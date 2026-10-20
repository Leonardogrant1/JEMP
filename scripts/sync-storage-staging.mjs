// Storage-Sync Prod→Staging: kopiert alle Buckets + Objekte (Thumbnails, Videos,
// Banner, Assets). Prod wird NUR gelesen, Ziel ist hart verdrahtet Staging.
// Idempotent: Dateien, die auf Staging schon mit gleicher Größe existieren,
// werden übersprungen; fehlende Buckets werden mit Prod-Config angelegt.
//
// Voraussetzungen: eingeloggte Supabase-CLI (Service-Keys + Keychain-Token).
//
// Usage: node scripts/sync-storage-staging.mjs

import { execFileSync } from 'child_process'

const PROD = 'laciueqbsljlmzqcdtpr'
const STAGING = 'thagwhvfqybuoghpriyb'
if (STAGING === PROD) throw new Error('target darf nie prod sein')

const accessToken = Buffer.from(
  execFileSync('security', ['find-generic-password', '-s', 'Supabase CLI', '-w'], { encoding: 'utf8' })
    .trim().replace(/^go-keyring-base64:/, ''), 'base64').toString('utf8')

const serviceKey = (ref) => {
  const keys = JSON.parse(execFileSync('npx', ['-y', 'supabase', 'projects', 'api-keys', '--project-ref', ref, '-o', 'json'], { encoding: 'utf8' }))
  const k = keys.find(k => k.name === 'service_role')?.api_key
  if (!k) throw new Error(`service_role-Key fehlt für ${ref} — supabase login?`)
  return k
}

async function query(ref, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) throw new Error(`query@${ref}: HTTP ${res.status} ${await res.text()}`)
  return res.json()
}

const prodKey = serviceKey(PROD)
const stagKey = serviceKey(STAGING)

// 1. Buckets angleichen (Config von Prod)
const prodBuckets = await query(PROD, `select id, public, file_size_limit, allowed_mime_types from storage.buckets`)
const stagBucketIds = new Set((await query(STAGING, `select id from storage.buckets`)).map(b => b.id))
for (const b of prodBuckets) {
  if (stagBucketIds.has(b.id)) continue
  const res = await fetch(`https://${STAGING}.supabase.co/storage/v1/bucket`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${stagKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: b.id, name: b.id, public: b.public, file_size_limit: b.file_size_limit, allowed_mime_types: b.allowed_mime_types }),
  })
  if (!res.ok) throw new Error(`bucket create ${b.id}: HTTP ${res.status} ${await res.text()}`)
  console.log(`Bucket angelegt: ${b.id} (public=${b.public})`)
}

// 2. Objektlisten vergleichen (voll qualifizierte Namen aus storage.objects)
const objSql = `select bucket_id, name, (metadata->>'size')::bigint as size, metadata->>'mimetype' as mimetype from storage.objects order by bucket_id, name`
const prodObjs = await query(PROD, objSql)
const stagObjs = await query(STAGING, objSql)
const stagByKey = new Map(stagObjs.map(o => [`${o.bucket_id}/${o.name}`, o.size]))

const todo = prodObjs.filter(o => stagByKey.get(`${o.bucket_id}/${o.name}`) !== o.size)
const totalMb = (todo.reduce((s, o) => s + (o.size ?? 0), 0) / 1024 / 1024).toFixed(0)
console.log(`Prod: ${prodObjs.length} Objekte | Staging hat: ${stagObjs.length} | zu kopieren: ${todo.length} (${totalMb} MB)`)

// 3. Kopieren mit begrenzter Parallelität
let done = 0, failed = []
async function copy(o) {
  const path = `${o.bucket_id}/${encodeURIComponent(o.name).replace(/%2F/g, '/')}`
  const dl = await fetch(`https://${PROD}.supabase.co/storage/v1/object/${path}`, {
    headers: { Authorization: `Bearer ${prodKey}` },
  })
  if (!dl.ok) throw new Error(`download ${path}: HTTP ${dl.status}`)
  const body = Buffer.from(await dl.arrayBuffer())
  const up = await fetch(`https://${STAGING}.supabase.co/storage/v1/object/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${stagKey}`, 'Content-Type': o.mimetype ?? 'application/octet-stream', 'x-upsert': 'true' },
    body,
  })
  if (!up.ok) throw new Error(`upload ${path}: HTTP ${up.status} ${await up.text()}`)
}

const CONCURRENCY = 6
const queue = [...todo]
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  for (let o; (o = queue.shift()); ) {
    try {
      await copy(o)
      done++
      if (done % 25 === 0 || done === todo.length) console.log(`  ${done}/${todo.length}…`)
    } catch (e) {
      failed.push(`${o.bucket_id}/${o.name}: ${e.message}`)
    }
  }
}))

// 4. Verifikation
const [after] = await query(STAGING, `select count(*)::int as n, pg_size_pretty(sum((metadata->>'size')::bigint)) as total from storage.objects`)
console.log(`Staging nach Sync: ${after.n} Objekte (${after.total})`)
if (failed.length) {
  console.error(`FEHLGESCHLAGEN (${failed.length}):\n  ${failed.join('\n  ')}`)
  process.exit(1)
}
console.log('Storage-Sync fertig ✓')
