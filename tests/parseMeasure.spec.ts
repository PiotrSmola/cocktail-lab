import { describe, expect, it } from 'vitest'
import { parseMeasure, toMilliliters } from '../server/utils/parseMeasure'

describe('parseMeasure', () => {
  it.each([
    ['1 1/2 oz', { amount: 1.5, amountMax: null, unit: 'OZ' }],
    ['3/4 oz', { amount: 0.75, amountMax: null, unit: 'OZ' }],
    ['1.5 cl', { amount: 1.5, amountMax: null, unit: 'CL' }],
    ['2 dashes', { amount: 2, amountMax: null, unit: 'DASH' }],
    ['1 tblsp', { amount: 1, amountMax: null, unit: 'TBSP' }],
    ['1 shot', { amount: 1, amountMax: null, unit: 'SHOT' }],
    ['3 parts', { amount: 3, amountMax: null, unit: 'PART' }],
    ['½', { amount: 0.5, amountMax: null, unit: null }],
    ['2-3 oz', { amount: 2, amountMax: 3, unit: 'OZ' }],
    ['Juice of 1/2', { amount: 0.5, amountMax: null, unit: 'PIECE' }],
    ['1 twist of', { amount: 1, amountMax: null, unit: 'PIECE' }],
    ['Add 250 ml', { amount: 250, amountMax: null, unit: 'ML' }],
    ['cubes', { amount: null, amountMax: null, unit: 'PIECE' }],
  ])('parses %s', (input, expected) => {
    expect(parseMeasure(input)).toMatchObject(expected)
  })

  it.each([
    ['Top up with', { topUp: true }],
    ['Fill with', { topUp: true }],
    ['Garnish with', { garnish: true }],
    ['to taste', { toTaste: true }],
    ['Around rim put 1 pinch', { amount: 1, unit: 'PINCH', garnish: true }],
    ['crushed', { note: 'crushed' }],
  ])('recognizes flags and notes in %s', (input, expected) => {
    expect(parseMeasure(input)).toMatchObject(expected)
  })

  it('sets both bounds for a range', () => {
    expect(parseMeasure('2-3 oz')).toMatchObject({
      amount: 2,
      amountMax: 3,
    })
  })

  it.each([
    ['½', 0.5],
    ['⅓', 1 / 3],
    ['⅔', 2 / 3],
    ['¼', 0.25],
    ['¾', 0.75],
    ['⅕', 0.2],
    ['⅖', 0.4],
    ['⅗', 0.6],
    ['⅘', 0.8],
    ['⅙', 1 / 6],
    ['⅚', 5 / 6],
    ['⅛', 0.125],
    ['⅜', 0.375],
    ['⅝', 0.625],
    ['⅞', 0.875],
  ])('parses the unicode fraction %s', (input, expected) => {
    expect(parseMeasure(input).amount).toBeCloseTo(expected, 3)
  })

  it('does not mark a quantified fill instruction as top-up', () => {
    expect(parseMeasure('Fill to top with 1 oz')).toMatchObject({
      amount: 1,
      unit: 'OZ',
      topUp: false,
    })
  })

  it.each(['', null, undefined])('returns a clean result for %s', (input) => {
    expect(parseMeasure(input)).toEqual({
      amount: null,
      amountMax: null,
      unit: null,
      optional: false,
      garnish: false,
      toTaste: false,
      topUp: false,
      note: null,
      raw: '',
    })
  })
})

describe('toMilliliters', () => {
  it('converts one ounce', () => {
    const parsed = parseMeasure('1 oz')

    expect(toMilliliters(parsed.amount, parsed.unit)).toBeCloseTo(29.57, 2)
  })

  it('does not convert pieces', () => {
    const parsed = parseMeasure('Juice of 1/2')

    expect(toMilliliters(parsed.amount, parsed.unit)).toBeNull()
  })

  it('does not convert parts', () => {
    const parsed = parseMeasure('3 parts')

    expect(toMilliliters(parsed.amount, parsed.unit)).toBeNull()
  })
})
