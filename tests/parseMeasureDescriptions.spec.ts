import { describe, expect, it } from 'vitest'
import { parseMeasure } from '../server/utils/parseMeasure'

describe('parseMeasure descriptive instructions', () => {
  it('marks if needed as optional', () => {
    expect(parseMeasure('(if needed)')).toMatchObject({
      optional: true,
      note: null
    })
  })

  it('marks an alternative citrus as optional', () => {
    expect(parseMeasure('or lime')).toMatchObject({
      optional: true,
      note: null
    })
  })

  it('marks rimmed as garnish', () => {
    expect(parseMeasure('Rimmed')).toMatchObject({
      garnish: true,
      note: null
    })
  })
})
