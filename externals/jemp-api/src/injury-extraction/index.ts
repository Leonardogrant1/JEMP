// POST /api/injury-extraction — übersetzt eine Freitext-Verletzungsnotiz via
// gpt-5-mini in Kontraindikations-Tag-Vorschläge (Task 1, Plan B Intake).
// Dünner Handler: Auth (Muster src/index.ts:44-56) + Live-Fetch der gültigen
// Slugs (contraindication_tags, must()-Muster aus swap-route/index.ts:24-27,
// fail-closed) + Delegation an die reine Logik in extract.ts.
import type { Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import { extractInjuryConstraints } from './extract'

const EXTRACTION_TIMEOUT_MS = 12_000

// must()-Muster (kopiert aus swap-route/index.ts:24-27): ungeprüfte Supabase-
// Fehler dürfen nie wie "keine Tags" aussehen (fail-closed, wirft statt `?? []`).
function must<T>(r: { data: T | null; error: { message: string } | null }, what: string): T {
  if (r.error) throw new Error(`${what}: ${r.error.message}`)
  return r.data as T
}

// extractInjuryConstraints hat kein signal-Argument (Brief-Signatur ist fix,
// 3 Parameter) — der Server-Timeout läuft deshalb hier als Race gegen
// AbortSignal.timeout statt als Fetch-Abort im OpenAI-Call.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const signal = AbortSignal.timeout(ms)
    signal.addEventListener('abort', () => reject(new Error('injury-extraction: timeout')))
    promise.then(resolve, reject)
  })
}

export async function injuryExtractionHandler(req: Request, res: Response): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) { res.status(401).json({ error: 'Unauthorized' }); return }

  const note = (req.body as { note?: unknown } | undefined)?.note
  if (typeof note !== 'string') { res.status(400).json({ error: 'note must be a string' }); return }

  try {
    const tagsRes = await supabase.from('contraindication_tags').select('slug')
    const tagRows = must(tagsRes, 'contraindication_tags')
    const validSlugs = (tagRows ?? []).map((r) => r.slug as string)

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
    const result = await withTimeout(extractInjuryConstraints(note, validSlugs, openai), EXTRACTION_TIMEOUT_MS)

    res.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('injury-extraction: failed', message)
    res.status(502).json({ error: 'Extraction failed' })
  }
}
