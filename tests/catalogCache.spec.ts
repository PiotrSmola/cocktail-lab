import { describe, expect, it } from 'vitest'
import { catalogQueryCacheKey, catalogSlugCacheKey, isRandomSortQuery } from '../server/utils/catalogCache'
import { parseCocktailListQuery } from '../server/utils/catalogQuery'

describe('catalogQueryCacheKey', () => {
  it('does not collide when a value contains the pair separators', () => {
    const separateFields = catalogQueryCacheKey('cocktails', { category: 'Cocktail', q: 'mar' })
    const singleFieldWithSeparators = catalogQueryCacheKey('cocktails', { category: 'Cocktail&q=mar' })

    expect(separateFields).not.toBe(singleFieldWithSeparators)
  })

  it('does not collide when a value contains the encoded key separator', () => {
    expect(catalogQueryCacheKey('cocktails', { q: 'a-b', glass: 'c' }))
      .not.toBe(catalogQueryCacheKey('cocktails', { q: 'a', 'b-glass': 'c' }))
  })

  it('is stable regardless of property order', () => {
    expect(catalogQueryCacheKey('cocktails', { q: 'mar', page: 2, sort: 'name' }))
      .toBe(catalogQueryCacheKey('cocktails', { sort: 'name', page: 2, q: 'mar' }))
  })

  it('drops undefined, null and empty values', () => {
    expect(catalogQueryCacheKey('cocktails', { q: 'mar', spirit: undefined, glass: null, category: '' }))
      .toBe(catalogQueryCacheKey('cocktails', { q: 'mar' }))
  })

  it('returns the bare prefix when nothing survives filtering', () => {
    expect(catalogQueryCacheKey('cocktails', {})).toBe('cocktails')
    expect(catalogQueryCacheKey('cocktails', { q: undefined })).toBe('cocktails')
  })

  it('joins array values into one segment', () => {
    expect(catalogQueryCacheKey('cocktails', { sort: ['name', 'random'] }))
      .toBe(catalogQueryCacheKey('cocktails', { sort: 'name,random' }))
  })

  it('separates values that differ only by casing', () => {
    expect(catalogQueryCacheKey('cocktails', { glass: 'Highball glass' }))
      .not.toBe(catalogQueryCacheKey('cocktails', { glass: 'highball glass' }))
  })

  it('only lets validated fields participate when fed a parsed query', () => {
    const withUnknownField = catalogQueryCacheKey('cocktails', parseCocktailListQuery({ q: 'mar', utm_source: 'newsletter' }))
    const withoutUnknownField = catalogQueryCacheKey('cocktails', parseCocktailListQuery({ q: 'mar' }))

    expect(withUnknownField).toBe(withoutUnknownField)
  })

  it('reflects every validated field of a parsed query', () => {
    expect(catalogQueryCacheKey('cocktails', parseCocktailListQuery({ q: 'mar', page: '2' })))
      .not.toBe(catalogQueryCacheKey('cocktails', parseCocktailListQuery({ q: 'mar', page: '3' })))
  })
})

describe('catalogSlugCacheKey', () => {
  it('prefixes and encodes the slug', () => {
    expect(catalogSlugCacheKey('cocktail', 'mojito')).toBe('cocktail_mojito')
    expect(catalogSlugCacheKey('cocktail', 'a-b')).toBe('cocktail_a_2d_b')
  })

  it('falls back to an empty segment for a missing slug', () => {
    expect(catalogSlugCacheKey('cocktail', undefined)).toBe('cocktail_')
  })

  it('keeps different slugs and different prefixes apart', () => {
    expect(catalogSlugCacheKey('cocktail', 'gin')).not.toBe(catalogSlugCacheKey('ingredient', 'gin'))
    expect(catalogSlugCacheKey('cocktail', 'a_b')).not.toBe(catalogSlugCacheKey('cocktail', 'a-b'))
  })
})

describe('isRandomSortQuery', () => {
  it('detects the scalar random sort', () => {
    expect(isRandomSortQuery({ sort: 'random' })).toBe(true)
    expect(isRandomSortQuery({ sort: 'name' })).toBe(false)
  })

  it('detects random inside an array-valued sort', () => {
    expect(isRandomSortQuery({ sort: ['random'] })).toBe(true)
    expect(isRandomSortQuery({ sort: ['name', 'random'] })).toBe(true)
    expect(isRandomSortQuery({ sort: ['name', '-name'] })).toBe(false)
    expect(isRandomSortQuery({ sort: [] })).toBe(false)
  })

  it('handles a missing or non-string sort', () => {
    expect(isRandomSortQuery({})).toBe(false)
    expect(isRandomSortQuery({ sort: undefined })).toBe(false)
    expect(isRandomSortQuery({ sort: null })).toBe(false)
    expect(isRandomSortQuery({ sort: 1 })).toBe(false)
  })
})
