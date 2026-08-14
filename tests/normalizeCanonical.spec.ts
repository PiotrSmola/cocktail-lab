import { describe, expect, it } from 'vitest'
import type { IngredientStrengthProfile } from '../scripts/normalize'
import {
  canonicalCasing,
  canonicalCasingMap,
  cocktailStrength,
  nameSortKey,
} from '../scripts/normalize'

function repeat(value: string, times: number): string[] {
  return Array.from({ length: times }, () => value)
}

const profiles = new Map<string, IngredientStrengthProfile>([
  ['vodka', { abv: 40, abvEstimated: false, isAlcoholic: true }],
  ['triple-sec', { abv: 24, abvEstimated: true, isAlcoholic: true }],
  ['lime-juice', { abv: 0, abvEstimated: true, isAlcoholic: false }],
  ['cola', { abv: 0, abvEstimated: true, isAlcoholic: false }],
  ['ice', { abv: 0, abvEstimated: true, isAlcoholic: false }],
])

describe('canonicalCasingMap with the most-frequent strategy', () => {
  it('keeps the most frequent variant of a case-duplicate group', () => {
    const values = [
      ...repeat('Cocktail glass', 102),
      ...repeat('Cocktail Glass', 2),
    ]

    expect(canonicalCasingMap(values, 'mostFrequent').get('cocktail glass')).toBe(
      'Cocktail glass',
    )
  })

  it('keeps the upper-case variant when it is the more frequent one', () => {
    const values = [
      ...repeat('Collins Glass', 33),
      ...repeat('Collins glass', 30),
    ]

    expect(canonicalCasingMap(values, 'mostFrequent').get('collins glass')).toBe(
      'Collins Glass',
    )
  })

  it('breaks a tie with the variant that sorts first', () => {
    const values = [...repeat('Shot Glass', 4), ...repeat('Shot glass', 4)]

    expect(canonicalCasingMap(values, 'mostFrequent').get('shot glass')).toBe(
      'Shot Glass',
    )
  })

  it('leaves an already consistent title-cased field untouched', () => {
    const values = [
      ...repeat('Ordinary Drink', 197),
      ...repeat('Punch / Party Drink', 24),
      ...repeat('Other / Unknown', 23),
    ]
    const canonicalByKey = canonicalCasingMap(values, 'mostFrequent')

    expect([...canonicalByKey.values()].sort()).toStrictEqual([
      'Ordinary Drink',
      'Other / Unknown',
      'Punch / Party Drink',
    ])
  })
})

describe('canonicalCasingMap with the sentence strategy', () => {
  it('merges a case-duplicate group into one sentence-cased value', () => {
    const values = [
      ...repeat('Cocktail glass', 102),
      ...repeat('Cocktail Glass', 2),
    ]

    expect(canonicalCasingMap(values, 'sentence').get('cocktail glass')).toBe(
      'Cocktail glass',
    )
  })

  it('overrides the more frequent variant to keep the field uniform', () => {
    const values = [
      ...repeat('Collins Glass', 33),
      ...repeat('Collins glass', 30),
    ]

    expect(canonicalCasingMap(values, 'sentence').get('collins glass')).toBe(
      'Collins glass',
    )
  })

  it('lowercases an internal capital that no proper noun needs', () => {
    const canonicalByKey = canonicalCasingMap(
      ['Martini Glass', 'Whiskey Glass', 'Wine Glass', 'Coupe Glass'],
      'sentence',
    )

    expect([...canonicalByKey.values()]).toStrictEqual([
      'Martini glass',
      'Whiskey glass',
      'Wine glass',
      'Coupe glass',
    ])
  })

  it('is insensitive to the casing of the input variants', () => {
    const canonicalByKey = canonicalCasingMap(
      ['OLD-FASHIONED GLASS', 'old-fashioned glass'],
      'sentence',
    )

    expect(canonicalByKey.get('old-fashioned glass')).toBe(
      'Old-fashioned glass',
    )
  })

  it('falls back to the most frequent variant for a proper noun', () => {
    const values = [
      ...repeat('Nick and Nora Glass', 3),
      'Nick and nora glass',
    ]

    expect(canonicalCasingMap(values, 'sentence').get('nick and nora glass')).toBe(
      'Nick and Nora Glass',
    )
  })
})

describe('canonicalCasingMap grouping', () => {
  it('produces the same result regardless of input order', () => {
    const values = [
      ...repeat('Punch Bowl', 1),
      ...repeat('Punch bowl', 7),
      'Jar',
    ]
    const reversed = [...values].reverse()

    expect([...canonicalCasingMap(reversed).entries()].sort()).toStrictEqual(
      [...canonicalCasingMap(values).entries()].sort(),
    )
  })

  it('collapses one group per lower-cased value', () => {
    const values = ['Mason jar', 'mason JAR', 'Pitcher']

    expect(canonicalCasingMap(values).size).toBe(2)
  })

  it('leaves values without case duplicates untouched', () => {
    const canonicalByKey = canonicalCasingMap(['Irish coffee cup'])

    expect(canonicalCasing(canonicalByKey, 'Irish coffee cup')).toBe(
      'Irish coffee cup',
    )
  })
})

describe('canonicalCasing', () => {
  it('rewrites a known variant to its canonical spelling', () => {
    const canonicalByKey = canonicalCasingMap([
      ...repeat('Highball glass', 80),
      ...repeat('Highball Glass', 19),
    ])

    expect(canonicalCasing(canonicalByKey, 'Highball Glass')).toBe(
      'Highball glass',
    )
  })

  it('passes through null', () => {
    expect(canonicalCasing(new Map(), null)).toBeNull()
  })

  it('passes through unknown values', () => {
    expect(canonicalCasing(new Map(), 'Copper Mug')).toBe('Copper Mug')
  })
})

describe('nameSortKey', () => {
  it('lowercases and trims', () => {
    expect(nameSortKey('  Blackstrap Rum ')).toBe('blackstrap rum')
  })

  it('sorts lower-case names before an upper-case tail byte-wise', () => {
    const keys = ['Zima', 'blackstrap rum'].map(nameSortKey).sort()

    expect(keys).toStrictEqual(['blackstrap rum', 'zima'])
  })
})

describe('cocktailStrength', () => {
  it('materialises the abv of an alcoholic cocktail', () => {
    const strength = cocktailStrength(
      {
        instructions: 'Shake with ice and strain into a chilled glass.',
        ingredients: [
          { ingredientSlug: 'vodka', amountMl: 60 },
          { ingredientSlug: 'lime-juice', amountMl: 30 },
        ],
      },
      profiles,
    )

    expect(strength.dilutionMethod).toBe('shake')
    expect(strength.abv).toBe(21.3)
    expect(strength.abvEstimated).toBe(true)
  })

  it('reports an exact value when every alcoholic line is measured and known', () => {
    const strength = cocktailStrength(
      {
        instructions: 'Stir gently and serve.',
        ingredients: [{ ingredientSlug: 'vodka', amountMl: 50 }],
      },
      profiles,
    )

    expect(strength.dilutionMethod).toBe('stir')
    expect(strength.abvEstimated).toBe(false)
    expect(strength.abv).toBe(33.3)
  })

  it('lands a zero-proof cocktail at 0 rather than null', () => {
    const strength = cocktailStrength(
      {
        instructions: 'Pour over ice and serve.',
        ingredients: [
          { ingredientSlug: 'cola', amountMl: 150 },
          { ingredientSlug: 'lime-juice', amountMl: 15 },
        ],
      },
      profiles,
    )

    expect(strength.abv).toBe(0)
    expect(strength.dilutionMethod).toBe('build')
  })

  it('returns a null abv when no line carries a measurable volume', () => {
    const strength = cocktailStrength(
      {
        instructions: 'Build in the glass.',
        ingredients: [
          { ingredientSlug: 'vodka', amountMl: null },
          { ingredientSlug: 'cola', amountMl: null },
        ],
      },
      profiles,
    )

    expect(strength.abv).toBeNull()
    expect(strength.abvEstimated).toBe(true)
  })

  it('rejects an ingredient that has no profile', () => {
    expect(() =>
      cocktailStrength(
        {
          instructions: 'Shake.',
          ingredients: [{ ingredientSlug: 'absinthe', amountMl: 30 }],
        },
        profiles,
      ),
    ).toThrow('Missing ingredient profile: absinthe')
  })
})
