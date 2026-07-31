import { describe, expect, it } from 'vitest'
import { parseMeasure, toMilliliters } from '../server/utils/parseMeasure'

describe('parseMeasure unit alias regressions', () => {
  it('recognizes a singular splash', () => {
    expect(parseMeasure('1 splash')).toMatchObject({
      amount: 1,
      unit: 'SPLASH',
    })
  })

  it('recognizes a singular glass without an amount', () => {
    expect(parseMeasure('Full Glass')).toMatchObject({
      amount: null,
      unit: 'GLASS',
      note: null,
    })
  })

  it('converts a splash to milliliters', () => {
    const parsed = parseMeasure('1 splash')

    expect(toMilliliters(parsed.amount, parsed.unit)).toBe(5)
  })
})
