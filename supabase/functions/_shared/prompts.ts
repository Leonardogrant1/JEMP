
// ── Call 1: Week Planner (name + description + all main block exercises) ──────

type WeekPlanPromptInput = {
  sessions: Array<{ day_of_week: number; mode_slug: string; min: number; max: number }>
  exercisesString: string
  exerciseSlugs: string
  userContext: string
  categorySlugs: string[]
}

export const GENERATE_WEEK_PLAN_PROMPT = (input: WeekPlanPromptInput) => {
  const { sessions, exercisesString, exerciseSlugs, userContext, categorySlugs } = input

  const sessionsText = sessions
    .map((s) => `- Tag ${s.day_of_week} (${DAY_NAMES[s.day_of_week]}): mode=${s.mode_slug}, Dauer ${s.min}–${s.max} min`)
    .join("\n")

  return `
Du bist ein professioneller Trainer. Plane den gesamten Wochentrainingsplan auf einmal.
Entscheide für jede Session welche Categories und welche konkreten Übungen in die Hauptblöcke kommen.

## Nutzerdaten
${userContext}

## Sessions diese Woche
${sessionsText}

## Erlaubte Blöcke pro mode_slug

| mode_slug  | primary        | secondary      | accessory       |
|------------|----------------|----------------|-----------------|
| full       | ✅ 1–2 Übungen | ✅ 1–2 Übungen | ✅ optional 2–3 |
| reduced    | ✅ 1 Übung     | ✅ 1 Übung     | ✅ optional 2   |
| activation | ❌             | ❌             | ✅ optional 2–3 |
| recovery   | ❌             | ❌             | ❌              |

Sessions mit mode_slug \`recovery\` → \`blocks: []\` (kein Eintrag in blocks).

## Intensitäts-Regeln (Pflicht — pro mode_slug)

- **full**: nur \`exercise_type = dynamic\`, alle Intensitäten erlaubt
- **reduced**: nur \`exercise_type = dynamic\`, \`intensity_score ≤ 7\`
- **activation**: kein \`exercise_type = breathing\`, \`intensity_score ≤ 5\`

## Category-Regeln

Erlaubte Category-Slugs: ${categorySlugs.map((s) => `\`${s}\``).join(", ")}

- \`primary\`-Category darf sich über alle Sessions NICHT wiederholen (jede Session eine andere)
- Sport-Pflicht-Categories (sport_required_categories mit Relevanz 3) müssen mindestens einmal als primary erscheinen
- \`secondary\` muss eine andere Category als primary derselben Session sein
- \`accessory\` optional — nur wenn ein klarer Ergänzungsfokus sinnvoll ist (z.B. mobility)

## Übungsregeln

- **Keine Übung darf in mehreren Sessions vorkommen** (globale Eindeutigkeit)
- primary/secondary: 1–2 Übungen aus der jeweiligen Category
- accessory: 2–3 Übungen
- Wähle die zielführendsten und intensitätspassenden Übungen für den jeweiligen Modus

## name & description

- Name: Kurz, prägnant, auf Sportart und Fokus abgestimmt, max. 5 Wörter, kein Wochentag
- Beschreibung: 1–2 Sätze zum Trainingsschwerpunkt der Woche

## Verfügbare Übungen (nur Hauptblock-Übungen: primary, secondary, accessory)

${exercisesString}

Verwende **ausschließlich** Slugs aus dieser Liste:
${exerciseSlugs}
`
}

// ── Call 2–N: Full Session Assembly (parallel) ────────────────────────────────

type PreDecidedBlocks = {
  blocks: Array<{
    block_type: "primary" | "secondary" | "accessory"
    category_slug: string
    exercise_slugs: string[]
  }>
  selectedBodyRegions: string[]
}

type SessionPromptInput = {
  sessionIndex: number
  totalSessions: number
  spec: { day_of_week: number; mode_slug: string }
  duration: { min: number; max: number }
  exercisesString: string
  exerciseSlugs: string
  warmupCooldownExercisesString?: string
  warmupCooldownSlugs?: string
  preDecided?: PreDecidedBlocks
  otherSessionSlugs: string[]
  weekPlanSummary: string
  userContext: string
  planName: string
  planDescription: string
}

function getBlockStructure(mode: string): string {
  switch (mode) {
    case "full":
      return `\
Jede Session hat genau 5 Blöcke in dieser Reihenfolge:
1. warmup — 4 Übungen (Mobility, Activation, Dynamic Prep; max 1–2 Foam Roll)
2. primary — 1–2 Übungen (Hauptziel, lange Pausen)
3. secondary — 1–2 Übungen (komplementäre Category)
4. accessory — 2–4 Übungen (Core, Stabilität)
5. cooldown — genau 3 Übungen (Mobility, Static Stretch, Recovery)`

    case "reduced":
      return `\
Jede Session hat 5 Blöcke, aber mit reduziertem Volumen:
1. warmup — 3 Übungen (Mobility, Activation; KEINE intensiven Sprint-Drills)
2. primary — 1 Übung (moderate Intensität, keine Max-Lifts)
3. secondary — 1 Übung (komplementär, moderater Reiz)
4. accessory — 2 Übungen (Core, Stability, Injury Prevention)
5. cooldown — 3 Übungen (Mobility, Static Stretch)`

    case "activation":
      return `\
Activation Session: 3 Blöcke, kurze Einheit (20–30 Min):
1. warmup — 2–3 Übungen (Mobility, leichte Activation)
2. accessory — 2–3 Übungen (Core, Stability, leichte Drills — KEINE Sprints, KEINE Plyos, KEINE Lifts)
3. cooldown — 2–3 Übungen (Static Stretch, Mobility)`

    case "recovery":
      return `\
Recovery Session: 2 Blöcke, sehr kurz (15–25 Min):
1. warmup — 2–3 Übungen (sanfte Mobility)
2. cooldown — 3–4 Übungen (Foam Roll, Static Stretch, Breathing)
KEINE Strength, KEINE Power, KEINE Sprints.`

    default:
      return ""
  }
}

const DAY_NAMES: Record<number, string> = {
  1: "Montag", 2: "Dienstag", 3: "Mittwoch", 4: "Donnerstag",
  5: "Freitag", 6: "Samstag", 7: "Sonntag",
}

const MODE_DESCRIPTIONS: Record<string, string> = {
  full:       "Full Session (60–90 min) — vollständige Trainingseinheit, alle Blöcke",
  reduced:    "Reduced Session (45–60 min) — reduziertes Volumen, Fokus auf Hauptreize",
  activation: "Activation (20–30 min) — kurze Aktivierung, kein schweres Training",
  recovery:   "Recovery (15–25 min) — Regeneration, Mobility, leichte Auslastung",
}

export const GENERATE_SESSION_PROMPT = (input: SessionPromptInput) => {
  const {
    sessionIndex, totalSessions, spec, duration,
    exercisesString, exerciseSlugs,
    warmupCooldownExercisesString, warmupCooldownSlugs,
    preDecided, otherSessionSlugs, weekPlanSummary,
    userContext, planName, planDescription,
  } = input

  const dayName = DAY_NAMES[spec.day_of_week] ?? `Tag ${spec.day_of_week}`
  const modeDesc = MODE_DESCRIPTIONS[spec.mode_slug] ?? spec.mode_slug

  const preDecidedSection = preDecided ? `
## Bereits festgelegt: Hauptblöcke

${preDecided.blocks.map((b) =>
    `${b.block_type} (category: ${b.category_slug}): ${b.exercise_slugs.join(", ")}`
  ).join("\n")}
Belastete Körperregionen: ${preDecided.selectedBodyRegions.join(", ") || "nicht spezifiziert"}

Übernimm diese Übungen EXAKT in die entsprechenden Blöcke. Baue warmup und cooldown kohärent darauf auf.
` : ""

  const exerciseSection = warmupCooldownExercisesString ? `
## Verfügbare Übungen für Hauptblöcke (primary, secondary, accessory)

${exercisesString}

## Verfügbare Übungen für warmup und cooldown (bereits nach Körperregion der Hauptblöcke gefiltert)

${warmupCooldownExercisesString}
` : `
## Verfügbare Übungen

${exercisesString}
`


  return `
Du bist ein professioneller Trainer. Generiere Session ${sessionIndex + 1} von ${totalSessions} für diesen Wochenplan.

## Plan
Name: ${planName}
Beschreibung: ${planDescription}

## Nutzerdaten
${userContext}

## Wochenplan-Überblick (alle Sessions)
${weekPlanSummary}

${preDecidedSection}
## Diese Session
Tag: ${dayName} (day_of_week: ${spec.day_of_week})
Modus: ${modeDesc}
Zieldauer: ${duration.min}–${duration.max} min
${otherSessionSlugs.length > 0 ? `\nHinweis: Diese Übungen sind in anderen Sessions dieser Woche bereits verplant — verwende sie in dieser Session nicht:\n${otherSessionSlugs.join(", ")}` : ""}
${exerciseSection}

## Regeln

### Umgebungs-Regeln

Jede Übung kann ein optionales Feld \`environments: [slug, ...]\` haben.
- Fehlt das Feld → die Übung funktioniert in allen Umgebungen.
- Steht \`environments: [outdoor]\` → **nur** wenn der User \`outdoor\` in \`user_environments\` hat.
- Steht \`environments: [gym]\` → **nur** wenn der User \`gym\` in \`user_environments\` hat.

### Messtyp-Regeln

- \`reps\` → setze \`reps_min\` und \`reps_max\`, \`duration_seconds\` = 0
- \`duration\` → setze \`duration_seconds\`, \`reps_min\` = \`reps_max\` = 0
- \`distance\` → Distanz in \`notes\`, \`reps\` = 0, \`duration\` = 0
- \`reps_or_duration\` → du entscheidest basierend auf Kontext

### Volumen-Regeln (intensity_score)

- intensity 1–3: 1–2 Sätze
- intensity 4–5: 2–3 Sätze
- intensity 6–7: max. 3–4 Sätze, mind. 90 s Pause
- intensity 8–9: max. 5–6 Sätze, mind. 2 min Pause (nur full)
- intensity 10: max. 3–5 Sätze, mind. 3 min Pause (nur full)

In **reduced**: max. EINE Übung mit intensity ≥ 7 pro Session.

### Blockstruktur

${getBlockStructure(spec.mode_slug)}

### Block-Kohärenz

**warmup** — Zweck: Vorbereitung auf die Hauptblöcke
- Dynamische Mobility, Activation, Movement Prep
- Körperregionen müssen zu den Hauptblöcken passen (Pool ist bereits danach gefiltert)
- KEINE statischen Stretches länger als 30 Sekunden
- KEINE Übungen mit \`exercise_type = restorative\`
- Bei reduced-Modus: KEINE intensiven Sprint-Drills im warmup

**primary** — Zweck: Hauptreiz der Session
- 1–2 Übungen aus EINER Category
- Die intensitätshöchsten Übungen der Session
- \`focused_category_slug\` MUSS mit Category der Übungen übereinstimmen

**secondary** — Zweck: Komplementärer Reiz
- 1–2 Übungen, komplementäre Category zu primary
- \`focused_category_slug\` MUSS mit Category der Übungen übereinstimmen

**accessory** — Zweck: Schwächen, Stabilität, Injury Prevention
- 2–3 Übungen, Fokus auf Core, Stability, Unilateral
- KEINE reinen Mobility-Übungen

**cooldown** — Zweck: Recovery der belasteten Körperregionen
- Genau 3 Übungen
- AUSSCHLIESSLICH \`exercise_type = restorative\` ODER \`intensity_score ≤ 2\`
- Pool ist bereits nach Körperregion gefiltert
- NIEMALS Strength-, Plyo- oder Activation-Übungen
- \`focused_category_slug = mobility\`

### Kategorie-Regeln

Jede Übung hat ein Feld \`blocks: [...]\` — sie darf **nur** in den aufgeführten Blöcken verwendet werden.

### Wochenbelastung

- \`low\`: Intensivere Sessions möglich
- \`medium\`: Ausgewogene Belastung
- \`high\`: Leichtere Sessions, mehr Regeneration

### Session-Name

Kurz, beschreibend, kein Wochentag. Beispiele: "Power & Beinkraft", "Explosivität & Sprungkraft"

### Duplikat-Verbot

Jede Übung darf pro Session **maximal einmal** vorkommen.

### Ausgabe

- Blöcke: warmup=0, primary=1, secondary=2, accessory=3, cooldown=4 — \`order_index\` entsprechend setzen
- order_index der Übungen innerhalb eines Blocks beginnt bei 0
- Fehlende numerische Werte → 0 (nie null)
- estimated_duration_minutes muss im Bereich ${duration.min}–${duration.max} liegen
- mode_slug muss "${spec.mode_slug}" sein
- day_of_week muss ${spec.day_of_week} sein

**Erlaubte Slugs für primary / secondary / accessory** — verwende ausschließlich Slugs aus dieser Liste:
${exerciseSlugs}
${warmupCooldownSlugs ? `
**Erlaubte Slugs für warmup / cooldown** — verwende ausschließlich Slugs aus dieser Liste:
${warmupCooldownSlugs}

WICHTIG: Slugs aus der warmup/cooldown-Liste dürfen NICHT in primary/secondary/accessory verwendet werden. Slugs aus der primary/secondary/accessory-Liste dürfen NICHT in warmup/cooldown verwendet werden.
` : ""}
`
}
