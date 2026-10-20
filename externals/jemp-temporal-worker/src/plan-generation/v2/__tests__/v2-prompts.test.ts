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

describe('Pattern-Blockzeilen (Spec 2026-10-10)', () => {
  const upperLead = {
    block_type: 'upper_strength', variant: null, emphasis: 'heavy',
    patterns: [
      { pattern: 'push_vertical', emphasis: 'heavy' },
      { pattern: 'pull_horizontal', emphasis: 'normal' },
    ],
  } as any
  it('upper_strength-Zeile nennt beide Patterns mit Dosis und Supersatz-Hinweis', () => {
    const p = prompt([upperLead])
    expect(p).toMatch(/upper_strength/)
    expect(p).toMatch(/vertikaler Push[\s\S]*4–5 Sätze|4–5 Sätze[\s\S]*vertikaler Push/)
    expect(p).toMatch(/horizontaler Pull[\s\S]*3 Sätze|3 Sätze[\s\S]*horizontaler Pull/)
    expect(p).toMatch(/Supersatz/)
  })
  it('lower_strength-Zeile nennt das Pattern mit Dosis', () => {
    const p = prompt([{ block_type: 'lower_strength', variant: null, emphasis: 'heavy', patterns: [{ pattern: 'hinge', emphasis: 'heavy' }] } as any])
    expect(p).toMatch(/hüft-dominant/)
    expect(p).toMatch(/4–5 Sätze/)
  })
  it('OBERKÖRPER-DECKEL feuert bei Upper-Plyo + Push-heavy im upper_strength', () => {
    const p = prompt([withEmphasis('plyo', 'light', 'upper'), upperLead])
    expect(p).toMatch(/OBERKÖRPER-DECKEL/)
  })
  it('kein Deckel bei Pull-heavy', () => {
    const pullHeavy = { ...upperLead, patterns: [
      { pattern: 'push_vertical', emphasis: 'normal' }, { pattern: 'pull_horizontal', emphasis: 'heavy' },
    ] }
    const p = prompt([withEmphasis('plyo', 'light', 'upper'), pullHeavy])
    expect(p).not.toMatch(/OBERKÖRPER-DECKEL/)
  })
})

describe('Sport-Präferenz-Zeile (QA 10.10.)', () => {

  const base = {
    workout: { day_of_week: 4, blocks: [{ block_type: 'warmup', variant: null, emphasis: 'normal' }] },
    day: { day_of_week: 4, minutes: 60, dose: 'normal', suppress_micro_dose: false, carries_sprint_block: false },
    poolLines: ['- `warmup`: hip_cars'],
    sprintPoolLine: null, userContext: '', weekSummary: '', previousSummaries: [],
  }
  it('nennt bevorzugte Übungen explizit', () => {
    const p = V2_SESSION_PROMPT({ ...base, preferredLine: 'landmine_punch_throw, rotational_med_ball_slam' } as any)
    expect(p).toContain('SPORT-PRÄFERENZ')
    expect(p).toContain('landmine_punch_throw')
  })
  it('ohne Präferenzen keine Zeile', () => {
    expect(V2_SESSION_PROMPT({ ...base, preferredLine: null } as any)).not.toContain('SPORT-PRÄFERENZ')
  })
})

import { buildPlaneFocusLines } from '../run-session-v2'

describe('EBENEN-FOKUS-Zeile (Spec 2026-10-11 §4.3)', () => {
  const base = {
    workout: { day_of_week: 4, blocks: [{ block_type: 'warmup', variant: null, emphasis: 'normal' }] },
    day: { day_of_week: 4, minutes: 60, dose: 'normal', suppress_micro_dose: false, carries_sprint_block: false },
    poolLines: ['- `warmup`: hip_cars'],
    sprintPoolLine: null, userContext: '', weekSummary: '', previousSummaries: [],
  }
  it('rendert übergebene EBENEN-FOKUS-Zeilen', () => {
    const p = V2_SESSION_PROMPT({ ...base, planeFocusLines: [
      'EBENEN-FOKUS: Wähle für knee_dominant heute eine dieser Übungen als Sekundärmuster-Übung — rotierende Kraft gehört zum Sport des Athleten: kb_split_squat_rotation',
    ] } as any)
    expect(p).toContain('EBENEN-FOKUS')
    expect(p).toContain('kb_split_squat_rotation')
  })
  it('ohne planeFocusLines keine Zeile', () => {
    expect(V2_SESSION_PROMPT({ ...base } as any)).not.toContain('EBENEN-FOKUS')
    expect(V2_SESSION_PROMPT({ ...base, planeFocusLines: [] } as any)).not.toContain('EBENEN-FOKUS')
  })
})

describe('buildPlaneFocusLines (Spec §4.3 — Formulierung je Ebene)', () => {
  it('frontal → „laterale", transverse → „rotierende"; nur Einträge mit planeSlugs', () => {
    const lines = buildPlaneFocusLines([
      { block_type: 'lower_strength', pattern: 'knee_dominant', emphasis: 'normal', slugs: [], planeFocus: 'frontal', planeSlugs: ['lateral_lunge'] },
      { block_type: 'upper_strength', pattern: 'push_vertical', emphasis: 'normal', slugs: [], planeFocus: 'transverse', planeSlugs: ['split_stance_landmine_press'] },
      { block_type: 'lower_strength', pattern: 'hinge', emphasis: 'heavy', slugs: [] },
    ] as any)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('laterale')
    expect(lines[0]).toContain('lateral_lunge')
    expect(lines[1]).toContain('rotierende')
    expect(lines[1]).toContain('push_vertical')
  })
})

describe('Warmup-/Cooldown-Umfang im Prompt (QA 11.10., v1-Parität)', () => {
  it('volle Session: 4–6 Übungen Warmup, 3–5 Cooldown', () => {
    const p = prompt([withEmphasis('lower_body', 'heavy', 'knee_dominant')])
    expect(p).toMatch(/Warmup: 4–6 Übungen/)
    expect(p).toMatch(/Cooldown: 3–5 Übungen/)
  })
  it('Kompakt-Session: je 2–3 Übungen', () => {
    const p = prompt([withEmphasis('lower_body', 'heavy', 'knee_dominant')], day({ session_type: 'training', minutes: 40 }))
    expect(p).toMatch(/je 2–3 Übungen/)
    expect(p).not.toMatch(/4–6 Übungen/)
  })
})
