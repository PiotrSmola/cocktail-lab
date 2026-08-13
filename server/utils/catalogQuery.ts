import { z } from 'zod'
import type { Prisma } from '@prisma/client'
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
  q: z.string().trim().optional(),
  spirit: z.enum(SPIRIT_GROUP_SLUGS).optional(),
  ingredient: z.string().trim().optional(),
  alcoholic: z.enum(['true', 'false']).optional(),
  category: z.string().trim().optional(),
  glass: z.string().trim().optional(),
  sort: z.enum(['name', '-name', 'recent', 'random']).default('name'),
  page: pageSchema,
  perPage: perPageSchema(24, 60)
})

const ingredientListQuerySchema = z.object({
  q: z.string().trim().optional(),
  group: z.string().trim().optional(),
  alcoholic: z.enum(['true', 'false']).optional(),
  sort: z.enum(['name', '-name', 'popular']).default('name'),
  page: pageSchema,
  perPage: perPageSchema(36, 96)
})

const catalogSlugSchema = z.string().trim().min(1)

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
  tags: true
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
    tags: row.tags
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
    where.category = query.category
  }

  if (query.glass) {
    where.glass = query.glass
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
    return [{ name: 'desc' }, { id: 'asc' }]
  }

  if (sort === 'recent') {
    return [{ sourceModifiedAt: { sort: 'desc', nulls: 'last' } }, { name: 'asc' }, { id: 'asc' }]
  }

  return [{ name: 'asc' }, { id: 'asc' }]
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
  return [{ name: sort === '-name' ? 'desc' : 'asc' }, { id: 'asc' }]
}

export async function fetchIngredientCocktailCounts(): Promise<Map<number, number>> {
  const rows = await prisma.$queryRaw<{ ingredientId: number, cocktailCount: number }[]>`
    SELECT "ingredientId", COUNT(DISTINCT "cocktailId")::int AS "cocktailCount"
    FROM "CocktailIngredient"
    GROUP BY "ingredientId"
  `

  return new Map(rows.map(row => [row.ingredientId, row.cocktailCount]))
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
  return rows
    .flatMap(row => (row.value === null ? [] : [{ value: row.value, count: row.count }]))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
}
