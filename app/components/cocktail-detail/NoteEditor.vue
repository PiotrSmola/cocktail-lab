<script setup lang="ts">
import type { CocktailCard } from '#shared/types/catalog'

const props = defineProps<{
  cocktailId: number
  name: string
}>()

interface NoteItem {
  cocktail: CocktailCard
  body: string
  rating: number | null
  updatedAt: string
}

const MAX_LENGTH = 2000
const STARS = [1, 2, 3, 4, 5]

const toast = useToast()

const body = ref('')
const rating = ref<number | null>(null)
const hasNote = ref(false)
const loading = ref(true)
const saving = ref(false)
const removing = ref(false)

const textarea = ref<HTMLTextAreaElement | null>(null)
const starEls = ref<Record<number, HTMLButtonElement>>({})

const canSave = computed(() => !saving.value && !removing.value && (body.value.trim().length > 0 || rating.value !== null))
const focusableStar = computed(() => rating.value ?? STARS[0] ?? 1)

function setStarEl(el: unknown, value: number): void {
  if (el instanceof HTMLButtonElement) starEls.value[value] = el
}

function autogrow(): void {
  const el = textarea.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function pickRating(value: number): void {
  rating.value = value
}

function moveRating(delta: number): void {
  const next = Math.min(STARS.length, Math.max(1, focusableStar.value + delta))
  rating.value = next
  nextTick(() => starEls.value[next]?.focus())
}

function clearRating(): void {
  rating.value = null
  nextTick(() => starEls.value[1]?.focus())
}

onMounted(async () => {
  const response = await $fetch<{ items: NoteItem[] }>('/api/notes').catch(() => null)
  const existing = response?.items.find(item => item.cocktail.id === props.cocktailId)

  if (existing) {
    body.value = existing.body
    rating.value = existing.rating
    hasNote.value = true
  }

  loading.value = false
  await nextTick()
  autogrow()
})

async function save(): Promise<void> {
  if (!canSave.value) return
  saving.value = true

  try {
    await $fetch(`/api/notes/${props.cocktailId}`, {
      method: 'PUT',
      body: { body: body.value.slice(0, MAX_LENGTH), rating: rating.value }
    })
    hasNote.value = true
    toast.add({
      title: 'Tasting note saved',
      description: `Your notes on ${props.name} are behind the bar.`,
      icon: 'i-lucide-notebook-pen',
      color: 'success'
    })
  }
  catch {
    toast.add({
      title: 'Could not save the note',
      description: 'Something spilled on the way to the cellar. Try again in a moment.',
      icon: 'i-lucide-triangle-alert',
      color: 'error'
    })
  }
  finally {
    saving.value = false
  }
}

async function remove(): Promise<void> {
  if (removing.value) return
  removing.value = true

  try {
    await $fetch(`/api/notes/${props.cocktailId}`, { method: 'DELETE' })
    body.value = ''
    rating.value = null
    hasNote.value = false
    await nextTick()
    autogrow()
    toast.add({
      title: 'Tasting note deleted',
      description: `${props.name} is a blank page again.`,
      icon: 'i-lucide-trash-2',
      color: 'neutral'
    })
  }
  catch {
    toast.add({
      title: 'Could not delete the note',
      description: 'The note stayed put. Try again in a moment.',
      icon: 'i-lucide-triangle-alert',
      color: 'error'
    })
  }
  finally {
    removing.value = false
  }
}
</script>

<template>
  <GlassPanel class="relative">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-accent-violet">
          Your notebook
        </p>
        <h2 class="mt-2 font-display text-2xl font-semibold text-highlighted sm:text-3xl">
          Tasting notes
        </h2>
      </div>

      <span
        v-if="hasNote"
        class="inline-flex items-center gap-1.5 rounded-full border border-lab-mint/45 bg-lab-mint/12 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-accent-mint"
      >
        <UIcon name="i-lucide-bookmark-check" class="size-3.5" />
        Saved
      </span>
    </div>

    <div class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
      <span id="note-rating-label" class="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-dimmed">
        Rating
      </span>

      <div
        role="radiogroup"
        aria-labelledby="note-rating-label"
        class="flex items-center gap-1"
        @keydown.left.prevent="moveRating(-1)"
        @keydown.down.prevent="moveRating(-1)"
        @keydown.right.prevent="moveRating(1)"
        @keydown.up.prevent="moveRating(1)"
      >
        <button
          v-for="value in STARS"
          :key="value"
          :ref="el => setStarEl(el, value)"
          type="button"
          role="radio"
          :aria-checked="rating === value"
          :aria-label="`${value} out of 5`"
          :tabindex="focusableStar === value ? 0 : -1"
          class="flex size-9 items-center justify-center rounded-full transition-all duration-300 ease-lab hover:bg-elevated/60 active:scale-[0.92]"
          @click="pickRating(value)"
        >
          <UIcon
            name="i-lucide-star"
            class="size-5 transition-colors duration-300 [&_svg]:fill-current"
            :class="rating !== null && value <= rating ? 'text-accent' : 'text-dimmed/60'"
          />
        </button>

        <button
          v-if="rating !== null"
          type="button"
          class="ml-1 rounded-full px-2 py-1 text-[0.7rem] font-medium text-dimmed transition-colors duration-300 hover:text-accent-rose"
          @click="clearRating"
        >
          Clear
        </button>
      </div>
    </div>

    <div class="mt-5">
      <label for="note-body" class="sr-only">Tasting notes for {{ name }}</label>
      <textarea
        id="note-body"
        ref="textarea"
        v-model="body"
        rows="4"
        :maxlength="MAX_LENGTH"
        :disabled="loading"
        placeholder="Too sweet with a heavy pour. Next time: fresh lime, half the syrup, longer shake."
        class="w-full resize-none rounded-2xl border border-default/60 bg-elevated/35 px-4 py-3.5 text-sm leading-relaxed text-highlighted transition-colors duration-300 placeholder:text-dimmed focus:border-accent/50 focus:outline-none focus-visible:outline-none disabled:opacity-50"
        @input="autogrow"
      />

      <div class="mt-2 flex items-center justify-between text-[0.7rem] text-dimmed">
        <span v-if="loading">Loading your note…</span>
        <span v-else>Private to your account</span>
        <span class="tabular-nums">{{ body.length }} / {{ MAX_LENGTH }}</span>
      </div>
    </div>

    <div class="mt-5 flex flex-wrap items-center gap-3">
      <UButton
        color="primary"
        size="lg"
        icon="i-lucide-save"
        class="rounded-full px-5 font-semibold glow-amber"
        :loading="saving"
        :disabled="!canSave"
        @click="save"
      >
        Save note
      </UButton>

      <UButton
        v-if="hasNote"
        color="neutral"
        variant="ghost"
        size="lg"
        icon="i-lucide-trash-2"
        class="rounded-full px-4 hover:text-accent-rose"
        :loading="removing"
        @click="remove"
      >
        Delete
      </UButton>
    </div>
  </GlassPanel>
</template>
