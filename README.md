# Cocktail Lab 🍸

A craft-cocktail encyclopedia, pantry matcher and bartender calculator, built as a portfolio project
to learn **Nuxt 4** end to end: server routes, SSR data fetching, sessions, Prisma, SEO and a
design-heavy front end. It ships a curated offline dataset (441 cocktails, 299 ingredients, 1,730
ingredient links derived from [TheCocktailDB](https://www.thecocktaildb.com/)), answers the question
*"what can I actually make tonight?"* from the bottles you own, and estimates the strength of every
drink it has enough measures for instead of just printing a recipe. It runs entirely locally in
Docker — there is no hosted deployment and no production target.

---

## Features

### The three that matter

- **"What can I make?" pantry matching, substitute-aware.** Tick the bottles on your shelf;
  `POST /api/pantry/match` returns everything you can make right now, everything you're 1–2
  ingredients short of, and — the interesting part — a **buy-one-bottle-unlocks-N** ranking: the five
  single ingredients that would unlock the most new cocktails, with example drinks for each.
  A curated substitution graph (`server/utils/substitutes.ts`) means a drink can also be *makeable
  with substitutes*: bourbon stands in for rye, `lime` for `lime-juice`, `sweet-vermouth` for plain
  `vermouth`. The result separates `exactCount` from `substituted[]` so the UI can say which drinks
  lean on a stand-in, and a candidate is only accepted when its alcoholic flag matches the ingredient
  it replaces — a zero-proof swap can never quietly "unlock" a spirit-forward drink.
- **ABV estimation with dilution honesty.** Per-drink strength is computed from measured volumes and
  per-ingredient ABV, then divided by a dilution factor inferred from the instructions
  (shake 25% / stir 20% / build 12%). Whenever any input is estimated — an ingredient without a
  source ABV, or a line with no parseable measure — the reading is prefixed with `≈` instead of
  pretending to be precise. Of 133 alcoholic ingredients, 40 carry an ABV from the source data and
  93 are estimated from a per-type table. When *every* alcoholic line is unmeasured the estimate is
  `null`, which reads as **"Not enough measures"** rather than "zero proof" — a sangria is not a soft
  drink. 395 of 441 cocktails carry a materialised ABV; the other 46 are deliberately unknown.
- **Serving scaler.** Step the ingredient list from 1 to N servings; amounts, ranges and millilitre
  conversions scale together, and unparsed measures fall back to `raw measure ×N` rather than lying.

### Everything else

- **Strength filter.** `Cocktail.abv` is materialised at seed time, so strength is a first-class
  facet: filter by band (`zero` / `easy` / `balanced` / `strong` / `spirit-forward`) or sort by
  `strength` / `-strength`. The bands are defined **once** in `shared/types/catalog.ts` and shared by
  the query parser, the meta facet, the filter pills, the cards and the detail meter — so a band edit
  cannot drift between API and UI.
- **Account pantry that syncs.** Signed out, your shelf is a cookie; signed in, it is the
  `PantryItem` table, and the guest cookie is merged into the account on login/registration
  (`POST /api/pantry/merge`) exactly the way favorites already were. `usePantry()` is one dual-mode
  composable rather than two code paths in the pages. Guest cookies are capped (80 ingredients, 100
  favorites) because all 299 slugs in one cookie encode to 5,958 bytes — past the ~4,096-byte browser
  limit, at which point the browser drops the cookie and your shelf silently vanishes. Hitting the
  cap raises a "sign in for an unlimited pantry" toast instead.
- Guest **favorites live in a cookie** and are merged into the account on login/registration
  (`POST /api/favorites/merge`), so nothing is lost by signing up late.
- **Tasting notes with 1–5 star ratings**, one note per user per cocktail, upserted.
- **Live search + URL-synced filters** — the catalog reads its entire state from the query string
  (`q`, `spirit`, `alcoholic`, `category`, `glass`, `strength`, `sort`, `page`), so every filtered
  view is linkable, shareable and back-button-correct. Search input is debounced.
- **`GET /api/stats`** — the landing page, `/ingredients` and the pantry picker read their headline
  counts from the database instead of hardcoding them, so the numbers cannot go stale behind a
  re-seed.
- **Dark/light glassmorphism design** ("Neon Alchemy": dark-first, amber/rose/violet, translucent
  panels, scroll reveals) with focus-visible rings, aria-labels on icon-only controls and
  `prefers-reduced-motion` fallbacks. See [docs/DESIGN_BRIEF.md](docs/DESIGN_BRIEF.md).
- **Full SSR + SEO**: `useSeoMeta` on every page, schema.org `Recipe` markup on cocktail detail
  pages, plus `sitemap.xml` (744 URLs — every cocktail and ingredient page, sourced from the
  database) and `robots.txt` via `@nuxtjs/seo`.
- **Social share images** via `@nuxtjs/og-image`, rendered from real templates in
  `app/components/OgImage/` — a `Default` card for the section pages and a `Cocktail` card that
  carries the drink's image, category, glass and ABV. URLs are signed, which is what
  `NUXT_OG_IMAGE_SECRET` is for.

---

## Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Nuxt 4 (SSR, Nitro) | 4.5.1 |
| UI | Nuxt UI v4 on Tailwind CSS v4 (`@theme` tokens, no config file) | 4.10.0 / 4.3.3 |
| Language | TypeScript, `strict` + `noUncheckedIndexedAccess` | 5.9.3 |
| Data | Prisma ORM + PostgreSQL | 6.19.0 / 17 |
| Auth | `nuxt-auth-utils` (sealed cookie sessions, scrypt hashing) | 0.5.30 |
| SEO | `@nuxtjs/seo` (sitemap, robots, schema.org, og-image) | 5.3.12 |
| Images | `@nuxt/image`, TheCocktailDB domain allow-listed | 2.1.0 |
| Utilities | VueUse (+ `@vueuse/motion`), Zod v4 | 14.4.0 / 4.4.3 |
| Tests | Vitest | 4.1.10 |
| Lint | `@nuxt/eslint` (flat config) + `eslint-plugin-vuejs-accessibility` | 1.17.0 / 2.6.0 |
| Runtime | Docker Compose: `app` (Node 22) + `db` (Postgres 17) + `adminer` | — |

---

## Architecture

### Data pipeline — three separated stages

```text
TheCocktailDB API  ──▶  data/raw/**.json  ──▶  data/normalized.json  ──▶  PostgreSQL
                  fetch.ts             normalize.ts               seed.ts
                (network, cached)     (pure, offline)          (idempotent upserts)
```

1. **`npm run data:fetch`** (`scripts/fetch.ts`) — the only stage that touches the network. Walks the
   official search endpoints a–z/0–9, throttles to one request per 250 ms, retries up to 3 times,
   writes atomically (temp file + rename) and **skips any file that already exists**, so re-running
   costs nothing. Output: 36 drink pages + 335 ingredient files, **committed to the repo** so the
   rest of the pipeline is reproducible offline and forever.
2. **`npm run data:normalize`** (`scripts/normalize.ts`) — pure, deterministic, no network, no DB.
   Slugifies names, canonicalises ~40 raw ingredient type strings, assigns spirit groups by regex,
   fills missing ABVs from a per-type fallback table (flagging them `abvEstimated`), and parses free
   text measures (`"1 1/2 oz"`, `"2-3 dashes"`, `"½"`, `"Fill with"`, `"or lime"`) into
   `{ amount, amountMax, unit, amountMl }` plus flags (`optional`, `garnish`, `toTaste`, `topUp`).
   Beyond the obvious units it converts `deciliter`, `fifth`, `pint`, `quart` and `gallon` to
   millilitres. Every measure it cannot parse is dumped to `data/unparsed-measures.json` — the
   regression backlog the parser tests grow from. Current coverage: **1,548 / 1,615 non-empty
   measures = 95.85%**.
   This stage also **materialises the derived columns** the API then filters and sorts on, so no
   request has to recompute them: per-drink `abv` / `abvEstimated` / `dilutionMethod`, and the
   `nameSort` keys (see *Sorting and collation* below). It canonicalises casing too — `glass` values
   collapse to a uniform sentence case, taking the source's 39 distinct spellings down to 31 real
   ones, so the glass facet stops listing `Cocktail Glass` and `Cocktail glass` as different filters.
3. **`npm run db:seed`** (`prisma/seed.ts`) — idempotent. Upserts ingredients by slug, upserts
   cocktails by `externalId`, replaces each cocktail's ingredient lines inside a transaction. If
   `data/normalized.json` is missing it runs stage 2 automatically, so a fresh clone needs only this
   one command. Generated artifacts (`normalized.json`, `unparsed-measures.json`) are git-ignored;
   `data/raw/**` is not.

### Sorting and collation

Nothing orders by `name`. `Cocktail` and `Ingredient` each carry an indexed `nameSort` column
(`lower(name)`), and every name-ordered query sorts on that. The database runs on
`postgres:17-alpine`, whose musl libc gives `en_US.utf8` byte-order semantics rather than real locale
collation — so a plain `ORDER BY name` sorts every capitalised name before every lowercase one, and
`blackstrap rum` lands *after* `Zima`. Sorting on `nameSort` makes the order case-insensitive and
independent of the host's collation. Every `orderBy` also ends in `id: asc`, so ties can't make
pagination drop or repeat a row.

### Known upstream data issues

Documented rather than silently patched, because the raw snapshot is meant to stay a faithful copy of
the source: TheCocktailDB flags **Everclear** and **Hot Damn** as non-alcoholic with 0% ABV. The
estimator believes the data, so `brain-fart` reads a too-low 7.3% and `herbal-flame` reads a flat 0%
— "zero proof" for a drink built on cinnamon schnapps. Fixing this means an override table, which is
the point at which the dataset stops being reproducible from `data/raw/**`; the honest reading is
that these two drinks are wrong and the mechanism is right.

### API surface

22 JSON endpoints under `/api`, all validated with Zod (`getValidatedQuery` /
`readValidatedBody` / `getValidatedRouterParams`). Full request/response shapes and error codes live
in **[docs/API_CONTRACTS.md](docs/API_CONTRACTS.md)** — that document began as a pre-implementation
contract the front end and back end were built against in parallel, and is now kept in sync with the
handlers.

| Group | Endpoints |
|---|---|
| Catalog | `GET /api/cocktails`, `/cocktails/[slug]`, `/cocktails/meta`, `/cocktails/random` |
| Ingredients | `GET /api/ingredients`, `/ingredients/[slug]` |
| Stats | `GET /api/stats` |
| Pantry (matching) | `POST /api/pantry/match` |
| Pantry (account) | `GET /api/pantry`, `POST /api/pantry`, `DELETE /api/pantry/[ingredientId]`, `POST /api/pantry/merge` |
| Auth | `POST /api/auth/register`, `/auth/login`, `/auth/logout` |
| Favorites | `GET /api/favorites`, `POST /api/favorites`, `DELETE /api/favorites/[id]`, `POST /api/favorites/merge` |
| Notes | `GET /api/notes`, `PUT /api/notes/[cocktailId]`, `DELETE /api/notes/[cocktailId]` |

A twenty-third handler, `server/api/__sitemap__/urls.ts`, isn't a public endpoint — it is the
database-backed source `@nuxtjs/seo` reads to build `sitemap.xml`.

DTOs live in `shared/types/*` and are imported by both sides via `#shared/types/...`, so a contract
change breaks the type check on both ends at once. That is also where the strength bands live, as
data rather than as three copies of the same thresholds.

### Auth model

- Sessions, not tokens: `nuxt-auth-utils` stores a sealed, HTTP-only cookie; `NUXT_SESSION_PASSWORD`
  (≥32 chars) is the seal key.
- Passwords are hashed with **scrypt** (`hashPassword` / `verifyPassword`, `@adonisjs/hash` driver),
  max length 72, min 8 on registration.
- **Timing-safe login**: when the email is unknown, the handler still verifies the submitted password
  against a pre-computed dummy hash and returns the same generic `Invalid email or password`, so
  response time doesn't leak account existence.
- **Rate limiting**: in-memory sliding window, 10 attempts / 10 minutes / IP on both login and
  register, `429` beyond that. Per-process only — fine for a single-container dev app, a shared
  store would be required if this ever ran on more than one instance. The client IP comes from
  `getRequestIP(event, { xForwardedFor: process.env.TRUST_PROXY === 'true' })`: `x-forwarded-for` is
  honoured **only** when `TRUST_PROXY=true`, because a limiter that trusts it unconditionally is
  bypassed by one spoofed header per request.
- Authenticated pages use the `auth` route middleware and `useRequestFetch()` so the session cookie
  is forwarded during SSR.

### Caching

The catalog is a read-mostly dataset that changes only when the seed is re-run, so it is cached — but
**only at the API layer**, and that placement is the whole decision.

- **No page-level ISR/SWR.** There are no `swr` or `isr` route rules in `nuxt.config.ts`. Every SSR
  response here varies by cookies (guest favorites, guest pantry, session), and Nitro's page cache
  has no cookie `varies` — a cached page would replay one user's `set-cookie` headers and
  personalised header to everyone. Page caching is therefore deliberately off; the heavy lifting is
  cached one layer down instead. `/me`, `/login` and `/register` additionally carry `robots: false`
  and `ogImage: false`.
- **Cached handlers** (`defineCachedEventHandler`, 1 h `maxAge` + SWR) wrap the four read-only
  endpoints whose whole response is derivable from the URL: cocktail detail, cocktail meta,
  ingredient list, ingredient detail. Nitro sets their `cache-control: s-maxage=3600,
  stale-while-revalidate`.
- **Cached functions** (`defineCachedFunction`) back `/api/cocktails` and `/api/stats`. The cache
  wraps the query, not the handler, so the handler still runs — which is what lets `/api/cocktails`
  branch *before* the cache is consulted and lets both set an explicit
  `cache-control: public, s-maxage=3600, stale-while-revalidate=60`.
- **Two deliberate uncached paths.** `/api/cocktails/random` is never cached, and a list request with
  `sort=random` skips the cached function entirely and answers `cache-control: no-store` — a cached
  shuffle would freeze the "surprise" order.
- **Cache keys are built from the validated query**, never the raw one: a closed field set, blanks
  dropped, each key and value encoded (`[^a-zA-Z0-9]` → `_<hex>_`) before joining, then sorted
  (`server/utils/catalogCache.ts`). Unknown params never reach the key, so they can neither collide
  with a real query nor mint unbounded cache entries.

Auth, favorites, notes, the account pantry and pantry matching are never cached (the matcher does
memoise its static required-ingredients map and substitute graph in process memory, clearing the
memo on failure so a transient DB error can't poison it). Build-time prerendering is deliberately
avoided so CI can build without a database.

---

## Getting started

Docker is the only prerequisite — **no local Node or npm required**. Everything runs in containers.

```bash
git clone <this-repo> && cd cocktail-lab
cp .env.example .env          # Windows CMD: copy .env.example .env

docker compose up -d --build              # app + postgres + adminer
docker compose run --rm app npx prisma migrate deploy   # create the schema
docker compose run --rm app npm run db:seed             # normalize + seed (idempotent)
```

Then open:

| Service | Where |
|---|---|
| App | <http://localhost:3000> |
| Adminer | <http://localhost:8081> (server `db`, user `cocktail`, password `cocktail`, db `cocktail_lab`) |
| Postgres from the host | `localhost:5433` |

`.env.example` carries working defaults (`cocktail` / `cocktail` / `cocktail_lab`, ports 3000 / 5433
/ 8081) — all ports bind to `127.0.0.1` only. The one value worth changing is
`NUXT_SESSION_PASSWORD`: it must be **at least 32 characters** and the committed default is
explicitly a local-development placeholder. `NUXT_OG_IMAGE_SECRET` signs the social-image URLs and
`TRUST_PROXY` gates `x-forwarded-for`; both have safe local defaults in code, and both need adding to
the `app` service's `environment:` block in `docker-compose.yml` before a value in `.env` reaches the
container — see [.env.example](.env.example).

Useful commands (all via Docker):

```bash
docker compose logs -f app                          # dev server output
docker compose run --rm app npm run test            # vitest run
docker compose run --rm app npm run lint            # eslint .
docker compose run --rm app npm run lint:fix        # eslint . --fix
docker compose run --rm app npm run data:fetch      # refresh raw data from the API (network)
docker compose run --rm app npm run data:normalize  # re-derive normalized.json offline
docker compose run --rm app npm run db:reset        # drop, re-migrate and re-seed
docker compose down -v                              # stop and delete volumes (db + node_modules)
```

---

## Testing

```bash
docker compose run --rm app npm run test        # vitest run
docker compose run --rm app npm run lint        # eslint .
docker compose run --rm app npx nuxt typecheck
```

**572 tests across 14 files**, all pure unit tests (no DB, no browser, ~1.8 s):

| File | Tests | Covers |
|---|---|---|
| `tests/format.spec.ts` | 238 | unit labels, pluralisation, nice fractions, ml formatting |
| `tests/parseMeasure.spec.ts` | 75 | table-driven measure parsing + ml conversion |
| `tests/abv.spec.ts` | 55 | dilution detection, ABV estimation, `null` vs zero, `estimated` propagation, scaling |
| `tests/strengthBands.spec.ts` | 39 | band boundaries, labels and the range → Prisma filter mapping |
| `tests/catalogQuery.spec.ts` | 35 | query validation, `where` / `orderBy` construction, facet merging |
| `tests/pantryMatch.spec.ts` | 28 | makeable / almost / unlock ranking, substitution bookkeeping |
| `tests/normalizeCanonical.spec.ts` | 24 | casing canonicalisation and `nameSort` keys |
| `tests/pantryCookie.spec.ts` | 22 | guest cookie caps and the encoded-byte budget |
| `tests/stats.spec.ts` | 18 | `buildCatalogStats` derivations and clamping |
| `tests/catalogCache.spec.ts` | 15 | cache-key encoding, collision and unbounded-key resistance |
| `tests/substitutes.spec.ts` | 13 | cluster/directed graph construction, alcoholic-flag guard |
| `tests/normalize.spec.ts` | 4 | slugify (diacritics, casing, digits) and slug uniqueness |
| `tests/parseMeasureAliases.spec.ts` | 3 | unit alias regressions found in real data |
| `tests/parseMeasureDescriptions.spec.ts` | 3 | descriptive measures → `optional` / `note` flags |

The parser specs are table-driven and grew directly out of `data/unparsed-measures.json`: every
measure the parser choked on became a row, which is how coverage got past 95%. `vitest.config.ts`
resolves the `#shared` and `~~` aliases so the specs can import the same modules the app does rather
than a duplicated copy.

Linting is `@nuxt/eslint`'s flat config (stylistic options declared in `nuxt.config.ts`) extended in
`eslint.config.mjs` with `eslint-plugin-vuejs-accessibility` — the accessibility rules are switched
off only for `app/components/OgImage/**`, which renders to a PNG and has no DOM to be accessible in.

Type checking uses `nuxt typecheck` → `vue-tsc -b --noEmit` over the four project references in
`tsconfig.json` (app, server, shared, node). Continuous integration
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs install → `prisma generate` → tests →
lint → typecheck → build on Node 22, with no database service (nothing is prerendered, and Prisma
connects lazily).

---

## Why X

**Why `$fetch` inside `useAsyncData` rather than `useFetch` everywhere?**
`useFetch` is `useAsyncData` + `$fetch` with implicit key and option inference — convenient until you
need control. `useAsyncData(key, () => $fetch(url, { query }))` makes the cache key explicit
(it is slug-derived on `/cocktails/[slug]`), makes `watch` / `lazy` / `default` obvious, and keeps SSR
payload dedupe intact: the server result is serialised into the payload and the client doesn't
refetch. Client-only interactions (favorite toggles, pantry matching, login submit) use plain
`$fetch` — they aren't page data and shouldn't touch the payload at all. `useRequestFetch()` covers
the SSR case where the request's cookies must be forwarded.

**Why three separated pipeline stages?**
Because they fail differently. Fetching is slow, network-bound and rate-limited; normalization is
pure logic that changes constantly while the parser improves; seeding is I/O against a database.
Separating them means the parser can be iterated hundreds of times with zero API calls, the raw
snapshot stays a byte-stable committed artifact (so results are reproducible offline and years from
now), and the normalizer is a pure function that unit tests can attack directly.

**Why does `node_modules` live in a named volume?**
The compose file bind-mounts the project (`.:/app`) for hot reload, and a bind mount *covers* the
image's `/app/node_modules`. On Windows that leaves two bad options: no dependencies at all, or
installing them on the host — where they'd be the wrong platform binaries (Prisma engines, esbuild
and Rollup are native) and where the Windows-to-Linux filesystem bridge makes installs and file
watching painfully slow. Mounting `node_modules:/app/node_modules` on top of the bind mount keeps the
Linux binaries from `npm ci` intact and off the host. `.nuxt` gets the same treatment for the same
reason. Trade-off: dependency changes need `docker compose build app`, not just a `package.json` edit.

**Why sessions instead of JWT?**
Nothing here is a distributed system. A sealed HTTP-only cookie is unreadable by JavaScript, is
invalidated instantly by clearing it server-side (a JWT is valid until it expires unless you build a
revocation list, at which point you have a session), and needs no refresh-token dance. `nuxt-auth-utils`
gives it with SSR-aware `useUserSession()` on the client and `requireUserSession()` on the server.
JWTs would only start paying off with multiple services or non-browser clients — neither exists here.

---

## Scope decisions

Deliberately left out. Each of these is easy to add badly and expensive to add properly:

| Omitted | Why |
|---|---|
| Password reset / email verification | Requires SMTP delivery, token storage and expiry, and an email template pipeline. No mail infrastructure in a local-only project. |
| OAuth providers, 2FA | Provider registration and callback URLs need a public origin; TOTP needs recovery codes and a device-loss story. |
| Admin panel | The dataset is generated by the seed pipeline, not edited by hand. Adminer at `:8081` covers the rare manual poke. |
| User-submitted recipes / comments | Any public write surface needs moderation, spam defence and abuse reporting to be responsible. Notes are private to their author instead. |
| i18n | Content (441 recipes and instructions) is English-only at the source; translating chrome alone would be theatre. |
| PDF export, shaking timers, collections | Feature creep — none of them exercises anything new. |
| An ingredient-ABV override table | It would fix the two known upstream errors above, but it also breaks the promise that the database is reproducible from `data/raw/**` by a pure function. Documenting the two bad rows costs less than owning a divergent fork of the dataset. |
| A learned/inferred substitution graph | The clusters in `server/utils/substitutes.ts` are hand-curated and deliberately conservative. Deriving them from co-occurrence would produce confident nonsense (lime and tequila co-occur constantly and substitute for nothing), and a wrong substitution is worse than a missing one — it tells you that you can make a drink you cannot. |
| **Production deployment** | The `Dockerfile` has a single `development` target and the compose stack runs `nuxt dev`. Out of scope on purpose. |

Production hardening, as future work: a multi-stage Dockerfile with a `production` target
(`npm ci --omit=dev` + `nuxt build` + a slim runtime on `.output`), a real `NUXT_SESSION_PASSWORD`
secret, `prisma migrate deploy` on release, a shared-store rate limiter (plus `TRUST_PROXY=true`
only behind a proxy that overwrites `x-forwarded-for`), a real `NUXT_OG_IMAGE_SECRET` — with both of
those actually forwarded to the container, which `docker-compose.yml` does not do today —
HTTPS/secure-cookie settings, and a CDN/page-cache story that accounts for the
session-cookie-dependent SSR described above.

---

## Seeing it run

There are no screenshots in this repo — run it instead, it takes one command:

```bash
docker compose up -d
```

Then open <http://localhost:3000>. The pages worth a look are `/` (animated hero, live stats band),
`/cocktails` (URL-synced filters with facet counts), `/cocktails/mojito` (serving scaler, ABV meter),
and `/pantry` (tick a few bottles and watch the matching, substitutions and buy-one-bottle ranking
update live).

---

## Attribution and licensing

Cocktail and ingredient data comes from **[TheCocktailDB](https://www.thecocktaildb.com/)** and is
used through their official JSON API endpoints only. This project does not scrape the website and
does not rehost their images: only image **URLs** are stored and rendered, together with the
`imageIsCC` flag and `imageAttribution` string from the API. The attribution and backlink are shown
in the site footer. No ownership of the dataset is claimed, and no licence to it is granted by this
repository — if you reuse the data, get it from TheCocktailDB under their terms.

The **source code** of this repository is MIT licensed — see [LICENSE](LICENSE). That licence covers
the code only and says so explicitly: the dataset is not relicensed, and the images are not
redistributed.

Built to learn Nuxt 4. Not affiliated with TheCocktailDB.
