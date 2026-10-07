import { describe, it, expect } from 'vitest'
import { circularDayDistance } from '../week-layout'

describe('circularDayDistance', () => {
  it('measures forward distance across the week boundary', () => {
    expect(circularDayDistance(7, 2)).toBe(2) // Sun -> Tue
    expect(circularDayDistance(1, 7)).toBe(6) // Mon -> Sun
    expect(circularDayDistance(3, 3)).toBe(0)
  })
})
