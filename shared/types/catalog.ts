export const STRENGTH_BAND_VALUES = ['zero', 'easy', 'balanced', 'strong', 'spirit-forward'] as const

export type StrengthBandValue = typeof STRENGTH_BAND_VALUES[number]

export interface StrengthBandRange {
  gt?: number
  gte?: number
  lt?: number
  lte?: number
}

export interface StrengthBand {
  value: StrengthBandValue
  label: string
  range: StrengthBandRange
}

export const UNMEASURED_STRENGTH_LABEL = 'Unmeasured'

export const STRENGTH_BANDS: readonly StrengthBand[] = [
  { value: 'zero', label: 'Zero proof', range: { lte: 0 } },
  { value: 'easy', label: 'Easy going', range: { gt: 0, lt: 10 } },
  { value: 'balanced', label: 'Balanced', range: { gte: 10, lt: 20 } },
  { value: 'strong', label: 'Strong', range: { gte: 20, lt: 30 } },
  { value: 'spirit-forward', label: 'Spirit-forward', range: { gte: 30 } }
]

export function strengthBandOf(abv: number | null | undefined): StrengthBandValue | null {
  if (typeof abv !== 'number' || !Number.isFinite(abv)) {
    return null
  }
  if (abv <= 0) {
    return 'zero'
  }
  if (abv < 10) {
    return 'easy'
  }
  if (abv < 20) {
    return 'balanced'
  }
  if (abv < 30) {
    return 'strong'
  }
  return 'spirit-forward'
}

export function strengthBandRange(value: StrengthBandValue): StrengthBandRange {
  return STRENGTH_BANDS.find(band => band.value === value)?.range ?? {}
}

export function strengthBandLabel(abv: number | null | undefined): string {
  const band = strengthBandOf(abv)

  if (band === null) {
    return UNMEASURED_STRENGTH_LABEL
  }

  return STRENGTH_BANDS.find(entry => entry.value === band)?.label ?? UNMEASURED_STRENGTH_LABEL
}

export function strengthValueLabel(value: string): string {
  return STRENGTH_BANDS.find(band => band.value === value)?.label ?? value
}

export interface CocktailCard {
  id: number
  slug: string
  name: string
  category: string | null
  glass: string | null
  isAlcoholic: boolean
  imageUrl: string | null
  imageIsCC: boolean
  tags: string[]
  abv?: number | null
  abvEstimated?: boolean
}

export interface IngredientLite {
  id: number
  slug: string
  name: string
  imageUrl: string | null
  isAlcoholic: boolean
  abv: number | null
  abvEstimated: boolean
  groupSlug: string | null
}

export interface CocktailIngredientLine {
  position: number
  amount: number | null
  amountMax: number | null
  unit: string | null
  amountMl: number | null
  rawMeasure: string
  note: string | null
  optional: boolean
  garnish: boolean
  toTaste: boolean
  topUp: boolean
  ingredient: IngredientLite
}

export interface CocktailDetail extends CocktailCard {
  iba: string | null
  instructions: string
  imageAttribution: string | null
  sourceModifiedAt: string | null
  abv: number | null
  abvEstimated: boolean
  dilutionMethod: string | null
  ingredients: CocktailIngredientLine[]
}

export interface IngredientCard extends IngredientLite {
  type: string | null
  description: string | null
  cocktailCount: number
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  perPage: number
  pages: number
}

export interface CatalogMeta {
  categories: { value: string, count: number }[]
  glasses: { value: string, count: number }[]
  spirits: { value: string, count: number }[]
  strengths: { value: StrengthBandValue, count: number }[]
}
