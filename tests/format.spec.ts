import { describe, expect, it } from 'vitest'
import type { AmountLike } from '../app/utils/format'
import { UNIT_LABELS, formatAmount, formatMl, formatRawMeasure, isPieceTextMeasure, niceFraction, pluralizeUnit, unitLabel } from '../app/utils/format'
import { scaleAmount } from '../app/utils/abv'

const MIN_SERVINGS = 1

function servingText(line: AmountLike, servings: number): string {
  const suffix = servings === MIN_SERVINGS ? '' : ` ×${servings}`

  if (isPieceTextMeasure(line)) {
    return `${formatRawMeasure(line.rawMeasure)}${suffix}`
  }

  const formatted = formatAmount({
    amount: scaleAmount(line.amount ?? null, servings),
    amountMax: scaleAmount(line.amountMax ?? null, servings),
    unit: line.unit
  })

  if (formatted) {
    return formatted
  }
  if (!line.rawMeasure) {
    return ''
  }

  return `${line.rawMeasure}${suffix}`
}

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
    ['PIECE', '']
  ])('labels %s as "%s"', (unit, expected) => {
    expect(unitLabel(unit)).toBe(expected)
    expect(UNIT_LABELS[unit]).toBe(expected)
  })

  it.each([
    [null, ''],
    [undefined, ''],
    ['', ''],
    ['oz', 'oz'],
    ['Dash', 'dash']
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
    [null, 5, '']
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
    [0.75, '¾']
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
    [10.75, '10¾']
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
    [1.51, '1½']
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
    [2.999, '3']
  ])('falls back to a trimmed decimal for %s', (value, expected) => {
    expect(niceFraction(value)).toBe(expected)
  })

  it.each([
    [-0.5, '-½'],
    [-1.5, '-1½'],
    [-2, '-2']
  ])('keeps the sign of %s', (value, expected) => {
    expect(niceFraction(value)).toBe(expected)
  })

  it.each([
    [Number.NaN],
    [Number.POSITIVE_INFINITY],
    [Number.NEGATIVE_INFINITY]
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
    [{ amount: 3, amountMax: null, unit: null }, '3']
  ] as [AmountLike, string][])('formats %o as "%s"', (line, expected) => {
    expect(formatAmount(line)).toBe(expected)
  })

  it.each([
    [{ amount: 2, amountMax: 3, unit: 'OZ' }, '2–3 oz'],
    [{ amount: 1, amountMax: 2, unit: 'DASH' }, '1–2 dashes'],
    [{ amount: 0.5, amountMax: 0.75, unit: 'OZ' }, '½–¾ oz'],
    [{ amount: 2, amountMax: 2, unit: 'OZ' }, '2 oz'],
    [{ amount: 2, amountMax: null, unit: 'OZ' }, '2 oz']
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
    [{ amount: 0.5, amountMax: null, unit: 'CUP' }, '½ cup']
  ] as [AmountLike, string][])('pluralizes %o as "%s"', (line, expected) => {
    expect(formatAmount(line)).toBe(expected)
  })

  it.each([
    [{ amount: 1, amountMax: null, unit: 'PIECE' }, '1'],
    [{ amount: 0.5, amountMax: null, unit: 'PIECE' }, '½'],
    [{ amount: 2, amountMax: 3, unit: 'PIECE' }, '2–3'],
    [{ amount: null, amountMax: null, unit: 'PIECE' }, ''],
    [{ amount: null, amountMax: null, unit: null }, ''],
    [{}, '']
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
      topUp: false
    }

    expect(formatAmount(line)).toBe('1½ oz')
  })
})

describe('formatRawMeasure', () => {
  it.each([
    ['Juice of 1/2', 'Juice of ½'],
    ['cubes', 'cubes'],
    ['1 twist of', '1 twist of'],
    ['1 slice', '1 slice'],
    ['Twist of', 'Twist of'],
    ['1 whole', '1 whole'],
    ['1 Slice', '1 Slice'],
    ['Juice of 1', 'Juice of 1'],
    ['1/2 slice', '½ slice'],
    ['Juice of 1/4', 'Juice of ¼'],
    ['1 cube', '1 cube'],
    ['wedges', 'wedges'],
    ['1 wedge', '1 wedge'],
    ['Squeeze', 'Squeeze'],
    ['1 piece', '1 piece'],
    ['2 pieces', '2 pieces'],
    ['Sprig', 'Sprig'],
    ['slice', 'slice'],
    ['1-2 whole', '1–2 whole'],
    ['2 Wedges', '2 Wedges'],
    ['2 wedges', '2 wedges'],
    ['4-5 whole green', '4–5 whole green'],
    ['2 Fresh leaves', '2 Fresh leaves'],
    ['1/2 piece textural', '½ piece textural'],
    ['Juice of 1 wedge', 'Juice of 1 wedge'],
    ['1 Large Sprig', '1 Large Sprig'],
    ['1 stick', '1 stick'],
    ['pods', 'pods'],
    ['2 sprigs', '2 sprigs'],
    ['1 Sprig', '1 Sprig'],
    ['wedge', 'wedge']
  ])('renders the seeded raw measure "%s" as "%s"', (raw, expected) => {
    expect(formatRawMeasure(raw)).toBe(expected)
  })

  it.each([
    ['1/3 cup of leaves', '⅓ cup of leaves'],
    ['2/3 slice', '⅔ slice'],
    ['3/4 wheel', '¾ wheel'],
    ['1 1/2 slices', '1½ slices'],
    ['1 / 2 slice', '½ slice'],
    ['0.5 slice', '½ slice'],
    ['0.25 wedge', '¼ wedge']
  ])('snaps the fraction in "%s" to "%s"', (raw, expected) => {
    expect(formatRawMeasure(raw)).toBe(expected)
  })

  it.each([
    ['1-2 whole', '1–2 whole'],
    ['2 - 3 leaves', '2–3 leaves'],
    ['1/2-1 slice', '½–1 slice'],
    ['2–3 pods', '2–3 pods']
  ])('renders the range in "%s" with an en dash as "%s"', (raw, expected) => {
    expect(formatRawMeasure(raw)).toBe(expected)
    expect(formatRawMeasure(raw)).not.toContain('-')
  })

  it.each([
    ['  1/2   slice  ', '½ slice'],
    ['Juice  of  1/2', 'Juice of ½']
  ])('collapses the whitespace of "%s" into "%s"', (raw, expected) => {
    expect(formatRawMeasure(raw)).toBe(expected)
  })

  it.each([
    [null, ''],
    [undefined, ''],
    ['', ''],
    ['1', '1'],
    ['2-3', '2–3']
  ] as [string | null | undefined, string][])('returns "%s" as "%s"', (raw, expected) => {
    expect(formatRawMeasure(raw)).toBe(expected)
  })
})

describe('isPieceTextMeasure', () => {
  it.each([
    [{ unit: 'PIECE', rawMeasure: 'Juice of 1/2' }, true],
    [{ unit: 'PIECE', rawMeasure: '1 twist of' }, true],
    [{ unit: 'PIECE', rawMeasure: 'cubes' }, true],
    [{ unit: 'piece', rawMeasure: '1/2 slice' }, true],
    [{ unit: 'PIECE', rawMeasure: '1' }, false],
    [{ unit: 'PIECE', rawMeasure: '2-3' }, false],
    [{ unit: 'PIECE', rawMeasure: '1/2' }, false],
    [{ unit: 'PIECE', rawMeasure: '' }, false],
    [{ unit: 'PIECE', rawMeasure: null }, false],
    [{ unit: 'PIECE' }, false],
    [{ unit: 'OZ', rawMeasure: '2-3 oz' }, false],
    [{ unit: 'TSP', rawMeasure: '2 tsp' }, false],
    [{ unit: 'DASH', rawMeasure: 'dash of' }, false],
    [{ unit: null, rawMeasure: '1 slice' }, false],
    [{}, false]
  ] as [AmountLike, boolean][])('classifies %o as %s', (line, expected) => {
    expect(isPieceTextMeasure(line)).toBe(expected)
  })
})

describe('formatAmount with piece raw measures', () => {
  it.each([
    [{ amount: 0.5, amountMax: null, unit: 'PIECE', rawMeasure: 'Juice of 1/2' }, 'Juice of ½'],
    [{ amount: 1, amountMax: null, unit: 'PIECE', rawMeasure: 'Juice of 1' }, 'Juice of 1'],
    [{ amount: 0.25, amountMax: null, unit: 'PIECE', rawMeasure: 'Juice of 1/4' }, 'Juice of ¼'],
    [{ amount: 1, amountMax: null, unit: 'PIECE', rawMeasure: '1 twist of' }, '1 twist of'],
    [{ amount: 0.5, amountMax: null, unit: 'PIECE', rawMeasure: '1/2 slice' }, '½ slice'],
    [{ amount: 1, amountMax: 2, unit: 'PIECE', rawMeasure: '1-2 whole' }, '1–2 whole'],
    [{ amount: 4, amountMax: 5, unit: 'PIECE', rawMeasure: '4-5 whole green' }, '4–5 whole green'],
    [{ amount: null, amountMax: null, unit: 'PIECE', rawMeasure: 'cubes' }, 'cubes'],
    [{ amount: null, amountMax: null, unit: 'PIECE', rawMeasure: 'Twist of' }, 'Twist of'],
    [{ amount: 2, amountMax: null, unit: 'PIECE', rawMeasure: '2 Fresh leaves' }, '2 Fresh leaves']
  ] as [AmountLike, string][])('keeps the wording of %o as "%s"', (line, expected) => {
    expect(formatAmount(line)).toBe(expected)
  })

  it.each([
    [{ amount: 1, amountMax: null, unit: 'PIECE', rawMeasure: '1' }, '1'],
    [{ amount: 2, amountMax: 3, unit: 'PIECE', rawMeasure: '2-3' }, '2–3'],
    [{ amount: 0.5, amountMax: null, unit: 'PIECE', rawMeasure: '1/2' }, '½'],
    [{ amount: 1, amountMax: null, unit: 'PIECE', rawMeasure: null }, '1'],
    [{ amount: 1, amountMax: null, unit: 'PIECE' }, '1']
  ] as [AmountLike, string][])('renders the bare numeric measure %o as "%s"', (line, expected) => {
    expect(formatAmount(line)).toBe(expected)
  })

  it.each([
    [{ amount: 2, amountMax: 3, unit: 'OZ', rawMeasure: '2-3 oz' }, '2–3 oz'],
    [{ amount: 2, amountMax: null, unit: 'TSP', rawMeasure: '2 tsp' }, '2 tsp'],
    [{ amount: 1.5, amountMax: null, unit: 'OZ', rawMeasure: '1 1/2 oz' }, '1½ oz'],
    [{ amount: 2, amountMax: null, unit: 'DASH', rawMeasure: '2 dashes' }, '2 dashes'],
    [{ amount: null, amountMax: null, unit: 'DASH', rawMeasure: 'dash of' }, 'dash'],
    [{ amount: 250, amountMax: null, unit: 'ML', rawMeasure: '250 ml' }, '250 ml'],
    [{ amount: 40, amountMax: null, unit: 'GRAM', rawMeasure: '40 g' }, '40 g'],
    [{ amount: 0.5, amountMax: null, unit: 'CUP', rawMeasure: '1/2 cup' }, '½ cup'],
    [{ amount: 1, amountMax: null, unit: null, rawMeasure: '1 slice' }, '1'],
    [{ amount: null, amountMax: null, unit: null, rawMeasure: 'to taste' }, '']
  ] as [AmountLike, string][])('ignores the raw measure of %o and renders "%s"', (line, expected) => {
    expect(formatAmount(line)).toBe(expected)
  })
})

describe('serving scaling of piece raw measures', () => {
  it.each([
    [{ amount: 0.5, amountMax: null, unit: 'PIECE', rawMeasure: 'Juice of 1/2' }, 1, 'Juice of ½'],
    [{ amount: 0.5, amountMax: null, unit: 'PIECE', rawMeasure: 'Juice of 1/2' }, 2, 'Juice of ½ ×2'],
    [{ amount: 0.5, amountMax: null, unit: 'PIECE', rawMeasure: 'Juice of 1/2' }, 8, 'Juice of ½ ×8'],
    [{ amount: 1, amountMax: null, unit: 'PIECE', rawMeasure: '1 twist of' }, 3, '1 twist of ×3'],
    [{ amount: 0.5, amountMax: null, unit: 'PIECE', rawMeasure: '1/2 slice' }, 2, '½ slice ×2'],
    [{ amount: 1, amountMax: 2, unit: 'PIECE', rawMeasure: '1-2 whole' }, 2, '1–2 whole ×2'],
    [{ amount: null, amountMax: null, unit: 'PIECE', rawMeasure: 'cubes' }, 4, 'cubes ×4'],
    [{ amount: null, amountMax: null, unit: 'PIECE', rawMeasure: 'Twist of' }, 2, 'Twist of ×2']
  ] as [AmountLike, number, string][])('marks %o at %s servings as "%s"', (line, servings, expected) => {
    expect(servingText(line, servings)).toBe(expected)
  })

  it('never multiplies a number that lives inside the wording', () => {
    const line: AmountLike = { amount: 0.5, amountMax: null, unit: 'PIECE', rawMeasure: 'Juice of 1/2' }

    expect(servingText(line, 2)).not.toBe('Juice of 1')
    expect(servingText(line, 2)).toContain('½')
  })

  it.each([
    [{ amount: 1, amountMax: null, unit: 'PIECE', rawMeasure: '1' }, 2, '2'],
    [{ amount: 2, amountMax: 3, unit: 'PIECE', rawMeasure: '2-3' }, 2, '4–6'],
    [{ amount: 0.5, amountMax: null, unit: 'PIECE', rawMeasure: '1/2' }, 3, '1½'],
    [{ amount: 2, amountMax: 3, unit: 'OZ', rawMeasure: '2-3 oz' }, 2, '4–6 oz'],
    [{ amount: 1.5, amountMax: null, unit: 'OZ', rawMeasure: '1 1/2 oz' }, 2, '3 oz'],
    [{ amount: 2, amountMax: null, unit: 'TSP', rawMeasure: '2 tsp' }, 3, '6 tsp'],
    [{ amount: 1, amountMax: null, unit: 'DASH', rawMeasure: '1 dash' }, 2, '2 dashes']
  ] as [AmountLike, number, string][])('scales the parsed amount of %o at %s servings to "%s"', (line, servings, expected) => {
    expect(servingText(line, servings)).toBe(expected)
  })

  it.each([
    [{ amount: null, amountMax: null, unit: null, rawMeasure: 'to taste' }, 1, 'to taste'],
    [{ amount: null, amountMax: null, unit: null, rawMeasure: 'to taste' }, 2, 'to taste ×2'],
    [{ amount: null, amountMax: null, unit: null, rawMeasure: null }, 2, '']
  ] as [AmountLike, number, string][])('keeps the unit-less fallback of %o at %s servings as "%s"', (line, servings, expected) => {
    expect(servingText(line, servings)).toBe(expected)
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
    [177.44, '≈175 ml']
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
    [0, '≈0 ml']
  ])('rounds %s at or below the threshold to "%s"', (ml, expected) => {
    expect(formatMl(ml)).toBe(expected)
  })

  it.each([
    [Number.NaN],
    [Number.POSITIVE_INFINITY]
  ])('returns an empty string for %s', (ml) => {
    expect(formatMl(ml)).toBe('')
  })
})
