// Prod→Staging-Seed für Übungsdaten. ANDERS als sync-exercises-from-prod.mjs
// (Vollmirror in die lokale DB): Staging ist schema-/seed-seitig NEUER als Prod
// (3.0.0-Migrationsbatch dort schon applied), darum Feld-Merge statt Mirror:
//
//   - staging-only Übungen (aus pending Migrationen): bleiben unangetastet
//   - prod-only Übungen (im Admin angelegt): werden inkl. Links eingefügt
//   - Overlap: Staging behält Struktur-/Generator-Felder (Kategorien, Caps,
//     movement-Metadaten — migration-maintained), Prod liefert Content-Felder
//     (youtube_url, thumbnail/video_storage_path — admin-maintained, via
//     coalesce: nie Werte durch NULL ersetzen; image_group nur NULL-Füllung)
// (equipments.is_location_specific gibt es auf Prod NICHT — die Spalte existiert
// nur lokal/staging; Werte müssen per Migration gepflegt werden.)
//
// Schreibt AUSSCHLIESSLICH auf Staging (Management-Query-API, Token aus dem
// macOS-Keychain der eingeloggten Supabase-CLI). Prod wird nur gelesen.
//
// Usage: node scripts/seed-exercises-staging.mjs

import { execFileSync } from 'child_process'

const PROD = 'laciueqbsljlmzqcdtpr'
const STAGING = 'thagwhvfqybuoghpriyb'
if (STAGING === PROD) throw new Error('target darf nie prod sein')

const token = execFileSync('security', ['find-generic-password', '-s', 'Supabase CLI', '-w'], { encoding: 'utf8' })
  .trim().replace(/^go-keyring-base64:/, '')
const accessToken = Buffer.from(token, 'base64').toString('utf8')

const serviceKey = (ref) => {
  const keys = JSON.parse(execFileSync('npx', ['-y', 'supabase', 'projects', 'api-keys', '--project-ref', ref, '-o', 'json'], { encoding: 'utf8' }))
  const k = keys.find(k => k.name === 'service_role')?.api_key
  if (!k) throw new Error(`service_role-Key fehlt für ${ref} — supabase login?`)
  return k
}

const PAGE = 1000
async function fetchAll(ref, key, table, select = '*') {
  const rows = []
  for (let offset = 0; ; offset += PAGE) {
    const res = await fetch(`https://${ref}.supabase.co/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=${PAGE}&offset=${offset}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } })
    if (!res.ok) throw new Error(`${table}@${ref}: HTTP ${res.status} ${await res.text()}`)
    const page = await res.json()
    rows.push(...page)
    if (page.length < PAGE) return rows
  }
}

// Schreibzugriff: nur Richtung Staging
async function stagingQuery(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${STAGING}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) throw new Error(`staging query: HTTP ${res.status} ${await res.text()}`)
  return res.json()
}

const jsonLit = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`

const prodKey = serviceKey(PROD)
const stagKey = serviceKey(STAGING)

const prod = await fetchAll(PROD, prodKey, 'exercises', '*,category:categories(slug)')
const stag = await fetchAll(STAGING, stagKey, 'exercises')
const stagSlugs = new Set(stag.map(e => e.slug))
const stagCols = new Set(Object.keys(stag[0]))

const prodOnly = prod.filter(e => !stagSlugs.has(e.slug))
const overlap = prod.filter(e => stagSlugs.has(e.slug))
console.log(`prod: ${prod.length} | staging: ${stag.length} | overlap: ${overlap.length} | neu aus prod: ${prodOnly.length}`)

// --- 1. Content-Merge für Overlap ---
const contentRows = overlap.map(e => ({
  slug: e.slug,
  youtube_url: e.youtube_url ?? null,
  thumbnail_storage_path: e.thumbnail_storage_path ?? null,
  video_storage_path: e.video_storage_path ?? null,
  image_group: e.image_group ?? null,
}))

// --- 2. Insert prod-only (nur Spalten, die Staging kennt; category per Slug remappt) ---
const insertCols = Object.keys(prod[0]).filter(c => stagCols.has(c) && !['id', 'category_id', 'created_at', 'updated_at'].includes(c))
const insertRows = prodOnly.map(e => ({
  ...Object.fromEntries(insertCols.map(c => [c, e[c] ?? null])),
  category_slug: e.category?.slug ?? null,
}))
const missingCat = insertRows.filter(r => !r.category_slug)
if (missingCat.length) throw new Error(`prod-only ohne Kategorie: ${missingCat.map(r => r.slug).join(', ')}`)

// --- 3. Links nur für die neu eingefügten Übungen ---
const prodOnlySlugs = new Set(prodOnly.map(e => e.slug))
const linkDefs = [
  ['exercise_equipments', 'equipments', 'equipment_id', 'exercise:exercises(slug),equipment:equipments(slug)', r => r.equipment.slug],
  ['exercise_environments', 'environments', 'environment_id', 'exercise:exercises(slug),environment:environments(slug)', r => r.environment.slug],
  ['exercise_blocks', 'block_types', 'block_type_id', 'exercise:exercises(slug),block_type:block_types(slug)', r => r.block_type.slug],
]
const linkRows = {}
for (const [table, , , select, refSlug] of linkDefs) {
  linkRows[table] = (await fetchAll(PROD, prodKey, table, select))
    .filter(r => prodOnlySlugs.has(r.exercise.slug))
    .map(r => ({ exercise_slug: r.exercise.slug, ref_slug: refSlug(r) }))
}
const sportGroups = (await fetchAll(PROD, prodKey, 'exercise_sport_groups', 'exercise:exercises(slug),sport_group'))
  .filter(r => prodOnlySlugs.has(r.exercise.slug))
  .map(r => ({ exercise_slug: r.exercise.slug, ref_slug: r.sport_group }))

const colType = (await stagingQuery(`select column_name, udt_name from information_schema.columns where table_schema='public' and table_name='exercises'`))
  .reduce((m, r) => ({ ...m, [r.column_name]: r.udt_name }), {})
const recordDef = (cols) => cols.map(c => `"${c}" ${colType[c] ?? 'text'}`).join(', ')
const [{ udt_name: sportGroupType }] = await stagingQuery(
  `select udt_name from information_schema.columns where table_schema='public' and table_name='exercise_sport_groups' and column_name='sport_group'`)

const sql = `
begin;
set local lock_timeout = '5s';

-- Content-Felder aus Prod (coalesce: nie Vorhandenes durch NULL ersetzen)
with p as (
  select * from jsonb_to_recordset(${jsonLit(contentRows)})
    as x(slug text, youtube_url text, thumbnail_storage_path text, video_storage_path text, image_group ${colType.image_group ?? 'text'})
)
update exercises e set
  youtube_url = coalesce(p.youtube_url, e.youtube_url),
  thumbnail_storage_path = coalesce(p.thumbnail_storage_path, e.thumbnail_storage_path),
  video_storage_path = coalesce(p.video_storage_path, e.video_storage_path),
  image_group = coalesce(e.image_group, p.image_group)
from p where p.slug = e.slug;

-- Prod-only Übungen einfügen
insert into exercises (category_id, ${insertCols.map(c => `"${c}"`).join(', ')})
select c.id, ${insertCols.map(c => `x."${c}"`).join(', ')}
from jsonb_to_recordset(${jsonLit(insertRows)}) as x(${recordDef(insertCols)}, "category_slug" text)
join categories c on c.slug = x.category_slug
where not exists (select 1 from exercises e where e.slug = x.slug);

${linkDefs.map(([table, refTable, refCol]) => `
insert into ${table} (exercise_id, ${refCol})
select e.id, r.id
from jsonb_to_recordset(${jsonLit(linkRows[table])}) as l(exercise_slug text, ref_slug text)
join exercises e on e.slug = l.exercise_slug
join ${refTable} r on r.slug = l.ref_slug
on conflict do nothing;`).join('\n')}

insert into exercise_sport_groups (exercise_id, sport_group)
select e.id, l.ref_slug::${sportGroupType}
from jsonb_to_recordset(${jsonLit(sportGroups)}) as l(exercise_slug text, ref_slug text)
join exercises e on e.slug = l.exercise_slug
on conflict do nothing;

commit;
`

await stagingQuery(sql)

const [after] = await stagingQuery(`select count(*)::int as n from exercises`)
const [links] = await stagingQuery(`select (select count(*)::int from exercise_equipments) as eq, (select count(*)::int from exercise_environments) as env, (select count(*)::int from exercise_blocks) as blocks, (select count(*)::int from exercise_sport_groups) as sg`)
console.log(`Staging nach Seed: ${after.n} Übungen | Links: equipments=${links.eq}, environments=${links.env}, blocks=${links.blocks}, sport_groups=${links.sg}`)
console.log(`Eingefügt: ${prodOnly.map(e => e.slug).join(', ') || '—'}`)
console.log('Seed fertig ✓')
