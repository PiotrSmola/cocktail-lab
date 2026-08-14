# Setup

Setup instructions now live in the [README](README.md#getting-started) — one Docker-only quickstart,
kept next to everything else it depends on.

This file survives only for the piece the README does not cover: how the project was **bootstrapped
on Windows without Node or npm installed on the host**. You do not need any of this to run the app.

## Historical: creating the project from scratch (Windows CMD)

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

## Adding a dependency later

`node_modules` lives in a Docker volume, so an install has to happen in the container and the image
has to be rebuilt:

```bat
docker compose run --rm app npm install <package>
docker compose build app
docker compose up -d
```
