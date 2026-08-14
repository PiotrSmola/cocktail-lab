<script setup lang="ts">
import type { CocktailCard as CocktailCardDto, Paginated } from '#shared/types/catalog'
import type { CatalogStats } from '#shared/types/stats'

const { data: catalogStats } = await useAsyncData(
  'catalog-stats',
  () => $fetch<CatalogStats>('/api/stats'),
  { default: () => null }
)

const seoDescription = computed(() => (
  catalogStats.value
    ? `Browse ${catalogStats.value.cocktails} cocktails and ${catalogStats.value.ingredients} ingredients, learn what every bottle unlocks, and find out what you can shake tonight with what is already on your shelf.`
    : 'Browse the craft cocktail catalogue, learn what every bottle unlocks, and find out what you can shake tonight with what is already on your shelf.'
))

useSeoMeta({
  title: 'Cocktail Lab — craft cocktail encyclopedia',
  description: () => seoDescription.value,
  ogTitle: 'Cocktail Lab — craft cocktail encyclopedia',
  ogDescription: 'A moody craft-cocktail laboratory: search the classics, explore ingredients, and match your pantry to drinks you can make right now.'
})

const toast = useToast()
const query = ref('')
const surprising = ref(false)

function search() {
  const q = query.value.trim()
  return navigateTo(q ? { path: '/cocktails', query: { q } } : '/cocktails')
}

async function surpriseMe() {
  if (surprising.value) return
  surprising.value = true
  try {
    const result = await $fetch<{ slug: string }>('/api/cocktails/random')
    if (result?.slug) await navigateTo(`/cocktails/${result.slug}`)
    else throw new Error('empty')
  } catch {
    toast.add({
      title: 'The shaker slipped',
      description: 'Could not pull a random cocktail right now. Try browsing the catalogue instead.',
      icon: 'i-lucide-triangle-alert',
      color: 'warning'
    })
  } finally {
    surprising.value = false
  }
}

const { data: picks, status: picksStatus } = await useAsyncData(
  'home-picks',
  () => $fetch<Paginated<CocktailCardDto>>('/api/cocktails', { query: { sort: 'random', perPage: 8 } }),
  { default: () => null }
)

const pickItems = computed<CocktailCardDto[]>(() => picks.value?.items ?? [])
const picksPending = computed(() => picksStatus.value === 'pending')
const picksEmpty = computed(() => !picksPending.value && pickItems.value.length === 0)

const heroBadge = computed(() => (
  catalogStats.value ? `${catalogStats.value.cocktails} recipes` : 'always stocked'
))

const stats = computed(() => {
  const data = catalogStats.value

  return [
    {
      label: 'cocktails',
      value: data?.cocktails ?? null,
      hint: data
        ? `${data.ibaCocktails} IBA officials · ${data.zeroProofCocktails} zero-proof`
        : 'classics, tiki and modern',
      icon: 'i-lucide-martini'
    },
    {
      label: 'ingredients',
      value: data?.ingredients ?? null,
      hint: 'spirits, mixers and garnish',
      icon: 'i-lucide-flask-round'
    },
    {
      label: 'pairings',
      value: data?.pairings ?? null,
      hint: data
        ? `${data.avgIngredientsPerCocktail} ingredients per drink on average`
        : 'mapped ingredient links',
      icon: 'i-lucide-git-fork'
    }
  ]
})

const spirits = [
  { slug: 'gin', label: 'Gin', note: 'Botanical & bright', icon: 'i-lucide-sprout' },
  { slug: 'rum', label: 'Rum', note: 'Sugarcane & sun', icon: 'i-lucide-palmtree' },
  { slug: 'vodka', label: 'Vodka', note: 'Clean canvas', icon: 'i-lucide-snowflake' },
  { slug: 'tequila', label: 'Tequila', note: 'Agave & smoke', icon: 'i-lucide-flame' },
  { slug: 'whiskey', label: 'Whiskey', note: 'Oak & spice', icon: 'i-lucide-barrel' },
  { slug: 'brandy', label: 'Brandy', note: 'Orchard & velvet', icon: 'i-lucide-grape' }
]

const pantryDemo = [
  { name: 'Gin', checked: true },
  { name: 'Lime juice', checked: true },
  { name: 'Simple syrup', checked: true },
  { name: 'Angostura bitters', checked: false },
  { name: 'Sweet vermouth', checked: false }
]
</script>

<template>
  <div>
    <section class="relative isolate overflow-hidden grain">
      <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10">
        <span class="orb -left-32 -top-24 size-[26rem] bg-lab-amber/50" style="animation-duration: 26s" />
        <span
          class="orb left-1/3 -top-40 size-[30rem] bg-lab-rose/40"
          style="animation-duration: 34s; animation-delay: -9s"
        />
        <span
          class="orb -right-24 top-10 size-[28rem] bg-lab-violet/50"
          style="animation-duration: 30s; animation-delay: -17s"
        />
      </div>

      <div class="mx-auto w-full max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:px-8">
        <p
          class="animate-rise-in inline-flex items-center gap-2 rounded-full border border-default/70 bg-elevated/40 px-3.5 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted backdrop-blur"
        >
          <span class="size-1.5 animate-pulse rounded-full bg-accent" />
          Open bar · {{ heroBadge }}
        </p>

        <h1
          class="animate-rise-in mt-7 max-w-4xl font-display text-5xl font-semibold leading-[1.02] text-highlighted sm:text-6xl lg:text-7xl"
          style="animation-delay: 80ms"
        >
          Every great drink starts as
          <span class="text-gradient text-gradient-anim">an experiment</span>
        </h1>

        <p
          class="animate-rise-in mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg"
          style="animation-delay: 160ms"
        >
          A craft cocktail encyclopedia with a laboratory streak. Search the classics, trace what every
          bottle unlocks, then tick your shelf and see exactly what you can shake tonight.
        </p>

        <form
          class="animate-rise-in mt-10 flex w-full max-w-2xl flex-col gap-3 sm:flex-row"
          style="animation-delay: 240ms"
          role="search"
          @submit.prevent="search"
        >
          <label for="hero-search" class="sr-only">Search cocktails by name</label>
          <div
            class="glass-panel glass-panel-strong focus-ring-within flex flex-1 items-center gap-3 rounded-full px-5 py-1.5"
          >
            <UIcon name="i-lucide-search" class="size-5 shrink-0 text-accent" />
            <input
              id="hero-search"
              v-model="query"
              type="search"
              name="q"
              placeholder="Try negroni, mojito, amaretto…"
              autocomplete="off"
              class="w-full bg-transparent py-3 text-base text-highlighted placeholder:text-dimmed focus:outline-none"
            >
          </div>
          <UButton
            type="submit"
            size="xl"
            color="primary"
            class="justify-center rounded-full px-7 font-semibold glow-amber"
            trailing-icon="i-lucide-arrow-right"
          >
            Search
          </UButton>
        </form>

        <div class="animate-rise-in mt-5 flex flex-wrap items-center gap-4" style="animation-delay: 320ms">
          <UButton
            variant="ghost"
            color="neutral"
            size="lg"
            icon="i-lucide-dices"
            :loading="surprising"
            class="rounded-full border border-default/70 px-5 hover:border-accent-rose/60 hover:text-accent-rose"
            @click="surpriseMe"
          >
            Surprise me
          </UButton>
          <NuxtLink
            to="/pantry"
            class="nav-link text-sm font-medium text-muted transition-colors duration-300 hover:text-highlighted"
          >
            or match what is already on your shelf
          </NuxtLink>
        </div>
      </div>

      <div aria-hidden="true" class="rule-gradient absolute inset-x-0 bottom-0 opacity-40" />
    </section>

    <section class="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <h2 class="sr-only">Cocktail Lab in numbers</h2>
      <RevealOnScroll :stagger="110" class="grid gap-4 sm:grid-cols-3">
        <GlassPanel
          v-for="stat in stats"
          :key="stat.label"
          hover
          :padded="false"
          class="flex items-start justify-between gap-4 p-6 sm:p-7"
        >
          <div>
            <p class="font-display text-4xl font-semibold text-highlighted sm:text-5xl">
              <AnimatedNumber v-if="stat.value !== null" :key="stat.value" :value="stat.value" />
              <span v-else class="text-dimmed">—</span>
            </p>
            <p class="mt-1 text-sm font-semibold uppercase tracking-[0.16em] text-accent">
              {{ stat.label }}
            </p>
            <p class="mt-2 text-xs text-dimmed">
              {{ stat.hint }}
            </p>
          </div>
          <span
            class="flex size-11 shrink-0 items-center justify-center rounded-full border border-default/60 bg-elevated/40"
          >
            <UIcon :name="stat.icon" class="size-5 text-accent-violet" />
          </span>
        </GlassPanel>
      </RevealOnScroll>
    </section>

    <section class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <RevealOnScroll class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-accent-rose">
            Fresh pour
          </p>
          <h2 class="mt-2 font-display text-3xl font-semibold text-highlighted sm:text-4xl">
            Tonight's picks
          </h2>
          <p class="mt-2 max-w-xl text-sm text-muted">
            Eight recipes pulled at random from the shelf. Refresh the page for a different round.
          </p>
        </div>
        <UButton
          to="/cocktails"
          variant="outline"
          color="neutral"
          size="lg"
          trailing-icon="i-lucide-arrow-up-right"
          class="rounded-full hover:border-accent/60 hover:text-accent"
        >
          Browse all cocktails
        </UButton>
      </RevealOnScroll>

      <div v-if="picksPending" class="mt-8 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        <CocktailCardSkeleton v-for="n in 8" :key="n" :delay="n * 90" />
      </div>

      <EmptyState
        v-else-if="picksEmpty"
        class="mt-8"
        icon="i-lucide-flask-conical-off"
        title="The shelf is still being stocked"
        hint="The catalogue is coming online. In the meantime you can already explore ingredients and set up your pantry."
      >
        <UButton to="/ingredients" color="primary" size="lg" class="rounded-full" trailing-icon="i-lucide-arrow-right">
          Explore ingredients
        </UButton>
      </EmptyState>

      <RevealOnScroll
        v-else
        :stagger="80"
        class="mt-8 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
      >
        <CocktailCard
          v-for="(cocktail, index) in pickItems"
          :key="cocktail.id"
          :cocktail="cocktail"
          :eager="index < 4"
        />
      </RevealOnScroll>
    </section>

    <section class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <RevealOnScroll>
        <GlassPanel grain :padded="false" class="relative overflow-hidden">
          <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10">
            <span class="orb -right-20 -top-20 size-72 bg-lab-mint/40" style="animation-duration: 28s" />
            <span class="orb -bottom-24 left-10 size-64 bg-lab-violet/40" style="animation-duration: 36s" />
          </div>

          <div class="grid items-center gap-10 p-7 sm:p-10 lg:grid-cols-2 lg:gap-14 lg:p-14">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-accent-mint">
                Pantry matcher
              </p>
              <h2 class="mt-3 font-display text-3xl font-semibold leading-tight text-highlighted sm:text-4xl">
                Tick what is home.
                <span class="text-gradient">See what you can shake.</span>
              </h2>
              <p class="mt-4 max-w-lg text-sm leading-relaxed text-muted sm:text-base">
                Mark the bottles, mixers and citrus on your shelf. Cocktail Lab matches them against every
                recipe, shows the drinks you can pour right now, the ones you are one ingredient away from,
                and which single bottle would unlock the most new rounds.
              </p>

              <ul class="mt-6 space-y-2.5 text-sm text-muted">
                <li class="flex items-start gap-2.5">
                  <UIcon name="i-lucide-check-check" class="mt-0.5 size-4 shrink-0 text-accent-mint" />
                  Instant "makeable now" list, no account needed
                </li>
                <li class="flex items-start gap-2.5">
                  <UIcon name="i-lucide-target" class="mt-0.5 size-4 shrink-0 text-accent-mint" />
                  "One away" suggestions with the exact missing bottle
                </li>
                <li class="flex items-start gap-2.5">
                  <UIcon name="i-lucide-sparkles" class="mt-0.5 size-4 shrink-0 text-accent-mint" />
                  Unlock ranking: the best next purchase for your bar
                </li>
              </ul>

              <UButton
                to="/pantry"
                size="xl"
                color="primary"
                trailing-icon="i-lucide-arrow-right"
                class="mt-8 rounded-full px-6 font-semibold glow-amber"
              >
                Build your pantry
              </UButton>
            </div>

            <div class="relative">
              <div class="glass-panel glass-panel-strong p-5 sm:p-6">
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-dimmed">
                  Your shelf
                </p>
                <RevealOnScroll as="ul" :stagger="150" :y="10" class="mt-4 space-y-2">
                  <li
                    v-for="item in pantryDemo"
                    :key="item.name"
                    class="flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors duration-500"
                    :class="item.checked
                      ? 'border-lab-mint/40 bg-lab-mint/10 text-highlighted'
                      : 'border-default/60 bg-elevated/30 text-dimmed'"
                  >
                    <span
                      class="flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-500"
                      :class="item.checked ? 'border-lab-mint bg-lab-mint/80' : 'border-default'"
                      aria-hidden="true"
                    >
                      <UIcon v-if="item.checked" name="i-lucide-check" class="size-3.5 text-ink-950" />
                    </span>
                    {{ item.name }}
                  </li>
                </RevealOnScroll>

                <div class="mt-5 flex items-center justify-between border-t border-default/60 pt-4">
                  <span class="text-xs uppercase tracking-[0.16em] text-dimmed">You can make</span>
                  <span class="font-display text-2xl font-semibold text-accent-mint">
                    <AnimatedNumber :value="12" :duration="1400" />
                  </span>
                </div>
              </div>

              <span
                aria-hidden="true"
                class="absolute -bottom-4 -right-3 hidden rotate-6 rounded-xl border border-lab-amber/40 bg-lab-amber/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent backdrop-blur sm:block"
              >
                +3 one away
              </span>
            </div>
          </div>
        </GlassPanel>
      </RevealOnScroll>
    </section>

    <section class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <RevealOnScroll>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-accent-violet">
          Start from the bottle
        </p>
        <h2 class="mt-2 font-display text-3xl font-semibold text-highlighted sm:text-4xl">
          Pick a base spirit
        </h2>
      </RevealOnScroll>

      <RevealOnScroll :stagger="70" class="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
        <NuxtLink
          v-for="spirit in spirits"
          :key="spirit.slug"
          :to="{ path: '/cocktails', query: { spirit: spirit.slug } }"
          class="glass-panel glass-hover group flex flex-col gap-3 rounded-2xl p-5"
        >
          <span
            class="flex size-10 items-center justify-center rounded-full border border-default/60 bg-elevated/40 transition-colors duration-500 group-hover:border-accent/55"
          >
            <UIcon
              :name="spirit.icon"
              class="size-5 text-accent transition-transform duration-500 ease-lab group-hover:scale-110"
            />
          </span>
          <span class="font-display text-lg font-semibold text-highlighted">{{ spirit.label }}</span>
          <span class="text-xs text-dimmed">{{ spirit.note }}</span>
        </NuxtLink>
      </RevealOnScroll>
    </section>
  </div>
</template>
