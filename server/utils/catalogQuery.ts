import { Prisma } from '@prisma/client'
import { createError } from 'h3'
import { z } from 'zod'
import { prisma } from './db'
import { STRENGTH_BAND_VALUES, strengthBandRange } from '#shared/types/catalog'
import type {
  CocktailCard,
  CocktailDetail,
  CocktailIngredientLine,
  IngredientCard,
  IngredientLite,
  Paginated
} from '#shared/types/catalog'

export const SPIRIT_GROUP_SLUGS = ['rum', 'gin', 'vodka', 'tequila', 'whiskey', 'brandy'] as const

const pageSchema = z.coerce.number().int().default(1).transform(value => Math.max(value, 1))

function perPageSchema(fallback: number, max: number) {
  return z.coerce.number().int().default(fallback).transform(value => Math.min(Math.max(value, 1), max))
}

const cocktailListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  spirit: z.enum(SPIRIT_GROUP_SLUGS).optional(),
  ingredient: z.string().trim().max(120).optional(),
  alcoholic: z.enum(['true', 'false']).optional(),
  category: z.string().trim().max(120).optional(),
  glass: z.string().trim().max(120).optional(),
  strength: z.enum(STRENGTH_BAND_VALUES).optional(),
  sort: z.enum(['name', '-name', 'recent', 'random', 'strength', '-strength']).default('name'),
  page: pageSchema,
  perPage: perPageSchema(24, 60)
})

const ingredientListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  group: z.string().trim().max(120).optional(),
  alcoholic: z.enum(['true', 'false']).optional(),
  sort: z.enum(['name', '-name', 'popular']).default('name'),
  page: pageSchema,
  perPage: perPageSchema(36, 96)
})

const catalogSlugSchema = z.string().trim().min(1).max(200)

export type CocktailListQuery = z.output<typeof cocktailListQuerySchema>
export type IngredientListQuery = z.output<typeof ingredientListQuerySchema>

function withoutBlankValues(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) {
    return input
  }

  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>)
      .filter(([, value]) => typeof value !== 'string' || value.trim() !== '')
  )
}

function parseCatalogInput<Schema extends z.ZodType>(schema: Schema, input: unknown): z.output<Schema> {
  const parsed = schema.safeParse(withoutBlankValues(input))

  if (!parsed.success) {
    const details = parsed.error.issues
      .map(issue => `${issue.path.join('.') || 'query'}: ${issue.message}`)
      .join('; ')

    throw createError({ statusCode: 400, statusMessage: `Invalid query: ${details}` })
  }

  return parsed.data
}

export function parseCocktailListQuery(input: unknown): CocktailListQuery {
  return parseCatalogInput(cocktailListQuerySchema, input)
}

export function parseIngredientListQuery(input: unknown): IngredientListQuery {
  return parseCatalogInput(ingredientListQuerySchema, input)
}

export function parseCatalogSlug(input: string | undefined): string {
  const parsed = catalogSlugSchema.safeParse(input)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid slug' })
  }

  return parsed.data
}

export const cocktailCardSelect = {
  id: true,
  slug: true,
  name: true,
  category: true,
  glass: true,
  isAlcoholic: true,
  imageUrl: true,
  imageIsCC: true,
  tags: true,
  abv: true,
  abvEstimated: true
} satisfies Prisma.CocktailSelect

export const ingredientLiteSelect = {
  id: true,
  slug: true,
  name: true,
  imageUrl: true,
  isAlcoholic: true,
  abv: true,
  abvEstimated: true,
  groupSlug: true
} satisfies Prisma.IngredientSelect

export const ingredientCardSelect = {
  ...ingredientLiteSelect,
  type: true,
  description: true
} satisfies Prisma.IngredientSelect

export const cocktailIngredientLineSelect = {
  position: true,
  amount: true,
  amountMax: true,
  unit: true,
  amountMl: true,
  rawMeasure: true,
  note: true,
  optional: true,
  garnish: true,
  toTaste: true,
  topUp: true,
  ingredient: { select: ingredientLiteSelect }
} satisfies Prisma.CocktailIngredientSelect

export const cocktailDetailSelect = {
  ...cocktailCardSelect,
  iba: true,
  instructions: true,
  imageAttribution: true,
  sourceModifiedAt: true,
  dilutionMethod: true,
  ingredients: {
    select: cocktailIngredientLineSelect,
    orderBy: { position: 'asc' }
  }
} satisfies Prisma.CocktailSelect

export type CocktailCardRow = Prisma.CocktailGetPayload<{ select: typeof cocktailCardSelect }>
export type IngredientLiteRow = Prisma.IngredientGetPayload<{ select: typeof ingredientLiteSelect }>
export type IngredientCardRow = Prisma.IngredientGetPayload<{ select: typeof ingredientCardSelect }>
export type CocktailIngredientLineRow = Prisma.CocktailIngredientGetPayload<{ select: typeof cocktailIngredientLineSelect }>

export type CocktailDetailRow = CocktailCardRow & {
  iba: string | null
  instructions: string
  imageAttribution: string | null
  sourceModifiedAt: Date | null
  dilutionMethod: string | null
  ingredients: CocktailIngredientLineRow[]
}

function toIsoString(value: Date | null): string | null {
  return value === null ? null : value.toISOString()
}

export function toCocktailCard(row: CocktailCardRow): CocktailCard {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    glass: row.glass,
    isAlcoholic: row.isAlcoholic,
    imageUrl: row.imageUrl,
    imageIsCC: row.imageIsCC,
    tags: row.tags,
    abv: row.abv,
    abvEstimated: row.abvEstimated
  }
}

export function toIngredientLite(row: IngredientLiteRow): IngredientLite {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    imageUrl: row.imageUrl,
    isAlcoholic: row.isAlcoholic,
    abv: row.abv,
    abvEstimated: row.abvEstimated,
    groupSlug: row.groupSlug
  }
}

export function toIngredientCard(row: IngredientCardRow, cocktailCount: number): IngredientCard {
  return {
    ...toIngredientLite(row),
    type: row.type,
    description: row.description,
    cocktailCount
  }
}

export function toCocktailIngredientLine(row: CocktailIngredientLineRow): CocktailIngredientLine {
  return {
    position: row.position,
    amount: row.amount,
    amountMax: row.amountMax,
    unit: row.unit,
    amountMl: row.amountMl,
    rawMeasure: row.rawMeasure,
    note: row.note,
    optional: row.optional,
    garnish: row.garnish,
    toTaste: row.toTaste,
    topUp: row.topUp,
    ingredient: toIngredientLite(row.ingredient)
  }
}

export function toCocktailDetail(row: CocktailDetailRow): CocktailDetail {
  return {
    ...toCocktailCard(row),
    iba: row.iba,
    instructions: row.instructions,
    imageAttribution: row.imageAttribution,
    sourceModifiedAt: toIsoString(row.sourceModifiedAt),
    abv: row.abv,
    abvEstimated: row.abvEstimated,
    dilutionMethod: row.dilutionMethod,
    ingredients: row.ingredients.map(toCocktailIngredientLine)
  }
}

export function buildCocktailWhere(query: CocktailListQuery): Prisma.CocktailWhereInput {
  const where: Prisma.CocktailWhereInput = {}

  if (query.q) {
    where.name = { contains: query.q, mode: 'insensitive' }
  }

  if (query.alcoholic) {
    where.isAlcoholic = query.alcoholic === 'true'
  }

  if (query.category) {
    where.category = { equals: query.category, mode: 'insensitive' }
  }

  if (query.glass) {
    where.glass = { equals: query.glass, mode: 'insensitive' }
  }

  if (query.strength) {
    where.abv = strengthBandRange(query.strength)
  }

  const ingredientMatches: Prisma.CocktailIngredientWhereInput[] = []

  if (query.spirit) {
    ingredientMatches.push({ ingredient: { groupSlug: query.spirit } })
  }

  if (query.ingredient) {
    ingredientMatches.push({ ingredient: { slug: query.ingredient } })
  }

  if (ingredientMatches.length > 0) {
    where.AND = ingredientMatches.map(match => ({ ingredients: { some: match } }))
  }

  return where
}

export function buildCocktailOrderBy(sort: CocktailListQuery['sort']): Prisma.CocktailOrderByWithRelationInput[] {
  if (sort === '-name') {
    return [{ nameSort: 'desc' }, { id: 'asc' }]
  }

  if (sort === 'recent') {
    return [{ sourceModifiedAt: { sort: 'desc', nulls: 'last' } }, { nameSort: 'asc' }, { id: 'asc' }]
  }

  if (sort === 'strength') {
    return [{ abv: { sort: 'asc', nulls: 'last' } }, { nameSort: 'asc' }, { id: 'asc' }]
  }

  if (sort === '-strength') {
    return [{ abv: { sort: 'desc', nulls: 'last' } }, { nameSort: 'asc' }, { id: 'asc' }]
  }

  return [{ nameSort: 'asc' }, { id: 'asc' }]
}

export function buildIngredientWhere(query: IngredientListQuery): Prisma.IngredientWhereInput {
  const where: Prisma.IngredientWhereInput = {}

  if (query.q) {
    where.name = { contains: query.q, mode: 'insensitive' }
  }

  if (query.group) {
    where.groupSlug = query.group
  }

  if (query.alcoholic) {
    where.isAlcoholic = query.alcoholic === 'true'
  }

  return where
}

export function buildIngredientOrderBy(sort: IngredientListQuery['sort']): Prisma.IngredientOrderByWithRelationInput[] {
  return [{ nameSort: sort === '-name' ? 'desc' : 'asc' }, { id: 'asc' }]
}

type IngredientCocktailCountRow = { ingredientId: number, cocktailCount: number }

export type PopularIngredientEntry = { id: number, cocktailCount: number }

export async function fetchIngredientCocktailCounts(ingredientIds?: number[]): Promise<Map<number, number>> {
  if (ingredientIds && ingredientIds.length === 0) {
    return new Map()
  }

  const scope = ingredientIds
    ? Prisma.sql`WHERE "ingredientId" IN (${Prisma.join(ingredientIds)})`
    : Prisma.empty

  const rows = await prisma.$queryRaw<IngredientCocktailCountRow[]>`
    SELECT "ingredientId", COUNT(DISTINCT "cocktailId")::int AS "cocktailCount"
    FROM "CocktailIngredient"
    ${scope}
    GROUP BY "ingredientId"
  `

  return new Map(rows.map(row => [row.ingredientId, row.cocktailCount]))
}

export async function fetchPopularIngredientPage(
  ingredientIds: number[],
  skip: number,
  take: number
): Promise<PopularIngredientEntry[]> {
  if (ingredientIds.length === 0) {
    return []
  }

  const scope = Prisma.join(ingredientIds)

  return prisma.$queryRaw<PopularIngredientEntry[]>`
    SELECT candidate."id", COALESCE(counted."cocktailCount", 0)::int AS "cocktailCount"
    FROM "Ingredient" candidate
    LEFT JOIN (
      SELECT "ingredientId", COUNT(DISTINCT "cocktailId") AS "cocktailCount"
      FROM "CocktailIngredient"
      WHERE "ingredientId" IN (${scope})
      GROUP BY "ingredientId"
    ) counted ON counted."ingredientId" = candidate."id"
    WHERE candidate."id" IN (${scope})
    ORDER BY COALESCE(counted."cocktailCount", 0) DESC, candidate."nameSort" ASC, candidate."id" ASC
    LIMIT ${take} OFFSET ${skip}
  `
}

export function shuffleIds(ids: number[]): number[] {
  return ids
    .map(id => ({ id, order: Math.random() }))
    .sort((left, right) => left.order - right.order)
    .map(entry => entry.id)
}

export function paginationRange(page: number, perPage: number): { skip: number, take: number } {
  return { skip: (page - 1) * perPage, take: perPage }
}

export const paginateCatalog = <T>(items: T[], total: number, page: number, perPage: number): Paginated<T> => ({
  items,
  total,
  page,
  perPage,
  pages: Math.ceil(total / perPage)
})

export function toSortedFacets(rows: { value: string | null, count: number }[]): { value: string, count: number }[] {
  const merged = new Map<string, { value: string, count: number, dominantCount: number }>()

  for (const row of rows) {
    if (row.value === null) {
      continue
    }
    const key = row.value.toLowerCase()
    const existing = merged.get(key)
    if (existing) {
      existing.count += row.count
      if (row.count > existing.dominantCount) {
        existing.value = row.value
        existing.dominantCount = row.count
      }
    }
    else {
      merged.set(key, { value: row.value, count: row.count, dominantCount: row.count })
    }
  }

  return [...merged.values()]
    .map(({ value, count }) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
}
