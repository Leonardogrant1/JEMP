import { describe, it, expect } from 'vitest'
import { composeWeek } from '../composition'

// Characterization (Game-Protection-Umbau 31.10.): pinnt das Verhalten von
// composeWeek OHNE Spieltage vor dem Lead-Zuweisungs-Umbau. Diese Snapshots
// wurden gegen den Stand VOR dem Umbau erzeugt — bricht einer, hat sich das
// No-Game-Verhalten geändert (Regression laut Spec Punkt 3).

const trainingDay = (dow: number, minutes = 60, heavy = false): any => ({
  day_of_week: dow, session_type: 'training', minutes, dose: 'normal',
  carries_sprint_block: false, carries_conditioning_finisher: false, heavy_lower: heavy, suppress_micro_dose: false,
})

const serialize = (week: Map<number, any[]>) =>
  [...week.entries()].sort(([a], [b]) => a - b).map(([dow, blocks]) => ({ dow, blocks }))

const CASES: Array<{ name: string; input: Parameters<typeof composeWeek>[0] }> = [
  { name: '3 Tage, kein heavy_lower, keine Säulen', input: { trainingDays: [1, 3, 5].map((d) => trainingDay(d)), pillarLevels: {}, hasSpeedSession: false } },
  { name: '3 Tage, heavy_lower Tag 3, strength 3 medium', input: { trainingDays: [trainingDay(1), trainingDay(3, 60, true), trainingDay(5)], pillarLevels: { strength: 3 }, hasSpeedSession: false, loadProfile: 'medium' } },
  { name: 'Do/Sa/So, heavy_lower Sa (48h-Szenario)', input: { trainingDays: [trainingDay(4), trainingDay(6, 60, true), trainingDay(7)], pillarLevels: {}, hasSpeedSession: false } },
  { name: '5 Tage, heavy_lower Tag 3, Plyo-Säulen', input: { trainingDays: [trainingDay(1), trainingDay(2), trainingDay(3, 60, true), trainingDay(4), trainingDay(5)], pillarLevels: { lower_body_plyometrics: 3, upper_body_plyometrics: 2 }, hasSpeedSession: true } },
  { name: '2 Tage kompakt (40min), strength 2', input: { trainingDays: [trainingDay(1, 40), trainingDay(3, 40)], pillarLevels: { strength: 2 }, hasSpeedSession: false } },
  { name: '1 Tag', input: { trainingDays: [trainingDay(3)], pillarLevels: {}, hasSpeedSession: false } },
  { name: 'Mo/Di/So — Wochenrand-Nachbarschaft', input: { trainingDays: [trainingDay(1), trainingDay(2), trainingDay(7)], pillarLevels: {}, hasSpeedSession: false } },
]

describe('composeWeek Characterization (ohne Spieltage)', () => {
  for (const c of CASES) {
    it(c.name, () => {
      expect(serialize(composeWeek(c.input))).toMatchSnapshot()
    })
  }
})
