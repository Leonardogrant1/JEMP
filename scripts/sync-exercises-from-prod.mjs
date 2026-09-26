// Prod→Dev-Mirror für Übungsdaten: kopiert exercises + Link-Tabellen aus der
// Production-DB in die lokale Supabase-Instanz. NUR in diese Richtung —
// Dev→Prod läuft weiterhin über Migrations.
//
// Matching läuft über SLUGS, nicht über IDs: lokal und prod haben ihre UUIDs
// unabhängig generiert (gilt für exercises UND Lookups). Bestehende lokale
// Übungen behalten ihre ID (lokale Workout-Daten bleiben verknüpft), nur die
// Felder werden aus Prod übernommen; category_id und Link-Tabellen werden per
// Slug auf lokale Lookup-IDs remappt.
//
// Mirror-Semantik: lokale Übungen, deren Slug es auf Prod nicht gibt, werden
// GELÖSCHT (cascaded in lokale Test-Pläne/Sessions — auf Dev gewollt).
// Lookup-Tabellen (categories, equipments, environments, block_types) werden
// nicht angefasst, nur auf Slug-Gleichheit geprüft — bei Drift: Migration.
//
// Voraussetzungen: eingeloggte Supabase-CLI (holt den Service-Key selbst),
// laufende lokale Instanz (docker container supabase_db_jemp).
//
// Usage: node scripts/sync-exercises-from-prod.mjs

import { execFileSync } from 'child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const DB_CONTAINER = 'supabase_db_jemp'
const LOOKUP_TABLES = ['categories', 'equipments', 'environments', 'block_types']

const projectRef = readFileSync(new URL('../supabase/.temp/project-ref', import.meta.url), 'utf8').trim()

const psql = (sql) =>
  execFileSync('docker', ['exec', DB_CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' }).trim()

console.log(`Projekt: ${projectRef} → lokale DB (${DB_CONTAINER})`)

// Service-Key über die eingeloggte CLI
const keys = JSON.parse(execFileSync('npx', ['-y', 'supabase', 'projects', 'api-keys', '--project-ref', projectRef, '-o', 'json'], { encoding: 'utf8' }))
const serviceKey = keys.find(k => k.name === 'service_role')?.api_key
if (!serviceKey) throw new Error('service_role-Key nicht gefunden — supabase login?')

const PAGE = 1000
async function fetchAll(table, select = '*') {
  const rows = []
  for (let offset = 0; ; offset += PAGE) {
    const res = await fetch(
      `https://${projectRef}.supabase.co/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=${PAGE}&offset=${offset}`,
      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
    )
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`)
    const page = await res.json()
    rows.push(...page)
    if (page.length < PAGE) return rows
  }
}

// 1. Lookup-Check: Slugs müssen identisch sein (die laufen über Migrations)
for (const table of LOOKUP_TABLES) {
  const prodSlugs = (await fetchAll(table, 'slug')).map(r => r.slug).sort().join(',')
  const localSlugs = psql(`select coalesce(string_agg(slug, ',' order by slug), '') from ${table}`)
  if (prodSlugs !== localSlugs) {
    console.error(`ABBRUCH: ${table}-Slugs weichen ab — erst Migrations syncen.\n  prod:  ${prodSlugs}\n  lokal: ${localSlugs}`)
    process.exit(1)
  }
}
console.log('Lookup-Tabellen identisch ✓')

// 2. Prod-Daten ziehen — Links direkt als Slug-Paare
const exercises = (await fetchAll('exercises', '*,category:categories(slug)')).map(({ category, category_id, ...rest }) => ({
  ...rest,
  category_slug: category?.slug ?? null,
}))
const links = {
  exercise_equipments: (await fetchAll('exercise_equipments', 'exercise:exercises(slug),equipment:equipments(slug)'))
    .map(r => ({ exercise_slug: r.exercise.slug, ref_slug: r.equipment.slug })),
  exercise_environments: (await fetchAll('exercise_environments', 'exercise:exercises(slug),environment:environments(slug)'))
    .map(r => ({ exercise_slug: r.exercise.slug, ref_slug: r.environment.slug })),
  exercise_blocks: (await fetchAll('exercise_blocks', 'exercise:exercises(slug),block_type:block_types(slug)'))
    .map(r => ({ exercise_slug: r.exercise.slug, ref_slug: r.block_type.slug })),
  exercise_sport_groups: (await fetchAll('exercise_sport_groups', 'exercise:exercises(slug),sport_group'))
    .map(r => ({ exercise_slug: r.exercise.slug, ref_slug: r.sport_group })),
}
console.log(`Prod: ${exercises.length} Übungen, Links: ${Object.entries(links).map(([t, v]) => `${t.replace('exercise_', '')}=${v.length}`).join(', ')}`)

// 3. JSON in den Container legen (pg_read_file liest im Container)
const dir = mkdtempSync(join(tmpdir(), 'jemp-sync-'))
writeFileSync(join(dir, 'exercises.json'), JSON.stringify(exercises))
for (const [table, rows] of Object.entries(links)) writeFileSync(join(dir, `${table}.json`), JSON.stringify(rows))

// 4. Spaltenliste dynamisch aus dem lokalen Schema (für jsonb_to_recordset + Update/Insert)
const colDefs = psql(`select string_agg(column_name || ' ' || udt_name, ',' order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='exercises'`)
  .split(',').filter(def => !def.startsWith('category_id '))
const dataCols = colDefs.map(def => def.split(' ')[0]).filter(c => c !== 'id')
const recordDef = colDefs.map(def => `"${def.split(' ')[0]}" ${def.split(' ')[1]}`).join(', ') + ', "category_slug" text'

const linkSql = (table, refTable, refCol) => `
delete from ${table};
insert into ${table} (exercise_id, ${refCol})
select e.id, r.id
from jsonb_to_recordset(:'${table}_json'::jsonb) as l(exercise_slug text, ref_slug text)
join exercises e on e.slug = l.exercise_slug
join ${refTable} r on r.slug = l.ref_slug;`

// 5. Mirror in einer Transaktion. Die JSON-Dateien werden client-seitig über
// psql-Backtick-Variablen gelesen (pg_read_file bräuchte Superuser-Rechte).
const sql = `
\\set exercises_json \`cat /tmp/jemp-sync/exercises.json\`
\\set exercise_equipments_json \`cat /tmp/jemp-sync/exercise_equipments.json\`
\\set exercise_environments_json \`cat /tmp/jemp-sync/exercise_environments.json\`
\\set exercise_blocks_json \`cat /tmp/jemp-sync/exercise_blocks.json\`
\\set exercise_sport_groups_json \`cat /tmp/jemp-sync/exercise_sport_groups.json\`
begin;
create temp table _prod as
select x.*, c.id as local_category_id
from jsonb_to_recordset(:'exercises_json'::jsonb) as x(${recordDef})
left join categories c on c.slug = x.category_slug;

select 'GELÖSCHT (lokal-only): ' || coalesce(string_agg(e.slug, ', '), '—')
  from exercises e where not exists (select 1 from _prod p where p.slug = e.slug);
delete from exercises e where not exists (select 1 from _prod p where p.slug = e.slug);

update exercises e set ${dataCols.filter(c => c !== 'slug').map(c => `"${c}" = p."${c}"`).join(', ')}, category_id = p.local_category_id
from _prod p where p.slug = e.slug;

insert into exercises (id, category_id, ${dataCols.map(c => `"${c}"`).join(', ')})
select p.id, p.local_category_id, ${dataCols.map(c => `p."${c}"`).join(', ')}
from _prod p where not exists (select 1 from exercises e where e.slug = p.slug);

${linkSql('exercise_equipments', 'equipments', 'equipment_id')}
${linkSql('exercise_environments', 'environments', 'environment_id')}
${linkSql('exercise_blocks', 'block_types', 'block_type_id')}

delete from exercise_sport_groups;
insert into exercise_sport_groups (exercise_id, sport_group)
select e.id, l.ref_slug
from jsonb_to_recordset(:'exercise_sport_groups_json'::jsonb) as l(exercise_slug text, ref_slug text)
join exercises e on e.slug = l.exercise_slug;

select 'Lokal nach Sync: ' || count(*) || ' Übungen' from exercises;
commit;
`
writeFileSync(join(dir, 'sync.sql'), sql)
execFileSync('docker', ['exec', DB_CONTAINER, 'rm', '-rf', '/tmp/jemp-sync'])
execFileSync('docker', ['cp', dir, `${DB_CONTAINER}:/tmp/jemp-sync`])
const out = execFileSync('docker', ['exec', DB_CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-f', '/tmp/jemp-sync/sync.sql'], { encoding: 'utf8' })
console.log(out.trim())
console.log('Sync fertig ✓')
