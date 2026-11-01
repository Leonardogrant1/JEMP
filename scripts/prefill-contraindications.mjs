#!/usr/bin/env node
// Batch-KI-Prefill für exercise_contraindications — LOKAL ONLY.
//
// Holt alle Übungen ohne bestehende Contraindication-Tags aus der lokalen
// Dev-DB (Docker `supabase_db_jemp`), schickt sie in Batches à 20 an
// gpt-5-mini (strict JSON-Schema, Enum = die Contraindication-Tag-Slugs aus
// der DB) und schreibt die Tags zurück — Schreibmuster (psql + jsonb_to_
// recordset) wie in `pull-exercises-from-prod.mjs`.
//
// Idempotent: der Auswahl-Query filtert auf "keine exercise_contraindications
// -Row vorhanden" — bereits getaggte Übungen werden nie erneut angefragt.
// Übungen, für die das Modell bewusst 0 Tags vergibt, bleiben ohne Row und
// werden bei einem Re-Run erneut angefragt (kein separates "verarbeitet"-
// Flag in diesem Schema) — bei Bedarf per --limit/--dry-run gezielt prüfen.
//
// KEIN Prod-/Staging-Zugriff: einzige externe Verbindung ist die OpenAI-API;
// alle DB-Reads/-Writes gehen ausschließlich gegen die lokale Docker-Instanz.
//
// Usage:
//   node scripts/prefill-contraindications.mjs
//   node scripts/prefill-contraindications.mjs --limit 20   // nur die ersten N Übungen (Testlauf)
//   node scripts/prefill-contraindications.mjs --dry-run     // ruft die API auf, schreibt aber nicht in die DB

import { execFileSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const DB_CONTAINER = 'supabase_db_jemp'
const BATCH_SIZE = 20
const MODEL = 'gpt-5-mini'
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitIdx = args.indexOf('--limit')
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : undefined

// ── psql-Muster wie in pull-exercises-from-prod.mjs ──────────────────────────
const psql = (sql) =>
  execFileSync('docker', ['exec', DB_CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim()
const psqlJson = (sql) => JSON.parse(psql(`select coalesce(jsonb_agg(t), '[]'::jsonb) from (${sql}) t`) || '[]')
const jsonLit = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`

// ── OPENAI_API_KEY: Env zuerst, sonst Fallback auf bekannte .env-Dateien ────
function loadOpenAiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY
  const candidates = ['.env', 'web/.env', 'web/.env.local', 'externals/jemp-temporal-worker/.env', 'supabase/.env']
  for (const rel of candidates) {
    const p = resolve(ROOT, rel)
    if (!existsSync(p)) continue
    const m = readFileSync(p, 'utf8').match(/^OPENAI_API_KEY=(.*)$/m)
    const v = m?.[1]?.trim().replace(/^["']|["']$/g, '')
    if (v) return v
  }
  return undefined
}

const apiKey = loadOpenAiKey()
if (!apiKey) {
  console.error('OPENAI_API_KEY fehlt (weder im Env noch in .env/.env.local/externals/*/.env/supabase/.env gefunden).')
  process.exit(1)
}

// ── 1. Tag-Katalog + zu taggende Übungen laden ───────────────────────────────
const tags = psqlJson(`select slug from contraindication_tags order by slug`).map((r) => r.slug)
if (tags.length === 0) throw new Error('contraindication_tags ist leer — Migration gelaufen?')

let exercises = psqlJson(`
  select e.slug, e.name, e.body_region, e.strength_pattern, e.plyo_type, e.movement_type, e.is_explosive
  from exercises e
  left join exercise_contraindications ec on ec.exercise_id = e.id
  where ec.exercise_id is null
  group by e.id, e.slug, e.name, e.body_region, e.strength_pattern, e.plyo_type, e.movement_type, e.is_explosive
  order by e.slug
`)
if (limit) exercises = exercises.slice(0, limit)

console.log(`Tags im Katalog: ${tags.length} | Übungen ohne Tags: ${exercises.length}${limit ? ` (limitiert auf ${limit})` : ''}`)
if (exercises.length === 0) {
  console.log('Nichts zu tun — alle Übungen bereits getaggt ✓')
  process.exit(0)
}

// ── 2. JSON-Schema + System-Prompt ───────────────────────────────────────────
const TAG_GUIDE = `
- deep_knee_flexion_loaded: geladene Übungen mit tiefer Kniebeugung unter Last (z.B. Pistol Squat, Front Squat, Back Squat, Bulgarian Split Squat in voller Tiefe). NICHT für unbelastete/flache Kniebeugen.
- jumping_landing: Sprung- und Landeübungen mit Impact (Box Jump, Depth Jump, Jump Squat, Broad Jump).
- sprinting_max_velocity: Sprints nahe/bei maximaler Geschwindigkeit (Flying Sprints, Max-Velocity-Drills, nicht reine Beschleunigungsdrills auf kurzer Distanz).
- hamstring_high_speed_load: Hamstring-Belastung bei hoher Geschwindigkeit (Sprinten, Nordic Curls, schnelle RDL-Varianten, Hamstring-Sprints).
- overhead_pressing: strenges/dynamisches Überkopfdrücken (Overhead Press, Push Press, Jerk).
- shoulder_end_range: Schulter in Endstellung/extremer Beweglichkeit (tiefe Überkopfdehnung, extreme Außenrotation, Overhead Squat, Snatch-Grip-Arbeiten).
- wrist_extension_loaded: belastete Handgelenksextension (Front-Rack-Halten, Liegestütze/Planks mit gestrecktem Handgelenk unter Last, Handstand-Arbeiten).
- spinal_flexion_loaded: belastete Wirbelsäulenflexion (beladene Sit-ups/Crunches, Ab Wheel unter starker Flexion).
- spinal_compression_heavy: schwere axiale Wirbelsäulenbelastung (schwere Back Squats/Deadlifts, schwere Overhead Carries, Farmers Walk mit sehr hoher Last).
- hip_flexion_loaded_deep: tiefe, belastete Hüftflexion (tiefe Lunges, High-Knee-Drives unter Last, tiefe Split Squats).
- adductor_loaded_stretch: belastete Adduktoren-Dehnposition (Cossack Squat, Sumo-Bewegungen in Tiefe, seitliche Lunges mit Dehnung).
- ankle_lateral_stress: seitliche Sprunggelenksbelastung (Cutting, laterale Bounds, Ladder-Drills mit Seitwärtsbewegung, Lateral Hops).
- ankle_plantar_load_explosive: explosive Plantarflexionsbelastung (Sprint-Abdruck, Sprünge, explosive Wadenarbeit, Pogos).
- elbow_extension_loaded: belastete Ellbogenextension unter hoher Last (Skull Crusher, schwere Trizepsextensionen, Dips mit Zusatzlast).
- spinal_rotation_loaded: belastete Wirbelsäulenrotation (Rotational Slams, beladene Holzfäller-Bewegungen, rotatorische Medizinball-Würfe).

Vergib nur echte, übungsdefinierende Risiken — bei den meisten Übungen ist ein leeres Array korrekt. Nutze die Metadaten-Spalten (body_region, strength_pattern, plyo_type, movement_type, is_explosive) als Signal, aber der Name/Slug ist die primäre Quelle (Metadaten sind teils lückenhaft).`

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['results'],
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['slug', 'tags'],
        properties: {
          slug: { type: 'string' },
          tags: { type: 'array', items: { type: 'string', enum: tags } },
        },
      },
    },
  },
}

const SYSTEM_PROMPT =
  'Du klassifizierst Übungen für JEMP, eine Trainings-App für Athleten, nach Verletzungs-Contraindication-Tags. ' +
  'Jeder Tag markiert ein Bewegungsmuster-Risiko, das die Übung belastet — relevant für Nutzer mit aktiven Verletzungs-Constraints. ' +
  'Für jede Übung im Input gibst du genau ein Ergebnis mit ihrem slug zurück (gleiche Reihenfolge wie Input) und ein Array der zutreffenden Tags (leer, wenn keiner zutrifft). ' +
  'Tag-Definitionen:' + TAG_GUIDE

// ── 3. Batches sequenziell gegen die API ─────────────────────────────────────
function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function classifyBatch(batch) {
  const userPayload = batch.map(({ slug, name, body_region, strength_pattern, plyo_type, movement_type, is_explosive }) => ({
    slug, name, body_region, strength_pattern, plyo_type, movement_type, is_explosive,
  }))
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: 'json_schema', json_schema: { name: 'contraindication_batch', strict: true, schema } },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(userPayload) },
      ],
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenAI ${res.status}: ${body.slice(0, 500)}`)
  }
  const json = await res.json()
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI returned no content')
  const parsed = JSON.parse(content)
  return parsed.results ?? []
}

const tagSet = new Set(tags)
const batches = chunk(exercises, BATCH_SIZE)
const allResults = [] // { slug, tags: string[] }
const failedBatches = []

for (let i = 0; i < batches.length; i++) {
  const batch = batches[i]
  console.log(`Batch ${i + 1}/${batches.length} (${batch.length} Übungen)…`)
  try {
    const results = await classifyBatch(batch)
    const bySlug = new Map(results.map((r) => [r.slug, r]))
    const rowsToInsert = []
    for (const ex of batch) {
      const r = bySlug.get(ex.slug)
      const resultTags = (r?.tags ?? []).filter((t) => tagSet.has(t))
      if (!r) console.warn(`  WARNUNG: kein Ergebnis für ${ex.slug} im Batch-Response — als 0 Tags behandelt`)
      allResults.push({ slug: ex.slug, tags: resultTags })
      for (const t of resultTags) rowsToInsert.push({ exercise_slug: ex.slug, tag_slug: t })
    }
    if (!dryRun && rowsToInsert.length > 0) {
      psql(`
        insert into exercise_contraindications (exercise_id, contraindication_tag_id)
        select e.id, t.id
        from jsonb_to_recordset(${jsonLit(rowsToInsert)}) as r(exercise_slug text, tag_slug text)
        join exercises e on e.slug = r.exercise_slug
        join contraindication_tags t on t.slug = r.tag_slug
        on conflict do nothing;
      `)
      // Die Insert-Row landet nicht via UPDATE auf exercises — der
      // updated_at-Trigger (Grundlage für push-exercises.mjs' affectedSlugs-
      // Diff) feuert sonst nie. Ohne diesen Bump würden die neu vergebenen
      // Tags beim nächsten Push als "unverändert" übersprungen.
      const taggedSlugs = [...new Set(rowsToInsert.map((r) => r.exercise_slug))]
      psql(`
        update exercises set updated_at = now()
        where slug in (select jsonb_array_elements_text(${jsonLit(taggedSlugs)}));
      `)
    }
  } catch (e) {
    console.error(`  Batch ${i + 1} fehlgeschlagen: ${e.message}`)
    failedBatches.push({ batch: i + 1, error: e.message })
  }
}

// ── 4. Zusammenfassung ────────────────────────────────────────────────────────
console.log('\n── Zusammenfassung ──')
for (const r of allResults) {
  console.log(`${r.slug}: ${r.tags.length > 0 ? r.tags.join(', ') : '(keine)'}`)
}

const taggedCount = allResults.filter((r) => r.tags.length > 0).length
console.log(`\nGetaggt: ${taggedCount} von ${allResults.length} verarbeiteten Übungen${dryRun ? ' (DRY RUN — nicht in DB geschrieben)' : ''}`)

const distribution = new Map(tags.map((t) => [t, 0]))
for (const r of allResults) for (const t of r.tags) distribution.set(t, (distribution.get(t) ?? 0) + 1)
console.log('\nVerteilung pro Tag:')
for (const [tag, count] of distribution) console.log(`  ${tag}: ${count}`)

if (failedBatches.length > 0) {
  console.error(`\n${failedBatches.length} von ${batches.length} Batches fehlgeschlagen:`)
  for (const f of failedBatches) console.error(`  Batch ${f.batch}: ${f.error}`)
  process.exit(1)
}

console.log('\nPrefill fertig ✓')
