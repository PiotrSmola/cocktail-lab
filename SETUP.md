# Cocktail Lab — start w Windows CMD

Wymagany jest Docker Desktop z działającym poleceniem `docker compose`.
Node.js ani npm nie muszą być zainstalowane w Windows.

## 1. Utworzenie projektu Nuxt 4

Otwórz **CMD** i wklej:

```bat
cd /d C:\Users\p.smola\Desktop\cocktail-lab

docker run --rm -it -v "%cd%:/workspace" -w /workspace node:22-bookworm-slim sh -lc "npm create nuxt@latest . -- --packageManager npm --no-install --no-modules --force"

docker run --rm -v "%cd%:/workspace" -w /workspace node:22-bookworm-slim npm install --package-lock-only --ignore-scripts --no-audit --no-fund

copy /Y .env.example .env
```

Pierwsze polecenie korzysta z oficjalnego generatora Nuxta. Flaga `--force`
jest potrzebna, ponieważ katalog zawiera już pliki Docker i repozytorium Git.
Drugie polecenie tworzy `package-lock.json`, ale nie instaluje `node_modules`
na hoście.

## 2. Uruchomienie

```bat
docker compose up --build
```

Po starcie:

- aplikacja: http://localhost:3000
- Adminer: http://localhost:8081
- PostgreSQL z hosta: `localhost:5433`
- PostgreSQL z kontenera aplikacji: `db:5432`

Logowanie do Adminera:

- system: `PostgreSQL`
- serwer: `db`
- użytkownik: `cocktail`
- hasło: `cocktail`
- baza: `cocktail_lab`

Zatrzymanie usług:

```bat
docker compose down
```

Zatrzymanie i usunięcie danych bazy oraz zależności:

```bat
docker compose down -v
```

## 3. Dodanie zależności planowanych dla Cocktail Lab

Po pierwszym uruchomieniu można instalować pakiety wyłącznie w Dockerze:

```bat
docker compose run --rm app npm install @prisma/client zod nuxt-auth-utils
docker compose run --rm app npm install --save-dev prisma tsx vitest
docker compose build app
```

Przykładowe późniejsze polecenia:

```bat
docker compose run --rm app npx prisma init --datasource-provider postgresql
docker compose run --rm app npx prisma migrate dev --name init
docker compose run --rm app npm run test
```
