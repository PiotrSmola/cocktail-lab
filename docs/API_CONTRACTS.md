# API Contracts — Cocktail Lab

This document started life as a pre-implementation contract, written so the front end and back end
could be built against the same shapes in parallel. It is now kept **in sync with the code**: every
shape and status code below was read out of `server/api/**`, `shared/types/**` and verified against a
running dev server. If an implementation must deviate, update this file in the same change.

## Conventions

- All endpoints live under `/api`, return JSON.
- Errors: `createError({ statusCode, statusMessage })`. Validation errors → 400, missing resources →
  404, unauthenticated → 401, conflict → 409, rate limited → 429.
- Input validation with `zod` (v4) via `getValidatedQuery` / `readValidatedBody` /
  `getValidatedRouterParams`.
- Database access through the shared Prisma singleton `prisma` exported from `server/utils/db.ts`
  (auto-imported in server handlers).
- DTO types live in `shared/types/*.ts` and are imported with
  `import type { ... } from '#shared/types/<file>'` (works in both app and server code).
- Dates serialize as ISO strings.
- Auth-guarded handlers call `requireUser(event)` (`server/utils/session.ts`), which wraps
  `requireUserSession` and returns `SessionUser`. Without a session they answer **401 `Unauthorized`**.

## Shared DTOs

### `shared/types/catalog.ts`

Strength bands are defined **once, here**, and consumed by the list query parser, the meta facet, the
filter pills, the cards and the detail meter — so a band edit cannot drift between API and UI.

```ts
export const STRENGTH_BAND_VALUES = ['zero', 'easy', 'balanced', 'strong', 'spirit-forward'] as const
export type StrengthBandValue = typeof STRENGTH_BAND_VALUES[number]

export interface StrengthBandRange { gt?: number, gte?: number, lt?: number, lte?: number }
export interface StrengthBand { value: StrengthBandValue, label: string, range: StrengthBandRange }

export const UNMEASURED_STRENGTH_LABEL = 'Unmeasured'

export const STRENGTH_BANDS: readonly StrengthBand[] = [
  { value: 'zero',           label: 'Zero proof',     range: { lte: 0 } },
  { value: 'easy',           label: 'Easy going',     range: { gt: 0, lt: 10 } },
  { value: 'balanced',       label: 'Balanced',       range: { gte: 10, lt: 20 } },
  { value: 'strong',         label: 'Strong',         range: { gte: 20, lt: 30 } },
  { value: 'spirit-forward', label: 'Spirit-forward', range: { gte: 30 } }
]

// Helpers shared by both sides:
strengthBandOf(abv: number | null | undefined): StrengthBandValue | null  // null ⇒ unmeasured
strengthBandRange(value: StrengthBandValue): StrengthBandRange            // used as a Prisma filter
strengthBandLabel(abv: number | null | undefined): string                 // 'Unmeasured' when null
strengthValueLabel(value: string): string
```

`abv` is `null` when a drink has alcoholic lines but no parseable measures for them — that reads as
*unmeasured*, **not** as zero proof. Only a genuine `abv <= 0` is `zero`.

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
  abv?: number | null        // materialised at seed time
  abvEstimated?: boolean     // true when any input to the estimate was itself estimated
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
  abv: number | null          // required (not optional) on the detail DTO
  abvEstimated: boolean
  dilutionMethod: string | null   // 'shake' | 'stir' | 'build', inferred from the instructions
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
  strengths: { value: StrengthBandValue, count: number }[]
}
```

### `shared/types/pantry.ts`

```ts
import type { CocktailCard, IngredientLite } from './catalog'

export interface PantrySubstitution {
  required: IngredientLite     // what the recipe asks for
  substitute: IngredientLite   // what you actually own and can stand in
}

export interface PantrySubstitutedCocktail {
  cocktailId: number
  substitutions: PantrySubstitution[]
}

export interface PantryMatchResult {
  pantryCount: number
  makeable: CocktailCard[]
  almost: { cocktail: CocktailCard, missing: IngredientLite[], substitutions: PantrySubstitution[] }[]
  unlocks: {
    ingredient: IngredientLite
    unlocksCount: number
    cocktails: string[]
    substitutesFor: IngredientLite[]
  }[]
  exactCount: number                          // makeable entries needing no substitution
  substituted: PantrySubstitutedCocktail[]    // the rest of `makeable`, with what was swapped
}
```

### `shared/types/pantryAccount.ts`

```ts
import type { IngredientLite } from './catalog'

export interface PantryListResponse { items: IngredientLite[] }
export interface PantryMutationResponse { ok: true }
export interface PantryMergeResponse { merged: number }
```

### `shared/types/stats.ts`

```ts
export interface CatalogStats {
  cocktails: number
  ingredients: number
  pairings: number                  // CocktailIngredient rows
  alcoholicCocktails: number
  zeroProofCocktails: number        // derived: cocktails - alcoholicCocktails
  ibaCocktails: number
  avgIngredientsPerCocktail: number // pairings / cocktails, one decimal
  sourceUpdatedAt: string | null    // max Cocktail.sourceModifiedAt, ISO
}

buildCatalogStats(input: CatalogStatsInput): CatalogStats   // pure, unit-tested, clamps nonsense
```

### `shared/types/auth.ts`

```ts
export interface SessionUser {
  id: number
  email: string
  name: string
}
```

### `shared/utils/pantryCookie.ts`

Shared between the guest-cookie composables and their tests. Guest state lives in cookies, so it is
budgeted rather than unbounded.

```ts
export const GUEST_PANTRY_LIMIT = 80          // slugs a guest pantry cookie may hold
export const GUEST_FAVORITES_LIMIT = 100      // ids a guest favorites cookie may hold
export const PANTRY_MERGE_LIMIT = 300         // slugs sent to /api/pantry/merge
export const GUEST_COOKIE_BUDGET_BYTES = 3072 // per-cookie budget under the ~4096 byte browser limit

capList<T>(values: T[], limit: number): T[]
withoutEntry<T>(values: T[], entry: T): T[]
addWithinLimit<T>(values, entry, limit, prepend?): { values: T[], capped: boolean }
buildMergeSlugs(values: string[]): string[]   // trim, drop blanks, dedupe, cap at PANTRY_MERGE_LIMIT
indexIngredientIds(items: { id: number, slug: string }[]): Record<string, number>
encodedCookieBytes(name: string, values: unknown): number
```

Why the caps exist: all 299 ingredient slugs serialised as one cookie encode to **5,958 bytes**, well
past the ~4,096-byte per-cookie browser limit — the cookie would be silently dropped. The 80 longest
slugs encode to 2,047 bytes, inside the 3,072-byte budget. `tests/pantryCookie.spec.ts` asserts both
directions so the limits cannot drift.

## Endpoints

22 handlers under `/api`, plus `server/api/__sitemap__/urls.ts`, which is not a public JSON endpoint
— it is the database-backed source `@nuxtjs/seo` reads to build `sitemap.xml`.

| Group | Endpoints |
|---|---|
| Catalog | `GET /api/cocktails`, `/cocktails/[slug]`, `/cocktails/meta`, `/cocktails/random` |
| Ingredients | `GET /api/ingredients`, `/ingredients/[slug]` |
| Stats | `GET /api/stats` |
| Pantry (guest + account) | `POST /api/pantry/match` |
| Pantry (account only) | `GET /api/pantry`, `POST /api/pantry`, `DELETE /api/pantry/[ingredientId]`, `POST /api/pantry/merge` |
| Auth | `POST /api/auth/register`, `/auth/login`, `/auth/logout` |
| Favorites | `GET /api/favorites`, `POST /api/favorites`, `DELETE /api/favorites/[cocktailId]`, `POST /api/favorites/merge` |
| Notes | `GET /api/notes`, `PUT /api/notes/[cocktailId]`, `DELETE /api/notes/[cocktailId]` |

### Catalog

`GET /api/cocktails` → `Paginated<CocktailCard>`

| Query | Type | Behaviour |
|---|---|---|
| `q` | string, max 120 | case-insensitive substring on `name` |
| `spirit` | `rum\|gin\|vodka\|tequila\|whiskey\|brandy` | cocktails having an ingredient with that `groupSlug` |
| `ingredient` | string, max 120 | ingredient slug — cocktails containing it |
| `alcoholic` | `'true'\|'false'` | omit = all |
| `category` | string, max 120 | case-insensitive equality |
| `glass` | string, max 120 | case-insensitive equality |
| `strength` | `zero\|easy\|balanced\|strong\|spirit-forward` | maps to a numeric `abv` range via `strengthBandRange`; rows with `abv = null` match **no** band |
| `sort` | `name\|-name\|recent\|random\|strength\|-strength` | default `name` |
| `page` | number ≥ 1 | default 1 |
| `perPage` | number | default 24, clamped to 1..60 |

- `spirit` and `ingredient` combine as **AND** (each becomes its own `ingredients: { some: … }` clause).
- Blank string values are stripped before validation, so `?q=&glass=` behaves like omitting them.
- Unknown enum values are a **400** with a readable message, e.g.
  `Invalid query: strength: Invalid option: expected one of "zero"|"easy"|…`.

`GET /api/cocktails/random` → `{ slug: string }` — 404 when the catalog is empty. Never cached.

`GET /api/cocktails/meta` → `CatalogMeta`

- `categories` / `glasses`: distinct values with counts, case-insensitively merged (the most frequent
  casing wins as the display value), sorted by count desc then value.
- `spirits`: the fixed six `groupSlug`s with cocktail counts.
- `strengths`: one entry per band in `STRENGTH_BANDS`, counted with the same range filter the list
  endpoint uses. Because the ranges are numeric, cocktails with `abv = null` are counted in no band —
  the facet counts sum to the number of cocktails that have a materialised ABV, not to the catalog
  total.

`GET /api/cocktails/[slug]` → `CocktailDetail`. 404 on unknown slug, 400 on an empty/oversized slug
(1..200 chars). `ingredients` ordered by `position` asc.

`GET /api/ingredients` → `Paginated<IngredientCard>`
Query: `q` (substring name, max 120), `group` (`groupSlug`), `alcoholic` (`'true'|'false'`),
`sort` (`name|-name|popular`; `popular` = `cocktailCount` desc, resolved in one raw SQL page query),
`page`, `perPage` (default 36, clamped to 1..96).

`GET /api/ingredients/[slug]` → `IngredientCard & { cocktails: CocktailCard[] }` — cocktails using
it, name asc; `cocktailCount` equals `cocktails.length`. 404 unknown.

### Stats

`GET /api/stats` → `CatalogStats`

Live catalogue figures read from the database, so the landing page, `/ingredients` and the pantry
picker no longer hardcode counts. Cached (`defineCachedFunction`, 1 h + SWR) and served with
`cache-control: public, s-maxage=3600, stale-while-revalidate=60`.

### Sort semantics and collation

Name ordering does **not** use `name`. Both `Cocktail` and `Ingredient` carry a `nameSort` column
(`lower(name)`, written by the seed, backfilled by the migration, indexed), and every name-ordered
query sorts on that instead.

The reason is the database's collation. The stack runs `postgres:17-alpine`, whose musl libc gives
`en_US.utf8` byte-order semantics rather than true locale collation — so `ORDER BY name` puts every
capitalised name before every lowercase one:

```text
ORDER BY name          ORDER BY lower(name)
  Banana                 apple juice
  Blackstrap rum         Banana
  Zima                   Blackstrap rum
  apple juice            Zima
```

`blackstrap rum` sorting after `Zima` is not a hypothetical — it is what the raw dataset's mixed
casing produced. Sorting on `nameSort` makes the order case-insensitive and stable regardless of the
host's collation.

Every ordering is fully deterministic — each `orderBy` ends in `id: asc`, so pagination cannot drop
or repeat a row on ties:

| `sort` | Order |
|---|---|
| `name` (default) | `nameSort` asc, `id` asc |
| `-name` | `nameSort` desc, `id` asc |
| `recent` | `sourceModifiedAt` desc (nulls last), `nameSort` asc, `id` asc |
| `strength` | `abv` asc (nulls last), `nameSort` asc, `id` asc |
| `-strength` | `abv` desc (nulls last), `nameSort` asc, `id` asc |
| `random` | shuffled ids, paginated after the shuffle; uncached |

### Caching

| Endpoint | Mechanism | `cache-control` |
|---|---|---|
| `GET /api/cocktails` | `defineCachedFunction` (1 h, SWR) around the query | `public, s-maxage=3600, stale-while-revalidate=60` |
| `GET /api/cocktails` with `sort=random` | none — bypasses the cached function entirely | `no-store` |
| `GET /api/cocktails/[slug]` | `defineCachedEventHandler` (1 h, SWR) | `s-maxage=3600, stale-while-revalidate` |
| `GET /api/cocktails/meta` | `defineCachedEventHandler` (1 h, SWR) | `s-maxage=3600, stale-while-revalidate` |
| `GET /api/ingredients` | `defineCachedEventHandler` (1 h, SWR) | `s-maxage=3600, stale-while-revalidate` |
| `GET /api/ingredients/[slug]` | `defineCachedEventHandler` (1 h, SWR) | `s-maxage=3600, stale-while-revalidate` |
| `GET /api/stats` | `defineCachedFunction` (1 h, SWR) | `public, s-maxage=3600, stale-while-revalidate=60` |
| `GET /api/cocktails/random` | never cached | — |
| Everything auth-guarded, and `POST /api/pantry/match` | never cached | — |

`/api/cocktails` and `/api/stats` cache the *function*, not the handler, so the handler can still set
its own header and branch on `sort=random` before the cache is consulted.

Cache keys are built from the **validated** query object by `catalogQueryCacheKey`
(`server/utils/catalogCache.ts`): a closed field set, blanks dropped, each key and value
percent-ish-encoded (`[^a-zA-Z0-9]` → `_<hex>_`) before joining, then sorted. Unknown params never
reach the key, so they can neither collide with a real query nor mint unbounded cache entries. Slug
handlers use `catalogSlugCacheKey` with the same encoding.

### Pantry — matching (no session required)

`POST /api/pantry/match` body `{ ingredients: string[] }` → `PantryMatchResult`

- `ingredients`: **1..300** entries, each 1..200 chars. Outside that → **400**. (This limit was
  raised from 100 when substitution matching landed.)
- Slugs are trimmed, lowercased and deduped; unknown slugs are silently dropped. `pantryCount` is the
  count of **recognised** slugs, not of submitted ones. If nothing is recognised, the response is the
  empty result with `pantryCount: 0`.
- A "required" line is `optional = false AND garnish = false`. Required ingredients are deduped per
  cocktail by `ingredientId`.
- The static required-ingredients map and the substitute graph are built once and memoised in process
  memory (the promise is cleared on failure so a transient DB error does not poison it).

**Substitution model** (`server/utils/substitutes.ts`):

- `SUBSTITUTE_CLUSTERS` — curated groups whose members stand in for each other symmetrically
  (`light-rum`/`dark-rum`/`gold-rum`…, `bourbon`/`rye-whiskey`/`whisky`…, `cointreau`/`triple-sec`,
  `sweet-vermouth`/`vermouth`, `club-soda`/`soda-water`, `heavy-cream`/`half-and-half`, …).
- `DIRECTED_SUBSTITUTES` — one-way edges, where the substitute is the raw material for the
  requirement: `lime-juice ← lime`, `orange-peel ← orange`, `egg-white ← egg`,
  `bitters ← angostura-bitters`, …
- A candidate is only accepted if its `isAlcoholic` flag **matches** the ingredient it replaces, so a
  zero-proof stand-in can never silently make an alcoholic drink "makeable".

**Result construction:**

- `makeable` — every required ingredient is either owned outright or covered by an accepted
  stand-in. Sorted exact-matches-first, then by name within each group.
- `exactCount` — how many of `makeable` needed no substitution at all.
- `substituted` — the remainder of `makeable`, as `{ cocktailId, substitutions[] }`, so the UI can
  label a card with *"With substitutes — Sweet Vermouth for Vermouth"*. Each entry's `substitutions`
  are sorted by the required ingredient's name.
- `almost` — 1 or 2 required ingredients missing after substitution. Sorted by missing count then
  name, capped at **30** entries. Carries its own `substitutions` (stand-ins already applied) and
  `missing` (what is still genuinely absent, name-sorted).
- `unlocks` — among cocktails missing exactly one ingredient, the single bottles that would unlock
  the most. Both the missing ingredient itself and anything that could substitute for it are ranked
  as candidates; a candidate already in the pantry is skipped. A candidate is dropped as redundant
  when an already-kept candidate is interchangeable with it *and* covers every one of its cocktails.
  Ranked by `unlocksCount` desc, then exact (non-substitute) coverage desc, then ingredient name;
  top **5**. `cocktails` = up to 5 example names (name-sorted). `substitutesFor` lists the
  ingredients this bottle would stand in for, and is empty when it is an exact match.

### Pantry — account storage (401 without session)

Backed by the `PantryItem` table (`@@id([userId, ingredientId])`, cascading deletes on both sides).

- `GET /api/pantry` → `PantryListResponse` — the signed-in user's ingredients as `IngredientLite[]`,
  ordered by ingredient name asc then `ingredientId` asc.
- `POST /api/pantry` body `{ ingredientId: number }` (positive int) → `{ ok: true }`. Idempotent
  (upsert). **404** `Ingredient not found` for an unknown id, **400** for a malformed body.
- `DELETE /api/pantry/[ingredientId]` → `{ ok: true }`. Idempotent (`deleteMany`, no 404 when absent).
  **400** when the route param is not a positive integer.
- `POST /api/pantry/merge` body `{ slugs: string[] }` (each 1..120 chars, **max 300**, else 400) →
  `{ merged: number }`. Deduped, resolved to ids, inserted with `skipDuplicates`. `merged` is the
  number of submitted slugs that **exist in the catalog** — it counts matched ingredients, including
  ones already in the pantry, not rows newly inserted. Empty or all-unknown input returns
  `{ merged: 0 }`.

`POST /api/pantry/merge` does double duty: it is both the login-time guest-cookie merge and the way
`usePantry()` adds a slug whose ingredient id it has not yet learned.

### Auth — sessions via `nuxt-auth-utils`

`POST /api/auth/register` body `{ email, password, name }` — email trimmed and lowercased then
validated as an email; `password` 8..72; `name` trimmed, 1..50.
→ creates the user (`hashPassword`, scrypt), sets the session, returns `{ user: SessionUser }`.
**409** `Email already registered` (checked up front and again on the Prisma `P2002` unique
violation, so a race cannot 500). Rate limit 10 / 10 min / IP → **429**.

`POST /api/auth/login` body `{ email, password }` (password 1..72) → sets session, `{ user: SessionUser }`.
**401** `Invalid email or password` — uniform for unknown email and wrong password; when the user is
not found the handler still verifies against a module-level dummy hash so response time does not leak
account existence. Rate limit 10 / 10 min / IP.

`POST /api/auth/logout` → clears the session → `{ ok: true }`. Succeeds (200) even with no session.

Session payload: `setUserSession(event, { user: { id, email, name } })`. Client reads
`useUserSession()`. Type augmentation for `#auth-utils` `User` lives in `auth.d.ts` at the project
root, pulled into server code by a `/// <reference>` in `server/utils/session.ts` (an `import` would
be elided and `session.user` would lose its type).

Rate limiting (`server/utils/rateLimit.ts`) is an in-memory sliding window keyed by
`bucket:ip`. The client IP comes from `getRequestIP(event, { xForwardedFor: process.env.TRUST_PROXY === 'true' })`
— `x-forwarded-for` is honoured **only** when `TRUST_PROXY=true`, because otherwise any client could
spoof the header and get a fresh bucket per request.

### Favorites (401 without session)

- `GET /api/favorites` → `{ items: CocktailCard[] }` — newest first (`createdAt` desc, `cocktailId` desc).
- `POST /api/favorites` body `{ cocktailId: number }` → `{ ok: true }` (idempotent; 404 unknown cocktail)
- `DELETE /api/favorites/[cocktailId]` → `{ ok: true }` (idempotent)
- `POST /api/favorites/merge` body `{ cocktailIds: number[] }` (max 500) → `{ merged: number }`
  — same semantics as the pantry merge: `merged` counts submitted ids that exist, inserted with
  `skipDuplicates`.

### Notes (401 without session)

- `GET /api/notes` → `{ items: { cocktail: CocktailCard, body: string, rating: number | null, updatedAt: string }[] }`
  — `updatedAt` desc.
- `PUT /api/notes/[cocktailId]` body `{ body: string (max 2000), rating: int 1..5 | null }` → upsert →
  `{ ok: true }` (404 unknown cocktail). `rating` defaults to `null` when omitted.
- `DELETE /api/notes/[cocktailId]` → `{ ok: true }` (idempotent)

## Composables

### `usePantry()` — dual-mode (cookie for guests, database when signed in)

```ts
usePantry(): {
  slugs: WritableComputedRef<string[]>
  has(slug: string): boolean
  toggle(slug: string): Promise<void>
  clear(): void
  count: ComputedRef<number>
  synced: ComputedRef<boolean>        // true ⇒ backed by the account, not a cookie
  atLimit: ComputedRef<boolean>       // guest only: cookie cap reached
  guestLimit: number                  // GUEST_PANTRY_LIMIT (80)
  rememberIds(items: { id: number, slug: string }[]): void
  refresh(): Promise<void>
  hydrate(): Promise<void>            // loads the account pantry once, if signed in
  mergeGuestPantry(): Promise<void>
}
```

- **Guest**: `useState` + `useCookie('pantry')` (`maxAge` 15,552,000 s = 180 days), capped at
  `GUEST_PANTRY_LIMIT`. Hitting the cap raises a toast pointing at `/login?redirect=/pantry` rather
  than silently dropping the ingredient.
- **Signed in**: `GET /api/pantry` on first use, then optimistic `toggle()` writing through to
  `POST /api/pantry` / `DELETE /api/pantry/[id]`, rolling the local state back if the request fails.
  Slug→id lookups are cached in `useState`; an unknown slug falls back to `POST /api/pantry/merge`
  with a single slug and then re-reads the index.
- `mergeGuestPantry()` posts the capped guest cookie to `POST /api/pantry/merge`, clears the cookie
  on success and reloads the account pantry. Called by the login and register pages, mirroring
  favorites.
- SSR-safe throughout; account reads use `useRequestFetch()` so the session cookie is forwarded.

### `useFavorites()`

```ts
useFavorites(): {
  ids: WritableComputedRef<number[]>
  isFavorite(id: number): boolean
  toggle(id: number): Promise<void>
  count: ComputedRef<number>
  refresh(): Promise<void>
  mergeGuestToAccount(): Promise<void>
}
```

Guest mode: cookie `guest-favorites` (`number[]`, 180 days), capped at `GUEST_FAVORITES_LIMIT`
(100), with the same cap toast. Signed in (`useUserSession().loggedIn`): the favorites API with an
optimistic toggle and rollback. `mergeGuestToAccount()` → `POST /api/favorites/merge`, clears the
guest cookie, refreshes. Called by the auth pages after login/register.

## Data fetching conventions (pages)

- Initial page data: `useAsyncData(key, () => $fetch(...))` — SSR + no double fetch.
- Client-only interactions (search-as-you-type, pantry match, toggles): plain `$fetch`.
- Anything that must carry the session cookie during SSR: `useRequestFetch()`.
- Every page sets `useSeoMeta` title + description.
