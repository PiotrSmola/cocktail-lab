export interface ParsedMeasure {
  amount: number | null
  amountMax: number | null
  unit: string | null
  optional: boolean
  garnish: boolean
  toTaste: boolean
  topUp: boolean
  note: string | null
  raw: string
}

export const ML_PER_UNIT = {
  ML: 1,
  CL: 10,
  L: 1000,
  OZ: 29.5735,
  TSP: 4.93,
  TBSP: 14.79,
  CUP: 236.59,
  SHOT: 44.36,
  JIGGER: 44.36,
  DASH: 0.92,
  SPLASH: 5,
  DROP: 0.05
} as const

export const ML_PER_ALIAS_UNIT = {
  DECILITER: 100,
  FIFTH: 750,
  PINT: 473.18,
  QUART: 946.35,
  GALLON: 3785.41
} as const

type AliasUnit = keyof typeof ML_PER_ALIAS_UNIT

function aliasUnit(unit: string | null): AliasUnit | null {
  if (unit !== null && unit in ML_PER_ALIAS_UNIT) {
    return unit as AliasUnit
  }

  return null
}

const UNICODE_FRACTIONS: Readonly<Record<string, string>> = {
  '½': '1/2',
  '⅓': '1/3',
  '⅔': '2/3',
  '¼': '1/4',
  '¾': '3/4',
  '⅕': '1/5',
  '⅖': '2/5',
  '⅗': '3/5',
  '⅘': '4/5',
  '⅙': '1/6',
  '⅚': '5/6',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8'
}

const UNIT_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['TBSP', /\b(?:tblsp|tbsp|tablespoons?)\.?\b/i],
  ['TSP', /\b(?:tsp|teaspoons?)\.?\b/i],
  ['JIGGER', /\bjiggers?\b/i],
  ['SHOT', /\bshots?\b/i],
  ['SPLASH', /\bsplash(?:es)?\b/i],
  ['DASH', /\bdash(?:es)?\b/i],
  ['DROP', /\bdrops?\b/i],
  ['PINCH', /\bpinch(?:es)?\b/i],
  ['OZ', /\b(?:oz|ounces?)\.?\b/i],
  ['ML', /\bml\.?\b/i],
  ['CL', /\bcl\.?\b/i],
  ['DECILITER', /\b(?:dl|decilit(?:er|re)s?)\.?\b/i],
  ['L', /\b(?:l|lit(?:er|re)s?)\.?\b/i],
  ['FIFTH', /\bfifths?\b/i],
  ['PINT', /\bpints?\b/i],
  ['QUART', /\b(?:qts?|quarts?)\.?\b/i],
  ['GALLON', /\b(?:gals?|gallons?)\.?\b/i],
  ['CUP', /\bcups?\b/i],
  ['PART', /\bparts?\b/i],
  ['GRAM', /\b(?:g|gr|grams?)\.?\b/i],
  ['CAN', /\bcans?\b/i],
  ['BOTTLE', /\bbottles?\b/i],
  ['GLASS', /\bglass(?:es)?\b/i],
  ['SCOOP', /\bscoops?\b/i],
  [
    'PIECE',
    /\b(?:cubes?|slices?|wedges?|twists?|sprigs?|leaf|leaves|sticks?|pieces?|whole|pods?|cloves?|squeezes?)\b/i
  ]
]

const NUMBER_TOKEN
  = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|(?:\d+(?:[.,]\d+)?|[.,]\d+))`
const RANGE_PATTERN = new RegExp(
  `(${NUMBER_TOKEN})\\s*(?:-|–|—|to)\\s*(${NUMBER_TOKEN})`,
  'i'
)
const MIXED_FRACTION_PATTERN = /(\d+)\s+(\d+)\/(\d+)/
const FRACTION_PATTERN = /(\d+)\/(\d+)/
const DECIMAL_PATTERN = /(?:\d+(?:[.,]\d+)?|[.,]\d+)/

interface NumericMatch {
  amount: number
  amountMax: number | null
  start: number
  end: number
}

function normalizeUnicodeFractions(value: string): string {
  return value.replace(/[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, (fraction, offset: number) => {
    const replacement = UNICODE_FRACTIONS[fraction] ?? fraction
    const previousCharacter = value[offset - 1]
    return previousCharacter && /\d/.test(previousCharacter)
      ? ` ${replacement}`
      : replacement
  })
}

function roundAmount(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000
}

function scaleToMilliliters(
  value: number | null,
  factor: number
): number | null {
  if (value === null || factor === 1) {
    return value
  }

  return roundAmount(value * factor)
}

function parseNumericToken(value: string): number {
  const mixedFraction = value.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixedFraction) {
    return (
      Number(mixedFraction[1])
      + Number(mixedFraction[2]) / Number(mixedFraction[3])
    )
  }

  const fraction = value.match(/^(\d+)\/(\d+)$/)
  if (fraction) {
    return Number(fraction[1]) / Number(fraction[2])
  }

  return Number(value.replace(',', '.'))
}

function findNumber(value: string): NumericMatch | null {
  const range = value.match(RANGE_PATTERN)
  if (range && range.index !== undefined) {
    return {
      amount: roundAmount(parseNumericToken(range[1] ?? '')),
      amountMax: roundAmount(parseNumericToken(range[2] ?? '')),
      start: range.index,
      end: range.index + range[0].length
    }
  }

  const mixedFraction = value.match(MIXED_FRACTION_PATTERN)
  if (mixedFraction && mixedFraction.index !== undefined) {
    return {
      amount: roundAmount(
        Number(mixedFraction[1])
        + Number(mixedFraction[2]) / Number(mixedFraction[3])
      ),
      amountMax: null,
      start: mixedFraction.index,
      end: mixedFraction.index + mixedFraction[0].length
    }
  }

  const fraction = value.match(FRACTION_PATTERN)
  if (fraction && fraction.index !== undefined) {
    return {
      amount: roundAmount(Number(fraction[1]) / Number(fraction[2])),
      amountMax: null,
      start: fraction.index,
      end: fraction.index + fraction[0].length
    }
  }

  const decimal = value.match(DECIMAL_PATTERN)
  if (decimal && decimal.index !== undefined) {
    return {
      amount: roundAmount(Number(decimal[0].replace(',', '.'))),
      amountMax: null,
      start: decimal.index,
      end: decimal.index + decimal[0].length
    }
  }

  return null
}

function findUnit(value: string): string | null {
  let firstUnit: string | null = null
  let firstIndex = Number.POSITIVE_INFINITY

  for (const [unit, pattern] of UNIT_PATTERNS) {
    const match = value.match(pattern)
    if (match?.index !== undefined && match.index < firstIndex) {
      firstUnit = unit
      firstIndex = match.index
    }
  }

  return firstUnit
}

function findUnitAroundNumber(
  value: string,
  numericMatch: NumericMatch | null
): string | null {
  if (!numericMatch) {
    return findUnit(value)
  }

  const afterNumber = findUnit(value.slice(numericMatch.end))
  if (afterNumber) {
    return afterNumber
  }

  return findUnit(value.slice(0, numericMatch.start))
}

export function parseMeasure(input?: string | null): ParsedMeasure {
  const raw = typeof input === 'string' ? input.trim() : ''
  const normalized = normalizeUnicodeFractions(raw)
  const numericMatch = findNumber(normalized)
  const amount = numericMatch?.amount ?? null
  const amountMax = numericMatch?.amountMax ?? null
  const optional
    = /\boptional(?:ly)?\b|\b(?:if|as)\s+desired\b|\bif\s+needed\b|\bor\s+(?:lemon|lime|orange)\b/i.test(
      normalized
    )
  const garnish
    = /\bgarnish(?:ed)?\b|\b(?:around|on)\s+(?:the\s+)?rim\b|\brim(?:med)?\b/i.test(
      normalized
    )
  const toTaste = /\bto taste\b/i.test(normalized)
  const topUp
    = amount === null
      && (/\btop(?:\s+up)?(?:\s+with)?\b/i.test(normalized)
        || /\bfill(?:\s+(?:up|to\s+top))?(?:\s+with)?\b/i.test(normalized))
  let unit = findUnitAroundNumber(normalized, numericMatch)

  if (unit === null && amount !== null && /\bjuice\s+of\b/i.test(normalized)) {
    unit = 'PIECE'
  }

  const alias = aliasUnit(unit)
  const milliliterFactor = alias === null ? 1 : ML_PER_ALIAS_UNIT[alias]
  const scaledAmount = scaleToMilliliters(amount, milliliterFactor)
  const scaledAmountMax = scaleToMilliliters(amountMax, milliliterFactor)

  if (alias !== null) {
    unit = 'ML'
  }

  const note
    = raw
      && amount === null
      && unit === null
      && !optional
      && !garnish
      && !toTaste
      && !topUp
      ? raw
      : null

  return {
    amount: scaledAmount,
    amountMax: scaledAmountMax,
    unit,
    optional,
    garnish,
    toTaste,
    topUp,
    note,
    raw
  }
}

export function toMilliliters(
  amount: number | null,
  unit: string | null
): number | null {
  if (amount === null || unit === null) {
    return null
  }

  const multiplier = ML_PER_UNIT[unit as keyof typeof ML_PER_UNIT]
  return multiplier === undefined ? null : amount * multiplier
}
