// Prod→Lokal-Pull für Übungen + Medien (ersetzt sync-exercises-from-prod.mjs).
// KEIN Mirror: lokal-only Übungen (neue Arbeit, pending Migrationen) bleiben.
//
// Semantik pro Overlap-Übung (Match über Slug):
//   - prod.updated_at > lokal.updated_at  → volle Übernahme (Felder, Links)
//   - sonst → nur Content-Fill: youtube_url/thumbnail/video/image_group werden
//     aus Prod gefüllt, wo lokal NULL (Migrations-Rows sind zeitlich "jünger"
//     als Prods Admin-Edits, tragen aber keine Medien — coalesce ist hier die
//     einzig sichere Richtung)
// prod-only Übungen werden inkl. Links eingefügt. updated_at wird verbatim
// geschrieben (der exercises-Trigger respektiert explizit gesetzte Werte).
//
// Medien: alle von lokalen Übungen referenzierten Pfade, die im lokalen
// exercises-Bucket fehlen (oder in der Größe abweichen), werden von Prod
// geladen. Erster Lauf = Bootstrap (~570 MB), danach inkrementell.
//
// Voraussetzungen: eingeloggte Supabase-CLI, laufende lokale Instanz.
// Usage: node scripts/pull-exercises-from-prod.mjs

import { execFileSync } from 'child_process'

const PROD = 'laciueqbsljlmzqcdtpr'
const DB_CONTAINER = 'supabase_db_jemp'
const CONTENT_FILL_COLS = ['youtube_url', 'thumbnail_storage_path', 'video_storage_path', 'image_group']
const LINK_DEFS = [
  ['exercise_equipments', 'equipments', 'equipment_id', 'exercise:exercises(slug),equipment:equipments(slug)', (r) => r.equipment.slug],
  ['exercise_environments', 'environments', 'environment_id', 'exercise:exercises(slug),environment:environments(slug)', (r) => r.environment.slug],
  ['exercise_blocks', 'block_types', 'block_type_id', 'exercise:exercises(slug),block_type:block_types(slug)', (r) => r.block_type.slug],
]

const psql = (sql) =>
  execFileSync('docker', ['exec', DB_CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim()
const psqlJson = (sql) => JSON.parse(psql(`select coalesce(jsonb_agg(t), '[]'::jsonb) from (${sql}) t`) || '[]')

const accessToken = Buffer.from(
  execFileSync('security', ['find-generic-password', '-s', 'Supabase CLI', '-w'], { encoding: 'utf8' })
    .trim().replace(/^go-keyring-base64:/, ''), 'base64').toString('utf8')

async function prodQuery(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROD}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) throw new Error(`prod query: HTTP ${res.status} ${await res.text()}`)
  return res.json()
}

const prodServiceKey = (() => {
  const keys = JSON.parse(execFileSync('npx', ['-y', 'supabase', 'projects', 'api-keys', '--project-ref', PROD, '-o', 'json'], { encoding: 'utf8' }))
  const k = keys.find((k) => k.name === 'service_role')?.api_key
  if (!k) throw new Error('service_role-Key für Prod fehlt — supabase login?')
  return k
})()

const localStatus = JSON.parse(execFileSync('npx', ['-y', 'supabase', 'status', '-o', 'json'], { encoding: 'utf8' }))
const localServiceKey = localStatus.SERVICE_ROLE_KEY ?? localStatus.service_role_key
const localApiUrl = (localStatus.API_URL ?? localStatus.api_url ?? 'http://127.0.0.1:54321').replace(/\/$/, '')
if (!localServiceKey) throw new Error('lokaler Service-Key nicht gefunden — läuft `supabase start`?')

const PAGE = 1000
async function fetchAllProd(table, select = '*') {
  const rows = []
  for (let offset = 0; ; offset += PAGE) {
    const res = await fetch(`https://${PROD}.supabase.co/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=${PAGE}&offset=${offset}`,
      { headers: { apikey: prodServiceKey, Authorization: `Bearer ${prodServiceKey}` } })
    if (!res.ok) throw new Error(`${table}@prod: HTTP ${res.status} ${await res.text()}`)
    const page = await res.json()
    rows.push(...page)
    if (page.length < PAGE) return rows
  }
}

const jsonLit = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`

// ── 1. Stände laden ──────────────────────────────────────────────────────────
const prod = (await fetchAllProd('exercises', '*,category:categories(slug)')).map(({ category, category_id, ...rest }) => ({
  ...rest, category_slug: category?.slug ?? null,
}))
const local = psqlJson(`select slug, updated_at from exercises`)
const localBySlug = new Map(local.map((e) => [e.slug, e]))

const colType = Object.fromEntries(psqlJson(
  `select column_name, udt_name from information_schema.columns where table_schema='public' and table_name='exercises'`,
).map((r) => [r.column_name, r.udt_name]))
const prodCols = Object.keys(prod[0] ?? {})
const dataCols = prodCols.filter((c) => c in colType && !['id', 'category_id', 'created_at'].includes(c))

const toInsert = prod.filter((e) => !localBySlug.has(e.slug))
const toUpdate = prod.filter((e) => {
  const l = localBySlug.get(e.slug)
  return l && e.updated_at && l.updated_at && new Date(e.updated_at) > new Date(l.updated_at)
})
const toFill = prod.filter((e) => localBySlug.has(e.slug) && !toUpdate.includes(e))
const affectedSlugs = new Set([...toInsert, ...toUpdate].map((e) => e.slug))

console.log(`prod: ${prod.length} | lokal: ${local.length} | neu: ${toInsert.length} | update (prod neuer): ${toUpdate.length} | content-fill: ${toFill.length}`)

// ── 2. Links der betroffenen Übungen aus Prod ────────────────────────────────
const linkRows = {}
for (const [table, , , select, refSlug] of LINK_DEFS) {
  linkRows[table] = (await fetchAllProd(table, select))
    .filter((r) => affectedSlugs.has(r.exercise.slug))
    .map((r) => ({ exercise_slug: r.exercise.slug, ref_slug: refSlug(r) }))
}
const sportGroups = (await fetchAllProd('exercise_sport_groups', 'exercise:exercises(slug),sport_group'))
  .filter((r) => affectedSlugs.has(r.exercise.slug))
  .map((r) => ({ exercise_slug: r.exercise.slug, ref_slug: r.sport_group }))

// ── 3. Lokal schreiben (eine Transaktion) ────────────────────────────────────
const pick = (e, cols) => Object.fromEntries(cols.map((c) => [c, e[c] ?? null]))
const recordDef = (cols) => cols.map((c) => `"${c}" ${colType[c] ?? 'text'}`).join(', ')
const [{ udt_name: sportGroupType }] = psqlJson(
  `select udt_name from information_schema.columns where table_schema='public' and table_name='exercise_sport_groups' and column_name='sport_group'`)

const updateRows = toUpdate.map((e) => ({ ...pick(e, dataCols), category_slug: e.category_slug }))
const insertRows = toInsert.map((e) => ({ ...pick(e, dataCols), category_slug: e.category_slug }))
const fillRows = toFill.map((e) => ({ slug: e.slug, ...pick(e, CONTENT_FILL_COLS) }))

const sql = `
begin;
set local lock_timeout = '5s';
-- Trigger aus: der Pull schreibt Timestamps verbatim, und der Content-Fill
-- darf updated_at nicht bumpen (lokal würde sonst fälschlich "neuer")
set local session_replication_role = replica;

update exercises e set ${dataCols.filter((c) => c !== 'slug').map((c) => `"${c}" = p."${c}"`).join(', ')},
  category_id = coalesce(c.id, e.category_id)
from jsonb_to_recordset(${jsonLit(updateRows)}) as p(${recordDef(dataCols)}, "category_slug" text)
left join categories c on c.slug = p.category_slug
where p.slug = e.slug;

update exercises e set ${CONTENT_FILL_COLS.map((c) => `"${c}" = coalesce(e."${c}", p."${c}")`).join(', ')}
from jsonb_to_recordset(${jsonLit(fillRows)}) as p(slug text, ${recordDef(CONTENT_FILL_COLS)})
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
`
if (affectedSlugs.size > 0 || fillRows.length > 0) {
  execFileSync('docker', ['exec', '-i', DB_CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' })
  console.log('DB-Sync fertig ✓')
} else {
  console.log('DB bereits aktuell ✓')
}

// ── 4. Medien: referenzierte Pfade, die lokal fehlen ─────────────────────────
const refs = psqlJson(`select thumbnail_storage_path as p from exercises where thumbnail_storage_path is not null
  union select video_storage_path from exercises where video_storage_path is not null`)
  .map((r) => r.p)
const localObjs = new Map(psqlJson(
  `select name, (metadata->>'size')::bigint as size from storage.objects where bucket_id = 'exercises'`,
).map((o) => [o.name, o.size]))
const prodObjs = new Map((await prodQuery(
  `select name, (metadata->>'size')::bigint as size, metadata->>'mimetype' as mimetype from storage.objects where bucket_id = 'exercises'`,
)).map((o) => [o.name, o]))

// Lokalen Bucket sicherstellen
const bucketRes = await fetch(`${localApiUrl}/storage/v1/bucket`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${localServiceKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: 'exercises', name: 'exercises', public: true }),
})
if (!bucketRes.ok && bucketRes.status !== 409) {
  const body = await bucketRes.text()
  if (!body.includes('already exists')) throw new Error(`lokaler Bucket: HTTP ${bucketRes.status} ${body}`)
}

const todo = refs.filter((p) => prodObjs.has(p) && localObjs.get(p) !== prodObjs.get(p).size)
const missing = refs.filter((p) => !prodObjs.has(p) && !localObjs.has(p))
if (missing.length) console.warn(`WARNUNG: ${missing.length} referenzierte Pfade existieren weder lokal noch auf Prod:\n  ${missing.slice(0, 5).join('\n  ')}${missing.length > 5 ? '\n  …' : ''}`)
const totalMb = (todo.reduce((s, p) => s + (prodObjs.get(p).size ?? 0), 0) / 1024 / 1024).toFixed(0)
console.log(`Medien zu laden: ${todo.length} (${totalMb} MB)`)

let done = 0
const failed = []
const queue = [...todo]
await Promise.all(Array.from({ length: 6 }, async () => {
  for (let p; (p = queue.shift());) {
    try {
      const dl = await fetch(`https://${PROD}.supabase.co/storage/v1/object/exercises/${p}`, {
        headers: { Authorization: `Bearer ${prodServiceKey}` },
      })
      if (!dl.ok) throw new Error(`download HTTP ${dl.status}`)
      const body = Buffer.from(await dl.arrayBuffer())
      const up = await fetch(`${localApiUrl}/storage/v1/object/exercises/${p}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localServiceKey}`, 'Content-Type': prodObjs.get(p).mimetype ?? 'application/octet-stream', 'x-upsert': 'true' },
        body,
      })
      if (!up.ok) throw new Error(`upload HTTP ${up.status} ${await up.text()}`)
      done++
      if (done % 25 === 0 || done === todo.length) console.log(`  ${done}/${todo.length}…`)
    } catch (e) {
      failed.push(`${p}: ${e.message}`)
    }
  }
}))
if (failed.length) {
  console.error(`MEDIEN FEHLGESCHLAGEN (${failed.length}):\n  ${failed.join('\n  ')}`)
  process.exit(1)
}
console.log('Pull fertig ✓')
