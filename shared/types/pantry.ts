import type { CocktailCard, IngredientLite } from './catalog'

export interface PantryMatchResult {
  pantryCount: number
  makeable: CocktailCard[]
  almost: { cocktail: CocktailCard, missing: IngredientLite[] }[]
  unlocks: { ingredient: IngredientLite, unlocksCount: number, cocktails: string[] }[]
}
