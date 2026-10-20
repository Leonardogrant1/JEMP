// Lokal→Remote-Push für Übungen + Medien (Gegenstück zu pull-exercises-from-prod).
//
// Semantik (Match über Slug):
//   - lokal-only Übungen → einfügen (inkl. Links + Medien)
//   - Overlap: nur updaten wenn lokal.updated_at > ziel.updated_at
//     (Admin-/UI-Edits bumpen den Timestamp; der exercises-Trigger auf dem
//     Ziel respektiert den verbatim geschriebenen Wert)
//   - NIE löschen — Löschungen laufen bewusst manuell/per Migration
// Nur Spalten, die BEIDE Seiten kennen (Prod hinkt dem Schema hinterher,
// bis der Migrationsbatch gepusht ist). Fehlen Lookup-Slugs auf dem Ziel
// (Kategorie/Equipment/...), bricht der Push mit Liste ab → erst Migrationen
// pushen.
//
// Safety: zeigt den Diff, dann Bestätigung — staging y/N, prod nur nach
// getipptem 'prod'. --dry-run zeigt nur den Diff.
//
// Usage: node scripts/push-exercises.mjs <staging|prod> [--dry-run]

import { execFileSync } from 'child_process'
import { createInterface } from 'readline'

const TARGETS = { staging: 'thagwhvfqybuoghpriyb', prod: 'laciueqbsljlmzqcdtpr' }
const DB_CONTAINER = 'supabase_db_jemp'
const LINK_DEFS = [
  ['exercise_equipments', 'equipments', 'equipment_id'],
  ['exercise_environments', 'environments', 'environment_id'],
  ['exercise_blocks', 'block_types', 'block_type_id'],
]

const envArg = process.argv[2]
const dryRun = process.argv.includes('--dry-run')
if (!TARGETS[envArg]) {
  console.error('Usage: node scripts/push-exercises.mjs <staging|prod> [--dry-run]')
  process.exit(1)
}
const TARGET = TARGETS[envArg]

const psql = (sql) =>
  execFileSync('docker', ['exec', DB_CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim()
const psqlJson = (sql) => JSON.parse(psql(`select coalesce(jsonb_agg(t), '[]'::jsonb) from (${sql}) t`) || '[]')

const accessToken = Buffer.from(
  execFileSync('security', ['find-generic-password', '-s', 'Supabase CLI', '-w'], { encoding: 'utf8' })
    .trim().replace(/^go-keyring-base64:/, ''), 'base64').toString('utf8')

async function targetQuery(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${TARGET}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) throw new Error(`target query: HTTP ${res.status} ${await res.text()}`)
  return res.json()
}

const targetServiceKey = (() => {
  const keys = JSON.parse(execFileSync('npx', ['-y', 'supabase', 'projects', 'api-keys', '--project-ref', TARGET, '-o', 'json'], { encoding: 'utf8' }))
  const k = keys.find((k) => k.name === 'service_role')?.api_key
  if (!k) throw new Error(`service_role-Key für ${envArg} fehlt — supabase login?`)
  return k
})()

const localStatus = JSON.parse(execFileSync('npx', ['-y', 'supabase', 'status', '-o', 'json'], { encoding: 'utf8' }))
const localServiceKey = localStatus.SERVICE_ROLE_KEY ?? localStatus.service_role_key
const localApiUrl = (localStatus.API_URL ?? localStatus.api_url ?? 'http://127.0.0.1:54321').replace(/\/$/, '')

const jsonLit = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`

// ── 1. Stände vergleichen ────────────────────────────────────────────────────
const local = psqlJson(`select e.*, c.slug as category_slug from exercises e left join categories c on c.id = e.category_id`)
const target = await targetQuery(`select slug, updated_at from exercises`)
const targetBySlug = new Map(target.map((e) => [e.slug, e]))

const targetCols = new Set((await targetQuery(
  `select column_name from information_schema.columns where table_schema='public' and table_name='exercises'`,
)).map((r) => r.column_name))
const localColType = Object.fromEntries(psqlJson(
  `select column_name, udt_name from information_schema.columns where table_schema='public' and table_name='exercises'`,
).map((r) => [r.column_name, r.udt_name]))
const dataCols = Object.keys(localColType).filter((c) => targetCols.has(c) && !['id', 'category_id', 'created_at'].includes(c))

const toInsert = local.filter((e) => !targetBySlug.has(e.slug))
const toUpdate = local.filter((e) => {
  const t = targetBySlug.get(e.slug)
  return t && e.updated_at && t.updated_at && new Date(e.updated_at) > new Date(t.updated_at)
})
const affectedSlugs = new Set([...toInsert, ...toUpdate].map((e) => e.slug))

// ── 2. Links + Lookup-Parität ────────────────────────────────────────────────
const linkRows = {}
for (const [table, refTable] of LINK_DEFS) {
  linkRows[table] = psqlJson(`select e.slug as exercise_slug, r.slug as ref_slug
    from ${table} l join exercises e on e.id = l.exercise_id join ${refTable} r on r.id = l.${LINK_DEFS.find(d => d[0] === table)[2]}
    where e.slug in (select jsonb_array_elements_text(${jsonLit([...affectedSlugs])}))`)
}
const sportGroups = psqlJson(`select e.slug as exercise_slug, l.sport_group::text as ref_slug
  from exercise_sport_groups l join exercises e on e.id = l.exercise_id
  where e.slug in (select jsonb_array_elements_text(${jsonLit([...affectedSlugs])}))`)

const neededLookups = {
  categories: [...new Set([...toInsert, ...toUpdate].map((e) => e.category_slug).filter(Boolean))],
  equipments: [...new Set(linkRows.exercise_equipments.map((r) => r.ref_slug))],
  environments: [...new Set(linkRows.exercise_environments.map((r) => r.ref_slug))],
  block_types: [...new Set(linkRows.exercise_blocks.map((r) => r.ref_slug))],
}
const missingLookups = []
for (const [table, slugs] of Object.entries(neededLookups)) {
  if (slugs.length === 0) continue
  const existing = new Set((await targetQuery(
    `select slug from ${table} where slug in (${slugs.map((s) => `'${s.replace(/'/g, "''")}'`).join(',')})`,
  )).map((r) => r.slug))
  for (const s of slugs) if (!existing.has(s)) missingLookups.push(`${table}/${s}`)
}
if (missingLookups.length) {
  console.error(`ABBRUCH: Lookups fehlen auf ${envArg} — erst Migrationen pushen:\n  ${missingLookups.join('\n  ')}`)
  process.exit(1)
}

// ── 3. Medien-Diff ───────────────────────────────────────────────────────────
const mediaRefs = [...new Set([...toInsert, ...toUpdate]
  .flatMap((e) => [e.thumbnail_storage_path, e.video_storage_path]).filter(Boolean))]
const localObjs = new Map(psqlJson(
  `select name, (metadata->>'size')::bigint as size, metadata->>'mimetype' as mimetype from storage.objects where bucket_id = 'exercises'`,
).map((o) => [o.name, o]))
const targetObjs = new Map((await targetQuery(
  `select name, (metadata->>'size')::bigint as size from storage.objects where bucket_id = 'exercises'`,
)).map((o) => [o.name, o.size]))
const mediaTodo = mediaRefs.filter((p) => localObjs.has(p) && targetObjs.get(p) !== localObjs.get(p).size)
const mediaMissing = mediaRefs.filter((p) => !localObjs.has(p) && !targetObjs.has(p))
const mediaMb = (mediaTodo.reduce((s, p) => s + (localObjs.get(p).size ?? 0), 0) / 1024 / 1024).toFixed(0)

// ── 4. Diff anzeigen + bestätigen ────────────────────────────────────────────
const show = (label, slugs) => console.log(`${label} (${slugs.length}): ${slugs.slice(0, 12).join(', ')}${slugs.length > 12 ? ', …' : ''}`)
console.log(`\nPush lokal → ${envArg.toUpperCase()} (${TARGET})`)
show('  Neu', toInsert.map((e) => e.slug))
show('  Update (lokal neuer)', toUpdate.map((e) => e.slug))
console.log(`  Medien: ${mediaTodo.length} Dateien (${mediaMb} MB)`)
if (mediaMissing.length) console.warn(`  WARNUNG: ${mediaMissing.length} referenzierte Medien existieren lokal nicht: ${mediaMissing.slice(0, 5).join(', ')}`)
if (affectedSlugs.size === 0 && mediaTodo.length === 0) { console.log('Nichts zu tun ✓'); process.exit(0) }
if (dryRun) { console.log('\n--dry-run: nichts geschrieben.'); process.exit(0) }

const rl = createInterface({ input: process.stdin, output: process.stdout })
const answer = await new Promise((res) => rl.question(
  envArg === 'prod'
    ? `\nDu pushst auf PRODUCTION. Tippe 'prod' zum Fortfahren: `
    : `\nFortfahren? [y/N] `, res))
rl.close()
if ((envArg === 'prod' && answer !== 'prod') || (envArg !== 'prod' && answer.toLowerCase() !== 'y')) {
  console.log('Abgebrochen.')
  process.exit(1)
}

// ── 5. Schreiben ─────────────────────────────────────────────────────────────
const pick = (e, cols) => Object.fromEntries(cols.map((c) => [c, e[c] ?? null]))
const recordDef = (cols) => cols.map((c) => `"${c}" ${localColType[c] ?? 'text'}`).join(', ')
const [{ udt_name: sportGroupType }] = await targetQuery(
  `select udt_name from information_schema.columns where table_schema='public' and table_name='exercise_sport_groups' and column_name='sport_group'`)

const updateRows = toUpdate.map((e) => ({ ...pick(e, dataCols), category_slug: e.category_slug }))
const insertRows = toInsert.map((e) => ({ ...pick(e, dataCols), category_slug: e.category_slug }))

if (affectedSlugs.size > 0) {
  await targetQuery(`
begin;
set local lock_timeout = '5s';

update exercises e set ${dataCols.filter((c) => c !== 'slug').map((c) => `"${c}" = p."${c}"`).join(', ')},
  category_id = coalesce(c.id, e.category_id)
from jsonb_to_recordset(${jsonLit(updateRows)}) as p(${recordDef(dataCols)}, "category_slug" text)
left join categories c on c.slug = p.category_slug
where p.slug = e.slug;

insert into exercises (category_id, ${dataCols.map((c) => `"${c}"`).join(', ')})
select c.id, ${dataCols.map((c) => `p."${c}"`).join(', ')}
from jsonb_to_recordset(${jsonLit(insertRows)}) as p(${recordDef(dataCols)}, "category_slug" text)
join categories c on c.slug = p.category_slug
where not exists (select 1 from exercises e where e.slug = p.slug);

${LINK_DEFS.map(([table, refTable, refCol]) => `
delete from ${table} l using exercises e
where e.id = l.exercise_id and e.slug in (select jsonb_array_elements_text(${jsonLit([...affectedSlugs])}));
insert into ${table} (exercise_id, ${refCol})
select e.id, r.id
from jsonb_to_recordset(${jsonLit(linkRows[table])}) as l(exercise_slug text, ref_slug text)
join exercises e on e.slug = l.exercise_slug
join ${refTable} r on r.slug = l.ref_slug
on conflict do nothing;`).join('\n')}

delete from exercise_sport_groups l using exercises e
where e.id = l.exercise_id and e.slug in (select jsonb_array_elements_text(${jsonLit([...affectedSlugs])}));
insert into exercise_sport_groups (exercise_id, sport_group)
select e.id, l.ref_slug::${sportGroupType}
from jsonb_to_recordset(${jsonLit(sportGroups)}) as l(exercise_slug text, ref_slug text)
join exercises e on e.slug = l.exercise_slug
on conflict do nothing;

commit;
`)
  console.log('DB-Push fertig ✓')
}

// ── 6. Medien hochladen ──────────────────────────────────────────────────────
let done = 0
const failed = []
const queue = [...mediaTodo]
await Promise.all(Array.from({ length: 6 }, async () => {
  for (let p; (p = queue.shift());) {
    try {
      const dl = await fetch(`${localApiUrl}/storage/v1/object/exercises/${p}`, {
        headers: { Authorization: `Bearer ${localServiceKey}` },
      })
      if (!dl.ok) throw new Error(`download HTTP ${dl.status}`)
      const body = Buffer.from(await dl.arrayBuffer())
      const up = await fetch(`https://${TARGET}.supabase.co/storage/v1/object/exercises/${p}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${targetServiceKey}`, 'Content-Type': localObjs.get(p).mimetype ?? 'application/octet-stream', 'x-upsert': 'true' },
        body,
      })
      if (!up.ok) throw new Error(`upload HTTP ${up.status} ${await up.text()}`)
      done++
      if (done % 25 === 0 || done === mediaTodo.length) console.log(`  ${done}/${mediaTodo.length}…`)
    } catch (e) {
      failed.push(`${p}: ${e.message}`)
    }
  }
}))
if (failed.length) {
  console.error(`MEDIEN FEHLGESCHLAGEN (${failed.length}):\n  ${failed.join('\n  ')}`)
  process.exit(1)
}
console.log('Push fertig ✓')
