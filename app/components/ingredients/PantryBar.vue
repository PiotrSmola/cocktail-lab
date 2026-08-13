<script setup lang="ts">
const { count, clear } = usePantry()

const label = computed(() => `${count.value} ${count.value === 1 ? 'ingredient' : 'ingredients'} in your pantry`)
</script>

<template>
  <div>
    <div v-if="count > 0" aria-hidden="true" class="h-28 sm:h-24" />

    <Transition name="pantry-bar">
      <div
        v-if="count > 0"
        class="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6"
      >
        <div
          class="glass-panel glass-panel-strong grain mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
        >
          <p class="flex items-center gap-2.5 text-sm font-medium text-highlighted">
            <span
              class="flex size-8 shrink-0 items-center justify-center rounded-full border border-lab-mint/45 bg-lab-mint/15"
            >
              <UIcon name="i-lucide-flask-conical" class="size-4 text-accent-mint" />
            </span>
            {{ label }}
          </p>

          <div class="flex items-center gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-trash-2"
              class="rounded-full text-dimmed hover:text-accent-rose"
              @click="clear"
            >
              Clear
            </UButton>
            <UButton
              to="/pantry"
              color="primary"
              size="lg"
              trailing-icon="i-lucide-arrow-right"
              class="rounded-full px-5 font-semibold glow-amber"
            >
              See what you can make
            </UButton>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.pantry-bar-enter-active,
.pantry-bar-leave-active {
  transition:
    transform 0.45s var(--ease-lab),
    opacity 0.45s var(--ease-lab);
}

.pantry-bar-enter-from,
.pantry-bar-leave-to {
  transform: translateY(130%);
  opacity: 0;
}
</style>
