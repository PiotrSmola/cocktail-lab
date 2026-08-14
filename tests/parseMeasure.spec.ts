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

describe('parseMeasure volume aliases', () => {
  it.each([
    ['1 fifth', { amount: 750, amountMax: null, unit: 'ML' }],
    ['1 fifth Smirnoff red label', { amount: 750, amountMax: null, unit: 'ML' }],
    ['2 fifths', { amount: 1500, amountMax: null, unit: 'ML' }],
    ['1 qt', { amount: 946.35, amountMax: null, unit: 'ML' }],
    ['2 qt', { amount: 1892.7, amountMax: null, unit: 'ML' }],
    ['1 quart', { amount: 946.35, amountMax: null, unit: 'ML' }],
    ['1 pint', { amount: 473.18, amountMax: null, unit: 'ML' }],
    ['1/2 pint', { amount: 236.59, amountMax: null, unit: 'ML' }],
    ['2 pints', { amount: 946.36, amountMax: null, unit: 'ML' }],
    ['1 gal', { amount: 3785.41, amountMax: null, unit: 'ML' }],
    ['1 gallon', { amount: 3785.41, amountMax: null, unit: 'ML' }],
    ['1 dl', { amount: 100, amountMax: null, unit: 'ML' }],
    ['1 dl Schweppes', { amount: 100, amountMax: null, unit: 'ML' }],
    ['2 deciliters', { amount: 200, amountMax: null, unit: 'ML' }],
  ])('rewrites %s to millilitres', (input, expected) => {
    expect(parseMeasure(input)).toMatchObject(expected)
  })

  it('scales both bounds of a range', () => {
    expect(parseMeasure('1-2 pints')).toMatchObject({
      amount: 473.18,
      amountMax: 946.36,
      unit: 'ML',
    })
  })

  it('keeps the raw measure intact', () => {
    expect(parseMeasure('1 fifth').raw).toBe('1 fifth')
  })

  it.each([
    ['1 pinch', 'PINCH'],
    ['1 part', 'PART'],
    ['1 pint glass', 'ML'],
    ['3 cl', 'CL'],
    ['2 L', 'L'],
    ['250 ml', 'ML'],
    ['1 cup', 'CUP'],
  ])('does not let %s drift to another unit', (input, expected) => {
    expect(parseMeasure(input).unit).toBe(expected)
  })

  it('emits only units backed by the Prisma enum', () => {
    const aliasInputs = [
      '1 fifth',
      '1 qt',
      '1 pint',
      '1 gal',
      '1 dl',
    ]

    for (const input of aliasInputs) {
      expect(parseMeasure(input).unit).toBe('ML')
    }
  })
})

describe('toMilliliters', () => {
  it('converts one ounce', () => {
    const parsed = parseMeasure('1 oz')

    expect(toMilliliters(parsed.amount, parsed.unit)).toBeCloseTo(29.57, 2)
  })

  it.each([
    ['1 fifth', 750],
    ['1 qt', 946.35],
    ['1 pint', 473.18],
    ['1/2 pint', 236.59],
    ['1 gal', 3785.41],
    ['1 dl', 100],
  ])('converts %s to millilitres', (input, expected) => {
    const parsed = parseMeasure(input)

    expect(toMilliliters(parsed.amount, parsed.unit)).toBeCloseTo(expected, 2)
  })

  it.each([
    ['1 pint', 16],
    ['1 qt', 32],
    ['1 gal', 128],
  ])('keeps %s consistent with the fluid ounce convention', (input, ounces) => {
    const parsed = parseMeasure(input)
    const milliliters = toMilliliters(parsed.amount, parsed.unit)

    expect(milliliters).not.toBeNull()
    expect(milliliters ?? 0).toBeCloseTo(
      toMilliliters(ounces, 'OZ') ?? 0,
      1,
    )
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
