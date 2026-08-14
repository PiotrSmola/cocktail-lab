# Setup

The quickstart lives in the [README](README.md#getting-started) — one Docker-only path, kept next to
everything else it depends on. This file covers the three things the README does not: the exact
sequence a **fresh clone** needs, the environment-variable reference, and how the project was
bootstrapped on Windows without Node or npm on the host.

## Fresh clone, in order

```bash
cp .env.example .env                                     # Windows CMD: copy .env.example .env
docker compose up -d --build                             # app + postgres + adminer
docker compose run --rm app npx prisma migrate deploy     # create the schema
docker compose run --rm app npm run db:seed               # normalize + seed (idempotent)
```

The migrate step is **not optional and not implied**. `prisma/migrations/` holds three migrations
(`catalog`, `users_favorites_notes`, `pantry_items_sort_keys_abv`) and nothing else applies them —
the dev server does not migrate on boot, and `db:seed` writes rows into tables that must already
exist. On an already-migrated database `migrate deploy` is a no-op; you can confirm the state with:

```bash
docker compose run --rm app npx prisma migrate status
# → 3 migrations found in prisma/migrations
# → Database schema is up to date!
```

`db:seed` runs `data:normalize` for you when `data/normalized.json` is missing, so a fresh clone
never has to run the normalize stage by hand. It is idempotent — re-running it upserts rather than
duplicating.

## Environment variables

Every variable the project reads is documented inline in [`.env.example`](.env.example). The part
worth repeating here, because it surprises people:

**`docker compose` loads `.env` for its own interpolation, not for the container.** A variable only
reaches the app process if it is also listed in the `app` service's `environment:` block in
`docker-compose.yml`. Today that block forwards exactly four values:

| Forwarded to the container | Source |
|---|---|
| `DATABASE_URL` | assembled from `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` |
| `NUXT_SESSION_PASSWORD` | `.env`, default `local-development-session-secret-change-me` |
| `NUXT_PUBLIC_SITE_URL` | `http://localhost:${APP_PORT}` |
| `CHOKIDAR_USEPOLLING` | hardcoded `"true"` for file watching on the Windows bind mount |

`NUXT_OG_IMAGE_SECRET` and `TRUST_PROXY` are read by the app (`nuxt.config.ts` and
`server/utils/rateLimit.ts` respectively) but are **not** in that block, so setting them in `.env`
alone does not change container behaviour — the in-code defaults apply. Both defaults are the safe
choice locally (a placeholder signing secret, and `x-forwarded-for` untrusted), which is why this has
not bitten anything yet. Add them to `environment:` if you need to override them.

`POSTGRES_*`, `APP_PORT` and `ADMINER_PORT` are compose-interpolation only and are never meant to
reach the app.

## Everyday commands

```bash
docker compose logs -f app                          # dev server output
docker compose run --rm app npm run test            # vitest run
docker compose run --rm app npm run lint            # eslint .
docker compose run --rm app npm run lint:fix        # eslint . --fix
docker compose run --rm app npx nuxt typecheck      # vue-tsc -b --noEmit
docker compose run --rm app npm run db:reset        # drop, re-migrate and re-seed
```

`npm run lint` needs `.nuxt/eslint.config.mjs`, which the `postinstall` hook (`nuxt prepare`)
generates. It exists in the `nuxt_cache` volume after the first `docker compose up`; if lint ever
complains that it cannot resolve that import, run `docker compose run --rm app npx nuxt prepare`.

## Adding a dependency later

`node_modules` lives in a Docker volume, so an install has to happen in the container and the image
has to be rebuilt:

```bat
docker compose run --rm app npm install <package>
docker compose build app
docker compose up -d
```

## Historical: creating the project from scratch (Windows CMD)

You do not need any of this to run the app. It records how the repository was bootstrapped with no
Node or npm installed on the host.

```bat
cd /d C:\path\to\cocktail-lab

REM scaffold Nuxt without writing node_modules to the host
docker run --rm -it -v "%cd%:/workspace" -w /workspace node:22-bookworm-slim ^
  sh -lc "npm create nuxt@latest . -- --packageManager npm --no-install --no-modules --force"

REM produce package-lock.json only (still no host node_modules)
docker run --rm -v "%cd%:/workspace" -w /workspace node:22-bookworm-slim ^
  npm install --package-lock-only --ignore-scripts --no-audit --no-fund

copy /Y .env.example .env
```

`--force` is required because the directory already contained the Docker files and the Git
repository. Dependencies are installed inside the image by `npm ci` (see `Dockerfile`) and kept in a
named volume, never on the host — see *"Why does `node_modules` live in a named volume?"* in the
README.
