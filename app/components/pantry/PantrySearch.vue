<script setup lang="ts">
import type { IngredientCard, Paginated } from '#shared/types/catalog'
import { usePantryNames } from './usePantryNames'

const { has, toggle, rememberIds } = usePantry()
const { remember } = usePantryNames()

const query = ref('')
const debounced = refDebounced(query, 250)
const results = ref<IngredientCard[]>([])
const loading = ref(false)
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)

let token = 0

const term = computed(() => debounced.value.trim())
const rawTerm = computed(() => query.value.trim())
const showPanel = computed(() => open.value && rawTerm.value.length > 0)
const searching = computed(() => loading.value || rawTerm.value !== term.value)
const tooShort = computed(() => rawTerm.value.length > 0 && rawTerm.value.length < 2)
const noResults = computed(() => !searching.value && !tooShort.value && results.value.length === 0)

const liveMessage = computed(() => {
  if (!showPanel.value || searching.value) {
    return ''
  }
  if (tooShort.value) {
    return 'Keep typing to search ingredients'
  }
  return results.value.length === 0
    ? `No ingredients match ${term.value}`
    : `${results.value.length} ingredients match ${term.value}`
})

function focusInput(): void {
  root.value?.querySelector('input')?.focus()
}

function optionEls(): HTMLElement[] {
  return Array.from(panel.value?.querySelectorAll<HTMLElement>('[data-option]') ?? [])
}

function close(): void {
  open.value = false
}

function closeAndFocus(): void {
  close()
  focusInput()
}

function reset(): void {
  query.value = ''
  results.value = []
  focusInput()
}

function pick(ingredient: IngredientCard): void {
  remember([{ slug: ingredient.slug, name: ingredient.name, imageUrl: ingredient.imageUrl }])
  rememberIds([{ id: ingredient.id, slug: ingredient.slug }])
  toggle(ingredient.slug)
}

function onInputKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    if (rawTerm.value.length > 0 && !open.value) {
      reset()
      return
    }
    close()
    return
  }
  if (event.key === 'ArrowDown') {
    const els = optionEls()
    if (els.length > 0) {
      event.preventDefault()
      els[0]?.focus()
    }
  }
}

function onOptionKeydown(event: KeyboardEvent, index: number): void {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    const els = optionEls()
    els[Math.min(index + 1, els.length - 1)]?.focus()
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (index === 0) {
      focusInput()
      return
    }
    optionEls()[index - 1]?.focus()
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    closeAndFocus()
  }
}

watch(query, (value) => {
  if (value.trim().length > 0) {
    open.value = true
  }
})

watch(term, async (value) => {
  if (value.length < 2) {
    results.value = []
    loading.value = false
    token += 1
    return
  }

  const current = ++token
  loading.value = true

  try {
    const response = await $fetch<Paginated<IngredientCard>>('/api/ingredients', {
      query: { q: value, perPage: 12, sort: 'popular' }
    })
    if (current !== token) {
      return
    }
    results.value = response.items
    remember(response.items.map(item => ({ slug: item.slug, name: item.name, imageUrl: item.imageUrl })))
  }
  catch {
    if (current === token) {
      results.value = []
    }
  }
  finally {
    if (current === token) {
      loading.value = false
    }
  }
})

onClickOutside(root, () => {
  close()
})
</script>

<template>
  <div ref="root" class="relative">
    <label for="pantry-search" class="text-xs font-semibold uppercase tracking-[0.18em] text-dimmed">
      Add an ingredient
    </label>

    <UInput
      id="pantry-search"
      v-model="query"
      class="mt-2 w-full"
      size="lg"
      variant="soft"
      autocomplete="off"
      placeholder="Search gin, lime, vermouth…"
      icon="i-lucide-search"
      :loading="searching"
      :ui="{ root: 'w-full' }"
      @keydown="onInputKeydown"
      @focus="open = rawTerm.length > 0"
    >
      <template v-if="query.length > 0" #trailing>
        <UButton
          color="neutral"
          variant="link"
          size="sm"
          icon="i-lucide-x"
          aria-label="Clear ingredient search"
          @click="reset"
        />
      </template>
    </UInput>

    <p class="sr-only" aria-live="polite">
      {{ liveMessage }}
    </p>

    <Transition name="pantry-drop">
      <div
        v-if="showPanel"
        ref="panel"
        class="glass-panel glass-panel-strong absolute inset-x-0 top-full z-40 mt-2 max-h-[22rem] overflow-y-auto p-1.5"
      >
        <div v-if="searching" class="space-y-1.5 p-1.5">
          <div v-for="n in 4" :key="n" class="flex items-center gap-3">
            <div class="shimmer size-10 shrink-0 rounded-lg bg-elevated/70" />
            <div class="flex-1 space-y-1.5">
              <div class="shimmer h-3 w-2/3 rounded-full bg-elevated/70" />
              <div class="shimmer h-2.5 w-1/3 rounded-full bg-elevated/50" />
            </div>
          </div>
        </div>

        <p v-else-if="tooShort" class="px-3 py-4 text-sm text-dimmed">
          Keep typing — at least two letters.
        </p>

        <div v-else-if="noResults" class="px-3 py-5 text-center">
          <UIcon name="i-lucide-search-x" class="mx-auto size-6 text-dimmed" />
          <p class="mt-2 text-sm text-muted">
            Nothing matches “{{ term }}”.
          </p>
          <NuxtLink
            to="/ingredients"
            class="mt-1 inline-block text-xs font-medium text-accent underline-offset-4 hover:underline"
          >
            Browse the full shelf
          </NuxtLink>
        </div>

        <ul v-else class="space-y-0.5">
          <li v-for="(ingredient, index) in results" :key="ingredient.id">
            <button
              data-option
              type="button"
              class="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors duration-200 hover:bg-elevated/70 focus:bg-elevated/80 focus:outline-none"
              :aria-pressed="has(ingredient.slug)"
              :aria-label="`${ingredient.name}, used in ${ingredient.cocktailCount} cocktails`"
              @keydown="onOptionKeydown($event, index)"
              @click="pick(ingredient)"
            >
              <span
                class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-default/60 bg-elevated/50"
              >
                <NuxtImg
                  v-if="ingredient.imageUrl"
                  :src="ingredient.imageUrl"
                  :alt="ingredient.name"
                  width="80"
                  height="80"
                  loading="lazy"
                  format="webp"
                  class="size-full object-contain p-1"
                />
                <UIcon v-else name="i-lucide-flask-round" class="size-4 text-dimmed" />
              </span>

              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-highlighted">
                  {{ ingredient.name }}
                </span>
                <span class="block text-xs text-dimmed">
                  in {{ ingredient.cocktailCount }} {{ ingredient.cocktailCount === 1 ? 'cocktail' : 'cocktails' }}
                </span>
              </span>

              <span
                class="flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-300"
                :class="has(ingredient.slug)
                  ? 'border-lab-mint/50 bg-lab-mint/20 text-accent-mint'
                  : 'border-default/70 bg-elevated/40 text-muted'"
                aria-hidden="true"
              >
                <UIcon v-if="has(ingredient.slug)" name="i-lucide-check" class="size-4" />
                <UIcon v-else name="i-lucide-plus" class="size-4" />
              </span>
            </button>
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.pantry-drop-enter-active,
.pantry-drop-leave-active {
  transition:
    opacity 0.22s var(--ease-lab),
    transform 0.22s var(--ease-lab);
}

.pantry-drop-enter-from,
.pantry-drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
