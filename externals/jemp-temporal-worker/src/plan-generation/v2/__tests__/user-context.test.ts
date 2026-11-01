// Task 6: buildUserContext extrahiert als pure Funktion aus dem bisherigen
// Inline-Array in prepareGenerationV2 — testet, dass bei bestätigter
// Verletzungs-Extraktion (injury_extraction_status === 'confirmed') die freie
// user_notes-Zeile durch eine strukturierte constraints-Zeile ersetzt wird
// (die freie Zeile ginge sonst gegen die Enum-Constrained-Decoding-Absicherung).
import { describe, it, expect } from 'vitest'
import { buildUserContext } from '../prepare-v2'

describe('buildUserContext', () => {
  const base = { sport_slug: 'fussball', load_profile: 'medium' as const }

  it('status confirmed → kein user_notes im Kontext, stattdessen constraints-Zeile', () => {
    const ctx = buildUserContext(
      { ...base, schedule_notes: 'Ich habe wenig Zeit am Montag', injury_extraction_status: 'confirmed' },
      [
        { tag_slug: 'knee_flexion', mode: 'block', acute: false },
        { tag_slug: 'shoulder_overhead', mode: 'light_only', acute: false },
      ],
    )
    expect(ctx).not.toMatch(/user_notes/)
    expect(ctx).toMatch(/injury_constraints: block=\[knee_flexion\] light_only=\[shoulder_overhead\]/)
  })

  it('status confirmed + null Constraints → weder user_notes noch constraints-Zeile', () => {
    const ctx = buildUserContext(
      { ...base, schedule_notes: 'Ich habe wenig Zeit am Montag', injury_extraction_status: 'confirmed' },
      [],
    )
    expect(ctx).not.toMatch(/user_notes/)
    expect(ctx).not.toMatch(/injury_constraints/)
    expect(ctx).toBe('sport: fussball\nload_profile: medium')
  })

  it('status pending/failed → user_notes wie bisher', () => {
    const pending = buildUserContext(
      { ...base, schedule_notes: 'Knie tut weh', injury_extraction_status: 'pending' },
      [{ tag_slug: 'knee_flexion', mode: 'block', acute: false }],
    )
    expect(pending).toMatch(/user_notes: Knie tut weh/)
    expect(pending).not.toMatch(/injury_constraints/)

    const failed = buildUserContext(
      { ...base, schedule_notes: 'Knie tut weh', injury_extraction_status: 'failed' },
      [],
    )
    expect(failed).toMatch(/user_notes: Knie tut weh/)
    expect(failed).not.toMatch(/injury_constraints/)
  })

  it('mehrere Tags je Modus werden komma-separiert und sortiert gelistet', () => {
    const ctx = buildUserContext(
      { ...base, injury_extraction_status: 'confirmed' },
      [
        { tag_slug: 'shoulder_overhead', mode: 'block', acute: false },
        { tag_slug: 'knee_flexion', mode: 'block', acute: false },
      ],
    )
    expect(ctx).toMatch(/block=\[knee_flexion,shoulder_overhead\]/)
    expect(ctx).toMatch(/light_only=\[\]/)
  })

  it('ohne schedule_notes/Status bleibt der Kontext wie bisher (sport + load_profile)', () => {
    expect(buildUserContext(base, [])).toBe('sport: fussball\nload_profile: medium')
  })
})
