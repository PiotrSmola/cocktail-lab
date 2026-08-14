# API Contracts — Cocktail Lab

Single source of truth for parallel feature work. Frontend and backend are built against these shapes simultaneously. If an implementation must deviate, report it to the orchestrator — never change a shape silently.

## Conventions

- All endpoints live under `/api`, return JSON.
- Errors: `createError({ statusCode, statusMessage })`. Validation errors → 400, missing resources → 404, unauthenticated → 401, rate limited → 429.
- Input validation with `zod` (v4) via `getValidatedQuery` / `readValidatedBody`.
- Database access through the shared Prisma singleton `prisma` exported from `server/utils/db.ts` (auto-imported in server handlers).
- DTO types live in `shared/types/*.ts` and are imported with `import type { ... } from '#shared/types/<file>'` (works in both app and server code).
- Dates serialize as ISO strings.

## Shared DTOs

### `shared/types/catalog.ts` (owner: catalog-api agent)

```ts
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
```

### `shared/types/pantry.ts` (owner: pantry agent)

```ts
import type { CocktailCard, IngredientLite } from './catalog'

export interface PantryMatchResult {
  pantryCount: number
  makeable: CocktailCard[]
  almost: { cocktail: CocktailCard, missing: IngredientLite[] }[]
  unlocks: { ingredient: IngredientLite, unlocksCount: number, cocktails: string[] }[]
}
```

### `shared/types/auth.ts` (owner: auth-api agent)

```ts
export interface SessionUser {
  id: number
  email: string
  name: string
}
```

## Endpoints

### Catalog (owner: catalog-api agent)

`GET /api/cocktails` → `Paginated<CocktailCard>`

| Query | Type | Behaviour |
|---|---|---|
| `q` | string | case-insensitive substring on `name` |
| `spirit` | `rum\|gin\|vodka\|tequila\|whiskey\|brandy` | cocktails having an ingredient with that `groupSlug` |
| `ingredient` | string | ingredient slug — cocktails containing it |
| `alcoholic` | `'true'\|'false'` | omit = all |
| `category` | string | exact match |
| `glass` | string | exact match |
| `sort` | `'name'\|'-name'\|'recent'\|'random'` | default `name`; `recent` = `sourceModifiedAt` desc; `random` = random order |
| `page` | number ≥ 1 | default 1 |
| `perPage` | number | default 24, max 60 |

`GET /api/cocktails/random` → `{ slug: string }`

`GET /api/cocktails/meta` → `CatalogMeta` (distinct categories/glasses with counts; spirits = fixed six groupSlugs with cocktail counts)

`GET /api/cocktails/[slug]` → `CocktailDetail` (404 unknown slug; `ingredients` ordered by `position` asc)

`GET /api/ingredients` → `Paginated<IngredientCard>`
Query: `q` (substring name), `group` (groupSlug), `alcoholic` (`'true'|'false'`), `sort` (`'name'|'-name'|'popular'`, popular = by cocktailCount desc), `page`, `perPage` (default 36, max 96).

`GET /api/ingredients/[slug]` → `IngredientCard & { cocktails: CocktailCard[] }` (cocktails using it, name asc; 404 unknown)

### Pantry (owner: pantry agent)

`POST /api/pantry/match` body `{ ingredients: string[] }` (slugs, 1..300, else 400) → `PantryMatchResult`

- Required line = `optional = false AND garnish = false`. Dedupe required ingredients per cocktail by `ingredientId`.
- `makeable`: all required ingredient ids ⊆ pantry ids, sorted by name.
- `almost`: exactly 1 or 2 missing; sorted by missing count then name; cap 30 entries.
- `unlocks`: among cocktails missing exactly 1, group by the missing ingredient; top 5 by `unlocksCount` desc; `cocktails` = up to 5 example names.

### Auth (owner: auth-api agent) — sessions via `nuxt-auth-utils`

`POST /api/auth/register` body `{ email: string (email), password: string (min 8, max 72), name: string (1..50) }`
→ creates user (`hashPassword` scrypt), sets session, returns `{ user: SessionUser }`. 409 when email taken. Rate limit 10 / 10 min / IP → 429.

`POST /api/auth/login` body `{ email, password }` → sets session, `{ user: SessionUser }`. 401 `Invalid email or password` (uniform; verify against dummy hash when user not found to blunt timing enumeration). Rate limit 10 / 10 min / IP.

`POST /api/auth/logout` → clears session → `{ ok: true }`

Session payload: `setUserSession(event, { user: { id, email, name } })`. Client reads `useUserSession()`. Type augmentation for `#auth-utils` `User` in `auth.d.ts` (project root, owner: auth-api agent).

### Favorites (owner: auth-api agent; 401 without session)

- `GET /api/favorites` → `{ items: CocktailCard[] }` (newest first)
- `POST /api/favorites` body `{ cocktailId: number }` → `{ ok: true }` (idempotent; 404 unknown cocktail)
- `DELETE /api/favorites/[cocktailId]` → `{ ok: true }` (idempotent)
- `POST /api/favorites/merge` body `{ cocktailIds: number[] }` (max 500) → `{ merged: number }` (skip duplicates + unknown ids)

### Notes (owner: auth-api agent; 401 without session)

- `GET /api/notes` → `{ items: { cocktail: CocktailCard, body: string, rating: number | null, updatedAt: string }[] }`
- `PUT /api/notes/[cocktailId]` body `{ body: string (max 2000), rating: number int 1..5 | null }` → upsert → `{ ok: true }` (404 unknown cocktail)
- `DELETE /api/notes/[cocktailId]` → `{ ok: true }` (idempotent)

## Composables (owner: pantry agent, consumed by pages)

`usePantry()` → `{ slugs: Ref<string[]>, has(slug): boolean, toggle(slug): void, clear(): void, count: ComputedRef<number> }`
SSR-safe (`useState` + `useCookie('pantry')`, maxAge 180 days).

`useFavorites()` → `{ ids: Ref<number[]>, isFavorite(id): boolean, toggle(id): Promise<void>, count: ComputedRef<number>, refresh(): Promise<void>, mergeGuestToAccount(): Promise<void> }`
Guest mode: cookie `guest-favorites` (`number[]`). Logged in (`useUserSession().loggedIn`): server favorites API, optimistic toggle. `mergeGuestToAccount()` → `POST /api/favorites/merge`, clears guest cookie, refreshes. Called by auth pages after login/register.

## Data fetching conventions (pages)

- Initial page data: `useAsyncData(key, () => $fetch(...))` — SSR + no double fetch.
- Client-only interactions (search-as-you-type, pantry match, toggles): plain `$fetch`.
- Every page sets `useSeoMeta` title + description.
