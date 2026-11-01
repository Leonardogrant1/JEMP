// externals/jemp-api/src/injury-extraction/extract.ts
//
// Übersetzt eine Freitext-Verletzungsnotiz (de/en) via gpt-5-mini in
// strukturierte Kontraindikations-Tag-Vorschläge. Die gültigen Slugs kommen
// IMMER live aus der DB (contraindication_tags) — niemals hier als Enum
// hardcoded (Spec-Regel 2026-11-01-injury-constraints-design.md §1).
//
// Der Handler (index.ts) macht Auth + DB-Fetch + Fehler-Mapping; diese Datei
// ist die reine, testbare Logik: Prompt/Schema-Bau + Nachvalidierung.
import type OpenAI from 'openai'

export type ExtractionProposal = { tag_slug: string; mode: 'block' | 'light_only'; acute: boolean; reason: string }
export type ExtractionResult = {
  constraints: ExtractionProposal[]
  unmapped: string[] // erkannte Verletzungsinhalte ohne passenden Tag
  scheduling: string[] // erkannte Scheduling-Inhalte (werden gespiegelt, nicht verarbeitet)
  noise: string[]
}

const MODEL = 'gpt-5-mini'

function emptyResult(): ExtractionResult {
  return { constraints: [], unmapped: [], scheduling: [], noise: [] }
}

// System-Prompt (deutsch, handhabt de+en Notizen): Few-Shots sind wörtlich
// aus der Tag-Tabelle in docs/superpowers/specs/2026-11-01-injury-constraints-
// design.md §1 (Zeilen 64-80) übernommen — die dort NICHT gelistete 16.
// Tag-Erweiterung (grip_pulling_loaded, Migration 20261101130000) fließt nur
// über die live gefetchte validSlugs-Liste ein, ohne eigenes Few-Shot, um die
// "nur diese Section lesen"-Vorgabe nicht zu verletzen.
function buildSystemPrompt(validSlugs: string[]): string {
  return `Du bist ein medizinisch vorsichtiger Assistent für eine Trainings-App. Nutzer:innen beschreiben in Freitext (Deutsch ODER Englisch) Verletzungen, Einschränkungen, manchmal auch Termine/Scheduling. Übersetze das in strukturierte Kontraindikations-Tags.

Gültige Tags (verwende AUSSCHLIESSLICH diese Slugs, erfinde keine neuen):
${validSlugs.join(', ')}

Beispiele für Tag ↔ typische Verletzungsnotiz:
- deep_knee_flexion_loaded: Pistol Squat/tiefe Kniebeuge betroffen; „keine tiefen Kniebeugen", Meniskus
- jumping_landing: Box Jump/Depth Jump/Jump Squat betroffen; Patellasehne, Reha nach Kreuzband
- sprinting_max_velocity: Sprints/Flying Runs betroffen; Hamstring-Zerrung
- hamstring_high_speed_load: Nordics/schwere RDL/Sprint betroffen; „no nordics"
- overhead_pressing: Overhead Press/Push Press betroffen; Schulter-Luxation
- shoulder_end_range: Behind-neck/tiefe Dips betroffen; Schulter instabil
- wrist_extension_loaded: Push-ups/Front Squat (Rack)/Handstand betroffen; Handgelenk gebrochen/geprellt
- spinal_flexion_loaded: schwere Sit-ups/Jefferson Curl betroffen; Bandscheibe
- spinal_compression_heavy: schwerer Back Squat/Deadlift betroffen; LWS, Skoliose
- hip_flexion_loaded_deep: tiefe Hocke/schwere Leg Raises betroffen; Hüft-Impingement
- adductor_loaded_stretch: Copenhagen/tiefer Cossack betroffen; Leiste
- ankle_lateral_stress: Lateral Bounds/Skater Jumps/COD betroffen; Bänderriss Sprunggelenk
- ankle_plantar_load_explosive: Pogos/Sprünge/schweres Wadenheben betroffen; Achillessehne
- elbow_extension_loaded: Skull Crusher/Dips betroffen; Ellenbogen
- spinal_rotation_loaded: Rotational Core/Med-Ball-Würfe mit Rotation betroffen; Bandscheibe, LWS

Regeln:
1. Ordne jedem erkannten Verletzungsinhalt so viele passende Tags zu wie nötig (ein Befund kann mehrere Tags auslösen, z. B. ein Handgelenksbruch kann wrist_extension_loaded UND bei Unterarmbeteiligung auch den Griff-/Zug-Tag auslösen, falls er in der gültigen Liste steht).
2. mode: 'block', wenn die Bewegung komplett ausgeschlossen werden muss; 'light_only', wenn nur schwere/explosive Ausführungen riskant sind, leichte Varianten aber vertretbar bleiben.
3. acute: true bei akuter Verletzung, laufender Reha oder sehr kürzlichem Vorfall; false bei chronisch/stabil/lange zurückliegend. Im Zweifel konservativ: akute/Reha-Formulierungen ("akut", "gerade operiert", "Reha läuft", "frisch") → acute:true UND mode:'block'.
4. reason: kurze eigene Zusammenfassung auf Deutsch, kein Zitat der ganzen Notiz.
5. unmapped: Verletzungs-/Einschränkungsinhalte, die klar erkannt wurden, aber zu KEINEM gültigen Tag passen — als kurze Stichworte.
6. scheduling: Inhalte, die sich auf Termine/Verfügbarkeit/Wochentage/andere Sporttermine beziehen statt auf eine Verletzung — NICHT in Tags übersetzen, nur als Stichwort spiegeln.
7. noise: alles andere (Smalltalk, unklare Aussagen ohne Verletzungs- oder Terminbezug).
8. Kategorien ohne Treffer bleiben leere Arrays. Wenn die Notiz keinen Verletzungsinhalt enthält, bleibt "constraints" leer.`
}

// OpenAI Structured Outputs (response_format: json_schema, strict: true).
// tag_slug ist als Enum auf validSlugs beschränkt — die Nachvalidierung in
// extractInjuryConstraints greift zusätzlich, weil das Enum einen
// Truncation-Pfad (finish_reason: 'length', abgeschnittenes JSON) nicht
// schützt.
function buildResponseFormat(validSlugs: string[]) {
  return {
    type: 'json_schema' as const,
    json_schema: {
      name: 'injury_extraction',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          constraints: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                tag_slug: { type: 'string', enum: validSlugs },
                mode: { type: 'string', enum: ['block', 'light_only'] },
                acute: { type: 'boolean' },
                reason: { type: 'string' },
              },
              required: ['tag_slug', 'mode', 'acute', 'reason'],
              additionalProperties: false,
            },
          },
          unmapped: { type: 'array', items: { type: 'string' } },
          scheduling: { type: 'array', items: { type: 'string' } },
          noise: { type: 'array', items: { type: 'string' } },
        },
        required: ['constraints', 'unmapped', 'scheduling', 'noise'],
        additionalProperties: false,
      },
    },
  }
}

export async function extractInjuryConstraints(
  note: string,
  validSlugs: string[],
  openai: OpenAI,
): Promise<ExtractionResult> {
  const trimmed = note.trim()
  if (!trimmed) return emptyResult()

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: buildSystemPrompt(validSlugs) },
      { role: 'user', content: trimmed },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK-Version pinnt response_format enger als unser dynamisches Enum-Schema
    response_format: buildResponseFormat(validSlugs) as any,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('injury-extraction: empty model response')

  // Wirft bei kaputtem/abgeschnittenem JSON — bewusst ungefangen, der Handler
  // mappt das auf 502 (fail-closed, kein stillschweigendes "keine Constraints").
  const parsed = JSON.parse(content) as ExtractionResult

  const validSlugSet = new Set(validSlugs)
  const constraints = (parsed.constraints ?? []).filter((c) => validSlugSet.has(c.tag_slug))

  return {
    constraints,
    unmapped: parsed.unmapped ?? [],
    scheduling: parsed.scheduling ?? [],
    noise: parsed.noise ?? [],
  }
}
