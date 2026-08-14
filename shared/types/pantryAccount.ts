import type { IngredientLite } from './catalog'

export interface PantryListResponse {
  items: IngredientLite[]
}

export interface PantryMutationResponse {
  ok: true
}

export interface PantryMergeResponse {
  merged: number
}
