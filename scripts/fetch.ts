import { createHash } from 'node:crypto'
import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  writeFile,
} from 'node:fs/promises'
import { join } from 'node:path'

const API_BASE_URL = 'https://www.thecocktaildb.com/api/json/v1/1'
const DRINK_INITIALS = [...'abcdefghijklmnopqrstuvwxyz0123456789']
const RAW_DIRECTORY = join(process.cwd(), 'data', 'raw')
const DRINKS_DIRECTORY = join(RAW_DIRECTORY, 'drinks')
const INGREDIENTS_DIRECTORY = join(RAW_DIRECTORY, 'ingredients')
const REQUEST_INTERVAL_MS = 250
const MAX_ATTEMPTS = 3

type ApiRecord = Record<string, unknown>

let lastRequestStartedAt = 0
let requestAttempts = 0
let skippedDrinkRequests = 0
let skippedIngredientRequests = 0

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJson(value: string): unknown {
  return JSON.parse(value) as unknown
}

function recordsFromProperty(value: unknown, property: string): ApiRecord[] {
  if (!isRecord(value)) {
    return []
  }

  const records = value[property]
  return Array.isArray(records) ? records.filter(isRecord) : []
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function waitForRequestSlot(): Promise<void> {
  const elapsed = Date.now() - lastRequestStartedAt
  const remaining = REQUEST_INTERVAL_MS - elapsed

  if (remaining > 0) {
    await delay(remaining)
  }

  lastRequestStartedAt = Date.now()
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function fetchJson(url: string): Promise<unknown> {
  let lastError: unknown

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await waitForRequestSlot()
      requestAttempts += 1
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'cocktail-lab-seed/1.0',
        },
      })

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`)
      }

      const body = await response.text()
      if (!body.trim()) {
        throw new Error('Empty response body')
      }

      return parseJson(body)
    } catch (error: unknown) {
      lastError = error
      if (attempt < MAX_ATTEMPTS) {
        const backoff = 500 * 2 ** (attempt - 1)
        console.warn(
          `Request failed (${attempt}/${MAX_ATTEMPTS}): ${errorMessage(error)}. Retrying in ${backoff} ms.`,
        )
        await delay(backoff)
      }
    }
  }

  throw new Error(`Request failed after ${MAX_ATTEMPTS} attempts`, {
    cause: lastError,
  })
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function writeJsonAtomically(path: string, value: unknown): Promise<void> {
  const temporaryPath = `${path}.${process.pid}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, path)
}

async function readDrinkFile(path: string): Promise<ApiRecord[]> {
  const parsed = parseJson(await readFile(path, 'utf8'))
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected a drink array in ${path}`)
  }

  return parsed.filter(isRecord)
}

async function getDrinkBatch(initial: string): Promise<ApiRecord[]> {
  const path = join(DRINKS_DIRECTORY, `${initial}.json`)

  if (await fileExists(path)) {
    skippedDrinkRequests += 1
    return readDrinkFile(path)
  }

  const payload = await fetchJson(
    `${API_BASE_URL}/search.php?f=${encodeURIComponent(initial)}`,
  )
  const drinks = recordsFromProperty(payload, 'drinks')
  await writeJsonAtomically(path, drinks)
  return drinks
}

function collectIngredientNames(drinks: ApiRecord[]): string[] {
  const names = new Set<string>()

  for (const drink of drinks) {
    for (let position = 1; position <= 15; position += 1) {
      const value = drink[`strIngredient${position}`]
      if (typeof value === 'string' && value.trim()) {
        names.add(value.trim())
      }
    }
  }

  return [...names].sort((left, right) => left.localeCompare(right, 'en'))
}

function safeIngredientBaseName(name: string): string {
  const sanitized = name
    .normalize('NFC')
    .replace(/\s+/g, '_')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/[ .]+$/g, '')

  return sanitized || 'ingredient'
}

function shortHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 8)
}

function ingredientFileNames(names: string[]): Map<string, string> {
  const namesByCaseInsensitiveBase = new Map<string, string[]>()

  for (const name of names) {
    const base = safeIngredientBaseName(name)
    const key = base.toLocaleLowerCase('en')
    const collisions = namesByCaseInsensitiveBase.get(key) ?? []
    collisions.push(name)
    namesByCaseInsensitiveBase.set(key, collisions)
  }

  const result = new Map<string, string>()

  for (const namesWithSameBase of namesByCaseInsensitiveBase.values()) {
    for (const name of namesWithSameBase) {
      const base = safeIngredientBaseName(name)
      const suffix =
        namesWithSameBase.length > 1 ? `__${shortHash(name)}` : ''
      result.set(name, `${base}${suffix}.json`)
    }
  }

  return result
}

async function getIngredient(
  name: string,
  fileName: string,
): Promise<void> {
  const path = join(INGREDIENTS_DIRECTORY, fileName)

  if (await fileExists(path)) {
    skippedIngredientRequests += 1
    return
  }

  const payload = await fetchJson(
    `${API_BASE_URL}/search.php?i=${encodeURIComponent(name)}`,
  )
  const ingredient = recordsFromProperty(payload, 'ingredients')[0]
  const result = ingredient ?? { strIngredient: name }

  if (!ingredient) {
    console.warn(`Ingredient could not be resolved: ${name}`)
  }

  await writeJsonAtomically(path, result)
}

async function countJsonFiles(directory: string): Promise<number> {
  const entries = await readdir(directory)
  return entries.filter((entry) => entry.endsWith('.json')).length
}

await mkdir(DRINKS_DIRECTORY, { recursive: true })
await mkdir(INGREDIENTS_DIRECTORY, { recursive: true })

const drinkBatches: ApiRecord[][] = []
for (const initial of DRINK_INITIALS) {
  drinkBatches.push(await getDrinkBatch(initial))
}

const drinks = drinkBatches.flat()
const ingredientNames = collectIngredientNames(drinks)
const fileNames = ingredientFileNames(ingredientNames)

for (const name of ingredientNames) {
  const fileName = fileNames.get(name)
  if (!fileName) {
    throw new Error(`Missing file name for ingredient: ${name}`)
  }

  await getIngredient(name, fileName)
}

console.table({
  'Drink files': await countJsonFiles(DRINKS_DIRECTORY),
  Drinks: drinks.length,
  'Ingredient names': ingredientNames.length,
  'Ingredient files': await countJsonFiles(INGREDIENTS_DIRECTORY),
  'Request attempts': requestAttempts,
  'Skipped drink requests': skippedDrinkRequests,
  'Skipped ingredient requests': skippedIngredientRequests,
})
