import { describe, it, expect } from 'vitest'
import { trainingSessionTitle } from '../session-title'
import { block, day } from './fixtures'

const blocks = (...types: string[]) => types.map((t) => block(t))

describe('trainingSessionTitle', () => {
  it('nennt nur den Trainingsinhalt — nie Sportart oder Tag-Nummer', () => {
    const title = trainingSessionTitle(blocks('warmup', 'push', 'pull', 'lower_body', 'plyo', 'cooldown'), day())
    expect(title).not.toMatch(/tag|day|\d/i)
    expect(title.toLowerCase()).not.toContain('kickbox')
  })

  it('kombiniert die zwei dominanten Themen', () => {
    expect(trainingSessionTitle(blocks('warmup', 'push', 'pull', 'lower_body', 'plyo', 'cooldown'), day()))
      .toBe('Kraft & Explosivität')
  })

  it('reine Kraft-Session: nur ein Thema', () => {
    expect(trainingSessionTitle(blocks('warmup', 'push', 'pull', 'lower_body', 'cooldown'), day()))
      .toBe('Kraft')
  })

  it('Rumpf-Thema aus rotation oder core', () => {
    expect(trainingSessionTitle(blocks('warmup', 'lower_body', 'rotation', 'core', 'cooldown'), day()))
      .toBe('Kraft & Rumpf')
  })

  it('Conditioning-Finisher taucht als Thema auf', () => {
    expect(trainingSessionTitle(blocks('warmup', 'push', 'lower_body', 'cooldown'), day({ carries_conditioning_finisher: true })))
      .toBe('Kraft & Kondition')
  })

  it('Fallback Ganzkörper, wenn nur warmup/cooldown übrig', () => {
    expect(trainingSessionTitle(blocks('warmup', 'cooldown'), day())).toBe('Ganzkörper')
  })
})
