import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseMeasure, toMilliliters } from '../server/utils/parseMeasure'
import { slugify, uniqueSlug } from '../server/utils/slug'

export const TYPE_CANON: Readonly<Record<string, string>> = {
  aperitif: 'fortified wine',
  beer: 'beer',
  beverage: 'spirit',
  bitter: 'bitters',
  bitters: 'bitters',
  brandy: 'brandy',
  cider: 'beer',
  cola: 'soft drink',
  cordial: 'liqueur',
  cream: 'dairy',
  'fortified wine': 'fortified wine',
  fruit: 'fruit',
  'fruit juice': 'juice',
  gin: 'gin',
  juice: 'juice',
  liquer: 'liqueur',
  liqueur: 'liqueur',
  liquor: 'spirit',
  milk: 'dairy',
  mineral: 'water',
  mixer: 'soft drink',
  rum: 'rum',
  sambuca: 'liqueur',
  schnapps: 'liqueur',
  soda: 'soft drink',
  'soft drink': 'soft drink',
  spirit: 'spirit',
  stout: 'beer',
  syrup: 'syrup',
  tequila: 'tequila',
  vodka: 'vodka',
  water: 'water',
  whiskey: 'whiskey',
  whisky: 'whiskey',
  wine: 'wine',
}

export const ABV_FALLBACK: Readonly<Record<string, number>> = {
  rum: 40,
  vodka: 40,
  gin: 40,
  tequila: 38,
  whiskey: 40,
  brandy: 38,
  spirit: 38,
  liqueur: 24,
  'fortified wine': 17,
  wine: 13,
  beer: 5,
  bitters: 40,
}

export const GROUP_RULES: ReadonlyArray<readonly [string, RegExp]> = [
  ['rum', /\brum\b|cachaca|cachaça/i],
  ['vodka', /\bvodka\b/i],
  ['gin', /\bgin\b/i],
  ['tequila', /tequila|mezcal/i],
  ['whiskey', /whisk|bourbon|scotch|rye\b/i],
  ['brandy', /brandy|cognac|armagnac|pisco|calvados/i],
  ['vermouth', /vermouth/i],
  ['bitters', /bitters|angostura/i],
  ['citrus', /lemon|lime|orange|grapefruit/i],
  ['ice', /\bice\b/i],
  ['soda', /soda|tonic|cola|7-up|sprite|ginger ale|club soda/i],
  ['syrup', /syrup|grenadine/i],
  ['dairy', /cream|milk|half-and-half/i],
  ['juice', /juice/i],
]

const DATA_DIRECTORY = join(process.cwd(), 'data')
const DRINKS_DIRECTORY = join(DATA_DIRECTORY, 'raw', 'drinks')
const INGREDIENTS_DIRECTORY = join(DATA_DIRECTORY, 'raw', 'ingredients')
const NORMALIZED_PATH = join(DATA_DIRECTORY, 'normalized.json')
const UNPARSED_MEASURES_PATH = join(DATA_DIRECTORY, 'unparsed-measures.json')

type RawRecord = Record<string, unknown>

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

interface NormalizedIngredient {
  slug: string
  name: string
  type: string | null
  groupSlug: string | null
  isAlcoholic: boolean
  abv: number
  abvEstimated: boolean
  description: string | null
  imageUrl: string
}

function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJson(value: string): unknown {
  return JSON.parse(value) as unknown
}

function stringValue(record: RawRecord, key: string): string | null {
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1
  }

  return left > right ? 1 : 0
}

async function jsonFileNames(directory: string): Promise<string[]> {
  const entries = await readdir(directory)
  return entries.filter((entry) => entry.endsWith('.json')).sort(compareText)
}

async function loadDrinks(): Promise<RawRecord[]> {
  const drinks: RawRecord[] = []

  for (const fileName of await jsonFileNames(DRINKS_DIRECTORY)) {
    const path = join(DRINKS_DIRECTORY, fileName)
    const parsed = parseJson(await readFile(path, 'utf8'))
    if (!Array.isArray(parsed)) {
      throw new Error(`Expected a drink array in ${path}`)
    }

    drinks.push(...parsed.filter(isRecord))
  }

  return drinks.sort((left, right) => {
    const leftId = stringValue(left, 'idDrink') ?? ''
    const rightId = stringValue(right, 'idDrink') ?? ''
    return compareText(leftId, rightId)
  })
}

async function loadIngredientDetails(): Promise<Map<string, RawRecord>> {
  const details = new Map<string, RawRecord>()

  for (const fileName of await jsonFileNames(INGREDIENTS_DIRECTORY)) {
    const path = join(INGREDIENTS_DIRECTORY, fileName)
    const parsed = parseJson(await readFile(path, 'utf8'))
    if (!isRecord(parsed)) {
      throw new Error(`Expected an ingredient object in ${path}`)
    }

    const name = stringValue(parsed, 'strIngredient')
    if (!name) {
      throw new Error(`Missing strIngredient in ${path}`)
    }

    const slug = slugify(name)
    if (!details.has(slug)) {
      details.set(slug, parsed)
    }
  }

  return details
}

function canonicalType(rawType: string | null): string | null {
  if (rawType === null) {
    return null
  }

  const normalizedType = rawType.toLowerCase().replace(/\s+/g, ' ')
  return TYPE_CANON[normalizedType] ?? 'other'
}

function groupSlug(name: string): string | null {
  const lowerName = name.toLowerCase()

  for (const [slug, pattern] of GROUP_RULES) {
    if (pattern.test(lowerName)) {
      return slug
    }
  }

  return null
}

function explicitAbv(detail: RawRecord | undefined): number | null {
  if (!detail) {
    return null
  }

  const value = detail.strABV
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }

  const parsed = Number.parseFloat(String(value).replace('%', '').trim())
  return Number.isFinite(parsed) ? parsed : null
}

function ingredientAlcoholic(detail: RawRecord | undefined): boolean {
  if (!detail) {
    return false
  }

  return stringValue(detail, 'strAlcohol')?.toLowerCase() === 'yes'
}

function ingredientAbv(
  detail: RawRecord | undefined,
  type: string | null,
  isAlcoholic: boolean,
): { abv: number; abvEstimated: boolean } {
  const sourceAbv = explicitAbv(detail)
  if (sourceAbv !== null) {
    return { abv: sourceAbv, abvEstimated: false }
  }

  if (!isAlcoholic) {
    return { abv: 0, abvEstimated: true }
  }

  if (type !== null && ABV_FALLBACK[type] !== undefined) {
    return { abv: ABV_FALLBACK[type], abvEstimated: true }
  }

  return {
    abv: 30,
    abvEstimated: true,
  }
}

function sourceModifiedAt(value: string | null): string | null {
  if (value === null) {
    return null
  }

  const parsed = new Date(`${value.replace(' ', 'T')}Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function tags(value: string | null): string[] {
  if (value === null) {
    return []
  }

  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function collectCanonicalIngredientNames(
  drinks: RawRecord[],
): Map<string, string> {
  const names = new Map<string, string>()

  for (const drink of drinks) {
    for (let sourcePosition = 1; sourcePosition <= 15; sourcePosition += 1) {
      const name = stringValue(drink, `strIngredient${sourcePosition}`)
      if (!name) {
        continue
      }

      const slug = slugify(name)
      if (!names.has(slug)) {
        names.set(slug, name)
      }
    }
  }

  return names
}

function normalizeIngredients(
  names: Map<string, string>,
  details: Map<string, RawRecord>,
): NormalizedIngredient[] {
  const ingredients: NormalizedIngredient[] = []

  for (const [slug, name] of names) {
    const detail = details.get(slug)
    const type = canonicalType(
      detail ? stringValue(detail, 'strType') : null,
    )
    const isAlcoholic = ingredientAlcoholic(detail)
    const { abv, abvEstimated } = ingredientAbv(
      detail,
      type,
      isAlcoholic,
    )

    ingredients.push({
      slug,
      name,
      type,
      groupSlug: groupSlug(name),
      isAlcoholic,
      abv,
      abvEstimated,
      description: detail ? stringValue(detail, 'strDescription') : null,
      imageUrl: `https://www.thecocktaildb.com/images/ingredients/${encodeURIComponent(name)}.png`,
    })
  }

  return ingredients.sort((left, right) => compareText(left.slug, right.slug))
}

function normalizeCocktails(
  drinks: RawRecord[],
  unparsedMeasures: Set<string>,
): {
  cocktails: NormalizedCocktail[]
  parsedMeasureCount: number
  nonEmptyMeasureCount: number
} {
  const cocktails: NormalizedCocktail[] = []
  const takenSlugs = new Set<string>()
  let parsedMeasureCount = 0
  let nonEmptyMeasureCount = 0

  for (const drink of drinks) {
    const externalId = stringValue(drink, 'idDrink')
    const name = stringValue(drink, 'strDrink')
    if (!externalId || !name) {
      throw new Error('Drink is missing idDrink or strDrink')
    }

    const ingredients: NormalizedCocktailIngredient[] = []

    for (let sourcePosition = 1; sourcePosition <= 15; sourcePosition += 1) {
      const ingredientName = stringValue(
        drink,
        `strIngredient${sourcePosition}`,
      )
      if (!ingredientName) {
        continue
      }

      const rawMeasure =
        stringValue(drink, `strMeasure${sourcePosition}`) ?? ''
      const parsed = parseMeasure(rawMeasure)

      if (rawMeasure) {
        nonEmptyMeasureCount += 1
        if (parsed.amount !== null || parsed.unit !== null) {
          parsedMeasureCount += 1
        } else if (
          !parsed.optional &&
          !parsed.garnish &&
          !parsed.toTaste &&
          !parsed.topUp
        ) {
          unparsedMeasures.add(rawMeasure)
        }
      }

      ingredients.push({
        ingredientSlug: slugify(ingredientName),
        position: ingredients.length,
        amount: parsed.amount,
        amountMax: parsed.amountMax,
        unit: parsed.unit,
        amountMl: toMilliliters(parsed.amount, parsed.unit),
        rawMeasure,
        note: parsed.note,
        optional: parsed.optional,
        garnish: parsed.garnish,
        toTaste: parsed.toTaste,
        topUp: parsed.topUp,
      })
    }

    cocktails.push({
      externalId,
      slug: uniqueSlug(slugify(name), takenSlugs),
      name,
      category: stringValue(drink, 'strCategory'),
      glass: stringValue(drink, 'strGlass'),
      iba: stringValue(drink, 'strIBA'),
      tags: tags(stringValue(drink, 'strTags')),
      isAlcoholic:
        stringValue(drink, 'strAlcoholic')?.toLowerCase() !==
        'non alcoholic',
      instructions: stringValue(drink, 'strInstructions') ?? '',
      imageUrl: stringValue(drink, 'strDrinkThumb'),
      imageIsCC:
        stringValue(
          drink,
          'strCreativeCommonsConfirmed',
        )?.toLowerCase() === 'yes',
      imageAttribution: stringValue(drink, 'strImageAttribution'),
      sourceModifiedAt: sourceModifiedAt(
        stringValue(drink, 'dateModified'),
      ),
      ingredients,
    })
  }

  return { cocktails, parsedMeasureCount, nonEmptyMeasureCount }
}

await mkdir(DATA_DIRECTORY, { recursive: true })

const drinks = await loadDrinks()
const ingredientDetails = await loadIngredientDetails()
const canonicalIngredientNames = collectCanonicalIngredientNames(drinks)
const ingredients = normalizeIngredients(
  canonicalIngredientNames,
  ingredientDetails,
)
const unparsedMeasureSet = new Set<string>()
const {
  cocktails,
  parsedMeasureCount,
  nonEmptyMeasureCount,
} = normalizeCocktails(drinks, unparsedMeasureSet)
const unparsedMeasures = [...unparsedMeasureSet].sort(compareText)

await writeFile(
  NORMALIZED_PATH,
  `${JSON.stringify({ cocktails, ingredients }, null, 2)}\n`,
  'utf8',
)
await writeFile(
  UNPARSED_MEASURES_PATH,
  `${JSON.stringify(unparsedMeasures, null, 2)}\n`,
  'utf8',
)

const parserCoverage =
  nonEmptyMeasureCount === 0
    ? 100
    : (parsedMeasureCount / nonEmptyMeasureCount) * 100

console.table({
  Cocktails: cocktails.length,
  Ingredients: ingredients.length,
  'Ingredients without groupSlug': ingredients.filter(
    (ingredient) => ingredient.groupSlug === null,
  ).length,
  'Alcoholic ingredients with estimated ABV': ingredients.filter(
    (ingredient) => ingredient.isAlcoholic && ingredient.abvEstimated,
  ).length,
  'Unique unparsed measures': unparsedMeasures.length,
  'Parsed non-empty measures': `${parsedMeasureCount}/${nonEmptyMeasureCount} (${parserCoverage.toFixed(2)}%)`,
})
