import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { AbvLineInput, DilutionMethod } from '../app/utils/abv'
import { detectDilution, estimateAbv } from '../app/utils/abv'
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
  nameSort: string
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
  abv: number | null
  abvEstimated: boolean
  dilutionMethod: DilutionMethod
  ingredients: NormalizedCocktailIngredient[]
}

interface NormalizedIngredient {
  slug: string
  name: string
  nameSort: string
  type: string | null
  groupSlug: string | null
  isAlcoholic: boolean
  abv: number
  abvEstimated: boolean
  description: string | null
  imageUrl: string
}

export interface IngredientStrengthProfile {
  abv: number | null
  abvEstimated: boolean
  isAlcoholic: boolean
}

export interface CocktailStrength {
  abv: number | null
  abvEstimated: boolean
  dilutionMethod: DilutionMethod
}

interface CocktailStrengthInput {
  instructions: string
  ingredients: ReadonlyArray<{
    ingredientSlug: string
    amountMl: number | null
  }>
}

const CASE_SENSITIVE_COCKTAIL_FIELDS = ['category', 'glass', 'iba'] as const

type CaseSensitiveCocktailField =
  (typeof CASE_SENSITIVE_COCKTAIL_FIELDS)[number]

interface CasingReport {
  Field: CaseSensitiveCocktailField
  'Distinct before': number
  'Distinct after': number
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

export function nameSortKey(name: string): string {
  return name.trim().toLowerCase()
}

export function canonicalCasingMap(
  values: Iterable<string>,
): Map<string, string> {
  const variantCounts = new Map<string, Map<string, number>>()

  for (const value of values) {
    const key = value.toLowerCase()
    let counts = variantCounts.get(key)

    if (!counts) {
      counts = new Map<string, number>()
      variantCounts.set(key, counts)
    }

    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  const canonicalByKey = new Map<string, string>()

  for (const [key, counts] of variantCounts) {
    let canonical = ''
    let canonicalCount = -1

    for (const [variant, count] of counts) {
      const winsOnCount = count > canonicalCount
      const winsOnOrder =
        count === canonicalCount && compareText(variant, canonical) < 0

      if (winsOnCount || winsOnOrder) {
        canonical = variant
        canonicalCount = count
      }
    }

    canonicalByKey.set(key, canonical)
  }

  return canonicalByKey
}

export function canonicalCasing(
  canonicalByKey: ReadonlyMap<string, string>,
  value: string | null,
): string | null {
  if (value === null) {
    return null
  }

  return canonicalByKey.get(value.toLowerCase()) ?? value
}

export function cocktailStrength(
  cocktail: CocktailStrengthInput,
  profileBySlug: ReadonlyMap<string, IngredientStrengthProfile>,
): CocktailStrength {
  const dilutionMethod = detectDilution(cocktail.instructions)
  const lines: AbvLineInput[] = cocktail.ingredients.map((ingredient) => {
    const profile = profileBySlug.get(ingredient.ingredientSlug)
    if (!profile) {
      throw new Error(
        `Missing ingredient profile: ${ingredient.ingredientSlug}`,
      )
    }

    return { amountMl: ingredient.amountMl, ingredient: profile }
  })

  const estimate = estimateAbv(lines, dilutionMethod)

  return {
    abv: estimate.abv,
    abvEstimated: estimate.estimated,
    dilutionMethod,
  }
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
      nameSort: nameSortKey(name),
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

function strengthProfiles(
  ingredients: NormalizedIngredient[],
): Map<string, IngredientStrengthProfile> {
  return new Map(
    ingredients.map((ingredient) => [
      ingredient.slug,
      {
        abv: ingredient.abv,
        abvEstimated: ingredient.abvEstimated,
        isAlcoholic: ingredient.isAlcoholic,
      },
    ]),
  )
}

function canonicalizeCocktailCasing(
  cocktails: NormalizedCocktail[],
): CasingReport[] {
  return CASE_SENSITIVE_COCKTAIL_FIELDS.map((field) => {
    const values = cocktails
      .map((cocktail) => cocktail[field])
      .filter((value): value is string => value !== null)
    const canonicalByKey = canonicalCasingMap(values)

    for (const cocktail of cocktails) {
      cocktail[field] = canonicalCasing(canonicalByKey, cocktail[field])
    }

    return {
      Field: field,
      'Distinct before': new Set(values).size,
      'Distinct after': canonicalByKey.size,
    }
  })
}

function normalizeCocktails(
  drinks: RawRecord[],
  profileBySlug: ReadonlyMap<string, IngredientStrengthProfile>,
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

    const instructions = stringValue(drink, 'strInstructions') ?? ''
    const strength = cocktailStrength(
      { instructions, ingredients },
      profileBySlug,
    )

    cocktails.push({
      externalId,
      slug: uniqueSlug(slugify(name), takenSlugs),
      name,
      nameSort: nameSortKey(name),
      category: stringValue(drink, 'strCategory'),
      glass: stringValue(drink, 'strGlass'),
      iba: stringValue(drink, 'strIBA'),
      tags: tags(stringValue(drink, 'strTags')),
      isAlcoholic:
        stringValue(drink, 'strAlcoholic')?.toLowerCase() !==
        'non alcoholic',
      instructions,
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
      abv: strength.abv,
      abvEstimated: strength.abvEstimated,
      dilutionMethod: strength.dilutionMethod,
      ingredients,
    })
  }

  return { cocktails, parsedMeasureCount, nonEmptyMeasureCount }
}

export async function runNormalization(): Promise<void> {
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
  } = normalizeCocktails(
    drinks,
    strengthProfiles(ingredients),
    unparsedMeasureSet,
  )
  const casingReports = canonicalizeCocktailCasing(cocktails)
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
  const measuredCocktails = cocktails.filter(
    (cocktail) => cocktail.abv !== null,
  )
  const zeroProofCocktails = measuredCocktails.filter(
    (cocktail) => cocktail.abv === 0,
  )

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
    'Cocktails with materialised ABV': `${measuredCocktails.length}/${cocktails.length}`,
    'Cocktails at 0% ABV': zeroProofCocktails.length,
  })
  console.table(casingReports)
}

function isDirectRun(): boolean {
  const entryPoint = process.argv[1]
  return (
    entryPoint !== undefined &&
    import.meta.url === pathToFileURL(entryPoint).href
  )
}

if (isDirectRun()) {
  await runNormalization()
}
