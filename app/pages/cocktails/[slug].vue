<script setup lang="ts">
import type { CocktailCard as CocktailCardDto, CocktailDetail, Paginated } from '#shared/types/catalog'

definePageMeta({ key: route => route.path })

const SENTENCE_BREAK = /\.\s+/
const MIN_STEP_LENGTH = 4
const DESCRIPTION_LENGTH = 155
const RELATED_LIMIT = 4

const route = useRoute()
const toast = useToast()
const { loggedIn } = useUserSession()

const slug = computed(() => String(route.params.slug ?? ''))

const { data: detail, error: detailError } = await useAsyncData(
  `cocktail-detail-${slug.value}`,
  () => $fetch<CocktailDetail>(`/api/cocktails/${slug.value}`)
)

if (detailError.value || !detail.value) {
  throw createError({ statusCode: 404, statusMessage: 'Cocktail not found', fatal: true })
}

const cocktail = computed<CocktailDetail>(() => detail.value!)

const steps = computed(() => {
  const parts = cocktail.value.instructions.split(SENTENCE_BREAK)
  return parts
    .map((part, index) => (index < parts.length - 1 ? `${part}.` : part).trim())
    .filter(part => part.length >= MIN_STEP_LENGTH)
})

const description = computed(() => {
  const text = cocktail.value.instructions.trim()
  return text.length > DESCRIPTION_LENGTH
    ? `${text.slice(0, DESCRIPTION_LENGTH - 1).trimEnd()}…`
    : text
})

const pivot = computed(() => {
  const lines = cocktail.value.ingredients
  return lines.find(line => line.ingredient.isAlcoholic)?.ingredient ?? lines[0]?.ingredient ?? null
})

const { data: relatedData } = await useAsyncData(
  `cocktail-related-${slug.value}`,
  async () => {
    const pivotSlug = pivot.value?.slug
    if (!pivotSlug) return []

    const result = await $fetch<Paginated<CocktailCardDto>>('/api/cocktails', {
      query: { ingredient: pivotSlug, perPage: 5 }
    })

    return result.items
      .filter(item => item.slug !== slug.value)
      .slice(0, RELATED_LIMIT)
  },
  { default: () => [] }
)

const related = computed<CocktailCardDto[]>(() => relatedData.value ?? [])

async function copyLink(): Promise<void> {
  const url = window.location.href

  try {
    if (!navigator.clipboard) throw new Error('clipboard unavailable')
    await navigator.clipboard.writeText(url)
    toast.add({
      title: 'Link copied',
      description: `${cocktail.value.name} is on your clipboard.`,
      icon: 'i-lucide-link',
      color: 'success'
    })
  }
  catch {
    toast.add({
      title: 'Could not copy the link',
      description: url,
      icon: 'i-lucide-triangle-alert',
      color: 'warning'
    })
  }
}

const strength = computed(() => estimateAbv(
  cocktail.value.ingredients,
  detectDilution(cocktail.value.instructions)
))

useSeoMeta({
  title: () => cocktail.value.name,
  description: () => description.value,
  ogTitle: () => `${cocktail.value.name} — Cocktail Lab`,
  ogDescription: () => description.value,
  twitterCard: 'summary_large_image'
})

defineOgImage('Cocktail', {
  name: cocktail.value.name,
  imageUrl: cocktail.value.imageUrl,
  category: cocktail.value.category,
  glass: cocktail.value.glass,
  isAlcoholic: cocktail.value.isAlcoholic,
  abv: strength.value.abv
})

useSchemaOrg([
  defineRecipe({
    name: cocktail.value.name,
    image: cocktail.value.imageUrl ?? undefined,
    description: description.value,
    recipeIngredient: cocktail.value.ingredients.map(line => `${line.rawMeasure ? `${line.rawMeasure} ` : ''}${line.ingredient.name}`.trim()),
    recipeInstructions: steps.value,
    recipeCategory: cocktail.value.category ?? undefined,
    keywords: cocktail.value.tags.length ? cocktail.value.tags : undefined
  })
])
</script>

<template>
  <div>
    <section class="relative isolate overflow-hidden grain">
      <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10">
        <span class="orb -left-32 -top-28 size-[24rem] bg-lab-amber/45" style="animation-duration: 27s" />
        <span
          class="orb -right-24 -top-16 size-[26rem] bg-lab-violet/45"
          style="animation-duration: 34s; animation-delay: -11s"
        />
      </div>

      <div class="mx-auto w-full max-w-7xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8">
        <nav aria-label="Breadcrumb" class="animate-rise-in">
          <ol class="flex flex-wrap items-center gap-2 text-xs font-medium text-dimmed sm:text-sm">
            <li>
              <NuxtLink
                to="/cocktails"
                class="nav-link transition-colors duration-300 hover:text-accent"
              >
                Cocktails
              </NuxtLink>
            </li>
            <li aria-hidden="true">
              <UIcon name="i-lucide-chevron-right" class="size-3.5 translate-y-0.5" />
            </li>
            <li aria-current="page" class="text-muted">
              {{ cocktail.name }}
            </li>
          </ol>
        </nav>

        <div class="mt-8 grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <figure class="animate-rise-in glass-panel group relative order-1 overflow-hidden p-3 sm:p-4">
            <div class="relative aspect-square w-full overflow-hidden rounded-2xl bg-elevated/40">
              <NuxtImg
                v-if="cocktail.imageUrl"
                :src="cocktail.imageUrl"
                :alt="cocktail.name"
                width="720"
                height="720"
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 88vw, 560px"
                loading="eager"
                fetchpriority="high"
                format="webp"
                class="size-full object-cover transition-transform duration-700 ease-lab group-hover:scale-[1.04]"
              />

              <div
                v-else
                class="flex size-full items-center justify-center bg-gradient-to-br from-lab-amber/25 via-lab-rose/20 to-lab-violet/30"
              >
                <span
                  class="flex size-24 items-center justify-center rounded-full border border-white/15 bg-white/10 backdrop-blur-md"
                >
                  <UIcon name="i-lucide-martini" class="size-10 text-white/80" />
                </span>
              </div>

              <div
                aria-hidden="true"
                class="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10"
              />
            </div>

            <figcaption v-if="cocktail.imageAttribution" class="mt-3 px-1 text-[0.7rem] leading-relaxed text-dimmed">
              Photo: {{ cocktail.imageAttribution }}
            </figcaption>
          </figure>

          <div class="order-2">
            <h1
              class="animate-rise-in font-display text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl"
              style="animation-delay: 80ms"
            >
              <span class="text-gradient text-gradient-anim">{{ cocktail.name }}</span>
            </h1>

            <div class="animate-rise-in mt-6 flex flex-wrap items-center gap-2" style="animation-delay: 140ms">
              <span
                v-if="cocktail.category"
                class="inline-flex items-center gap-1.5 rounded-full border border-default/70 bg-elevated/45 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted backdrop-blur"
              >
                <UIcon name="i-lucide-sparkles" class="size-3.5 text-accent" />
                {{ cocktail.category }}
              </span>

              <span
                v-if="cocktail.glass"
                class="inline-flex items-center gap-1.5 rounded-full border border-default/70 bg-elevated/45 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted backdrop-blur"
              >
                <UIcon name="i-lucide-martini" class="size-3.5 text-accent" />
                {{ cocktail.glass }}
              </span>

              <span
                v-if="cocktail.iba"
                class="inline-flex items-center gap-1.5 rounded-full border border-lab-amber/50 bg-lab-amber/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent backdrop-blur"
              >
                <UIcon name="i-lucide-award" class="size-3.5" />
                IBA · {{ cocktail.iba }}
              </span>

              <span
                v-if="!cocktail.isAlcoholic"
                class="inline-flex items-center gap-1.5 rounded-full border border-lab-mint/50 bg-lab-mint/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-accent-mint backdrop-blur"
              >
                <UIcon name="i-lucide-leaf" class="size-3.5" />
                Zero proof
              </span>
            </div>

            <p
              class="animate-rise-in mt-6 max-w-xl text-base leading-relaxed text-muted"
              style="animation-delay: 190ms"
            >
              {{ description }}
            </p>

            <ul
              v-if="cocktail.tags.length"
              class="animate-rise-in mt-6 flex flex-wrap gap-1.5"
              style="animation-delay: 240ms"
            >
              <li
                v-for="tag in cocktail.tags"
                :key="tag"
                class="rounded-full border border-default/50 bg-elevated/30 px-2.5 py-1 text-[0.7rem] font-medium text-dimmed"
              >
                {{ tag }}
              </li>
            </ul>

            <div class="animate-rise-in mt-8 flex flex-wrap items-center gap-3" style="animation-delay: 300ms">
              <CocktailDetailFavoriteButton :cocktail-id="cocktail.id" :name="cocktail.name" />

              <button
                type="button"
                class="inline-flex items-center gap-2.5 rounded-full border border-default/70 bg-elevated/40 px-5 py-3 text-sm font-semibold text-muted transition-all duration-300 ease-lab hover:border-accent/55 hover:text-accent active:scale-[0.97]"
                @click="copyLink"
              >
                <UIcon name="i-lucide-link" class="size-4.5" />
                Copy link
              </button>
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden="true" class="rule-gradient absolute inset-x-0 bottom-0 opacity-40" />
    </section>

    <section class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div class="grid gap-6 lg:grid-cols-5 lg:gap-7">
        <div class="flex flex-col gap-6 lg:col-span-2">
          <CocktailDetailIngredientList :lines="cocktail.ingredients" />
          <CocktailDetailAbvMeter :lines="cocktail.ingredients" :instructions="cocktail.instructions" />
        </div>

        <div class="flex flex-col gap-6 lg:col-span-3">
          <RevealOnScroll :y="14">
            <GlassPanel class="relative">
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-accent-violet">
                Method
              </p>
              <h2 class="mt-2 font-display text-2xl font-semibold text-highlighted sm:text-3xl">
                Instructions
              </h2>

              <RevealOnScroll
                v-if="steps.length >= 2"
                as="ol"
                :stagger="90"
                :y="12"
                class="mt-6 space-y-4"
              >
                <li
                  v-for="(step, index) in steps"
                  :key="index"
                  class="flex items-start gap-4 rounded-2xl border border-default/50 bg-elevated/25 p-4 transition-colors duration-300 hover:border-accent/40"
                >
                  <span
                    class="flex size-8 shrink-0 items-center justify-center rounded-full border border-lab-amber/45 bg-lab-amber/12 font-display text-sm font-semibold text-accent tabular-nums"
                  >
                    {{ index + 1 }}
                  </span>
                  <p class="text-sm leading-relaxed text-muted sm:text-base">
                    {{ step }}
                  </p>
                </li>
              </RevealOnScroll>

              <p v-else class="mt-6 text-sm leading-relaxed text-muted sm:text-base">
                {{ cocktail.instructions }}
              </p>
            </GlassPanel>
          </RevealOnScroll>

          <RevealOnScroll :y="14">
            <CocktailDetailNoteEditor
              v-if="loggedIn"
              :cocktail-id="cocktail.id"
              :name="cocktail.name"
            />

            <GlassPanel v-else class="relative">
              <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.2em] text-accent-violet">
                    Your notebook
                  </p>
                  <h2 class="mt-2 font-display text-2xl font-semibold text-highlighted">
                    Sign in to keep tasting notes
                  </h2>
                  <p class="mt-3 max-w-md text-sm leading-relaxed text-muted">
                    Rate every pour, log what you tweaked, and pick the thread back up next time you
                    reach for the shaker.
                  </p>
                </div>

                <UButton
                  :to="`/login?redirect=/cocktails/${slug}`"
                  size="lg"
                  color="primary"
                  trailing-icon="i-lucide-arrow-right"
                  class="shrink-0 rounded-full px-5 font-semibold glow-amber"
                >
                  Sign in
                </UButton>
              </div>
            </GlassPanel>
          </RevealOnScroll>
        </div>
      </div>
    </section>

    <section v-if="related.length" class="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
      <RevealOnScroll>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-accent-rose">
          Next round
        </p>
        <h2 class="mt-2 font-display text-3xl font-semibold text-highlighted sm:text-4xl">
          You might also like
        </h2>
        <p v-if="pivot" class="mt-2 max-w-xl text-sm text-muted">
          More drinks built on {{ pivot.name.toLowerCase() }}.
        </p>
      </RevealOnScroll>

      <RevealOnScroll :stagger="80" class="mt-8 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        <CocktailCard v-for="item in related" :key="item.id" :cocktail="item" />
      </RevealOnScroll>
    </section>
  </div>
</template>
