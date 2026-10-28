// Push-Notification-Kampagne über den Expo Push Service (dependency-frei).
//
// Zieht Empfänger aus user_profiles (push_token not null) des Ziel-Envs,
// sendet in 100er-Chunks (gedrosselt unter dem 600/s-Limit) und schreibt
// die Tickets nach .push-campaigns/ für den Receipt-Check.
//
// Zwei Phasen (Expo empfiehlt Receipts ~15 Min nach Versand zu prüfen):
//   1. Senden:   node scripts/push-campaign.mjs <staging|prod> \
//                  --title "..." --body "..." \
//                  [--data '{"route":"/plan"}'] [--lang de] \
//                  [--where "last_active_at > now() - interval '30 days'"] \
//                  [--at "16:00" | --at "2026-10-24 16:00"] [--dry-run]
//      --at = deutsche Zeit (Europe/Berlin); Bestätigung kommt sofort, gesendet
//      wird zum Zielzeitpunkt (Empfänger werden dann frisch gezogen). Der
//      Prozess muss durchlaufen — Mac wachhalten: caffeinate -i node scripts/…
//   2. Receipts: node scripts/push-campaign.mjs <staging|prod> --receipts <tickets-datei>
//      → prüft Zustellung, setzt push_token bei DeviceNotRegistered auf NULL
//
// Safety: --dry-run zeigt nur Empfängerzahl + Preview. Echter Versand:
// staging y/N, prod nur nach getipptem 'prod'. Tote Tokens werden auch
// schon aus den Sende-Tickets bereinigt (DeviceNotRegistered).
//
// Beispiele:
//   node scripts/push-campaign.mjs prod --title "JEMP 3.0 ist da" \
//     --body "Dein Training kennt deine Sportart jetzt noch besser." --dry-run
//   node scripts/push-campaign.mjs prod --receipts .push-campaigns/tickets-2026-10-23T10-00-00.json

import { execFileSync } from 'child_process'
import { createInterface } from 'readline'
import { mkdirSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'

const TARGETS = { staging: 'thagwhvfqybuoghpriyb', prod: 'laciueqbsljlmzqcdtpr' }
const PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts'
const SEND_CHUNK = 100      // API-Limit pro Request
const RECEIPT_CHUNK = 1000  // API-Limit pro Receipt-Request
const CHUNK_PAUSE_MS = 250  // 100er-Chunks alle 250ms ≈ 400/s < 600/s-Limit
const OUT_DIR = '.push-campaigns'

// ── Args ─────────────────────────────────────────────────────────────────────
const [envArg, ...rest] = process.argv.slice(2)
if (!TARGETS[envArg]) usage()
const flags = {}
for (let i = 0; i < rest.length; i++) {
  const a = rest[i]
  if (a === '--dry-run') flags.dryRun = true
  else if (['--title', '--body', '--data', '--lang', '--where', '--receipts', '--at'].includes(a)) {
    flags[a.slice(2)] = rest[++i]
  } else usage(`Unbekanntes Argument: ${a}`)
}
if (!flags.receipts && (!flags.title || !flags.body)) usage('--title und --body sind Pflicht (außer bei --receipts)')
let dataPayload = undefined
if (flags.data) {
  try { dataPayload = JSON.parse(flags.data) } catch { usage('--data muss valides JSON sein') }
}

function usage(msg) {
  if (msg) console.error(`Fehler: ${msg}\n`)
  console.error(`Usage:
  node scripts/push-campaign.mjs <staging|prod> --title "..." --body "..." [--data '{...}'] [--lang de] [--where "SQL"] [--at "16:00"] [--dry-run]
  node scripts/push-campaign.mjs <staging|prod> --receipts <tickets-datei>`)
  process.exit(1)
}

// "16:00" oder "2026-10-24 16:00" in deutscher Zeit → UTC-Timestamp.
// Trick: als UTC parsen und um den Berlin-Offset zum Zielzeitpunkt korrigieren
// (zweiter Durchlauf fängt DST-Wechsel zwischen Schätzung und Ziel ab).
function parseBerlinTime(spec) {
  const berlinOffsetMin = (ts) => {
    const part = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Berlin', timeZoneName: 'longOffset' })
      .formatToParts(ts).find((p) => p.type === 'timeZoneName').value // z. B. "GMT+02:00"
    const m = part.match(/GMT([+-])(\d{2}):(\d{2})/)
    return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0
  }
  const todayBerlin = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(Date.now()) // YYYY-MM-DD
  let dateStr = spec.trim()
  if (/^\d{1,2}:\d{2}$/.test(dateStr)) dateStr = `${todayBerlin} ${dateStr.padStart(5, '0')}`
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(dateStr)) usage(`--at: "HH:mm" oder "YYYY-MM-DD HH:mm" erwartet, bekommen: "${spec}"`)
  const naive = Date.parse(dateStr.replace(' ', 'T') + ':00Z')
  let ts = naive - berlinOffsetMin(naive) * 60000
  ts = naive - berlinOffsetMin(ts) * 60000
  if (/^\d{1,2}:\d{2}$/.test(spec.trim()) && ts <= Date.now()) ts += 24 * 3600 * 1000 // "16:00" schon vorbei → morgen
  return ts
}

// ── Supabase Management API (gleiches Muster wie push-exercises.mjs) ─────────
const TARGET = TARGETS[envArg]
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

const sqlLit = (s) => `'${String(s).replace(/'/g, "''")}'`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const isExpoToken = (t) => /^Expo(nent)?PushToken\[.+\]$/.test(t ?? '')
const mask = (t) => t.replace(/\[(.{4}).+(.{4})\]/, '[$1…$2]')

async function confirm() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const ask = (q) => new Promise((res) => rl.question(q, res))
  const answer = envArg === 'prod'
    ? await ask(`Du sendest an PRODUCTION-User. Tippe 'prod' zum Fortfahren: `)
    : await ask(`Senden an staging? y/N: `)
  rl.close()
  const ok = envArg === 'prod' ? answer === 'prod' : answer.toLowerCase() === 'y'
  if (!ok) { console.log('Abgebrochen.'); process.exit(0) }
}

// Tote Tokens (App deinstalliert) aus user_profiles entfernen
async function cleanupTokens(tokens, reason) {
  if (!tokens.length) return
  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500)
    await targetQuery(
      `update user_profiles set push_token = null where push_token in (${chunk.map(sqlLit).join(',')})`
    )
  }
  console.log(`  ${tokens.length} tote Tokens bereinigt (${reason})`)
}

// ── Phase 2: Receipts prüfen ─────────────────────────────────────────────────
if (flags.receipts) {
  const file = JSON.parse(readFileSync(flags.receipts, 'utf8'))
  if (file.env !== envArg) {
    console.error(`Tickets-Datei ist von '${file.env}', aufgerufen mit '${envArg}'. Abbruch.`)
    process.exit(1)
  }
  const withId = file.tickets.filter((t) => t.id)
  console.log(`Prüfe ${withId.length} Receipts (gesendet ${file.sentAt}, "${file.message.title}")`)

  const counts = {}
  const dead = []
  for (let i = 0; i < withId.length; i += RECEIPT_CHUNK) {
    const chunk = withId.slice(i, i + RECEIPT_CHUNK)
    const res = await fetch(RECEIPTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: chunk.map((t) => t.id) }),
    })
    if (!res.ok) throw new Error(`getReceipts: HTTP ${res.status} ${await res.text()}`)
    const { data = {}, errors } = await res.json()
    if (errors?.length) throw new Error(`getReceipts: ${JSON.stringify(errors)}`)
    for (const t of chunk) {
      const r = data[t.id]
      const key = !r ? 'pending' : r.status === 'ok' ? 'ok' : (r.details?.error ?? 'error')
      counts[key] = (counts[key] ?? 0) + 1
      if (r?.details?.error === 'DeviceNotRegistered') dead.push(t.token)
      else if (r?.status === 'error' && r.details?.error !== 'DeviceNotRegistered') {
        console.log(`  ${mask(t.token)}: ${r.details?.error ?? ''} ${r.message ?? ''}`)
      }
    }
  }
  console.log('Receipts:', JSON.stringify(counts))
  if (counts.pending) console.log(`  ${counts.pending} noch pending — später erneut prüfen (Receipts verfallen nach ~24h!)`)
  await cleanupTokens(dead, 'Receipt DeviceNotRegistered')
  console.log('Fertig ✓')
  process.exit(0)
}

// ── Phase 1: Empfänger ziehen + senden ───────────────────────────────────────
const conditions = ['push_token is not null']
if (flags.lang) conditions.push(`preferred_language = ${sqlLit(flags.lang)}`)
if (flags.where) conditions.push(`(${flags.where})`)

async function fetchTokens() {
  const rows = await targetQuery(`select push_token from user_profiles where ${conditions.join(' and ')}`)
  const tokens = [...new Set(rows.map((r) => r.push_token).filter(isExpoToken))]
  return { tokens, invalid: rows.length - tokens.length }
}

const sendAt = flags.at ? parseBerlinTime(flags.at) : null
if (sendAt && sendAt <= Date.now()) usage(`--at "${flags.at}" liegt in der Vergangenheit`)

let { tokens, invalid } = await fetchTokens()

console.log(`\nKampagne → ${envArg.toUpperCase()} (${TARGET})`)
console.log(`  Segment:   ${conditions.join(' AND ')}`)
console.log(`  Empfänger: ${tokens.length} eindeutige Tokens${invalid ? ` (${invalid} ungültige/doppelte übersprungen)` : ''}`)
console.log(`  Titel:     ${flags.title}`)
console.log(`  Body:      ${flags.body}`)
if (dataPayload) console.log(`  Data:      ${JSON.stringify(dataPayload)}`)
if (sendAt) console.log(`  Versand:   ${new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'medium', timeStyle: 'short' }).format(sendAt)} deutsche Zeit`)
console.log(`  Beispiele: ${tokens.slice(0, 3).map(mask).join(', ')}\n`)

if (!tokens.length && !sendAt) { console.log('Keine Empfänger — nichts zu tun.'); process.exit(0) }
if (flags.dryRun) { console.log('Dry-Run — nichts gesendet.'); process.exit(0) }
await confirm()

if (sendAt) {
  console.log(`Warte bis zum Versandzeitpunkt… (Prozess offen lassen, Mac ggf. mit caffeinate wachhalten)`)
  while (Date.now() < sendAt) await sleep(Math.min(60000, sendAt - Date.now()))
  // Empfänger zum Versandzeitpunkt frisch ziehen (Segment kann sich geändert haben)
  const fresh = await fetchTokens()
  if (fresh.tokens.length !== tokens.length) {
    console.log(`Empfänger aktualisiert: ${tokens.length} → ${fresh.tokens.length}`)
  }
  tokens = fresh.tokens
  if (!tokens.length) { console.log('Keine Empfänger — nichts zu tun.'); process.exit(0) }
}

const tickets = [] // { token, id? , status, error? } in Sende-Reihenfolge
for (let i = 0; i < tokens.length; i += SEND_CHUNK) {
  const chunk = tokens.slice(i, i + SEND_CHUNK)
  const messages = chunk.map((to) => ({
    to,
    title: flags.title,
    body: flags.body,
    sound: 'default',
    ...(dataPayload ? { data: dataPayload } : {}),
  }))

  let res, body
  for (let attempt = 1; ; attempt++) {
    res = await fetch(PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    })
    if (res.ok) { body = await res.json(); break }
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      const wait = 1000 * 2 ** attempt
      console.log(`  HTTP ${res.status} — Retry in ${wait / 1000}s (${attempt}/3)`)
      await sleep(wait)
      continue
    }
    throw new Error(`push/send: HTTP ${res.status} ${await res.text()}`)
  }
  if (body.errors?.length) throw new Error(`push/send: ${JSON.stringify(body.errors)}`)

  body.data.forEach((ticket, j) => {
    tickets.push({
      token: chunk[j],
      status: ticket.status,
      ...(ticket.id ? { id: ticket.id } : {}),
      ...(ticket.details?.error ? { error: ticket.details.error } : {}),
    })
  })
  process.stdout.write(`  ${Math.min(i + SEND_CHUNK, tokens.length)}/${tokens.length}\r`)
  if (i + SEND_CHUNK < tokens.length) await sleep(CHUNK_PAUSE_MS)
}

const okCount = tickets.filter((t) => t.status === 'ok').length
const errTickets = tickets.filter((t) => t.status !== 'ok')
console.log(`\nGesendet: ${okCount} ok, ${errTickets.length} Fehler-Tickets`)
for (const t of errTickets.filter((t) => t.error !== 'DeviceNotRegistered').slice(0, 10)) {
  console.log(`  ${mask(t.token)}: ${t.error ?? t.status}`)
}
await cleanupTokens(errTickets.filter((t) => t.error === 'DeviceNotRegistered').map((t) => t.token), 'Ticket DeviceNotRegistered')

mkdirSync(OUT_DIR, { recursive: true })
const outFile = join(OUT_DIR, `tickets-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`)
writeFileSync(outFile, JSON.stringify({
  env: envArg,
  sentAt: new Date().toISOString(),
  message: { title: flags.title, body: flags.body, data: dataPayload ?? null, segment: conditions.join(' AND ') },
  tickets,
}, null, 2))
console.log(`\nTickets → ${outFile}`)
console.log(`Receipt-Check in ~15 Min:\n  node scripts/push-campaign.mjs ${envArg} --receipts ${outFile}`)
