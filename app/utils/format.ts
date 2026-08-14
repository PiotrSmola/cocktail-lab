export const UNIT_LABELS: Record<string, string> = {
  OZ: 'oz',
  TSP: 'tsp',
  TBSP: 'tbsp',
  ML: 'ml',
  CL: 'cl',
  L: 'L',
  CUP: 'cup',
  SHOT: 'shot',
  JIGGER: 'jigger',
  PART: 'part',
  DASH: 'dash',
  SPLASH: 'splash',
  DROP: 'drop',
  PINCH: 'pinch',
  GRAM: 'g',
  CAN: 'can',
  BOTTLE: 'bottle',
  GLASS: 'glass',
  SCOOP: 'scoop',
  PIECE: ''
}

const PLURAL_UNITS = new Set(['DASH', 'DROP', 'PART', 'SHOT', 'CUP', 'SPLASH', 'PINCH'])

const SIBILANT_ENDING = /(?:s|x|z|ch|sh)$/

const FRACTION_GLYPHS: { value: number, glyph: string }[] = [
  { value: 0.25, glyph: '¼' },
  { value: 1 / 3, glyph: '⅓' },
  { value: 0.5, glyph: '½' },
  { value: 2 / 3, glyph: '⅔' },
  { value: 0.75, glyph: '¾' }
]

const FRACTION_TOLERANCE = 0.02
const EN_DASH = '–'
const ALMOST_EQUAL = '≈'
const ML_ROUNDING_THRESHOLD = 20

const NUMBER_SOURCE = '\\d+\\s+\\d+\\s*/\\s*\\d+|\\d+\\s*/\\s*\\d+|\\d+(?:\\.\\d+)?'
const RAW_NUMBER = new RegExp(`(?:${NUMBER_SOURCE})(?:\\s*[-–]\\s*(?:${NUMBER_SOURCE}))?`, 'g')
const RAW_RANGE_SEPARATOR = /\s*[-–]\s*/
const SLASH_PADDING = /\s*\/\s*/g
const EXTRA_WHITESPACE = /\s+/g
const LETTER = /[a-z]/i
const PIECE_UNIT = 'PIECE'

export interface AmountLike {
  amount?: number | null
  amountMax?: number | null
  unit?: string | null
  rawMeasure?: string | null
}

export function unitLabel(unit?: string | null): string {
  if (!unit) {
    return ''
  }
  return UNIT_LABELS[unit.toUpperCase()] ?? unit.toLowerCase()
}

export function pluralizeUnit(unit?: string | null, amount?: number | null): string {
  const label = unitLabel(unit)
  if (!label || amount === null || amount === undefined || amount <= 1) {
    return label
  }
  if (!PLURAL_UNITS.has((unit ?? '').toUpperCase())) {
    return label
  }
  return SIBILANT_ENDING.test(label) ? `${label}es` : `${label}s`
}

export function niceFraction(value: number): string {
  if (!Number.isFinite(value)) {
    return ''
  }
  const sign = value < 0 ? '-' : ''
  const absolute = Math.abs(value)
  const whole = Math.floor(absolute)
  const remainder = absolute - whole
  const fraction = FRACTION_GLYPHS.find(candidate => Math.abs(remainder - candidate.value) <= FRACTION_TOLERANCE)
  if (fraction) {
    return `${sign}${whole > 0 ? whole : ''}${fraction.glyph}`
  }
  return `${sign}${Math.round(absolute * 100) / 100}`
}

function parseRawNumber(token: string): number {
  return token
    .replace(SLASH_PADDING, '/')
    .split(EXTRA_WHITESPACE)
    .reduce((total, part) => {
      const [rawNumerator, rawDenominator] = part.split('/')
      const numerator = Number(rawNumerator)
      if (!Number.isFinite(numerator)) {
        return total
      }
      if (rawDenominator === undefined) {
        return total + numerator
      }
      const denominator = Number(rawDenominator)
      if (!Number.isFinite(denominator) || denominator === 0) {
        return total + numerator
      }
      return total + numerator / denominator
    }, 0)
}

function renderRawNumber(token: string): string {
  const bounds = token.split(RAW_RANGE_SEPARATOR).filter(part => part.length > 0)
  return bounds.map(part => niceFraction(parseRawNumber(part))).join(EN_DASH)
}

export function formatRawMeasure(raw?: string | null): string {
  if (!raw) {
    return ''
  }
  return raw.replace(RAW_NUMBER, match => renderRawNumber(match)).replace(EXTRA_WHITESPACE, ' ').trim()
}

export function isPieceTextMeasure(line: AmountLike): boolean {
  if ((line.unit ?? '').toUpperCase() !== PIECE_UNIT) {
    return false
  }
  return LETTER.test(line.rawMeasure ?? '')
}

export function formatAmount(line: AmountLike): string {
  if (isPieceTextMeasure(line)) {
    return formatRawMeasure(line.rawMeasure)
  }
  const amount = line.amount ?? null
  const amountMax = line.amountMax ?? null
  const label = pluralizeUnit(line.unit, amountMax ?? amount)
  if (amount === null) {
    return label
  }
  const value = amountMax !== null && amountMax !== amount
    ? `${niceFraction(amount)}${EN_DASH}${niceFraction(amountMax)}`
    : niceFraction(amount)
  return label ? `${value} ${label}` : value
}

export function formatMl(ml: number): string {
  if (!Number.isFinite(ml)) {
    return ''
  }
  const rounded = ml > ML_ROUNDING_THRESHOLD ? Math.round(ml / 5) * 5 : Math.round(ml)
  return `${ALMOST_EQUAL}${rounded} ml`
}
