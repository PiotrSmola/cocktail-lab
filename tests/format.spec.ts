import { describe, expect, it } from 'vitest'
import type { AmountLike } from '../app/utils/format'
import { UNIT_LABELS, formatAmount, formatMl, niceFraction, pluralizeUnit, unitLabel } from '../app/utils/format'

describe('unitLabel', () => {
  it.each([
    ['OZ', 'oz'],
    ['TSP', 'tsp'],
    ['TBSP', 'tbsp'],
    ['ML', 'ml'],
    ['CL', 'cl'],
    ['L', 'L'],
    ['CUP', 'cup'],
    ['SHOT', 'shot'],
    ['JIGGER', 'jigger'],
    ['PART', 'part'],
    ['DASH', 'dash'],
    ['SPLASH', 'splash'],
    ['DROP', 'drop'],
    ['PINCH', 'pinch'],
    ['GRAM', 'g'],
    ['CAN', 'can'],
    ['BOTTLE', 'bottle'],
    ['GLASS', 'glass'],
    ['SCOOP', 'scoop'],
    ['PIECE', ''],
  ])('labels %s as "%s"', (unit, expected) => {
    expect(unitLabel(unit)).toBe(expected)
    expect(UNIT_LABELS[unit]).toBe(expected)
  })

  it.each([
    [null, ''],
    [undefined, ''],
    ['', ''],
    ['oz', 'oz'],
    ['Dash', 'dash'],
  ] as [string | null | undefined, string][])('normalises %s', (unit, expected) => {
    expect(unitLabel(unit)).toBe(expected)
  })

  it('covers every unit of the database enum', () => {
    expect(Object.keys(UNIT_LABELS)).toHaveLength(20)
  })
})

describe('pluralizeUnit', () => {
  it.each([
    ['DASH', 2, 'dashes'],
    ['DASH', 1, 'dash'],
    ['DASH', 0.5, 'dash'],
    ['DASH', null, 'dash'],
    ['SPLASH', 2, 'splashes'],
    ['PINCH', 3, 'pinches'],
    ['DROP', 4, 'drops'],
    ['PART', 3, 'parts'],
    ['SHOT', 2, 'shots'],
    ['CUP', 2, 'cups'],
    ['OZ', 3, 'oz'],
    ['ML', 250, 'ml'],
    ['TSP', 2, 'tsp'],
    ['GRAM', 40, 'g'],
    ['BOTTLE', 2, 'bottle'],
    ['PIECE', 5, ''],
    [null, 5, ''],
  ] as [string | null, number | null, string][])('pluralizes %s at %s as "%s"', (unit, amount, expected) => {
    expect(pluralizeUnit(unit, amount)).toBe(expected)
  })
})

describe('niceFraction', () => {
  it.each([
    [0.25, '¼'],
    [0.33, '⅓'],
    [1 / 3, '⅓'],
    [0.5, '½'],
    [0.67, '⅔'],
    [2 / 3, '⅔'],
    [0.75, '¾'],
  ])('renders the bare fraction %s as %s', (value, expected) => {
    expect(niceFraction(value)).toBe(expected)
  })

  it.each([
    [1.5, '1½'],
    [1.25, '1¼'],
    [1.75, '1¾'],
    [2.5, '2½'],
    [3.33, '3⅓'],
    [2.67, '2⅔'],
    [10.75, '10¾'],
  ])('renders the mixed number %s as %s', (value, expected) => {
    expect(niceFraction(value)).toBe(expected)
  })

  it.each([
    [0.24, '¼'],
    [0.265, '¼'],
    [0.34, '⅓'],
    [0.49, '½'],
    [0.51, '½'],
    [0.74, '¾'],
    [0.76, '¾'],
    [1.51, '1½'],
  ])('snaps %s inside the tolerance to %s', (value, expected) => {
    expect(niceFraction(value)).toBe(expected)
  })

  it.each([
    [0, '0'],
    [1, '1'],
    [2, '2'],
    [250, '250'],
    [1.2, '1.2'],
    [0.28, '0.28'],
    [0.7, '0.7'],
    [0.125, '0.13'],
    [1.187, '1.19'],
    [2.999, '3'],
  ])('falls back to a trimmed decimal for %s', (value, expected) => {
    expect(niceFraction(value)).toBe(expected)
  })

  it.each([
    [-0.5, '-½'],
    [-1.5, '-1½'],
    [-2, '-2'],
  ])('keeps the sign of %s', (value, expected) => {
    expect(niceFraction(value)).toBe(expected)
  })

  it.each([
    [Number.NaN],
    [Number.POSITIVE_INFINITY],
    [Number.NEGATIVE_INFINITY],
  ])('returns an empty string for %s', (value) => {
    expect(niceFraction(value)).toBe('')
  })
})

describe('formatAmount', () => {
  it.each([
    [{ amount: 1.5, amountMax: null, unit: 'OZ' }, '1½ oz'],
    [{ amount: 0.75, amountMax: null, unit: 'OZ' }, '¾ oz'],
    [{ amount: 2, amountMax: null, unit: 'OZ' }, '2 oz'],
    [{ amount: 250, amountMax: null, unit: 'ML' }, '250 ml'],
    [{ amount: 1, amountMax: null, unit: 'L' }, '1 L'],
    [{ amount: 40, amountMax: null, unit: 'GRAM' }, '40 g'],
    [{ amount: 0.5, amountMax: null, unit: null }, '½'],
    [{ amount: 3, amountMax: null, unit: null }, '3'],
  ] as [AmountLike, string][])('formats %o as "%s"', (line, expected) => {
    expect(formatAmount(line)).toBe(expected)
  })

  it.each([
    [{ amount: 2, amountMax: 3, unit: 'OZ' }, '2–3 oz'],
    [{ amount: 1, amountMax: 2, unit: 'DASH' }, '1–2 dashes'],
    [{ amount: 0.5, amountMax: 0.75, unit: 'OZ' }, '½–¾ oz'],
    [{ amount: 2, amountMax: 2, unit: 'OZ' }, '2 oz'],
    [{ amount: 2, amountMax: null, unit: 'OZ' }, '2 oz'],
  ] as [AmountLike, string][])('renders the range %o as "%s"', (line, expected) => {
    expect(formatAmount(line)).toBe(expected)
  })

  it('separates ranges with an en dash', () => {
    expect(formatAmount({ amount: 2, amountMax: 3, unit: 'OZ' })).toContain('–')
    expect(formatAmount({ amount: 2, amountMax: 3, unit: 'OZ' })).not.toContain('-')
  })

  it.each([
    [{ amount: 2, amountMax: null, unit: 'DASH' }, '2 dashes'],
    [{ amount: 1, amountMax: null, unit: 'DASH' }, '1 dash'],
    [{ amount: 3, amountMax: null, unit: 'PINCH' }, '3 pinches'],
    [{ amount: 1, amountMax: null, unit: 'PINCH' }, '1 pinch'],
    [{ amount: 2, amountMax: null, unit: 'SPLASH' }, '2 splashes'],
    [{ amount: 4, amountMax: null, unit: 'DROP' }, '4 drops'],
    [{ amount: 3, amountMax: null, unit: 'PART' }, '3 parts'],
    [{ amount: 2, amountMax: null, unit: 'SHOT' }, '2 shots'],
    [{ amount: 2, amountMax: null, unit: 'CUP' }, '2 cups'],
    [{ amount: 0.5, amountMax: null, unit: 'CUP' }, '½ cup'],
  ] as [AmountLike, string][])('pluralizes %o as "%s"', (line, expected) => {
    expect(formatAmount(line)).toBe(expected)
  })

  it.each([
    [{ amount: 1, amountMax: null, unit: 'PIECE' }, '1'],
    [{ amount: 0.5, amountMax: null, unit: 'PIECE' }, '½'],
    [{ amount: 2, amountMax: 3, unit: 'PIECE' }, '2–3'],
    [{ amount: null, amountMax: null, unit: 'PIECE' }, ''],
    [{ amount: null, amountMax: null, unit: null }, ''],
    [{}, ''],
  ] as [AmountLike, string][])('drops the label for %o', (line, expected) => {
    expect(formatAmount(line)).toBe(expected)
  })

  it('keeps a bare unit when the amount is unknown', () => {
    expect(formatAmount({ amount: null, amountMax: null, unit: 'DASH' })).toBe('dash')
  })

  it('accepts a full ingredient line from the api', () => {
    const line = {
      position: 1,
      amount: 1.5,
      amountMax: null,
      unit: 'OZ',
      amountMl: 45,
      rawMeasure: '1 1/2 oz',
      note: null,
      optional: false,
      garnish: false,
      toTaste: false,
      topUp: false,
    }

    expect(formatAmount(line)).toBe('1½ oz')
  })
})

describe('formatMl', () => {
  it.each([
    [45, '≈45 ml'],
    [44, '≈45 ml'],
    [43, '≈45 ml'],
    [21, '≈20 ml'],
    [23, '≈25 ml'],
    [88, '≈90 ml'],
    [90, '≈90 ml'],
    [177.44, '≈175 ml'],
  ])('rounds %s above the threshold to "%s"', (ml, expected) => {
    expect(formatMl(ml)).toBe(expected)
  })

  it.each([
    [20, '≈20 ml'],
    [19, '≈19 ml'],
    [15, '≈15 ml'],
    [7.4, '≈7 ml'],
    [7.6, '≈8 ml'],
    [0.9, '≈1 ml'],
    [0, '≈0 ml'],
  ])('rounds %s at or below the threshold to "%s"', (ml, expected) => {
    expect(formatMl(ml)).toBe(expected)
  })

  it.each([
    [Number.NaN],
    [Number.POSITIVE_INFINITY],
  ])('returns an empty string for %s', (ml) => {
    expect(formatMl(ml)).toBe('')
  })
})
