import { describe, expect, it } from 'vitest'
import {
  GUEST_COOKIE_BUDGET_BYTES,
  GUEST_FAVORITES_LIMIT,
  GUEST_PANTRY_LIMIT,
  PANTRY_MERGE_LIMIT,
  addWithinLimit,
  buildMergeSlugs,
  capList,
  encodedCookieBytes,
  indexIngredientIds,
  withoutEntry
} from '../shared/utils/pantryCookie'

const LONGEST_SLUG_LENGTH = 26

function slugSeries(count: number, length = LONGEST_SLUG_LENGTH): string[] {
  return Array.from({ length: count }, (_, index) => `${index}`.padStart(length, 'x'))
}

describe('capList', () => {
  it('keeps insertion order and drops duplicates', () => {
    expect(capList(['gin', 'lime', 'gin', 'sugar'], 10)).toEqual(['gin', 'lime', 'sugar'])
  })

  it('truncates to the limit, keeping the oldest entries', () => {
    expect(capList(['a', 'b', 'c'], 2)).toEqual(['a', 'b'])
  })

  it('returns an empty list for a zero or negative limit', () => {
    expect(capList(['a', 'b'], 0)).toEqual([])
    expect(capList(['a', 'b'], -5)).toEqual([])
  })

  it('does not mutate the input', () => {
    const input = ['a', 'b', 'c']
    capList(input, 1)
    expect(input).toEqual(['a', 'b', 'c'])
  })
})

describe('withoutEntry', () => {
  it('removes every occurrence of the entry', () => {
    expect(withoutEntry(['gin', 'lime', 'gin'], 'gin')).toEqual(['lime'])
  })

  it('leaves the list untouched when the entry is absent', () => {
    expect(withoutEntry([1, 2, 3], 4)).toEqual([1, 2, 3])
  })
})

describe('addWithinLimit', () => {
  it('appends below the limit', () => {
    expect(addWithinLimit(['gin'], 'lime', 3)).toEqual({ values: ['gin', 'lime'], capped: false })
  })

  it('prepends when asked', () => {
    expect(addWithinLimit([2, 3], 1, 5, true)).toEqual({ values: [1, 2, 3], capped: false })
  })

  it('is idempotent for an entry already present, even at the limit', () => {
    expect(addWithinLimit(['gin', 'lime'], 'gin', 2)).toEqual({ values: ['gin', 'lime'], capped: false })
  })

  it('reports capped and keeps the list unchanged at the limit', () => {
    expect(addWithinLimit(['gin', 'lime'], 'rum', 2)).toEqual({ values: ['gin', 'lime'], capped: true })
  })

  it('dedupes the incoming list', () => {
    expect(addWithinLimit(['gin', 'gin'], 'lime', 5).values).toEqual(['gin', 'lime'])
  })
})

describe('buildMergeSlugs', () => {
  it('trims, drops blanks and dedupes', () => {
    expect(buildMergeSlugs([' gin ', 'gin', '', '   ', 'lime'])).toEqual(['gin', 'lime'])
  })

  it('never exceeds the merge endpoint limit', () => {
    expect(buildMergeSlugs(slugSeries(PANTRY_MERGE_LIMIT + 40, 8))).toHaveLength(PANTRY_MERGE_LIMIT)
  })

  it('returns an empty payload for an empty pantry', () => {
    expect(buildMergeSlugs([])).toEqual([])
  })
})

describe('indexIngredientIds', () => {
  it('maps slugs to ids', () => {
    expect(indexIngredientIds([{ id: 7, slug: 'gin' }, { id: 9, slug: 'lime' }])).toEqual({ gin: 7, lime: 9 })
  })

  it('keeps the last id for a repeated slug', () => {
    expect(indexIngredientIds([{ id: 1, slug: 'gin' }, { id: 2, slug: 'gin' }])).toEqual({ gin: 2 })
  })

  it('returns an empty index for an empty pantry', () => {
    expect(indexIngredientIds([])).toEqual({})
  })
})

describe('guest cookie budget', () => {
  it('measures the encoded size the browser actually stores', () => {
    expect(encodedCookieBytes('pantry', ['gin', 'lime', 'sugar'])).toBe('pantry=%5B%22gin%22%2C%22lime%22%2C%22sugar%22%5D'.length)
  })

  it('would blow past the 4096 byte cookie limit with all 299 ingredient slugs', () => {
    expect(encodedCookieBytes('pantry', slugSeries(299, 11))).toBeGreaterThan(4096)
  })

  it('keeps a full guest pantry inside the budget even with the longest slugs', () => {
    expect(encodedCookieBytes('pantry', slugSeries(GUEST_PANTRY_LIMIT))).toBeLessThan(GUEST_COOKIE_BUDGET_BYTES)
  })

  it('keeps full guest favourites inside the budget with four digit ids', () => {
    const ids = Array.from({ length: GUEST_FAVORITES_LIMIT }, (_, index) => 1000 + index)
    expect(encodedCookieBytes('guest-favorites', ids)).toBeLessThan(GUEST_COOKIE_BUDGET_BYTES)
  })

  it('keeps both guest cookies together under the 4096 byte per-cookie limit', () => {
    const pantry = encodedCookieBytes('pantry', slugSeries(GUEST_PANTRY_LIMIT))
    const favorites = encodedCookieBytes('guest-favorites', Array.from({ length: GUEST_FAVORITES_LIMIT }, (_, index) => 1000 + index))
    expect(pantry + favorites).toBeLessThan(4096)
  })
})
