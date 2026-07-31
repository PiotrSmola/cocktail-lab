import { PrismaClient, Unit } from '@prisma/client'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

interface NormalizedIngredient {
  slug: string
  name: string
  type: string | null
  groupSlug: string | null
  isAlcoholic: boolean
  abv: number | null
  abvEstimated: boolean
  description: string | null
  imageUrl: string | null
}

interface NormalizedCocktailIngredient {
  ingredientSlug: string
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
}

interface NormalizedCocktail {
  externalId: string
  slug: string
  name: string
  category: string | null
  glass: string | null
  iba: string | null
  tags: string[]
  isAlcoholic: boolean
  instructions: string
  imageUrl: string | null
  imageIsCC: boolean
  imageAttribution: string | null
  sourceModifiedAt: string | null
  ingredients: NormalizedCocktailIngredient[]
}

interface NormalizedData {
  cocktails: NormalizedCocktail[]
  ingredients: NormalizedIngredient[]
}

type JsonRecord = Record<string, unknown>

const prisma = new PrismaClient()
const normalizedPath = join(process.cwd(), 'data', 'normalized.json')
const validUnits = new Set<string>(Object.values(Unit))

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseNormalizedData(value: string): NormalizedData {
  const parsed = JSON.parse(value) as unknown

  if (
    !isRecord(parsed) ||
    !Array.isArray(parsed.cocktails) ||
    !Array.isArray(parsed.ingredients)
  ) {
    throw new Error('Invalid normalized data shape')
  }

  return parsed as unknown as NormalizedData
}

function parsedUnit(value: string | null): Unit | null {
  if (value === null) {
    return null
  }

  if (!validUnits.has(value)) {
    throw new Error(`Unknown normalized unit: ${value}`)
  }

  return value as Unit
}

function parsedDate(value: string | null): Date | null {
  if (value === null) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid normalized date: ${value}`)
  }

  return parsed
}

async function readNormalizedFile(): Promise<string> {
  try {
    return await readFile(normalizedPath, 'utf8')
  } catch (error: unknown) {
    if (!isRecord(error) || error.code !== 'ENOENT') {
      throw error
    }

    console.log('Normalized data not found. Running offline normalization.')
    await import('../scripts/normalize')
    return readFile(normalizedPath, 'utf8')
  }
}

async function seed(): Promise<void> {
  const normalized = parseNormalizedData(
    await readNormalizedFile(),
  )

  for (const ingredient of normalized.ingredients) {
    const data = {
      name: ingredient.name,
      type: ingredient.type,
      groupSlug: ingredient.groupSlug,
      isAlcoholic: ingredient.isAlcoholic,
      abv: ingredient.abv,
      abvEstimated: ingredient.abvEstimated,
      description: ingredient.description,
      imageUrl: ingredient.imageUrl,
    }

    await prisma.ingredient.upsert({
      where: { slug: ingredient.slug },
      update: data,
      create: {
        slug: ingredient.slug,
        ...data,
      },
    })
  }

  const storedIngredients = await prisma.ingredient.findMany({
    where: {
      slug: {
        in: normalized.ingredients.map((ingredient) => ingredient.slug),
      },
    },
    select: {
      id: true,
      slug: true,
    },
  })
  const ingredientIds = new Map(
    storedIngredients.map((ingredient) => [
      ingredient.slug,
      ingredient.id,
    ]),
  )

  for (const cocktail of normalized.cocktails) {
    const cocktailData = {
      slug: cocktail.slug,
      name: cocktail.name,
      category: cocktail.category,
      glass: cocktail.glass,
      iba: cocktail.iba,
      tags: cocktail.tags,
      isAlcoholic: cocktail.isAlcoholic,
      instructions: cocktail.instructions,
      imageUrl: cocktail.imageUrl,
      imageIsCC: cocktail.imageIsCC,
      imageAttribution: cocktail.imageAttribution,
      sourceModifiedAt: parsedDate(cocktail.sourceModifiedAt),
    }

    await prisma.$transaction(async (transaction) => {
      const storedCocktail = await transaction.cocktail.upsert({
        where: { externalId: cocktail.externalId },
        update: cocktailData,
        create: {
          externalId: cocktail.externalId,
          ...cocktailData,
        },
      })

      await transaction.cocktailIngredient.deleteMany({
        where: { cocktailId: storedCocktail.id },
      })

      if (cocktail.ingredients.length === 0) {
        return
      }

      await transaction.cocktailIngredient.createMany({
        data: cocktail.ingredients.map((ingredient) => {
          const ingredientId = ingredientIds.get(ingredient.ingredientSlug)
          if (ingredientId === undefined) {
            throw new Error(
              `Missing stored ingredient: ${ingredient.ingredientSlug}`,
            )
          }

          return {
            cocktailId: storedCocktail.id,
            ingredientId,
            position: ingredient.position,
            amount: ingredient.amount,
            amountMax: ingredient.amountMax,
            unit: parsedUnit(ingredient.unit),
            amountMl: ingredient.amountMl,
            rawMeasure: ingredient.rawMeasure,
            note: ingredient.note,
            optional: ingredient.optional,
            garnish: ingredient.garnish,
            toTaste: ingredient.toTaste,
            topUp: ingredient.topUp,
          }
        }),
      })
    })
  }

  const [cocktails, ingredients, links] = await prisma.$transaction([
    prisma.cocktail.count(),
    prisma.ingredient.count(),
    prisma.cocktailIngredient.count(),
  ])

  console.table({
    Cocktails: cocktails,
    Ingredients: ingredients,
    'Cocktail ingredients': links,
  })
}

try {
  await seed()
} finally {
  await prisma.$disconnect()
}
