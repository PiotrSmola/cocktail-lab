<script setup lang="ts">
import type { CocktailCard as CocktailCardDto } from '#shared/types/catalog'

interface NoteEntry {
  cocktail: CocktailCardDto
  body: string
  rating: number | null
  updatedAt: string
}

definePageMeta({
  middleware: 'auth'
})

useSeoMeta({
  title: 'Your bar',
  description: 'Your saved cocktails, tasting notes and pantry — all in one place.',
  robots: 'noindex'
})

const { user, clear } = useUserSession()
const { ids: favoriteIds, toggle } = useFavorites()
const { count: pantryCount, hydrate: hydratePantry } = usePantry()
const requestFetch = useRequestFetch()

await hydratePantry()

const displayName = computed(() => user.value?.name ?? 'bartender')
const initial = computed(() => (user.value?.name || user.value?.email || '?').trim().charAt(0).toUpperCase())

const { data: favoritesData, status: favoritesStatus } = await useAsyncData(
  'me-favorites',
  () => requestFetch<{ items: CocktailCardDto[] }>('/api/favorites'),
  { default: () => ({ items: [] as CocktailCardDto[] }) }
)

const { data: notesData, status: notesStatus } = await useAsyncData(
  'me-notes',
  () => requestFetch<{ items: NoteEntry[] }>('/api/notes'),
  { default: () => ({ items: [] as NoteEntry[] }) }
)

const favoriteItems = ref<CocktailCardDto[]>([])
const noteItems = ref<NoteEntry[]>([])

watch(favoritesData, (value) => {
  const items = [...(value?.items ?? [])]
  favoriteItems.value = items
  favoriteIds.value = items.map(item => item.id)
}, { immediate: true })

watch(notesData, (value) => {
  noteItems.value = [...(value?.items ?? [])]
}, { immediate: true })

const favoritesPending = computed(() => favoritesStatus.value === 'pending')
const notesPending = computed(() => notesStatus.value === 'pending')

async function removeFavorite(id: number) {
  favoriteItems.value = favoriteItems.value.filter(item => item.id !== id)
  await toggle(id)
}

function onNoteSaved(cocktailId: number, payload: { body: string, rating: number | null, updatedAt: string }) {
  noteItems.value = noteItems.value.map(item => (item.cocktail.id === cocktailId ? { ...item, ...payload } : item))
}

function onNoteDeleted(cocktailId: number) {
  noteItems.value = noteItems.value.filter(item => item.cocktail.id !== cocktailId)
}

async function signOut() {
  await clear()
  await navigateTo('/')
}
</script>

<template>
  <div>
    <PageHero eyebrow="Your account" title="Your bar">
      <template #description>
        Good to see you, <span class="font-medium text-highlighted">{{ displayName }}</span>. Everything you
        hearted, rated and wrote down lives here.
      </template>
    </PageHero>

    <section class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h2 class="sr-only">
        Your bar in numbers
      </h2>

      <RevealOnScroll :stagger="110" class="grid gap-4 sm:grid-cols-3">
        <AuthStatTile
          icon="i-lucide-heart"
          label="favourites"
          :value="favoriteItems.length"
          hint="cocktails you saved"
          tone="rose"
        />
        <AuthStatTile
          icon="i-lucide-notebook-pen"
          label="tasting notes"
          :value="noteItems.length"
          hint="experiments written down"
          tone="amber"
        />
        <AuthStatTile
          icon="i-lucide-refrigerator"
          label="pantry items"
          :value="pantryCount"
          hint="bottles on your shelf"
          tone="mint"
        />
      </RevealOnScroll>
    </section>

    <section class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <RevealOnScroll class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-accent-rose">
            Saved drinks
          </p>
          <h2 class="mt-2 font-display text-3xl font-semibold text-highlighted sm:text-4xl">
            Favourites
          </h2>
        </div>
        <UButton
          to="/cocktails"
          variant="outline"
          color="neutral"
          size="lg"
          trailing-icon="i-lucide-arrow-up-right"
          class="rounded-full hover:border-accent/60 hover:text-accent"
        >
          Find more cocktails
        </UButton>
      </RevealOnScroll>

      <div v-if="favoritesPending" class="mt-8 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        <CocktailCardSkeleton v-for="n in 4" :key="n" :delay="n * 90" />
      </div>

      <EmptyState
        v-else-if="favoriteItems.length === 0"
        class="mt-8"
        icon="i-lucide-heart"
        title="No favourites yet"
        hint="Tap the heart on any cocktail and it will wait for you here — across every device you sign in on."
      >
        <UButton to="/cocktails" color="primary" size="lg" class="rounded-full" trailing-icon="i-lucide-arrow-right">
          Browse cocktails
        </UButton>
      </EmptyState>

      <RevealOnScroll v-else v-slot="{ visible }" class="mt-8">
        <TransitionGroup
          tag="ul"
          name="fav"
          class="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
        >
          <li
            v-for="(cocktail, index) in favoriteItems"
            :key="cocktail.id"
            class="fav-cell"
            :class="visible && 'is-in'"
            :style="{ '--cell-delay': `${index * 70}ms` }"
          >
            <CocktailCard :cocktail="cocktail">
              <template #actions>
                <button
                  type="button"
                  class="flex size-9 items-center justify-center rounded-full border border-white/15 bg-black/45 text-lab-rose backdrop-blur-sm transition-all duration-300 ease-lab hover:scale-110 hover:border-lab-rose/60 active:scale-95"
                  :aria-label="`Remove ${cocktail.name} from favourites`"
                  @click="removeFavorite(cocktail.id)"
                >
                  <UIcon name="i-lucide-heart" class="size-4.5" />
                </button>
              </template>
            </CocktailCard>
          </li>
        </TransitionGroup>
      </RevealOnScroll>
    </section>

    <section class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <RevealOnScroll class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-accent-violet">
            Lab journal
          </p>
          <h2 class="mt-2 font-display text-3xl font-semibold text-highlighted sm:text-4xl">
            Tasting notes
          </h2>
        </div>
      </RevealOnScroll>

      <div v-if="notesPending" class="mt-8 space-y-3">
        <div v-for="n in 3" :key="n" class="glass-panel shimmer h-28 rounded-2xl" aria-hidden="true" />
      </div>

      <EmptyState
        v-else-if="noteItems.length === 0"
        class="mt-8"
        icon="i-lucide-notebook-pen"
        title="Your journal is empty"
        hint="Open any cocktail page, rate it and write down what you changed. Every note lands here."
      >
        <UButton to="/cocktails" color="primary" size="lg" class="rounded-full" trailing-icon="i-lucide-arrow-right">
          Pick a cocktail to rate
        </UButton>
      </EmptyState>

      <RevealOnScroll v-else v-slot="{ visible }" class="mt-8">
        <TransitionGroup tag="ul" name="fav" class="space-y-3">
          <li
            v-for="(note, index) in noteItems"
            :key="note.cocktail.id"
            class="fav-cell"
            :class="visible && 'is-in'"
            :style="{ '--cell-delay': `${index * 70}ms` }"
          >
            <AuthNoteRow
              :note="note"
              @saved="payload => onNoteSaved(note.cocktail.id, payload)"
              @deleted="onNoteDeleted(note.cocktail.id)"
            />
          </li>
        </TransitionGroup>
      </RevealOnScroll>
    </section>

    <section class="mx-auto w-full max-w-7xl px-4 py-6 pb-16 sm:px-6 sm:py-10 sm:pb-24 lg:px-8">
      <RevealOnScroll>
        <GlassPanel grain :padded="false" class="flex flex-wrap items-center gap-5 p-6 sm:p-8">
          <span
            class="flex size-14 shrink-0 items-center justify-center rounded-full border border-default/60 bg-gradient-to-br from-lab-amber/80 via-lab-rose/70 to-lab-violet/80 font-display text-xl font-semibold text-ink-950"
            aria-hidden="true"
          >
            {{ initial }}
          </span>

          <div class="min-w-0">
            <p class="font-display text-lg font-semibold text-highlighted">
              {{ user?.name }}
            </p>
            <p class="truncate text-sm text-muted">
              {{ user?.email }}
            </p>
          </div>

          <UButton
            color="neutral"
            variant="outline"
            size="lg"
            icon="i-lucide-log-out"
            class="ms-auto rounded-full hover:border-accent-rose/60 hover:text-accent-rose"
            @click="signOut"
          >
            Sign out
          </UButton>
        </GlassPanel>
      </RevealOnScroll>
    </section>
  </div>
</template>

<style scoped>
.fav-cell {
  opacity: 0;
  transform: translateY(14px);
  transition:
    opacity 0.6s var(--ease-lab) var(--cell-delay, 0ms),
    transform 0.6s var(--ease-lab) var(--cell-delay, 0ms);
}

.fav-cell.is-in {
  opacity: 1;
  transform: none;
}

.fav-leave-active {
  transition:
    opacity 0.3s var(--ease-lab),
    transform 0.3s var(--ease-lab);
}

.fav-leave-to {
  opacity: 0;
  transform: scale(0.92);
}

.fav-move {
  transition: transform 0.4s var(--ease-lab);
}

@media (prefers-reduced-motion: reduce) {
  .fav-cell {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

@media (scripting: none) {
  .fav-cell {
    opacity: 1;
    transform: none;
  }
}
</style>
