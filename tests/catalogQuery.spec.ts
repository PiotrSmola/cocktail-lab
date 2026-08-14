import { describe, expect, it } from 'vitest'
import {
  buildCocktailOrderBy,
  buildCocktailWhere,
  buildIngredientOrderBy,
  buildIngredientWhere,
  parseCocktailListQuery,
  parseIngredientListQuery,
  toSortedFacets
} from '../server/utils/catalogQuery'

function badRequestStatus(parse: () => unknown): number | undefined {
  try {
    parse()
  }
  catch (error) {
    return (error as { statusCode?: number }).statusCode
  }

  return undefined
}

describe('parseCocktailListQuery', () => {
  it('applies defaults for an empty query', () => {
    expect(parseCocktailListQuery({})).toEqual({ sort: 'name', page: 1, perPage: 24 })
  })

  it('keeps every supported filter', () => {
    expect(parseCocktailListQuery({
      q: 'mar',
      spirit: 'gin',
      ingredient: 'lime',
      alcoholic: 'false',
      category: 'Cocktail',
      glass: 'Highball glass',
      sort: '-name',
      page: '3',
      perPage: '12'
    })).toEqual({
      q: 'mar',
      spirit: 'gin',
      ingredient: 'lime',
      alcoholic: 'false',
      category: 'Cocktail',
      glass: 'Highball glass',
      sort: '-name',
      page: 3,
      perPage: 12
    })
  })

  it('clamps the page to at least 1', () => {
    expect(parseCocktailListQuery({ page: '0' }).page).toBe(1)
    expect(parseCocktailListQuery({ page: '-7' }).page).toBe(1)
  })

  it('clamps perPage to the 1..60 range', () => {
    expect(parseCocktailListQuery({ perPage: '1000' }).perPage).toBe(60)
    expect(parseCocktailListQuery({ perPage: '0' }).perPage).toBe(1)
    expect(parseCocktailListQuery({ perPage: '60' }).perPage).toBe(60)
  })

  it('trims q and treats blank params as absent', () => {
    expect(parseCocktailListQuery({ q: '  mar  ' }).q).toBe('mar')
    expect(parseCocktailListQuery({ q: '   ' }).q).toBeUndefined()
    expect(parseCocktailListQuery({ spirit: '', glass: '', category: '  ' })).toEqual({ sort: 'name', page: 1, perPage: 24 })
  })

  it('rejects an over-long q', () => {
    expect(badRequestStatus(() => parseCocktailListQuery({ q: 'x'.repeat(121) }))).toBe(400)
    expect(parseCocktailListQuery({ q: 'x'.repeat(120) }).q).toHaveLength(120)
  })

  it('rejects unknown sort, spirit and alcoholic values', () => {
    expect(badRequestStatus(() => parseCocktailListQuery({ sort: 'popular' }))).toBe(400)
    expect(badRequestStatus(() => parseCocktailListQuery({ spirit: 'absinthe' }))).toBe(400)
    expect(badRequestStatus(() => parseCocktailListQuery({ alcoholic: 'maybe' }))).toBe(400)
  })

  it('accepts every declared sort value', () => {
    for (const sort of ['name', '-name', 'recent', 'random']) {
      expect(parseCocktailListQuery({ sort }).sort).toBe(sort)
    }
  })

  it('drops unknown query params', () => {
    expect(parseCocktailListQuery({ utm_source: 'newsletter' })).toEqual({ sort: 'name', page: 1, perPage: 24 })
  })
})

describe('parseIngredientListQuery', () => {
  it('applies defaults for an empty query', () => {
    expect(parseIngredientListQuery({})).toEqual({ sort: 'name', page: 1, perPage: 36 })
  })

  it('clamps perPage to the 1..96 range', () => {
    expect(parseIngredientListQuery({ perPage: '1000' }).perPage).toBe(96)
    expect(parseIngredientListQuery({ perPage: '0' }).perPage).toBe(1)
  })

  it('clamps the page to at least 1', () => {
    expect(parseIngredientListQuery({ page: '-2' }).page).toBe(1)
  })

  it('treats blank params as absent', () => {
    expect(parseIngredientListQuery({ q: ' ', group: '', alcoholic: '' })).toEqual({ sort: 'name', page: 1, perPage: 36 })
  })

  it('rejects unknown sort and alcoholic values', () => {
    expect(badRequestStatus(() => parseIngredientListQuery({ sort: 'recent' }))).toBe(400)
    expect(badRequestStatus(() => parseIngredientListQuery({ alcoholic: '1' }))).toBe(400)
  })

  it('accepts popular sort and rejects an over-long q', () => {
    expect(parseIngredientListQuery({ sort: 'popular' }).sort).toBe('popular')
    expect(badRequestStatus(() => parseIngredientListQuery({ q: 'x'.repeat(121) }))).toBe(400)
  })
})

describe('buildCocktailWhere', () => {
  it('is empty when nothing is filtered', () => {
    expect(buildCocktailWhere(parseCocktailListQuery({}))).toEqual({})
  })

  it('maps q to a case-insensitive contains on name', () => {
    expect(buildCocktailWhere(parseCocktailListQuery({ q: 'mar' })))
      .toEqual({ name: { contains: 'mar', mode: 'insensitive' } })
  })

  it('maps alcoholic to a boolean', () => {
    expect(buildCocktailWhere(parseCocktailListQuery({ alcoholic: 'true' })).isAlcoholic).toBe(true)
    expect(buildCocktailWhere(parseCocktailListQuery({ alcoholic: 'false' })).isAlcoholic).toBe(false)
  })

  it('matches category and glass case-insensitively', () => {
    expect(buildCocktailWhere(parseCocktailListQuery({ category: 'cocktail', glass: 'highball glass' })))
      .toEqual({
        category: { equals: 'cocktail', mode: 'insensitive' },
        glass: { equals: 'highball glass', mode: 'insensitive' }
      })
  })

  it('maps spirit to a relation filter on the ingredient group', () => {
    expect(buildCocktailWhere(parseCocktailListQuery({ spirit: 'gin' })))
      .toEqual({ AND: [{ ingredients: { some: { ingredient: { groupSlug: 'gin' } } } }] })
  })

  it('maps ingredient to a relation filter on the ingredient slug', () => {
    expect(buildCocktailWhere(parseCocktailListQuery({ ingredient: 'lime' })))
      .toEqual({ AND: [{ ingredients: { some: { ingredient: { slug: 'lime' } } } }] })
  })

  it('requires spirit and ingredient to match separate lines via AND', () => {
    expect(buildCocktailWhere(parseCocktailListQuery({ spirit: 'gin', ingredient: 'lime' })))
      .toEqual({
        AND: [
          { ingredients: { some: { ingredient: { groupSlug: 'gin' } } } },
          { ingredients: { some: { ingredient: { slug: 'lime' } } } }
        ]
      })
  })

  it('combines scalar and relation filters in one where', () => {
    expect(buildCocktailWhere(parseCocktailListQuery({ q: 'mar', category: 'Cocktail', alcoholic: 'true', spirit: 'tequila' })))
      .toEqual({
        name: { contains: 'mar', mode: 'insensitive' },
        isAlcoholic: true,
        category: { equals: 'Cocktail', mode: 'insensitive' },
        AND: [{ ingredients: { some: { ingredient: { groupSlug: 'tequila' } } } }]
      })
  })
})

describe('buildIngredientWhere', () => {
  it('is empty when nothing is filtered', () => {
    expect(buildIngredientWhere(parseIngredientListQuery({}))).toEqual({})
  })

  it('maps q to a case-insensitive contains and group to an exact groupSlug', () => {
    expect(buildIngredientWhere(parseIngredientListQuery({ q: 'gin', group: 'gin', alcoholic: 'true' })))
      .toEqual({
        name: { contains: 'gin', mode: 'insensitive' },
        groupSlug: 'gin',
        isAlcoholic: true
      })
  })

  it('maps alcoholic=false to false', () => {
    expect(buildIngredientWhere(parseIngredientListQuery({ alcoholic: 'false' })).isAlcoholic).toBe(false)
  })
})

describe('catalog ordering', () => {
  it('orders cocktails by the collation-stable nameSort column', () => {
    expect(buildCocktailOrderBy('name')).toEqual([{ nameSort: 'asc' }, { id: 'asc' }])
    expect(buildCocktailOrderBy('-name')).toEqual([{ nameSort: 'desc' }, { id: 'asc' }])
    expect(buildCocktailOrderBy('random')).toEqual([{ nameSort: 'asc' }, { id: 'asc' }])
  })

  it('orders recent cocktails by source date with a nameSort tiebreaker', () => {
    expect(buildCocktailOrderBy('recent'))
      .toEqual([{ sourceModifiedAt: { sort: 'desc', nulls: 'last' } }, { nameSort: 'asc' }, { id: 'asc' }])
  })

  it('orders ingredients by the collation-stable nameSort column', () => {
    expect(buildIngredientOrderBy('name')).toEqual([{ nameSort: 'asc' }, { id: 'asc' }])
    expect(buildIngredientOrderBy('-name')).toEqual([{ nameSort: 'desc' }, { id: 'asc' }])
    expect(buildIngredientOrderBy('popular')).toEqual([{ nameSort: 'asc' }, { id: 'asc' }])
  })
})

describe('toSortedFacets', () => {
  it('drops null values', () => {
    expect(toSortedFacets([{ value: null, count: 99 }, { value: 'Cocktail', count: 1 }]))
      .toEqual([{ value: 'Cocktail', count: 1 }])
  })

  it('merges case duplicates and sums their counts', () => {
    expect(toSortedFacets([{ value: 'Highball glass', count: 30 }, { value: 'Highball Glass', count: 5 }]))
      .toEqual([{ value: 'Highball glass', count: 35 }])
  })

  it('keeps the dominant variant as the merged label', () => {
    expect(toSortedFacets([{ value: 'punch / party drink', count: 2 }, { value: 'Punch / Party Drink', count: 40 }]))
      .toEqual([{ value: 'Punch / Party Drink', count: 42 }])
  })

  it('keeps the first variant when counts tie', () => {
    expect(toSortedFacets([{ value: 'Shot', count: 3 }, { value: 'shot', count: 3 }]))
      .toEqual([{ value: 'Shot', count: 6 }])
  })

  it('sorts by count descending then by value ascending', () => {
    expect(toSortedFacets([
      { value: 'Shot', count: 5 },
      { value: 'Beer', count: 12 },
      { value: 'Cocktail', count: 5 }
    ])).toEqual([
      { value: 'Beer', count: 12 },
      { value: 'Cocktail', count: 5 },
      { value: 'Shot', count: 5 }
    ])
  })

  it('returns an empty list for empty input', () => {
    expect(toSortedFacets([])).toEqual([])
  })
})
