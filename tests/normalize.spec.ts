import { describe, expect, it } from 'vitest'
import { slugify, uniqueSlug } from '../server/utils/slug'

describe('slugify', () => {
  it('removes diacritics', () => {
    expect(slugify('Jägermeister')).toBe('jagermeister')
  })

  it('normalizes casing consistently', () => {
    expect(slugify('Dark Rum')).toBe(slugify('Dark rum'))
  })

  it('keeps digits separated by hyphens', () => {
    expect(slugify('7-Up')).toBe('7-up')
  })
})

describe('uniqueSlug', () => {
  it('adds a numeric suffix for collisions', () => {
    const taken = new Set<string>()
    const base = slugify("Planter's Punch")

    expect(uniqueSlug(base, taken)).toBe('planter-s-punch')
    expect(uniqueSlug(base, taken)).toBe('planter-s-punch-2')
  })
})
