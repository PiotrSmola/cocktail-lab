import { describe, expect, it } from 'vitest'
import type { SubstituteIngredientMeta } from '../server/utils/substitutes'
import {
  DIRECTED_SUBSTITUTES,
  SUBSTITUTE_CLUSTERS,
  buildAcceptedByRequired,
  buildSubstituteSlugMap,
} from '../server/utils/substitutes'

function meta(id: number, slug: string, isAlcoholic: boolean): SubstituteIngredientMeta {
  return { id, slug, isAlcoholic }
}

describe('buildSubstituteSlugMap', () => {
  const map = buildSubstituteSlugMap()

  it('never links a slug to itself', () => {
    for (const [slug, substitutes] of map) {
      expect(substitutes.has(slug)).toBe(false)
    }
  })

  it('is symmetric for every cluster pair', () => {
    for (const cluster of SUBSTITUTE_CLUSTERS) {
      for (const a of cluster) {
        for (const b of cluster) {
          if (a === b) {
            continue
          }
          expect(map.get(a)?.has(b)).toBe(true)
          expect(map.get(b)?.has(a)).toBe(true)
        }
      }
    }
  })

  it('accepts light, white and dark rum for one another but not overproof or flavoured rum', () => {
    const lightRum = map.get('light-rum')
    expect(lightRum?.has('dark-rum')).toBe(true)
    expect(lightRum?.has('white-rum')).toBe(true)
    expect(lightRum?.has('rum')).toBe(true)
    expect(lightRum?.has('151-proof-rum')).toBe(false)
    expect(lightRum?.has('blackstrap-rum')).toBe(false)
    expect(lightRum?.has('spiced-rum')).toBe(false)
    expect(lightRum?.has('malibu-rum')).toBe(false)
    expect(lightRum?.has('cachaca')).toBe(false)
  })

  it('keeps groups that share a groupSlug but not a role apart', () => {
    expect(map.get('lemon-juice')?.has('orange-juice')).toBe(false)
    expect(map.get('orange-juice')?.has('lemon-juice')).toBe(false)
    expect(map.get('dry-vermouth')?.has('sweet-vermouth')).toBe(false)
    expect(map.get('gin')?.has('sloe-gin')).toBeFalsy()
    expect(map.get('tonic-water')).toBeUndefined()
    expect(map.get('scotch')?.has('bourbon')).toBe(false)
  })

  it('bridges specific spirits through the generic slug without becoming transitive', () => {
    expect(map.get('vermouth')?.has('dry-vermouth')).toBe(true)
    expect(map.get('vermouth')?.has('sweet-vermouth')).toBe(true)
    expect(map.get('whiskey')?.has('scotch')).toBe(true)
    expect(map.get('whiskey')?.has('bourbon')).toBe(true)
  })

  it('keeps whole-fruit to juice substitution one-way', () => {
    expect(map.get('lemon-juice')?.has('lemon')).toBe(true)
    expect(map.get('lemon')?.has('lemon-juice')).toBeFalsy()
    expect(map.get('egg-white')?.has('egg')).toBe(true)
    expect(map.get('egg')?.has('egg-white')).toBeFalsy()
  })

  it('lets a generic bitters requirement take any specific bitters, but not the reverse', () => {
    expect(map.get('bitters')?.has('orange-bitters')).toBe(true)
    expect(map.get('orange-bitters')?.has('angostura-bitters')).toBeFalsy()
    expect(DIRECTED_SUBSTITUTES.bitters).toContain('peach-bitters')
  })

  it('accepts a caller supplied map', () => {
    const custom = buildSubstituteSlugMap([['a', 'b']], { c: ['a'] })
    expect([...custom.keys()].sort()).toEqual(['a', 'b', 'c'])
    expect(custom.get('c')?.has('a')).toBe(true)
    expect(custom.get('a')?.has('c')).toBe(false)
  })
})

describe('buildAcceptedByRequired', () => {
  it('resolves slugs to ids and drops slugs missing from the catalogue', () => {
    const accepted = buildAcceptedByRequired(
      [meta(1, 'light-rum', true), meta(2, 'dark-rum', true)],
      buildSubstituteSlugMap(),
    )
    expect([...(accepted.get(1) ?? [])]).toEqual([2])
    expect([...(accepted.get(2) ?? [])]).toEqual([1])
  })

  it('never lets an alcoholic ingredient stand in for a non-alcoholic one', () => {
    const accepted = buildAcceptedByRequired(
      [meta(1, 'bitters', false), meta(2, 'angostura-bitters', false), meta(3, 'peach-bitters', true)],
      buildSubstituteSlugMap(),
    )
    expect([...(accepted.get(1) ?? [])]).toEqual([2])
    expect(accepted.get(1)?.has(3)).toBe(false)
  })

  it('never lets a non-alcoholic ingredient stand in for an alcoholic one', () => {
    const symmetric = buildSubstituteSlugMap([['booze', 'mocktail-booze']], {})
    const accepted = buildAcceptedByRequired(
      [meta(10, 'booze', true), meta(11, 'mocktail-booze', false)],
      symmetric,
    )
    expect(accepted.get(10)).toBeUndefined()
    expect(accepted.get(11)).toBeUndefined()
  })

  it('returns ids in ascending order so the chosen stand-in is deterministic', () => {
    const accepted = buildAcceptedByRequired(
      [meta(9, 'rum', true), meta(4, 'dark-rum', true), meta(7, 'white-rum', true), meta(2, 'light-rum', true)],
      buildSubstituteSlugMap(),
    )
    expect([...(accepted.get(9) ?? [])]).toEqual([2, 4, 7])
  })

  it('produces no entry for an ingredient with no catalogue siblings', () => {
    const accepted = buildAcceptedByRequired([meta(1, 'light-rum', true)], buildSubstituteSlugMap())
    expect(accepted.size).toBe(0)
  })
})
