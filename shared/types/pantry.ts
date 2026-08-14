import type { CocktailCard, IngredientLite } from './catalog'

export interface PantrySubstitution {
  required: IngredientLite
  substitute: IngredientLite
}

export interface PantrySubstitutedCocktail {
  cocktailId: number
  substitutions: PantrySubstitution[]
}

export interface PantryMatchResult {
  pantryCount: number
  makeable: CocktailCard[]
  almost: { cocktail: CocktailCard, missing: IngredientLite[], substitutions: PantrySubstitution[] }[]
  unlocks: { ingredient: IngredientLite, unlocksCount: number, cocktails: string[], substitutesFor: IngredientLite[] }[]
  exactCount: number
  substituted: PantrySubstitutedCocktail[]
}
