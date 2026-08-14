# Cocktail Lab — Design Brief: "Neon Alchemy"

A moody craft-cocktail laboratory at dusk: dark glass, amber light, a hint of chemistry. Artistic and heavily animated, yet legible, accessible and fast. Every page must feel like one product — use only the tokens and shared components below.

## Foundations

- **Color mode**: dark-first (default dark), full light-mode support via Nuxt UI color mode; toggle in header.
- **Nuxt UI v4** theming in `app.config.ts`: `{ ui: { colors: { primary: 'amber', neutral: 'zinc' } } }`.
- **Palette** (Tailwind v4 `@theme` tokens in `app/assets/css/main.css`, owner: design agent):
  - Background: near-black ink with a subtle violet cast; elevated "glass" surfaces = translucent white 4–6% + `backdrop-blur` + 1px `white/10` border.
  - Primary: amber/gold. Accent: rose/coral. Non-alcoholic badge: emerald/mint.
  - Signature gradient: amber → rose → violet (hero headline, glows, section accents).
- **Typography** (@nuxt/fonts ships with Nuxt UI — just declare font families in CSS):
  - Display: **Fraunces** (600–900) for h1/h2/logo — expose as `--font-display` / `.font-display`.
  - Body: **Inter** (400/500/600) as default sans.
- **Icons**: `i-lucide-*` (Nuxt UI / @nuxt/icon).
- **Rhythm**: `max-w-7xl` container, sections `py-16`+, radius `rounded-xl/2xl`, soft shadows with colored glow on interactive elements.

## Motion language (required, but respect `prefers-reduced-motion`)

- Page transitions: fade + 8px rise, ~300ms, defined once in `app.vue`.
- Scroll reveals with stagger: shared `<RevealOnScroll>` component (IntersectionObserver / VueUse) or `v-motion`.
- Cards: hover lift `translateY(-4px) scale(1.02)` + amber glow + image zoom 1.05, ~300ms `cubic-bezier(0.22,1,0.36,1)`.
- Hero: slow animated gradient + floating blurred orbs (CSS keyframes, transform/opacity only — GPU friendly).
- `<AnimatedNumber>` count-ups when scrolled into view.
- `TransitionGroup` FLIP moves on list filtering.
- Buttons: press `scale(0.97)`; `focus-visible` amber ring everywhere.
- Skeletons with shimmer while data loads.
- Reduced motion: kill orbs, parallax, count-ups and big transitions — this is a hard requirement.

## Shared components (owner: design agent — others consume, never edit)

| Component | Purpose |
|---|---|
| `AppHeader` | sticky glass header: logo, nav (Cocktails, Ingredients, Pantry), color-mode toggle, `UserMenu` slot area |
| `UserMenu` | auth area placeholder (login link); **auth-pages agent may edit this one file** |
| `AppFooter` | includes required attribution: "Data by TheCocktailDB" + backlink |
| `CocktailCard` | prop `cocktail: CocktailCard` DTO; image (fallback = gradient + glass icon), name, category + non-alcoholic badges, optional favorite-slot |
| `GlassPanel` | glassmorphism surface wrapper |
| `PageHero` | inner-page hero: eyebrow, display title, description slot |
| `RevealOnScroll` | scroll-reveal wrapper with `delay` prop |
| `AnimatedNumber` | count-up number, reduced-motion safe |
| `EmptyState` | icon + title + hint + CTA slot |

Images: TheCocktailDB URLs via `<NuxtImg>` (domain already allow-listed), always with `width`/`height`, `rounded-2xl`, lazy where below the fold.

## Page-specific notes

- **Landing `/`** (design agent): the showpiece. Hero with animated gradient + orbs + tagline + search CTA (routes to `/cocktails?q=`), "Surprise me" button (`/api/cocktails/random` → navigate to slug), stats band with count-ups (441 cocktails / 299 ingredients / 1730 pairings), horizontally scrolling/marquee row of random cocktail cards, pantry feature teaser with CTA, footer attribution.
- **Inner pages** (wave-2 agents): same language, calmer. Every page: `PageHero`, staggered reveals, skeletons for async data, `EmptyState` for zero results.
- **`error.vue`**: artistic 404/500 — CSS/SVG spilled-glass illustration, "This drink doesn't exist", search input + link home.

## Accessibility

Text contrast ≥ 4.5:1, focus-visible rings, aria-labels on icon-only buttons, semantic headings, keyboard reachable everything, reduced-motion fallbacks.

---

## Postscript: what it actually grew into

Everything above is the original intent and still holds. This section records the pieces the brief
did not anticipate, so it does not read as fiction against the built product.

- **Strength as a visual language.** Drink strength became a first-class dimension, and it needed its
  own vocabulary rather than another neutral badge. Five bands — Zero proof, Easy going, Balanced,
  Strong, Spirit-forward — each with a lucide icon that reads at a glance (`leaf`, `feather`,
  `scale`, `flame`, `zap`). They appear three ways: as filter pills on `/cocktails`
  (`components/cocktails/StrengthPills.vue`, a labelled `role="group"` alongside the spirit pills),
  as a pill on the card, and as the `AbvMeter` on the detail page — a bar filling toward a 40% ABV
  ceiling, with the `≈` prefix kept from the original honesty rule. The bands live in
  `shared/types/catalog.ts`, so the UI and the API cannot disagree about where "Strong" begins.
- **"Not enough measures" is a design state, not an error.** When a drink's alcoholic lines are all
  unmeasured, the meter shows no bar and reads *Not enough measures* rather than 0%. Zero proof and
  unknown look different on purpose; collapsing them would make the design lie.
- **Substitution chips.** Pantry results needed to distinguish *you can make this* from *you can make
  this if you accept a stand-in*. The answer was a violet-accented chip under the affected cards —
  "With substitutes — Sweet Vermouth for Vermouth" — plus a summary line above the grid ("N of the M
  ready drinks lean on a close stand-in"). Violet was already in the signature gradient, so the
  swapped state reads as a variation rather than a warning. The unlock cards gained the same
  treatment for what a bottle would cover.
- **The pantry sync indicator.** Once the shelf could live either in a cookie or in an account, the
  user had to be able to see which. `PantryShelf` carries a persistent line: *"Synced to your
  account"* when signed in, and otherwise an invitation to sign in that names the guest cap. When the
  cap is hit, a toast — not a silent drop — explains what happened and links to `/login`.
- **OG image templates** (`app/components/OgImage/`). Two takumi templates in the same visual
  language: `Default` for the section pages, and `Cocktail`, which composes the drink's photo,
  category, glass and ABV into a 1200×630 card, stepping the headline size down across four length
  bands so long names stay on the card. These render to PNG and never reach a browser, so the
  accessibility lint rules are switched off for that directory alone.
- **Iconography and empty states** stayed exactly as briefed — `i-lucide-*` throughout, `EmptyState`
  on every zero-result surface, `RevealOnScroll` on the new panels as well as the old.
