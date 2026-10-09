import { describe, it, expect } from 'vitest'
import { V2_SESSION_PROMPT } from '../v2-prompts'
import { block, day } from './fixtures'

const prompt = (blocks: any[], d: any = day({ session_type: 'training', minutes: 60 })) =>
  V2_SESSION_PROMPT({
    workout: { day_of_week: d.day_of_week, blocks, dropped: [], estimated_minutes: 50 } as any,
    day: d,
    poolLines: ['- `push`: bench_press'],
    sprintPoolLine: null,
    userContext: 'sport: boxing',
    weekSummary: '-',
    previousSummaries: [],
  })

const withEmphasis = (bt: string, emphasis: string, variant: string | null = null) =>
  ({ ...block(bt, variant), emphasis })

describe('V2_SESSION_PROMPT Hierarchie (§1.3/§3.1)', () => {
  it('heavy-Primary bekommt 4–5 Sätze, normal 3, light 2', () => {
    const p = prompt([
      withEmphasis('lower_body', 'heavy', 'knee_dominant'),
      withEmphasis('push', 'normal', 'push_vertical'),
      withEmphasis('core', 'light'),
    ])
    expect(p).toMatch(/4–5 Sätze/)
    expect(p).toMatch(/3 Sätze/)
    expect(p).toMatch(/2 Sätze/)
  })

  it('plyo-Varianten haben lesbare Labels', () => {
    const p = prompt([withEmphasis('plyo', 'light', 'lower'), withEmphasis('plyo', 'light', 'upper')])
    expect(p).toMatch(/Unterkörper/)
    expect(p).toMatch(/Oberkörper/)
  })

  it('Deckel (§1.6.1): plyo upper + push in derselben Session → max 3×3 + Intensitätsgrenze', () => {
    const p = prompt([
      withEmphasis('plyo', 'light', 'upper'),
      withEmphasis('push', 'normal', 'push_horizontal'),
    ])
    expect(p).toMatch(/3×3|3 × 3/)
    expect(p).toMatch(/85\s?%/)
  })

  it('kein Deckel ohne Kollision', () => {
    const p = prompt([
      withEmphasis('plyo', 'light', 'lower'),
      withEmphasis('push', 'heavy', 'push_horizontal'),
    ])
    expect(p).not.toMatch(/85\s?%/)
  })
})

describe('plyo-light Prompt (Review-Fix #5: kein "submaximal" am PAP-Tag)', () => {
  it('plyo mit emphasis light bekommt explosive Qualitäts-Anweisung statt "submaximal"', () => {
    const p = prompt([withEmphasis('plyo', 'light', 'lower'), withEmphasis('lower_body', 'heavy', 'knee_dominant')])
    const plyoLine = p.split('\n').find((l) => l.includes('`plyo`'))!
    expect(plyoLine).not.toMatch(/submaximal/)
    expect(plyoLine).toMatch(/explosiv/i)
    expect(plyoLine).toMatch(/volle Pausen/)
  })
})
