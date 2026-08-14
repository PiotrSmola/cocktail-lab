import { describe, expect, it } from 'vitest'
import type { AbvLineInput, DilutionMethod } from '../app/utils/abv'
import { DILUTION_FACTOR, detectDilution, estimateAbv, scaleAmount } from '../app/utils/abv'

function makeLine(
  amountMl: number | null,
  abv: number | null,
  overrides: { abvEstimated?: boolean, isAlcoholic?: boolean } = {}
): AbvLineInput {
  return {
    amountMl,
    ingredient: {
      abv,
      abvEstimated: overrides.abvEstimated ?? false,
      isAlcoholic: overrides.isAlcoholic ?? (abv !== null && abv > 0)
    }
  }
}

const spiritAndJuice = [makeLine(60, 40), makeLine(30, 0, { isAlcoholic: false })]

describe('DILUTION_FACTOR', () => {
  it.each([
    ['shake', 0.25],
    ['stir', 0.2],
    ['build', 0.12]
  ] as [DilutionMethod, number][])('maps %s to %s', (method, factor) => {
    expect(DILUTION_FACTOR[method]).toBe(factor)
  })

  it('covers exactly the three methods', () => {
    expect(Object.keys(DILUTION_FACTOR).sort()).toEqual(['build', 'shake', 'stir'])
  })
})

describe('detectDilution', () => {
  it.each([
    ['Shake with ice and strain into a chilled glass', 'shake'],
    ['SHAKE WELL', 'shake'],
    ['shaken, not stirred', 'shake'],
    ['Shake and then stir gently', 'shake'],
    ['Stir with ice and strain', 'stir'],
    ['Pour over ice, STIR briefly', 'stir'],
    ['stirred over cracked ice', 'stir'],
    ['Build in a highball glass over ice', 'build'],
    ['Muddle the mint, add rum, top with soda', 'build'],
    ['Pour all ingredients into the glass', 'build'],
    ['', 'build']
  ] as [string, DilutionMethod][])('detects %s as %s', (instructions, expected) => {
    expect(detectDilution(instructions)).toBe(expected)
  })
})

describe('estimateAbv', () => {
  it.each([
    ['shake', 21.3],
    ['stir', 22.2],
    ['build', 23.8]
  ] as [DilutionMethod, number][])('applies the %s dilution factor', (method, expected) => {
    expect(estimateAbv(spiritAndJuice, method).abv).toBe(expected)
  })

  it('reports the undiluted volume and pure alcohol volume', () => {
    const result = estimateAbv(spiritAndJuice, 'stir')

    expect(result.volumeMl).toBe(90)
    expect(result.alcoholMl).toBeCloseTo(24, 10)
    expect(result.estimated).toBe(false)
  })

  it('sums alcohol across several spirits', () => {
    const result = estimateAbv([makeLine(30, 40), makeLine(30, 20), makeLine(30, 0, { isAlcoholic: false })], 'build')

    expect(result.volumeMl).toBe(90)
    expect(result.alcoholMl).toBeCloseTo(18, 10)
    expect(result.abv).toBe(17.9)
  })

  it('rounds the result to one decimal', () => {
    expect(estimateAbv([makeLine(50, 40)], 'build').abv).toBe(35.7)
    expect(estimateAbv([makeLine(60, 40), makeLine(15, 0, { isAlcoholic: false })], 'shake').abv).toBe(25.6)
  })

  it.each([
    ['no lines at all', []],
    ['no measurable line', [makeLine(null, 40)]],
    ['only zero volume lines', [makeLine(0, 40)]]
  ] as [string, AbvLineInput[]][])('returns a null abv when volume is unknown: %s', (_label, lines) => {
    const result = estimateAbv(lines, 'stir')

    expect(result.abv).toBeNull()
    expect(result.estimated).toBe(true)
    expect(result.volumeMl).toBe(0)
  })

  it('returns zero for an alcohol free build', () => {
    const result = estimateAbv([
      makeLine(120, null, { isAlcoholic: false }),
      makeLine(30, 0, { isAlcoholic: false })
    ], 'build')

    expect(result.abv).toBe(0)
    expect(result.alcoholMl).toBe(0)
    expect(result.estimated).toBe(false)
  })

  it.each([
    [
      'every line is measured with a known abv',
      [makeLine(60, 40), makeLine(30, 0, { isAlcoholic: false })],
      false
    ],
    [
      'a counted ingredient carries an estimated abv',
      [makeLine(60, 40, { abvEstimated: true }), makeLine(30, 0, { isAlcoholic: false })],
      true
    ],
    [
      'a non alcoholic line has no measurable amount',
      [makeLine(60, 40), makeLine(null, 0, { isAlcoholic: false })],
      true
    ],
    [
      'an alcoholic line has no measurable amount',
      [makeLine(60, 40), makeLine(null, 40, { isAlcoholic: true })],
      true
    ],
    [
      'an unmeasured line also carries an estimated abv',
      [makeLine(60, 40), makeLine(null, 20, { abvEstimated: true, isAlcoholic: true })],
      true
    ],
    [
      'an uncounted ingredient without abv carries the estimated flag',
      [makeLine(60, 40), makeLine(30, null, { abvEstimated: true, isAlcoholic: false })],
      false
    ]
  ] as [string, AbvLineInput[], boolean][])('flags estimated=%s when %s', (_label, lines, expected) => {
    expect(estimateAbv(lines, 'shake').estimated).toBe(expected)
  })

  it('keeps the abv value usable while flagged as estimated', () => {
    const result = estimateAbv([makeLine(60, 40, { abvEstimated: true }), makeLine(30, 0, { isAlcoholic: false })], 'stir')

    expect(result).toEqual({ abv: 22.2, estimated: true, alcoholMl: 24, volumeMl: 90 })
  })

  it('ignores lines without an amount when summing volume', () => {
    const result = estimateAbv([makeLine(45, 40), makeLine(null, 15, { isAlcoholic: true })], 'stir')

    expect(result.volumeMl).toBe(45)
    expect(result.alcoholMl).toBeCloseTo(18, 10)
  })
})

describe('estimateAbv with unmeasured alcohol', () => {
  it.each([
    [
      'a single unmeasured spirit over a measured mixer',
      [makeLine(null, 40, { isAlcoholic: true }), makeLine(150, 0, { isAlcoholic: false })]
    ],
    [
      'every spirit unmeasured over several measured mixers',
      [
        makeLine(null, 14, { isAlcoholic: true }),
        makeLine(118.295, 0, { isAlcoholic: false }),
        makeLine(236.59, 0, { isAlcoholic: false })
      ]
    ],
    [
      'an unmeasured spirit beside a measured line of unknown abv',
      [makeLine(null, 40, { isAlcoholic: true }), makeLine(200, null, { isAlcoholic: false })]
    ]
  ] as [string, AbvLineInput[]][])('returns a null abv rather than zero for %s', (_label, lines) => {
    const result = estimateAbv(lines, 'build')

    expect(result.abv).toBeNull()
    expect(result.estimated).toBe(true)
    expect(result.alcoholMl).toBe(0)
  })

  it('keeps the measured volume visible when the abv is unknowable', () => {
    const result = estimateAbv(
      [makeLine(null, 40, { isAlcoholic: true }), makeLine(150, 0, { isAlcoholic: false })],
      'build'
    )

    expect(result.volumeMl).toBe(150)
  })

  it('still reports an understated estimate when only some alcohol is unmeasured', () => {
    const result = estimateAbv(
      [makeLine(45, 40), makeLine(null, 40, { isAlcoholic: true }), makeLine(90, 0, { isAlcoholic: false })],
      'build'
    )

    expect(result.abv).toBe(11.9)
    expect(result.estimated).toBe(true)
    expect(result.alcoholMl).toBeCloseTo(18, 10)
  })

  it.each([
    ['a measured spirit of known strength', [makeLine(50, 40)], 35.7],
    ['a measured spirit beside a measured mixer', [makeLine(60, 40), makeLine(30, 0, { isAlcoholic: false })], 23.8]
  ] as [string, AbvLineInput[], number][])('leaves %s untouched', (_label, lines, expected) => {
    expect(estimateAbv(lines, 'build').abv).toBe(expected)
  })

  it('keeps a genuinely alcohol free recipe at zero rather than null', () => {
    const result = estimateAbv(
      [makeLine(150, 0, { isAlcoholic: false }), makeLine(15, 0, { isAlcoholic: false })],
      'build'
    )

    expect(result.abv).toBe(0)
    expect(result.estimated).toBe(false)
  })

  it('keeps a zero proof recipe at zero even when a mixer is unmeasured', () => {
    const result = estimateAbv(
      [makeLine(150, 0, { isAlcoholic: false }), makeLine(null, 0, { isAlcoholic: false })],
      'build'
    )

    expect(result.abv).toBe(0)
    expect(result.estimated).toBe(true)
  })

  it('does not null a measured drink whose only alcohol is genuinely zero strength', () => {
    const result = estimateAbv(
      [makeLine(200, 0, { isAlcoholic: true }), makeLine(50, 0, { isAlcoholic: false })],
      'build'
    )

    expect(result.abv).toBe(0)
  })
})

describe('scaleAmount', () => {
  it.each([
    [null, 2, null],
    [1.5, 2, 3],
    [1.5, 0.5, 0.75],
    [0.75, 1.5, 1.125],
    [1, 1 / 3, 0.333],
    [0.3333, 3, 1],
    [2, 1, 2],
    [2.5, 0, 0],
    [0, 4, 0],
    [30, 1.5, 45],
    [0.0625, 1, 0.063]
  ] as [number | null, number, number | null][])('scales %s by %s to %s', (value, factor, expected) => {
    expect(scaleAmount(value, factor)).toBe(expected)
  })

  it('rounds to three decimals', () => {
    expect(scaleAmount(1 / 3, 1)).toBe(0.333)
    expect(scaleAmount(2 / 3, 1)).toBe(0.667)
  })
})
