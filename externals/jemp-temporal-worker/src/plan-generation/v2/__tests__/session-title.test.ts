import { describe, it, expect } from 'vitest'
import { trainingSessionTitle } from '../session-title'
import { day } from './fixtures'

const b = (block_type: string, extra: any = {}) => ({ block_type, emphasis: 'normal', variant: null, ...extra })
const heavyLower = (pattern: string) => b('lower_strength', {
  emphasis: 'heavy', patterns: [{ pattern, emphasis: 'heavy' }, { pattern: pattern === 'hinge' ? 'knee_dominant' : 'hinge', emphasis: 'normal' }],
})
const heavyUpper = (heavyPattern: string) => b('upper_strength', {
  emphasis: 'heavy', patterns: [
    { pattern: heavyPattern, emphasis: 'heavy' },
    { pattern: heavyPattern.startsWith('push') ? 'pull_horizontal' : 'push_vertical', emphasis: 'normal' },
  ],
})

describe('trainingSessionTitle — Fokus statt Allgemeinplatz (QA 10.10.)', () => {
  it('Beintag mit Hüftzug-Lead', () => {
    const title = trainingSessionTitle([b('warmup'), b('plyo'), heavyLower('hinge'), b('upper_strength', { patterns: [{ pattern: 'pull_horizontal', emphasis: 'normal' }] }), b('cooldown')], day())
    expect(title).toBe('Beintag — Hüftzug')
  })
  it('Beintag mit Kniebeuge-Lead ≠ Beintag mit Hüftzug-Lead (keine Dubletten pro Woche)', () => {
    const knee = trainingSessionTitle([b('warmup'), heavyLower('knee_dominant'), b('cooldown')], day())
    expect(knee).toBe('Beintag — Kniebeuge')
    expect(knee).not.toBe(trainingSessionTitle([b('warmup'), heavyLower('hinge'), b('cooldown')], day()))
  })
  it('Oberkörper-Lead nennt die schwere Seite (Zug/Drücken)', () => {
    expect(trainingSessionTitle([b('warmup'), heavyUpper('pull_horizontal'), b('lower_strength', { patterns: [{ pattern: 'knee_dominant', emphasis: 'normal' }] }), b('cooldown')], day()))
      .toBe('Oberkörper — Zug')
    expect(trainingSessionTitle([b('warmup'), heavyUpper('push_vertical'), b('cooldown')], day()))
      .toBe('Oberkörper — Drücken')
  })
  it('Plyo-Lead führt: Explosiv-Tag mit Region', () => {
    expect(trainingSessionTitle([b('plyo', { emphasis: 'heavy', variant: 'lower' }), b('lower_strength')], day()))
      .toBe('Explosiv-Tag — Unterkörper')
    expect(trainingSessionTitle([b('plyo', { emphasis: 'heavy', variant: 'upper' }), b('upper_strength')], day()))
      .toBe('Explosiv-Tag — Oberkörper')
  })
  it('Doppel-heavy-Tag (§3.3): Kraft-Tag — alles schwer', () => {
    expect(trainingSessionTitle([b('warmup'), heavyLower('knee_dominant'), heavyUpper('pull_horizontal'), b('cooldown')], day()))
      .toBe('Kraft-Tag — alles schwer')
  })
  it('kein heavy Lead (gedämpfter Tag): Regions-Titel ohne Muster', () => {
    expect(trainingSessionTitle([b('warmup'), b('upper_strength', { patterns: [{ pattern: 'pull_horizontal', emphasis: 'normal' }] }), b('plyo'), b('cooldown')], day()))
      .toBe('Oberkörper-Tag')
  })
  it('Legacy-Blöcke (Alt-Pläne): heavy lower_body mit Variante', () => {
    expect(trainingSessionTitle([b('warmup'), b('lower_body', { emphasis: 'heavy', variant: 'knee_dominant' }), b('push'), b('cooldown')], day()))
      .toBe('Beintag — Kniebeuge')
  })
  it('nennt nie Sportart oder Tag-Nummer', () => {
    const title = trainingSessionTitle([b('warmup'), heavyLower('hinge'), b('cooldown')], day())
    expect(title).not.toMatch(/\d/)
    expect(title.toLowerCase()).not.toContain('kickbox')
  })
  it('Fallback Ganzkörper, wenn nur warmup/cooldown übrig', () => {
    expect(trainingSessionTitle([b('warmup'), b('cooldown')], day())).toBe('Ganzkörper')
  })
})
