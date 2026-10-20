import { describe, expect, it } from 'vitest'
import { attachPatternAssignment } from '../run-session-v2'

const reqs = [
  { block_type: 'upper_strength', pattern: 'push_horizontal', emphasis: 'heavy' as const, slugs: new Set(['bench_press']) },
  { block_type: 'upper_strength', pattern: 'pull_horizontal', emphasis: 'normal' as const, slugs: new Set(['barbell_row']) },
]

describe('attachPatternAssignment', () => {
  it('weist jeder Kraft-Übung ihr Pattern + Emphasis aus den Reqs zu', () => {
    const blocks = [{ block_type: 'upper_strength', exercises: [
      { exercise_slug: 'bench_press' }, { exercise_slug: 'barbell_row' },
    ] }]
    attachPatternAssignment(blocks as any, reqs)
    expect((blocks[0].exercises[0] as any).assigned_pattern).toBe('push_horizontal')
    expect((blocks[0].exercises[0] as any).pattern_emphasis).toBe('heavy')
    expect((blocks[0].exercises[1] as any).assigned_pattern).toBe('pull_horizontal')
    expect((blocks[0].exercises[1] as any).pattern_emphasis).toBe('normal')
  })
  it('Mehrdeutige (ungetaggte) Übung geht ans noch unbedeckte Pattern, nicht an den First-Match (Review 20.10.)', () => {
    // untagged_press steht via Coarse-Fallback in BEIDEN Push-Fenstern;
    // bench_press deckt push_horizontal eindeutig → untagged_press muss
    // push_vertical bekommen, obwohl push_horizontal zuerst in reqs steht.
    const twoPush = [
      { block_type: 'upper_strength', pattern: 'push_horizontal', emphasis: 'normal' as const, slugs: new Set(['bench_press', 'untagged_press']) },
      { block_type: 'upper_strength', pattern: 'push_vertical', emphasis: 'normal' as const, slugs: new Set(['untagged_press']) },
    ]
    const blocks = [{ block_type: 'upper_strength', exercises: [
      { exercise_slug: 'untagged_press' }, { exercise_slug: 'bench_press' },
    ] }]
    attachPatternAssignment(blocks as any, twoPush)
    expect((blocks[0].exercises[1] as any).assigned_pattern).toBe('push_horizontal')
    expect((blocks[0].exercises[0] as any).assigned_pattern).toBe('push_vertical')
  })
  it('lässt Nicht-Kraftblöcke und unbekannte Slugs unberührt (null-Fall)', () => {
    const blocks = [
      { block_type: 'core', exercises: [{ exercise_slug: 'plank' }] },
      { block_type: 'upper_strength', exercises: [{ exercise_slug: 'mystery_move' }] },
    ]
    attachPatternAssignment(blocks as any, reqs)
    expect((blocks[0].exercises[0] as any).assigned_pattern).toBeUndefined()
    expect((blocks[1].exercises[0] as any).assigned_pattern).toBeUndefined()
  })
})
