# Cocktail Lab 🍸

A craft-cocktail encyclopedia, pantry matcher and bartender calculator, built as a portfolio project
to learn **Nuxt 4** end to end: server routes, SSR data fetching, sessions, Prisma, SEO and a
design-heavy front end. It ships a curated offline dataset (441 cocktails, 299 ingredients, 1,730
ingredient links derived from [TheCocktailDB](https://www.thecocktaildb.com/)), answers the question
*"what can I actually make tonight?"* from the bottles you own, and estimates the strength of every
drink instead of just printing a recipe. It runs entirely locally in Docker — there is no hosted
deployment and no production target.

---

## Features

### The three that matter

- **"What can I make?" pantry matching.** Tick the bottles on your shelf; `POST /api/pantry/match`
  returns everything you can make right now, everything you're 1–2 ingredients short of, and —
  the interesting part — a **buy-one-bottle-unlocks-N** ranking: the five single ingredients that
  would unlock the most new cocktails, with example drinks for each.
- **ABV estimation with dilution honesty.** Per-drink strength is computed from measured volumes and
  per-ingredient ABV, then divided by a dilution factor inferred from the instructions
  (shake 25% / stir 20% / build 12%). Whenever any input is estimated — an ingredient without a
  source ABV, or a line with no parseable measure — the reading is prefixed with `≈` instead of
  pretending to be precise. Of 133 alcoholic ingredients, 40 carry an ABV from the source data and
  93 are estimated from a per-type table.
- **Serving scaler.** Step the ingredient list from 1 to N servings; amounts, ranges and millilitre
  conversions scale together, and unparsed measures fall back to `raw measure ×N` rather than lying.

### Everything else

- Guest **favorites live in a cookie** and are merged into the account on login/registration
  (`POST /api/favorites/merge`), so nothing is lost by signing up late.
- **Tasting notes with 1–5 star ratings**, one note per user per cocktail, upserted.
- **Live search + URL-synced filters** — the catalog reads its entire state from the query string
  (`q`, `spirit`, `alcoholic`, `category`, `glass`, `sort`, `page`), so every filtered view is
  linkable, shareable and back-button-correct. Search input is debounced.
- **Dark/light glassmorphism design** ("Neon Alchemy": dark-first, amber/rose/violet, translucent
  panels, scroll reveals) with focus-visible rings, aria-labels on icon-only controls and
  `prefers-reduced-motion` fallbacks. See [docs/DESIGN_BRIEF.md](docs/DESIGN_BRIEF.md).
- **Full SSR + SEO**: `useSeoMeta` on every page, schema.org `Recipe` markup on cocktail detail
  pages, plus `sitemap.xml` (744 URLs — every cocktail and ingredient page, sourced from the
  database) and `robots.txt` via `@nuxtjs/seo`.

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
   Every measure it cannot parse is dumped to `data/unparsed-measures.json` — the regression backlog
   the parser tests grow from. Current coverage: **1,548 / 1,615 non-empty measures = 95.85%**.
3. **`npm run db:seed`** (`prisma/seed.ts`) — idempotent. Upserts ingredients by slug, upserts
   cocktails by `externalId`, replaces each cocktail's ingredient lines inside a transaction. If
   `data/normalized.json` is missing it runs stage 2 automatically, so a fresh clone needs only this
   one command. Generated artifacts (`normalized.json`, `unparsed-measures.json`) are git-ignored;
   `data/raw/**` is not.

### API surface

17 JSON endpoints under `/api`, all validated with Zod (`getValidatedQuery` /
`readValidatedBody` / `getValidatedRouterParams`). Full request/response shapes and error codes live
in **[docs/API_CONTRACTS.md](docs/API_CONTRACTS.md)** — that document was written before the code and
is the contract the front end and back end were built against in parallel.

| Group | Endpoints |
|---|---|
| Catalog | `GET /api/cocktails`, `/cocktails/[slug]`, `/cocktails/meta`, `/cocktails/random` |
| Ingredients | `GET /api/ingredients`, `/ingredients/[slug]` |
| Pantry | `POST /api/pantry/match` |
| Auth | `POST /api/auth/register`, `/auth/login`, `/auth/logout` |
| Favorites | `GET /api/favorites`, `POST /api/favorites`, `DELETE /api/favorites/[id]`, `POST /api/favorites/merge` |
| Notes | `GET /api/notes`, `PUT /api/notes/[cocktailId]`, `DELETE /api/notes/[cocktailId]` |

DTOs live in `shared/types/*` and are imported by both sides via `#shared/types/...`, so a contract
change breaks the type check on both ends at once.

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
  store would be required if this ever ran on more than one instance.
- Authenticated pages use the `auth` route middleware and `useRequestFetch()` so the session cookie
  is forwarded during SSR.

### Caching

The catalog is a read-mostly dataset that changes only when the seed is re-run, so it is cached at
two levels:

- **Nitro cached handlers** (`defineCachedEventHandler`, 1 h `maxAge` + SWR) wrap the five read-only
  catalog endpoints (cocktail list/detail/meta, ingredient list/detail). Cache keys are built from
  the **validated** query (closed field set, each key and value encoded separately before joining),
  so unknown params can neither collide with real queries nor mint unbounded cache entries. Two
  deliberate exceptions: `/api/cocktails/random` is never cached, and list requests with
  `sort=random` bypass the cache via `shouldBypassCache` and answer with `cache-control: no-store` —
  a cached shuffle would freeze the "surprise" order.
- **No page-level ISR/SWR.** Every SSR response here varies by cookies (guest favorites, pantry,
  session), and Nitro's page cache has no cookie `varies` — a cached page would replay one user's
  `set-cookie` headers and personalised header to everyone. Page caching is therefore deliberately
  off; the heavy lifting is cached one layer down at the API instead. `/me`, `/login` and
  `/register` additionally carry `robots: false`.

Auth, favorites, notes and pantry matching are never cached (the pantry matcher does memoise its
static required-ingredients map in process memory). Build-time prerendering is deliberately avoided
so CI can build without a database.

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
explicitly a local-development placeholder.

Useful commands (all via Docker):

```bash
docker compose logs -f app                          # dev server output
docker compose run --rm app npm run data:fetch      # refresh raw data from the API (network)
docker compose run --rm app npm run data:normalize  # re-derive normalized.json offline
docker compose run --rm app npm run db:reset        # drop, re-migrate and re-seed
docker compose down -v                              # stop and delete volumes (db + node_modules)
```

---

## Testing

```bash
docker compose run --rm app npm run test    # vitest run
docker compose run --rm app npx nuxt typecheck
```

**227 tests across 6 files**, all pure unit tests (no DB, no browser, ~0.7 s):

| File | Tests | Covers |
|---|---|---|
| `tests/format.spec.ts` | 130 | unit labels, pluralisation, nice fractions, ml formatting |
| `tests/abv.spec.ts` | 45 | dilution detection, ABV estimation, `estimated` propagation, scaling |
| `tests/parseMeasure.spec.ts` | 42 | table-driven measure parsing + ml conversion |
| `tests/parseMeasureAliases.spec.ts` | 3 | unit alias regressions found in real data |
| `tests/parseMeasureDescriptions.spec.ts` | 3 | descriptive measures → `optional` / `note` flags |
| `tests/normalize.spec.ts` | 4 | slugify (diacritics, casing, digits) and slug uniqueness |

The parser specs are table-driven and grew directly out of `data/unparsed-measures.json`: every
measure the parser choked on became a row, which is how coverage got past 95%.

Type checking uses `nuxt typecheck` → `vue-tsc -b --noEmit` over the four project references in
`tsconfig.json` (app, server, shared, node). Continuous integration
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs install → `prisma generate` → tests →
typecheck → build on Node 22, with no database service (nothing is prerendered, and Prisma connects
lazily).

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
| **Production deployment** | The `Dockerfile` has a single `development` target and the compose stack runs `nuxt dev`. Out of scope on purpose. |

Production hardening, as future work: a multi-stage Dockerfile with a `production` target
(`npm ci --omit=dev` + `nuxt build` + a slim runtime on `.output`), a real `NUXT_SESSION_PASSWORD`
secret, `prisma migrate deploy` on release, a shared-store rate limiter (plus `TRUST_PROXY=true`
only behind a proxy that overwrites `x-forwarded-for`), HTTPS/secure-cookie settings, and a
CDN/page-cache story that accounts for the session-cookie-dependent SSR described above.

---

## Screenshots

<!-- TODO: create docs/screenshots/, drop the four images in, and uncomment the image lines below. -->

| Screen | Preview |
|---|---|
| Landing — hero, stats band, random picks | <!-- ![Landing](docs/screenshots/landing.png) --> *TODO* |
| Catalog — live search and URL-synced filters | <!-- ![Catalog](docs/screenshots/cocktails.png) --> *TODO* |
| Detail — ABV meter, serving scaler, tasting notes | <!-- ![Detail](docs/screenshots/detail.png) --> *TODO* |
| Pantry — makeable, almost, and unlock ranking | <!-- ![Pantry](docs/screenshots/pantry.png) --> *TODO* |

---

## Attribution and licensing

Cocktail and ingredient data comes from **[TheCocktailDB](https://www.thecocktaildb.com/)** and is
used through their official JSON API endpoints only. This project does not scrape the website and
does not rehost their images: only image **URLs** are stored and rendered, together with the
`imageIsCC` flag and `imageAttribution` string from the API. The attribution and backlink are shown
in the site footer. No ownership of the dataset is claimed, and no licence to it is granted by this
repository — if you reuse the data, get it from TheCocktailDB under their terms.

This repository contains **no LICENSE file**, so the licensing of the source code is currently
unspecified: default copyright applies and no permission to reuse it is granted. Add a LICENSE file
if you intend otherwise.

Built to learn Nuxt 4. Not affiliated with TheCocktailDB.
