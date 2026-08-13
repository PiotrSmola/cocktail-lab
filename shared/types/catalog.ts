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
}
