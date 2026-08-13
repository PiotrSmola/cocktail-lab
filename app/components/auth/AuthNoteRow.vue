<script setup lang="ts">
import type { CocktailCard as CocktailCardDto } from '#shared/types/catalog'

interface NoteEntry {
  cocktail: CocktailCardDto
  body: string
  rating: number | null
  updatedAt: string
}

const props = defineProps<{
  note: NoteEntry
}>()

const emit = defineEmits<{
  saved: [payload: { body: string, rating: number | null, updatedAt: string }]
  deleted: []
}>()

const toast = useToast()

const editing = ref(false)
const saving = ref(false)
const deleting = ref(false)
const draftBody = ref(props.note.body)
const draftRating = ref<number | null>(props.note.rating)

const updatedLabel = computed(() => new Date(props.note.updatedAt).toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC'
}))

function startEditing() {
  draftBody.value = props.note.body
  draftRating.value = props.note.rating
  editing.value = true
}

async function save() {
  if (saving.value) {
    return
  }

  saving.value = true

  try {
    await $fetch(`/api/notes/${props.note.cocktail.id}`, {
      method: 'PUT',
      body: { body: draftBody.value, rating: draftRating.value }
    })

    emit('saved', {
      body: draftBody.value,
      rating: draftRating.value,
      updatedAt: new Date().toISOString()
    })

    editing.value = false

    toast.add({
      title: 'Note saved',
      description: `Your tasting note for ${props.note.cocktail.name} is up to date.`,
      icon: 'i-lucide-check-check',
      color: 'success'
    })
  }
  catch {
    toast.add({
      title: 'Could not save that note',
      description: 'Something went wrong on the way to the lab. Try again in a moment.',
      icon: 'i-lucide-triangle-alert',
      color: 'error'
    })
  }
  finally {
    saving.value = false
  }
}

async function remove() {
  if (deleting.value) {
    return
  }

  deleting.value = true

  try {
    await $fetch(`/api/notes/${props.note.cocktail.id}`, { method: 'DELETE' })

    emit('deleted')

    toast.add({
      title: 'Note deleted',
      description: `${props.note.cocktail.name} lost its tasting note.`,
      icon: 'i-lucide-trash-2',
      color: 'neutral'
    })
  }
  catch {
    toast.add({
      title: 'Could not delete that note',
      description: 'Something went wrong on the way to the lab. Try again in a moment.',
      icon: 'i-lucide-triangle-alert',
      color: 'error'
    })
  }
  finally {
    deleting.value = false
  }
}
</script>

<template>
  <GlassPanel :padded="false" class="p-4 sm:p-5">
    <div class="flex items-start gap-4">
      <NuxtLink
        :to="`/cocktails/${note.cocktail.slug}`"
        class="group shrink-0 rounded-xl"
        :aria-label="`Open ${note.cocktail.name}`"
      >
        <NuxtImg
          v-if="note.cocktail.imageUrl"
          :src="note.cocktail.imageUrl"
          :alt="note.cocktail.name"
          width="56"
          height="56"
          sizes="56px"
          loading="lazy"
          format="webp"
          class="size-14 rounded-xl object-cover transition-transform duration-500 ease-lab group-hover:scale-105"
        />
        <span
          v-else
          class="flex size-14 items-center justify-center rounded-xl bg-gradient-to-br from-lab-amber/25 via-lab-rose/20 to-lab-violet/30"
        >
          <UIcon name="i-lucide-martini" class="size-6 text-white/80" />
        </span>
      </NuxtLink>

      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h3 class="font-display text-base font-semibold text-highlighted sm:text-lg">
            <NuxtLink
              :to="`/cocktails/${note.cocktail.slug}`"
              class="rounded-sm transition-colors duration-300 hover:text-accent"
            >
              {{ note.cocktail.name }}
            </NuxtLink>
          </h3>

          <AuthStarRating v-if="!editing" :model-value="note.rating" readonly />
        </div>

        <p class="mt-1 text-xs text-dimmed">
          updated {{ updatedLabel }}
        </p>

        <template v-if="editing">
          <div class="mt-4 space-y-3">
            <AuthStarRating v-model="draftRating" :label="`Rating for ${note.cocktail.name}`" />

            <UTextarea
              v-model="draftBody"
              :rows="4"
              :maxlength="2000"
              autoresize
              placeholder="Nose, balance, what you would change next time…"
              class="w-full"
              :aria-label="`Tasting note for ${note.cocktail.name}`"
            />

            <div class="flex flex-wrap items-center gap-2">
              <UButton
                color="primary"
                icon="i-lucide-check"
                :loading="saving"
                class="rounded-full"
                @click="save"
              >
                Save note
              </UButton>
              <UButton
                color="neutral"
                variant="ghost"
                class="rounded-full"
                @click="editing = false"
              >
                Cancel
              </UButton>
              <span class="ms-auto text-xs tabular-nums text-dimmed">{{ draftBody.length }} / 2000</span>
            </div>
          </div>
        </template>

        <p v-else-if="note.body" class="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">
          {{ note.body }}
        </p>

        <p v-else class="mt-3 text-sm italic text-dimmed">
          No tasting note yet — only a rating.
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-1">
        <UButton
          v-if="!editing"
          color="neutral"
          variant="ghost"
          icon="i-lucide-pencil"
          :aria-label="`Edit note for ${note.cocktail.name}`"
          class="rounded-full"
          @click="startEditing"
        />

        <UPopover
          :content="{ align: 'end', sideOffset: 8 }"
          :ui="{ content: 'glass-panel-strong w-64 p-4 backdrop-blur-xl' }"
        >
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            :aria-label="`Delete note for ${note.cocktail.name}`"
            :loading="deleting"
            class="rounded-full hover:text-accent-rose"
          />

          <template #content="{ close }">
            <p class="text-sm font-semibold text-highlighted">
              Delete this note?
            </p>
            <p class="mt-1 text-xs leading-relaxed text-muted">
              The tasting note for {{ note.cocktail.name }} will be gone for good.
            </p>
            <div class="mt-3 flex justify-end gap-2">
              <UButton size="xs" color="neutral" variant="ghost" @click="close">
                Keep it
              </UButton>
              <UButton
                size="xs"
                color="error"
                icon="i-lucide-trash-2"
                @click="close(); remove()"
              >
                Delete
              </UButton>
            </div>
          </template>
        </UPopover>
      </div>
    </div>
  </GlassPanel>
</template>
