<script setup lang="ts">
import type { PantryMatchResult } from '#shared/types/pantry'

const props = withDefaults(defineProps<{
  result: PantryMatchResult | null
  pending?: boolean
  pantryCount: number
  failed?: boolean
}>(), {
  pending: false,
  failed: false
})

defineEmits<{ retry: [] }>()

const { isFavorite, toggle: toggleFavorite } = useFavorites()
const reducedMotion = usePreferredReducedMotion()

const hasPantry = computed(() => props.pantryCount > 0)
const settledCount = refDebounced(toRef(props, 'pantryCount'), 260)
const makeable = computed(() => props.result?.makeable ?? [])
const almost = computed(() => props.result?.almost ?? [])
const unlocks = computed(() => props.result?.unlocks ?? [])
const makeableCount = computed(() => makeable.value.length)

const substitutionsByCocktail = computed(() => new Map(
  (props.result?.substituted ?? []).map(entry => [entry.cocktailId, entry.substitutions])
))
const exactCount = computed(() => props.result?.exactCount ?? makeableCount.value)
const substitutedCount = computed(() => Math.max(makeableCount.value - exactCount.value, 0))

function substitutionSummary(cocktailId: number): string {
  return (substitutionsByCocktail.value.get(cocktailId) ?? [])
    .map(line => `${line.substitute.name} for ${line.required.name}`)
    .join(' · ')
}

const loadingFirst = computed(() => hasPantry.value && !props.result && !props.failed)
const refreshing = computed(() => props.pending && Boolean(props.result))
const showFailure = computed(() => hasPantry.value && props.failed && !props.result)

const liveSummary = computed(() => {
  if (!hasPantry.value) {
    return 'Your pantry is empty'
  }
  if (showFailure.value) {
    return 'Matching your pantry failed'
  }
  if (loadingFirst.value) {
    return 'Matching your pantry'
  }
  const ready = makeableCount.value === 1 ? '1 cocktail' : `${makeableCount.value} cocktails`
  const swapped = substitutedCount.value > 0 ? `, ${substitutedCount.value} of them using a substitute` : ''
  return `${ready} ready to pour${swapped}, ${almost.value.length} within two ingredients`
})

const celebrate = ref(false)
const previousMakeable = ref(makeableCount.value)
let celebrateTimer: ReturnType<typeof setTimeout> | null = null

watch(makeableCount, (value) => {
  const before = previousMakeable.value
  previousMakeable.value = value

  if (value <= before || reducedMotion.value === 'reduce') {
    return
  }

  celebrate.value = false
  void nextTick(() => {
    celebrate.value = true
    if (celebrateTimer) {
      clearTimeout(celebrateTimer)
    }
    celebrateTimer = setTimeout(() => {
      celebrate.value = false
    }, 1000)
  })
})

onBeforeUnmount(() => {
  if (celebrateTimer) {
    clearTimeout(celebrateTimer)
  }
})
</script>

<template>
  <div class="min-w-0">
    <p class="sr-only" aria-live="polite">
      {{ liveSummary }}
    </p>

    <EmptyState
      v-if="!hasPantry"
      icon="i-lucide-refrigerator"
      title="Your pantry is empty — tick what you have at home"
      hint="Add a few bottles, mixers or citrus and Cocktail Lab instantly works out what you can pour tonight, what you are one ingredient away from, and which single bottle unlocks the most."
    >
      <template #hint>
        <p class="mx-auto mt-3 flex max-w-md items-center justify-center gap-2 text-sm text-accent-mint">
          <UIcon name="i-lucide-arrow-up" class="size-4 shrink-0 animate-bounce lg:hidden" />
          <UIcon name="i-lucide-arrow-left" class="hidden size-4 shrink-0 lg:inline-block" />
          Start with the search box or drop in a starter pack
        </p>
      </template>

      <div class="flex flex-wrap items-center justify-center gap-3">
        <UButton
          to="/ingredients"
          size="lg"
          color="neutral"
          variant="outline"
          trailing-icon="i-lucide-arrow-up-right"
          class="rounded-full hover:border-accent/60 hover:text-accent"
        >
          or browse the shelf
        </UButton>
      </div>
    </EmptyState>

    <EmptyState
      v-else-if="showFailure"
      icon="i-lucide-plug-zap"
      title="Matching hit a snag"
      hint="The pantry match request failed. Your shelf is safe — try matching again."
    >
      <UButton
        size="lg"
        color="primary"
        variant="solid"
        icon="i-lucide-rotate-ccw"
        class="rounded-full"
        :loading="pending"
        @click="$emit('retry')"
      >
        Try again
      </UButton>
    </EmptyState>

    <div v-else class="space-y-12 sm:space-y-16">
      <header>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-accent-rose">
          Mixology math
          <span v-if="refreshing" class="ml-2 inline-flex items-center gap-1 normal-case tracking-normal text-dimmed">
            <UIcon name="i-lucide-loader-circle" class="size-3 animate-spin" />
            matching
          </span>
        </p>

        <h2 class="mt-2 font-display text-2xl font-semibold leading-snug text-highlighted sm:text-3xl">
          With
          <span class="text-accent"><AnimatedNumber :key="`pc-${settledCount}`" :value="settledCount" :duration="700" /></span>
          {{ settledCount === 1 ? 'ingredient' : 'ingredients' }} you can shake
          <span
            class="inline-block text-gradient"
            :class="celebrate && 'pantry-pop'"
          ><AnimatedNumber :key="`mc-${makeableCount}`" :value="makeableCount" :duration="900" /></span>
          {{ makeableCount === 1 ? 'cocktail' : 'cocktails' }}
        </h2>

        <p class="mt-3 max-w-2xl text-sm text-muted">
          Matching runs against every required ingredient line — garnishes and optional extras are
          ignored, so the list stays honest.
          <template v-if="substitutedCount > 0">
            <span class="text-accent-violet">{{ substitutedCount }} of the {{ makeableCount }} ready
              {{ makeableCount === 1 ? 'recipe' : 'recipes' }}
              {{ substitutedCount === 1 ? 'leans' : 'lean' }} on a close stand-in from your shelf rather
              than the exact bottle — each one is marked.</span>
          </template>
        </p>
      </header>

      <section aria-labelledby="pantry-ready-heading">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <h3 id="pantry-ready-heading" class="font-display text-xl font-semibold text-highlighted sm:text-2xl">
            Ready to pour
          </h3>
          <span v-if="makeableCount > 0" class="text-xs uppercase tracking-[0.16em] text-dimmed">
            {{ makeableCount }} {{ makeableCount === 1 ? 'recipe' : 'recipes' }}
          </span>
        </div>

        <div
          v-if="loadingFirst"
          class="mt-5 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4"
        >
          <CocktailCardSkeleton v-for="n in 4" :key="n" :delay="n * 90" />
        </div>

        <EmptyState
          v-else-if="makeableCount === 0"
          compact
          class="mt-5"
          icon="i-lucide-flask-conical"
          title="Nothing shakeable yet"
          hint="You are close on the drinks below — tap a missing ingredient chip to see this list fill up."
        />

        <TransitionGroup
          v-else
          tag="ul"
          name="pantry-card"
          class="mt-5 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4"
        >
          <li v-for="(cocktail, index) in makeable" :key="cocktail.id" :style="{ '--i': index }">
            <CocktailCard :cocktail="cocktail" :eager="index < 4">
              <template #actions>
                <button
                  type="button"
                  class="flex size-9 items-center justify-center rounded-full border backdrop-blur-sm transition-all duration-300 ease-lab hover:border-lab-rose/60 active:scale-95"
                  :class="isFavorite(cocktail.id)
                    ? 'border-lab-rose/60 bg-lab-rose/25 text-lab-rose'
                    : 'border-white/15 bg-black/45 text-white/80'"
                  :aria-pressed="isFavorite(cocktail.id)"
                  :aria-label="isFavorite(cocktail.id)
                    ? `Remove ${cocktail.name} from favourites`
                    : `Save ${cocktail.name} to favourites`"
                  @click="toggleFavorite(cocktail.id)"
                >
                  <UIcon name="i-lucide-heart" class="size-4.5" />
                </button>
              </template>
            </CocktailCard>

            <p
              v-if="substitutionsByCocktail.has(cocktail.id)"
              class="mt-2 flex items-start gap-1.5 rounded-xl border border-lab-violet/35 bg-lab-violet/10 px-2.5 py-1.5 text-xs text-accent-violet"
            >
              <UIcon name="i-lucide-repeat-2" class="mt-0.5 size-3 shrink-0" />
              <span class="min-w-0">
                <span class="font-semibold">With substitutes</span> — {{ substitutionSummary(cocktail.id) }}
              </span>
            </p>
          </li>
        </TransitionGroup>
      </section>

      <section v-if="loadingFirst || almost.length > 0" aria-labelledby="pantry-almost-heading">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id="pantry-almost-heading" class="font-display text-xl font-semibold text-highlighted sm:text-2xl">
              Almost there
            </h3>
            <p class="mt-1 text-sm text-muted">
              Tap a missing ingredient to add it — the drink jumps straight to Ready to pour.
            </p>
          </div>
          <span v-if="almost.length > 0" class="text-xs uppercase tracking-[0.16em] text-dimmed">
            {{ almost.length }} close {{ almost.length === 1 ? 'call' : 'calls' }}
          </span>
        </div>

        <div v-if="loadingFirst" class="mt-5 space-y-3">
          <div v-for="n in 4" :key="n" class="glass-panel flex items-center gap-4 p-4" aria-hidden="true">
            <div class="shimmer size-14 shrink-0 rounded-xl bg-elevated/70 sm:size-16" />
            <div class="flex-1 space-y-2">
              <div class="shimmer h-4 w-1/3 rounded-full bg-elevated/70" />
              <div class="shimmer h-3 w-1/5 rounded-full bg-elevated/50" />
              <div class="shimmer h-6 w-2/5 rounded-full bg-elevated/40" />
            </div>
          </div>
        </div>

        <RevealOnScroll v-else as="ul" :stagger="60" class="mt-5 space-y-3">
          <li v-for="entry in almost" :key="entry.cocktail.id">
            <PantryAlmostRow
              :cocktail="entry.cocktail"
              :missing="entry.missing"
              :substitutions="entry.substitutions"
            />
          </li>
        </RevealOnScroll>
      </section>

      <section v-if="unlocks.length > 0" aria-labelledby="pantry-unlocks-heading">
        <div class="relative isolate overflow-hidden rounded-3xl">
          <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10">
            <span class="orb -left-16 -top-24 size-72 bg-lab-rose/40" style="animation-duration: 30s" />
            <span class="orb -right-10 bottom-0 size-72 bg-lab-violet/40" style="animation-duration: 36s; animation-delay: -12s" />
          </div>

          <div class="py-2">
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-accent-violet">
              Best next purchase
            </p>
            <h3 id="pantry-unlocks-heading" class="mt-2 font-display text-xl font-semibold text-highlighted sm:text-2xl">
              Buy one bottle
            </h3>
            <p class="mt-1 max-w-2xl text-sm text-muted">
              Each of these is a single ingredient away from unlocking a whole new round.
            </p>

            <RevealOnScroll
              as="ul"
              :stagger="110"
              class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              <li v-for="(unlock, index) in unlocks" :key="unlock.ingredient.id">
                <PantryUnlockCard
                  :ingredient="unlock.ingredient"
                  :unlocks-count="unlock.unlocksCount"
                  :cocktails="unlock.cocktails"
                  :rank="index + 1"
                  :substitutes-for="unlock.substitutesFor"
                />
              </li>
            </RevealOnScroll>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
@keyframes pantry-pop {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.22);
  }
  70% {
    transform: scale(0.98);
  }
  100% {
    transform: scale(1);
  }
}

.pantry-pop {
  animation: pantry-pop 0.95s var(--ease-lab);
}

.pantry-card-move,
.pantry-card-enter-active,
.pantry-card-leave-active {
  transition:
    transform 0.5s var(--ease-lab),
    opacity 0.4s var(--ease-lab);
}

.pantry-card-enter-active {
  transition-delay: calc(var(--i, 0) * 45ms);
}

.pantry-card-enter-from {
  opacity: 0;
  transform: translateY(14px) scale(0.94);
}

.pantry-card-leave-to {
  opacity: 0;
  transform: scale(0.94);
}
</style>
