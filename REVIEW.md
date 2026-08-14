# Cocktail Lab — Review końcowy (2026-08-14)

Zakres: przegląd kodu (`nuxt.config.ts`, `server/**`, `app/composables`, `app/utils`, kluczowe strony
i komponenty), weryfikacja na żywo przez `curl` względem działającego dev-servera, zapytania
read-only do Postgresa, uruchomienie testów. Znaleziska oznaczone jako **[potwierdzone]** (widziane
na własne oczy) albo **[podejrzenie]** (wynika z kodu, nieodtworzone w tym środowisku).

---

## 0a. Runda 2 — backlog domknięty (2026-08-14)

Druga tura pracy zamknęła **cały backlog z sekcji 4 i 5** oraz wdrożyła **pomysły 1–5 z sekcji 6**.
Stan po rundzie: `npm run lint` czysty, **572 testy** (było 227), typecheck czysty w 4 projektach TS,
build produkcyjny wstaje i serwuje wszystkie trasy, baza 441/299/1730.

**Backlog z tego review:**

| punkt | stan |
|---|---|
| 3.4 (duplikaty `glass`) | domknięty **u źródła** — kanonizacja w `normalize.ts`, 39 → 31 wartości, jednolity sentence case |
| 4.3 (ciasteczka bez limitu) | domknięty — zmierzone 5958 B dla 299 slugów (limit przeglądarki ~4096 B), cap 80/100 z toastem + spiżarnia w bazie dla zalogowanych |
| 4.6 (sortowanie bajtowe) | domknięty — kolumny `nameSort`, indeksy realnie używane (`EXPLAIN`: 25 wierszy zamiast sortowania 441) |
| 4.7 (indeksy, zliczenia) | domknięty — zliczenia zawężone do bieżącej strony (2,79 ms → 0,93 ms), `popular` sortuje i stronicuje w SQL; indeksy `glass`/`abv` udokumentowane jako dekoracyjne przy tej skali |
| 5.1 (testy tylko czystych funkcji) | w większości domknięty — 572 testy pokrywają warstwę zapytań, klucze cache, dopasowanie spiżarni, pasma mocy. **Nadal brak E2E** |
| 5.2 (potrójny `cocktailCardSelect`) | domknięty w całości, łącznie z `match.post.ts` |
| 5.3 (zahardkodowane statystyki) | domknięty — `GET /api/stats` |
| 5.4 (jednostka `PIECE`) | domknięty — `Juice of ½` zamiast samego `½`, przy skalowaniu uczciwy mnożnik `×N` |
| 5.5 (ESLint, LICENSE) | domknięty — `@nuxt/eslint`, 827 znalezisk → 0, lint w CI, LICENSE MIT |
| 5.6 (rozjazd dokumentacji) | domknięty — README i `API_CONTRACTS.md` zsynchronizowane z kodem |
| 5.7 (ostrzeżenia, moduł OG) | domknięty — szablony OG per koktajl i per sekcja, zero warningów przy starcie |
| 5.8 (błędy w logu) | **nie był bugiem** — odtworzone na żądanie: Nitro przepuszcza nieznane ścieżki do renderera SSR, a router loguje pudło. Artefakt zimnego startu |
| 5.9 (screenshoty) | odrzucone świadomie — README kieruje do uruchomienia aplikacji |
| 5.10 (brak targetu prod i E2E) | bez zmian, nadal świadome |

**Pomysły z sekcji 6:** 1 (spiżarnia na koncie), 2 (zamienniki), 3 (filtr mocy), 4 (`/api/stats`),
5 (obrazki OG) — wdrożone. Pomysł 6 (Playwright) nie był zamawiany.

**Dwa bugi znalezione przy okazji, których to review nie wyłapało:**

1. `estimateAbv` zwracał `0` zamiast `null`, gdy wszystkie linie alkoholowe były niezmierzone —
   sangria i 6 innych drinków pokazywało „0% — zero proof". Naprawione; 395/441 ma dziś ABV,
   46 świadomie `null` („Not enough measures").
2. `parseMeasure` nie konwertował `fifth`/`qt`/`pint`/`gal`/`dl` na mililitry, przez co cztery
   drinki (m.in. `coffee-liqueur`, `homemade-kahlua`) miały fałszywe zero. Naprawione.

**Nowe znane problemy (dane źródłowe, nie kod):** TheCocktailDB flaguje `Everclear`
(spirytus 75–95%) i `Hot Damn` (schnapps ~30%) jako bezalkoholowe. Skutek: `brain-fart` pokazuje
7,3% zamiast ~25%, a `herbal-flame` 0%. Świadomie nie łatane ręcznie — poprawka wymagałaby
kuratorowanej listy nadpisań pojedynczych składników.

---

## 0. Adnotacja po naprawach (2026-08-14, po review)

Bezpośrednio po tym review naprawiono i zweryfikowano na żywo następujące punkty:

- **3.1 / 3.2** — klucze cache budowane z **przewalidowanego** query (zamknięty zbiór pól z
  defaultami), a klucz i wartość enkodowane osobno przed sklejeniem. Repro z 3.1 daje teraz 12 vs 0;
  `?q=<5000 znaków>` → 400 (limity długości na wolnych parametrach tekstowych: 120, slug: 200);
  parametry śmieciowe nie tworzą nowych wpisów.
- **3.3** — limit `/api/pantry/match` podniesiony do 300 slugów (katalog ma 299, więc UI nie może go
  przekroczyć — zweryfikowane: 299 slugów → 200, makeable 441); dodatkowo `/pantry` obsługuje błąd
  matcha (`failed` + EmptyState z przyciskiem „Try again" zamiast wiecznych skeletonów).
- **3.4** — filtry `glass`/`category` porównują case-insensitive, facety w `meta` scalane po
  lowercase (etykieta = wariant dominujący, liczności sumowane): `glass=Cocktail Glass` i
  `glass=Cocktail glass` → oba 104. Normalizacja u źródła pozostaje zalecana długoterminowo.
- **3.5** — reguły `isr` zdjęte z `/cocktails/**` i `/ingredients/**`; cache zostaje na poziomie API
  (niezależnym od sesji). README sprostowane (także pkt 5.6).
- **4.1** — gałąź `sort=random` przeniesiona **poza** cached handler (lista nie-random przez
  `defineCachedFunction`); random odpowiada `cache-control: no-store`, pozostałe listy
  `public, s-maxage=3600, stale-while-revalidate=60` — zweryfikowane curl-em.
- **4.2** — `x-forwarded-for` honorowane tylko przy `TRUST_PROXY=true`.
- **4.4** — `:key` w `IngredientList.vue` to teraz `line.position`.
- **4.5** — mapa wymaganych linii memoizowana w pamięci procesu (odświeżenie po re-seedzie wymaga
  restartu); rate limitu celowo nie dodano — debounce klienta generuje legalne serie żądań.
- **5.7 (częściowo)** — moduł og-image wyłączony (`ogImage: { enabled: false }`) do czasu powstania
  własnego szablonu OG (pomysł nr 5 w sekcji 6); znika też ostrzeżenie o foncie przy starcie.

Po naprawach: typecheck czysty (3 projekty TS), 227 testów zielonych, smoke wszystkich tras 200/302,
zero hydration warnings. Pozostałe punkty (m.in. 4.3 rozmiar ciasteczek, 4.6 collation, 4.7 indeksy
oraz sekcja 5) pozostają aktualne jako backlog.

---

## 1. Ocena ogólna

Projekt jest **skończony i spójny** — nie szkielet z ładnym landingiem, tylko działająca aplikacja z
prawdziwą logiką domenową (parser miar, estymacja ABV z dylucją, dopasowanie spiżarni z rankingiem
"kup jedną butelkę"). 227 testów przechodzi (6 plików, 835 ms — potwierdzone), typy czyste, wszystkie
endpointy user-data zwracają 401 bez sesji, dostępność przemyślana powyżej średniej dla portfolio.

Realne słabości są skoncentrowane w **jednym miejscu: warstwie cache'owania katalogu** — akurat tym,
który README opisuje jako przemyślany, a który ma potwierdzoną kolizję kluczy i nieograniczoną
przestrzeń kluczy. Druga grupa to **rozjazd kontrakt ↔ UI** (limit 100 składników w API vs brak
limitu w spiżarni) i **jakość danych** (duplikaty wielkości liter w `glass` — gorsze niż zakładano).

Nic z tego nie dyskwalifikuje projektu. Wszystko poniżej to praca na 1–2 dni.

---

## 2. Co jest zrobione dobrze

- **Rozdzielony pipeline danych** (`scripts/fetch.ts` → `scripts/normalize.ts` → `prisma/seed.ts`).
  Uzasadnienie z README ("bo zawodzą inaczej") jest trafne i to najlepszy materiał na rozmowę w całym
  repo. `data/raw/**` w gicie = reprodukowalność offline.
- **Parser miar i jego testy.** `server/utils/parseMeasure.ts` — ułamki unicode, zakresy, mixed
  fractions, flagi `optional/garnish/toTaste/topUp`. Testy są table-driven i wyrosły z
  `data/unparsed-measures.json`; 95,85% pokrycia to uczciwa, mierzalna liczba.
- **Obrona timing-attack zrobiona poprawnie.** `server/api/auth/login.post.ts:9-11` — dummy hash
  liczony raz na poziomie modułu, z `.catch(() => undefined)` przeciw unhandled rejection, plus
  jednolite 401. Detal, który w większości projektów portfolio jest zrobiony źle albo wcale.
- **Autoryzacja kompletna.** Każdy handler user-data startuje od `requireUser(event)`; `deleteMany`/
  `upsert` mają `userId` w `where`, więc podmiana id nie sięga cudzych rekordów. Zweryfikowane na
  żywo: `GET /api/favorites`, `GET /api/notes`, `POST /api/favorites`, `PUT /api/notes/1`,
  `DELETE /api/favorites/1`, `POST /api/favorites/merge` — **wszystkie 401** bez ciasteczka.
- **Zabezpieczenie przed open redirect** w obu stronach auth (`login.vue:29-32`,
  `register.vue:34-37`): `target.startsWith('/') && !target.startsWith('//')`.
- **Optymistyczny toggle ulubionych z rollbackiem** — `useFavorites.ts:67-81`.
- **Dostępność.** Skip link (`layouts/default.vue:3-8`), globalny `:focus-visible`
  (`main.css:211-214`), `aria-label` na każdym przycisku ikonowym, `aria-pressed` na togglach,
  `aria-live` na licznikach wyników (`cocktails/index.vue:305`, `PantryResults.vue:69`), `sr-only`
  nagłówki. `prefers-reduced-motion` na trzech poziomach: globalny override (`main.css:476-503`),
  `usePreferredReducedMotion()` w 8 komponentach oraz — rzadkie — fallback `@media (scripting: none)`
  (`main.css:467-474`).
- **Motyw jasny realnie zaimplementowany**, nie tylko zadeklarowany: pełne tokeny
  (`main.css:114-149`) plus warstwa korekty kontrastu `.light .bg-primary.text-inverted`
  (`main.css:459-465`).
- **Wspólne DTO przez `#shared/types`** — zmiana kontraktu wywala typecheck po obu stronach naraz.
- **README** z tabelą *Scope decisions*, sekcją *Why X* i uczciwą informacją o braku LICENSE i targetu
  produkcyjnego.

---

## 3. Do poprawy — priorytet wysoki

### 3.1 Kolizja kluczy cache → zatruwanie cache **[potwierdzone]**

`catalogQueryCacheKey()` skleja parametry w `k=v` łączone `&`, a enkoduje dopiero całość. Dwa różne
zapytania dają ten sam klucz, gdy wartość zawiera `&`/`=`. Repro wykonane na żywo:

```text
GET /api/cocktails?category=Cocktail&q=mar       → "total":12   (poprawne)
GET /api/cocktails?category=Cocktail%26q%3Dmar   → "total":12   (BŁĄD — poprawnie 0)
```

Drugie ma jeden parametr `category` o wartości `Cocktail&q=mar`, niepasujący do niczego — dostaje
odpowiedź pierwszego, bo oba mapują się na `cocktails_category_3d_Cocktail_26_q_3d_mar`. Działa też w
drugą stronę: kto pierwszy "zaprimuje" klucz spreparowanym URL-em, karmi wszystkich błędną (np.
pustą) listą przez godzinę (`maxAge: 3600, swr: true`).

**Gdzie:** `server/utils/catalogCache.ts:11-19`, użyte w `server/api/cocktails/index.get.ts:49` i
`server/api/ingredients/index.get.ts:55`.
**Poprawka:** budować klucz z **przewalidowanego** obiektu (`parseCocktailListQuery`), nie z surowego
`getQuery(event)` — wtedy zbiór kluczy jest zamknięty; enkodować klucz i wartość osobno przed
sklejeniem albo po prostu `hash(JSON.stringify(sortedEntries))`. **Nakład: S.**

### 3.2 Nieograniczona przestrzeń kluczy cache **[potwierdzone]**

Schematy Zod nie są `.strict()`, więc nieznane parametry przechodzą, a klucz powstaje z surowego
query. `?perPage=2` i `?perPage=2&junk=1` zwracają bajt w bajt to samo, ale to dwa wpisy w storage.
`?q=<5000 znaków>` → **200 OK** i kolejny wpis. Pętla po `?nonce=N` zapełni storage Nitro (dev:
pamięć procesu, prod: FS).

**Gdzie:** `server/utils/catalogQuery.ts:20-39`, `server/utils/catalogCache.ts:11-19`.
**Poprawka:** ta sama co 3.1 — klucz wyłącznie z pól po walidacji; opcjonalnie `.strict()`, by
śmieciowe parametry dawały 400; `q` w kluczu skrócić do hasha. **Nakład: S.**

### 3.3 Spiżarnia >100 składników → strona wisi na skeletonach **[potwierdzone]**

Kontrakt (`docs/API_CONTRACTS.md:140`) i schemat (`server/api/pantry/match.post.ts:4-6`) ograniczają
listę do 100 slugów. Frontend nie ma **żadnego** limitu — katalog ma 299 składników z quick-togglem
na `/ingredients` i w `IngredientList.vue`. Repro: `POST /api/pantry/match` ze 101 slugami → **400**.

Gorszy jest skutek: `app/pages/pantry.vue:13-22` ignoruje `error` z `useAsyncData`, więc `match`
zostaje `null`, a `PantryResults.vue:22` liczy `loadingFirst = hasPantry && !result` → **skeletony w
nieskończoność**, bez komunikatu.

**Poprawka:** (a) twardy limit w `usePantry().toggle()` (`usePantry.ts:25-29`) z toastem,
(b) obsłużyć `error` i pokazać `EmptyState` — `loadingFirst` musi uwzględniać stan błędu. Nawet po
podniesieniu limitu w API (b) jest konieczne. **Nakład: S.**

### 3.4 Duplikaty wielkości liter w `glass` — filtr gubi wyniki **[potwierdzone]**

Problem jest **szerszy niż zakładano** — nie 2 pary, tylko 8:

| wariant A | n | wariant B | n |
|---|---|---|---|
| `Cocktail Glass` | 2 | `Cocktail glass` | 102 |
| `Highball Glass` | 19 | `Highball glass` | 80 |
| `Old-Fashioned glass` | 3 | `Old-fashioned glass` | 36 |
| `Collins Glass` | 33 | `Collins glass` | 30 |
| `Shot Glass` | 1 | `Shot glass` | 26 |
| `Coffee Mug` | 4 | `Coffee mug` | 12 |
| `Champagne Flute` | 2 | `Champagne flute` | 5 |
| `Punch Bowl` | 1 | `Punch bowl` | 7 |

To nie kosmetyka listy: `buildCocktailWhere` robi **exact match** (`catalogQuery.ts:241`), więc
kliknięcie "Cocktail Glass" pokazuje **2 ze 104** koktajli, a użytkownik nie ma jak zgadnąć, że
istnieje drugi, prawie identyczny wpis.

**Poprawka:** najlepiej u źródła — znormalizować `glass` w `normalize.ts` i przeseedować (facet i
filtr robią się poprawne bez zmian w API). Awaryjnie bez re-seedu: `groupBy` po `lower(glass)` w
`meta.get.ts:8` + `mode: 'insensitive'` w `where.glass`. **Nakład: M.**

### 3.5 ISR na trasach z treścią zależną od sesji **[podejrzenie — nieaktywne w dev, groźne w prod]**

`nuxt.config.ts:23-24` włącza `isr: 3600` na `/cocktails/**` i `/ingredients/**`. Sprawdziłem
implementację cache Nitro (`node_modules/nitropack/dist/runtime/internal/cache.mjs`): klucz to hash
ścieżki z query, **bez `varies` po ciasteczku**, a nagłówki — łącznie z `set-cookie` — trafiają do
wpisu cache i są **odtwarzane każdemu kolejnemu klientowi** (`if (name === "set-cookie")
event.node.res.appendHeader(...)`). Nie ma guardu "nie cache'uj odpowiedzi z set-cookie".

Każda odpowiedź SSR tej aplikacji ustawia ciasteczka (potwierdzone `curl -D -`):

```text
set-cookie: guest-favorites=%5B%5D; Max-Age=15552000; Path=/
set-cookie: pantry=%5B%5D; Max-Age=15552000; Path=/
```

a strona szczegółu renderuje treść zależną od sesji: blok notatek `v-if="loggedIn"`
(`cocktails/[slug].vue:310`) i w headerze inicjał + `aria-label="Account menu for {name}"`
(`UserMenu.vue:45,47`). Przy buildzie produkcyjnym pierwszy render zapełniający cache jest serwowany
wszystkim: imię zalogowanego trafia do HTML widzianego przez anonimów, a jego `pantry`/
`guest-favorites` są wpychane innym do przeglądarki.

**Dlaczego "podejrzenie":** w dev route rules ISR się nie stosują (brak `cache-control`, `set-cookie`
przy każdym żądaniu), a projekt nie ma targetu produkcyjnego — dziś to nie strzela. Konfiguracja już
tam jest.
**Poprawka:** zdjąć `isr` z tras z treścią zależną od sesji albo opakować te bloki w `<ClientOnly>`.
Wymaga też sprostowania README (5.6). **Nakład: M.**

---

## 4. Do poprawy — priorytet średni

**4.1 `sort=random` omija cache, ale ogłasza się jako cacheowalne [potwierdzone].** Bypass działa
(dwa wywołania → inne koktajle), ale odpowiedź i tak niesie
`cache-control: s-maxage=3600, stale-while-revalidate` — Nitro buduje te nagłówki także na ścieżce
bypassu. Za dowolnym CDN "losowość" zamarza na godzinę, czyli dokładnie to, czemu bypass miał
zapobiec. *Gdzie:* `server/api/cocktails/index.get.ts:23-31,50`. *Poprawka:* jawne
`setHeader(event, 'cache-control', 'no-store')` w gałęzi random. **S.**

**4.2 Rate limiter ufa `x-forwarded-for` [potwierdzone w kodzie].** `server/utils/rateLimit.ts:22` —
`getRequestIP(event, { xForwardedFor: true })` bez pojęcia trusted proxy. Bez reverse proxy
nadpisującego nagłówek klient podaje go sam, więc limit 10/10 min na logowaniu obchodzi się rotacją
jednej wartości — ochrona przed brute-force jest w praktyce wyłączona. Store per-proces (README to
odnotowuje). *Poprawka:* domyślnie `xForwardedFor: false`, włączane flagą środowiskową. **S.**

**4.3 Ciasteczka gościa rosną bez limitu [potwierdzone w kodzie].** `guest-favorites`
(`useFavorites.ts:13-16`) i `pantry` (`usePantry.ts:5-8`) nie mają górnej granicy i lecą przy
**każdym** żądaniu, także po assety. 299 slugów po URL-enkodowaniu (`%22`, `%2C`) to ~5–6 KB —
powyżej limitu 4096 B: przeglądarka po cichu odrzuci zapis i spiżarnia zacznie gubić pozycje. Ten sam
korzeń co 3.3. *Poprawka:* limit ilościowy albo `localStorage` z SSR-safe hydracją; dla zalogowanych —
spiżarnia w bazie. **M.**

**4.4 Zduplikowane klucze `v-for` [potwierdzone].** `IngredientList.vue:101` używa
`:key="line.ingredient.slug"`, a 10 par (cocktailId, ingredientId) występuje dwa razy. Z bazy:

```text
whiskey-sour | pos 1 | Lemon | Juice of 1/2
whiskey-sour | pos 4 | Lemon | 1/2 slice     ← ten sam slug
```

Schemat ma naturalny klucz — `@@id([cocktailId, position])`. Efekt uboczny tych samych danych:
"Total volume" (`IngredientList.vue:39-42`) sumuje zdublowaną linię dwa razy. *Poprawka:*
`:key="line.position"`; rozważyć scalanie linii przy liczeniu objętości. **S.**

**4.5 `POST /api/pantry/match` bez rate limitu i bez cache [potwierdzone].** Handler przy każdym
żądaniu czyta wszystkie 1730 wierszy `CocktailIngredient` i przebudowuje mapę w JS
(`match.post.ts:67-81`). Publiczny, nielimitowany, a strona pantry odpala go co 300 ms przy debounce.
*Poprawka:* zbuforować mapę "wymagane linie per koktajl" w pamięci procesu (zmienia się tylko przy
re-seedzie) + `assertRateLimit`. **S/M.**

**4.6 Sortowanie składników bajtowe [potwierdzone].** Collation C sprawia, że `blackstrap rum` i
`demerara Sugar` lądują **za** `Zima` — potwierdzone w psql i przez API
(`/api/ingredients?perPage=96&page=4`, dwie ostatnie pozycje). 2 z 299, widoczne tylko na ostatniej
stronie, ale wygląda jak błąd. *Poprawka:* kolumna `nameSort` (lowercase) wypełniana w seedzie. **S.**

**4.7 Brak indeksów pod realnie używane filtry [potwierdzone w schemacie].** `prisma/schema.prisma`
indeksuje `category`, `isAlcoholic`, `groupSlug`, ale **nie** `Cocktail.name` (domyślny sort +
`contains`), `Cocktail.glass` (facet i filtr) ani `Ingredient.name`. Przy 441/299 wierszach bez
znaczenia — warto jednak umieć to nazwać jako świadomą decyzję. Podobnie
`fetchIngredientCocktailCounts()` (pełny GROUP BY) leci przy każdym niecache'owanym wywołaniu
`/api/ingredients`, także gdy `sort != 'popular'` (`ingredients/index.get.ts:18`), a `sort=popular`
ładuje wszystkie pasujące rekordy i sortuje w JS. **S.**

---

## 5. Nice-to-have / dług techniczny

**5.1 Testy pokrywają wyłącznie czyste funkcje.** 227 testów to `format`, `abv`, `parseMeasure` ×3 i
`slugify`. Zero testów dla `buildCocktailWhere`, `catalogQueryCacheKey`, algorytmu spiżarni i
jakiegokolwiek handlera. To nie przypadek, że wszystkie błędy z sekcji 3 leżą dokładnie w niepokrytym
obszarze. Największy zwrot: kilkanaście testów na `catalogCache.ts` (w tym case z 3.1) i na czystą
funkcję wyodrębnioną z `match.post.ts`. **M.**

**5.2 Trzykrotnie zduplikowany `cocktailCardSelect`** — `catalogQuery.ts:89`, `userContent.ts:4`,
`match.post.ts:8`. Świadomy koszt równoległej pracy; teraz nie ma powodu go trzymać. Trzecia kopia
(`as const` zamiast `satisfies Prisma.CocktailSelect`) nie ma nawet tej samej ochrony typów. **S.**

**5.3 Zahardkodowane statystyki** — `index.vue:50-52,93` (441/299/1730), `pantry.vue:8`,
`PantryPicker.vue:40`, `ingredients/index.vue:11` (`CATALOG_SIZE = 299`). Dziś zgadzają się co do
jednego z bazą (sprawdzone); rozjadą się przy pierwszym `data:fetch`. **S.**

**5.4 Jednostka `PIECE` renderuje samą liczbę** — `app/utils/format.ts:21` mapuje `PIECE → ''`, więc
"Juice of 1/2" + "Lemon" wyświetla się jako "½". Sensowne dla "1 Lime", gubi się przy "Juice of".
Fallback: gdy `unit === 'PIECE'` a `rawMeasure` zawiera słowa — pokazać `rawMeasure`. **S.**

**5.5 Brak ESLint i LICENSE.** Styl jest zaskakująco spójny w całym repo, ale niczym niewymuszony.
`@nuxt/eslint` + krok w CI to 20 minut i domyka opis "install → generate → test → typecheck → build".
Brak LICENSE README opisuje uczciwie, ale dla repo portfolio warto dodać MIT. **S.**

**5.6 Dokumentacja rozjeżdża się z kodem w dwóch miejscach.** (a) README, *Caching*: "Cache keys
canonicalise the full query string, so each filter combination caches separately" — intencja tak,
efekt nie (3.1/3.2); do poprawienia **razem** z kodem. (b) README, koniec *Scope decisions*, wymienia
"the `routeRules` caching layer described above" jako **przyszłe** hardening, podczas gdy `routeRules`
z ISR jest już aktywne w `nuxt.config.ts:22-28` — do rozstrzygnięcia przy okazji 3.5.

**5.7 Ostrzeżenia w logu startowym.** `@nuxt/robots` o `disallow: ['/api']`; `@nuxtjs/og-image`
dwukrotnie — o sekrecie podpisu zmieniającym się przy każdym buildzie i o nierozwiązanym foncie
"Segoe UI" (jest w `--font-sans`, `main.css:5`, a moduł próbuje go pobrać z Google/Bunny/Fontsource).
Moduł OG jest aktywny, ale nie ma żadnego własnego szablonu per-page — płacimy koszt bez korzyści.
Decyzja: jeden szablon OG dla `/cocktails/[slug]` albo wyłączenie modułu. **S.**

**5.8 Dwa błędy zaobserwowane raz w logu, nieodtwarzalne [podejrzenie].** Przy zimnym starcie
dev-servera:

```text
WARN  [VUE_ROUTER_R0004] No match found for location with path "/api/pantry/match"   (×2)
ERROR [cache] Cache write error. [unstorage] Cannot stringify value!
```

Pierwsze wskazuje na `$fetch('/api/pantry/match')` z `pantry.vue:16` przechodzące przez router
zamiast handlera (jedyne wystąpienie tej ścieżki w repo). Po rozgrzaniu serwera nie odtworzyłem
żadnego — ani przez `/pantry` z ciasteczkiem i bez, ani przez świeże trasy ISR (`/cocktails/zambeer`,
`/ingredients/absinthe`, `/cocktails/b-53`, `/ingredients/campari`), ani przez sitemap. Wygląda na
artefakt zimnego startu, ale teza "SSR czysty" nie jest w 100% prawdziwa.

**5.9 Screenshoty w README to `TODO`** — cztery pozycje, wszystkie zakomentowane. Dla repo portfolio
to pierwsza rzecz, na którą patrzy rekruter, a aplikacja wygląda naprawdę dobrze; obecnie ta wartość
jest niewidoczna dla kogokolwiek, kto nie odpali Dockera. Najtańsza poprawa odbioru całości.

**5.10 Brak targetu produkcyjnego i testów E2E** — świadome i udokumentowane, w inwentarzu nie jako
zarzut. To samo dotyczy celu Lighthouse ≥95 z planu: nigdy nie zmierzony, bo w tym środowisku nie ma
przeglądarki.

---

## 6. Pomysły na rozwój

Wszystkie zgodne z tabelą *Scope decisions* — świadomie **nie** proponuję resetu hasła, OAuth, panelu
admina, treści od użytkowników ani i18n, bo README wyklucza je z uzasadnieniem, które nadal się broni.

1. **Spiżarnia w koncie użytkownika.** Dziś spiżarnia to ciasteczko, a ulubione dla zalogowanych są w
   bazie. `PantryItem(userId, ingredientId)` z tym samym mechanizmem merge co przy ulubionych
   rozwiązuje 3.3 i 4.3 przy okazji i domyka historię "guest → konto".
2. **"Prawie tam" z substytutami.** Model ma już `groupSlug` i `type`. Ranking "kup jedną butelkę"
   stałby się wyraźnie mądrzejszy, gdyby "light rum" zaliczał koktajle wymagające "white rum" —
   logika czysto po stronie normalizacji, bez nowych zależności, świetnie się demonstruje.
3. **Filtr po sile drinka.** `estimateAbv` już liczy ABV, ale wynik istnieje wyłącznie w UI detalu.
   Zmaterializowanie `abvEstimate` w seedzie odblokowuje filtr "lekkie / mocne" i sort po mocy — duży
   efekt, mało nowego kodu.
4. **Endpoint `/api/stats`** wykorzystany na landingu (rozwiązuje 5.3) i jako podstawa sekcji "co
   nowego po ostatnim re-seedzie".
5. **Jeden szablon OG per cocktail** (nazwa + zdjęcie + ABV). Moduł jest zainstalowany i płaci za
   siebie ostrzeżeniami przy każdym boocie — warto go wykorzystać albo usunąć.
6. **Playwright na trzy ścieżki** (katalog → filtr → detal; spiżarnia → składnik → "ready to pour";
   rejestracja → merge ulubionych). Zamyka lukę z 5.1 i umożliwia pomiar Lighthouse w CI.

---

## 7. Werdykt portfolio

**Tak, projekt jest gotowy do pokazania na rozmowie** — i to nie w kategorii "ładny tutorial", tylko
"ktoś umie dowieźć feature end-to-end". Wyróżniki, których większość projektów portfolio nie ma:
rozdzielony pipeline danych z uzasadnieniem, prawdziwa logika domenowa z testami wyrosłymi z realnych
danych, poprawnie zrobiona obrona timing-attack, konsekwentna dostępność oraz README mówiące także o
tym, czego **nie** zrobiono i dlaczego.

Przed rozmową warto:

- **Umieć opowiedzieć warstwę cache** — i potraktować 3.1 jako atut, nie wstyd. "Napisałem
  kanonikalizację klucza, w review znalazłem kolizję przy `&` w wartości, oto repro i oto fix" to
  jedna z najlepszych odpowiedzi na "opowiedz o błędzie, który popełniłeś".
- **Przygotować odpowiedź o ISR vs sesja** (3.5) — pytanie "co się stanie, gdy zalogowany user trafi
  na stronę cache'owaną przez ISR" pada często, a tu jest gotowy przykład z kodem Nitro w tle.
- **Znać liczby na pamięć:** 441/299/1730, 95,85% pokrycia parsera, 227 testów, 744 URL-e w sitemapie.
- **Umieć uzasadnić sesje zamiast JWT** i **`$fetch` w `useAsyncData` zamiast `useFetch`** — oba
  argumenty są w README i oba są dobre.
- **Naprawić przed wysłaniem linku:** 3.3 (zawieszone skeletony) i 3.4 (filtr szkła gubiący 98%
  wyników) — jedyne dwa błędy, na które recenzent klikający po aplikacji ma realną szansę wpaść sam.
  *(Oba naprawione — patrz sekcja 0.)*
- **Dodać screenshoty** (5.9) — *decyzja: świadomie pominięte, README kieruje do `docker compose up`.*

### Co dodać do tej rozmowy po rundzie 2

- **Kuratorowana mapa zamienników** (`server/utils/substitutes.ts`) — dlaczego `groupSlug` nie
  wystarczył jako klasa równoważności (w `citrus` siedzą obok siebie sok cytrynowy i pomarańczowy,
  w `dairy` mleko i Baileys), i jak nietranzytywność załatwiono przez obecność slugu w kilku
  klastrach (`whiskey` mostkuje scotch i bourbon, ale scotch z bourbonem już się nie łączą).
- **Dlaczego `abv = null` to nie `abv = 0`** — sangria z niezmierzonym winem nie jest napojem
  bezalkoholowym. To najlepszy przykład „uczciwości wobec danych" w całym projekcie.
- **ISR kontra sesja** — reguły `isr` zostały świadomie **zdjęte**, a cache zszedł piętro niżej, do
  API. Uzasadnienie: każda odpowiedź SSR ustawia ciasteczka, a cache stron Nitro nie ma `varies`
  po cookie.
