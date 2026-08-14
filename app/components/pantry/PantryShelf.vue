<script setup lang="ts">
import { usePantryNames } from './usePantryNames'

const { slugs, count, toggle, clear, synced, atLimit, guestLimit } = usePantry()
const { lookup, isKnown, resolveAll } = usePantryNames()

const confirmOpen = ref(false)
const settledCount = refDebounced(count, 260)

const chips = computed(() => slugs.value.map(slug => lookup(slug)))
const needsNames = computed(() => slugs.value.some(slug => !isKnown(slug)))

function remove(slug: string): void {
  toggle(slug)
}

function confirmClear(): void {
  clear()
  confirmOpen.value = false
}

onMounted(() => {
  if (needsNames.value) {
    void resolveAll()
  }
})

watch(needsNames, (value) => {
  if (value) {
    void resolveAll()
  }
})
</script>

<template>
  <section aria-labelledby="pantry-shelf-heading">
    <div class="flex items-center justify-between gap-3">
      <h3 id="pantry-shelf-heading" class="text-xs font-semibold uppercase tracking-[0.18em] text-dimmed">
        Your pantry
        <span class="ml-1.5 font-display text-sm font-semibold normal-case tracking-normal text-accent">
          <AnimatedNumber :key="settledCount" :value="settledCount" :duration="700" />
        </span>
      </h3>

      <UPopover v-if="count > 0" v-model:open="confirmOpen" :content="{ align: 'end' }">
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          icon="i-lucide-trash-2"
          class="rounded-full text-dimmed hover:text-error"
          aria-label="Clear every ingredient from your pantry"
        >
          Clear all
        </UButton>

        <template #content>
          <div class="w-64 p-4">
            <p class="text-sm font-semibold text-highlighted">
              Empty your pantry?
            </p>
            <p class="mt-1 text-xs text-muted">
              This removes all {{ count }} ingredients. You can always add them back.
            </p>
            <div class="mt-4 flex justify-end gap-2">
              <UButton size="xs" color="neutral" variant="ghost" @click="confirmOpen = false">
                Keep them
              </UButton>
              <UButton size="xs" color="error" variant="soft" @click="confirmClear">
                Clear all
              </UButton>
            </div>
          </div>
        </template>
      </UPopover>
    </div>

    <p
      v-if="synced"
      class="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-lab-mint/30 bg-lab-mint/10 px-2.5 py-1 text-[0.7rem] font-medium text-accent-mint"
    >
      <UIcon name="i-lucide-cloud" class="size-3.5 shrink-0" aria-hidden="true" />
      Synced to your account
    </p>

    <p v-else class="mt-2.5 flex items-start gap-1.5 text-xs text-dimmed">
      <UIcon name="i-lucide-cloud-off" class="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>
        <NuxtLink
          to="/login?redirect=/pantry"
          class="font-medium text-accent underline-offset-4 hover:underline"
        >
          Sign in to sync your pantry
        </NuxtLink>
        across devices. As a guest it lives in this browser, up to {{ guestLimit }} ingredients.
      </span>
    </p>

    <p v-if="atLimit" class="mt-2 text-xs font-medium text-accent-rose">
      Guest shelf full — sign in to keep adding.
    </p>

    <div
      v-if="count === 0"
      class="mt-3 rounded-xl border border-dashed border-default/70 bg-elevated/20 px-4 py-6 text-center"
    >
      <UIcon name="i-lucide-refrigerator" class="mx-auto size-6 text-dimmed" />
      <p class="mt-2 text-sm font-medium text-muted">
        Nothing on the shelf yet
      </p>
      <p class="mt-1 text-xs text-dimmed">
        Search above or drop in a starter pack to get going.
      </p>
    </div>

    <TransitionGroup v-else tag="ul" name="pantry-chip" class="mt-3 flex flex-wrap gap-2">
      <li
        v-for="(chip, index) in chips"
        :key="chip.slug"
        :style="{ '--i': index }"
        class="group inline-flex items-center gap-2 rounded-full border border-lab-mint/35 bg-lab-mint/10 py-1 pl-1 pr-1 text-sm"
      >
        <span
          class="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-default/50 bg-default"
        >
          <NuxtImg
            v-if="chip.imageUrl"
            :src="chip.imageUrl"
            :alt="chip.name"
            width="48"
            height="48"
            loading="lazy"
            format="webp"
            class="size-full object-contain p-0.5"
          />
          <UIcon v-else name="i-lucide-flask-round" class="size-3 text-dimmed" />
        </span>

        <span class="max-w-[10rem] truncate font-medium text-highlighted">{{ chip.name }}</span>

        <button
          type="button"
          class="flex size-5 shrink-0 items-center justify-center rounded-full text-dimmed transition-colors duration-200 hover:bg-error/15 hover:text-error"
          :aria-label="`Remove ${chip.name} from your pantry`"
          @click="remove(chip.slug)"
        >
          <UIcon name="i-lucide-x" class="size-3.5" />
        </button>
      </li>
    </TransitionGroup>
  </section>
</template>

<style scoped>
.pantry-chip-move,
.pantry-chip-enter-active,
.pantry-chip-leave-active {
  transition:
    transform 0.4s var(--ease-lab),
    opacity 0.3s var(--ease-lab);
}

.pantry-chip-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.85);
}

.pantry-chip-leave-to {
  opacity: 0;
  transform: scale(0.85);
}
</style>
