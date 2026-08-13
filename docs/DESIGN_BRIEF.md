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
