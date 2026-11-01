import { test } from 'node:test'
import assert from 'node:assert/strict'
import type OpenAI from 'openai'
import { extractInjuryConstraints } from './extract'

// Die 16 echten Slugs aus contraindication_tags (Migrationen 20261101120000 +
// 20261101130000) — in extract.ts selbst NIE hardcoded (DB ist Quelle der
// Wahrheit), hier nur als Test-Fixture.
const VALID_SLUGS = [
  'deep_knee_flexion_loaded', 'jumping_landing', 'sprinting_max_velocity',
  'hamstring_high_speed_load', 'overhead_pressing', 'shoulder_end_range',
  'wrist_extension_loaded', 'spinal_flexion_loaded', 'spinal_compression_heavy',
  'hip_flexion_loaded_deep', 'adductor_loaded_stretch', 'ankle_lateral_stress',
  'ankle_plantar_load_explosive', 'elbow_extension_loaded', 'spinal_rotation_loaded',
  'grip_pulling_loaded',
]

// Mock-OpenAI-Client: liefert den injizierten Content als
// chat.completions.create-Response, zählt Aufrufe (für den "nie aufgerufen"-
// Check bei leerer Notiz) und zeichnet die options (2. Argument) auf — damit
// lässt sich prüfen, dass ein übergebenes AbortSignal auch tatsächlich an den
// OpenAI-Call durchgereicht wird (Review Fix 2).
function mockOpenAI(content: string): { client: OpenAI; calls: number[]; optionsSeen: unknown[] } {
  const calls: number[] = []
  const optionsSeen: unknown[] = []
  const client = {
    chat: {
      completions: {
        create: async (_params: unknown, options?: unknown) => {
          calls.push(1)
          optionsSeen.push(options)
          return { choices: [{ message: { content } }] }
        },
      },
    },
  } as unknown as OpenAI
  return { client, calls, optionsSeen }
}

test('maps forearm strain note to grip/wrist tags', async () => {
  const modelResponse = JSON.stringify({
    constraints: [
      { tag_slug: 'grip_pulling_loaded', mode: 'block', acute: true, reason: 'Unterarmzerrung, akut' },
      { tag_slug: 'wrist_extension_loaded', mode: 'block', acute: true, reason: 'Handgelenk mitbetroffen' },
    ],
    unmapped: [],
    scheduling: [],
    noise: [],
  })
  const { client } = mockOpenAI(modelResponse)
  const result = await extractInjuryConstraints('Unterarmzerrung links, akut, Reha läuft', VALID_SLUGS, client)

  assert.equal(result.constraints.length, 2)
  const slugs = result.constraints.map((c) => c.tag_slug).sort()
  assert.deepEqual(slugs, ['grip_pulling_loaded', 'wrist_extension_loaded'])
  for (const c of result.constraints) {
    assert.equal(c.mode, 'block')
    assert.equal(c.acute, true)
  }
})

test('drops unknown tag_slug from model output', async () => {
  const modelResponse = JSON.stringify({
    constraints: [
      { tag_slug: 'grip_pulling_loaded', mode: 'block', acute: false, reason: 'Griff belastet' },
      { tag_slug: 'fantasy_tag', mode: 'block', acute: false, reason: 'sollte verworfen werden' },
    ],
    unmapped: [],
    scheduling: [],
    noise: [],
  })
  const { client } = mockOpenAI(modelResponse)
  const result = await extractInjuryConstraints('Griffproblem', VALID_SLUGS, client)

  assert.equal(result.constraints.length, 1)
  assert.equal(result.constraints[0].tag_slug, 'grip_pulling_loaded')
})

test('classifies scheduling-only note', async () => {
  const modelResponse = JSON.stringify({
    constraints: [],
    unmapped: [],
    scheduling: ['Dienstag Basketball'],
    noise: [],
  })
  const { client } = mockOpenAI(modelResponse)
  const result = await extractInjuryConstraints('Dienstag Basketball', VALID_SLUGS, client)

  assert.deepEqual(result.constraints, [])
  assert.deepEqual(result.scheduling, ['Dienstag Basketball'])
})

test('throws on malformed model JSON', async () => {
  const { client } = mockOpenAI('{ this is not valid json')
  await assert.rejects(() => extractInjuryConstraints('irgendeine Notiz', VALID_SLUGS, client))
})

test('empty note returns empty result without API call', async () => {
  const { client, calls } = mockOpenAI('{}')
  const result = await extractInjuryConstraints('', VALID_SLUGS, client)

  assert.deepEqual(result, { constraints: [], unmapped: [], scheduling: [], noise: [] })
  assert.equal(calls.length, 0)
})

test('passes the given AbortSignal through to the OpenAI call (Review Fix 2)', async () => {
  const modelResponse = JSON.stringify({ constraints: [], unmapped: [], scheduling: [], noise: [] })
  const { client, optionsSeen } = mockOpenAI(modelResponse)
  const controller = new AbortController()

  await extractInjuryConstraints('Knie-Schmerzen', VALID_SLUGS, client, controller.signal)

  assert.equal(optionsSeen.length, 1)
  assert.equal((optionsSeen[0] as { signal?: AbortSignal }).signal, controller.signal)
})
