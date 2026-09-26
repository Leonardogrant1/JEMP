// Exportiert den Übungskatalog als PDF (A4 quer), gruppiert nach Kategorie
// und darin nach Body Region. Datenquelle: exercises-JSON via REST (siehe
// Usage). Rendering: headless Chrome.
//
// Usage:
//   1. JSON ziehen (Service-Key nötig, URL ggf. auf lokal/prod anpassen):
//      curl -s "$SUPABASE_URL/rest/v1/exercises?select=name,slug,body_region,movement_pattern,min_level,max_level,intensity_score,laterality,measurement_type,description_i18n,category:categories(slug),exercise_blocks(block_types(slug)),exercise_equipments(equipments(slug)),exercise_environments(environments(slug))&order=name&limit=1000" \
//        -H "apikey: $KEY" -H "Authorization: Bearer $KEY" > /tmp/exercises.json
//   2. node scripts/export-exercise-catalog.mjs /tmp/exercises.json ~/Desktop/katalog.pdf

import { execFileSync } from 'child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const [jsonPath, outPath] = process.argv.slice(2)
if (!jsonPath || !outPath) {
  console.error('Usage: node scripts/export-exercise-catalog.mjs <exercises.json> <output.pdf>')
  process.exit(1)
}
const data = JSON.parse(readFileSync(jsonPath, 'utf8'))

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const joinSlugs = (arr, key) => (arr ?? []).map(x => x[key]?.slug).filter(Boolean).sort().join(', ') || '—'

// Kategorie → Body Region → Übungen
const byCategory = new Map()
for (const e of data) {
  const cat = e.category?.slug ?? 'ohne Kategorie'
  const region = e.body_region ?? 'ohne Region'
  if (!byCategory.has(cat)) byCategory.set(cat, new Map())
  const regions = byCategory.get(cat)
  if (!regions.has(region)) regions.set(region, [])
  regions.get(region).push(e)
}

let sections = ''
for (const cat of [...byCategory.keys()].sort()) {
  const regions = byCategory.get(cat)
  const total = [...regions.values()].reduce((n, list) => n + list.length, 0)
  let body = ''
  for (const region of [...regions.keys()].sort()) {
    const items = regions.get(region).sort((a, b) => a.name.localeCompare(b.name))
    body += `<tr class="region"><td colspan="8">${esc(region)} <span class="count">(${items.length})</span></td></tr>`
    body += items.map(e => `
      <tr>
        <td class="name">${esc(e.name)}<div class="desc">${esc(e.description_i18n?.de ?? e.description_i18n?.en ?? '')}</div></td>
        <td>${esc(e.movement_pattern ?? '—')}</td>
        <td>${joinSlugs(e.exercise_blocks, 'block_types')}</td>
        <td>${joinSlugs(e.exercise_equipments, 'equipments')}</td>
        <td>${joinSlugs(e.exercise_environments, 'environments')}</td>
        <td class="num">${e.min_level}–${e.max_level}</td>
        <td class="num">${e.intensity_score ?? '—'}</td>
        <td>${esc(e.laterality)}</td>
      </tr>`).join('')
  }
  sections += `
    <h2>${esc(cat)} <span class="count">(${total})</span></h2>
    <table>
      <thead><tr>
        <th style="width:30%">Übung</th><th>Pattern</th><th>Block-Typen</th>
        <th>Equipment</th><th>Environments</th><th>Level</th><th>Int.</th><th>Lateralität</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>`
}

const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
  @page { size: A4 landscape; margin: 12mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', sans-serif; font-size: 8.5px; color: #111; margin: 0; }
  h1 { font-size: 18px; margin: 0 0 2px; }
  .sub { color: #555; font-size: 10px; margin-bottom: 14px; }
  h2 { font-size: 13px; margin: 16px 0 6px; text-transform: capitalize; break-after: avoid; }
  .count { color: #888; font-weight: normal; font-size: 10px; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th { text-align: left; background: #f0f0f0; padding: 4px 5px; border-bottom: 1.5px solid #999; font-size: 8px; text-transform: uppercase; letter-spacing: .03em; }
  td { padding: 4px 5px; border-bottom: 0.5px solid #ddd; vertical-align: top; }
  tr { break-inside: avoid; }
  tr.region td { background: #fafafa; font-weight: 700; font-size: 9.5px; text-transform: capitalize; border-bottom: 1px solid #bbb; padding-top: 7px; }
  .name { font-weight: 600; }
  .desc { font-weight: 400; color: #555; font-size: 7.5px; margin-top: 1px; }
  .num { white-space: nowrap; }
</style></head><body>
  <h1>JEMP – Übungskatalog</h1>
  <div class="sub">Stand: ${today} · Production-Datenbank · ${data.length} Übungen · gruppiert nach Kategorie und Body Region · „Int." = Intensitäts-Score (1–10), „Level" = Nutzer-Level-Bereich (1–100)</div>
  ${sections}
</body></html>`

const htmlPath = join(mkdtempSync(join(tmpdir(), 'jemp-katalog-')), 'katalog.html')
writeFileSync(htmlPath, html)
execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${outPath}`, `file://${htmlPath}`],
  { stdio: 'ignore' })
console.log(`OK — ${data.length} Übungen → ${outPath}`)
