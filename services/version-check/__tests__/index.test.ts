import { parseSemver, compareVersions } from '../index'

describe('parseSemver', () => {
  it('parst eine gültige Version', () => {
    expect(parseSemver('1.2.3')).toEqual([1, 2, 3])
  })

  it('gibt null für leeren String zurück', () => {
    expect(parseSemver('')).toBeNull()
  })

  it('gibt null für nicht-numerische Teile zurück', () => {
    expect(parseSemver('1.x.3')).toBeNull()
  })

  it('gibt null zurück wenn nicht genau 3 Teile', () => {
    expect(parseSemver('1.2')).toBeNull()
    expect(parseSemver('1.2.3.4')).toBeNull()
  })
})

describe('compareVersions', () => {
  it('erkennt major update', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBe('major')
  })

  it('erkennt minor update', () => {
    expect(compareVersions('1.0.0', '1.1.0')).toBe('minor')
  })

  it('erkennt patch update', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBe('patch')
  })

  it('gibt equal zurück wenn Versionen identisch', () => {
    expect(compareVersions('1.2.3', '1.2.3')).toBe('equal')
  })

  it('gibt equal zurück wenn lokale Version neuer ist (Dev-Build)', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBe('equal')
    expect(compareVersions('1.5.0', '1.4.0')).toBe('equal')
  })

  it('gibt equal zurück bei ungültigen Versionsstrings', () => {
    expect(compareVersions('invalid', '1.0.0')).toBe('equal')
    expect(compareVersions('1.0.0', 'invalid')).toBe('equal')
  })
})
