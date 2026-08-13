<script setup lang="ts">
withDefaults(defineProps<{
  placeholder?: string
  label?: string
}>(), {
  placeholder: 'Search cocktails by name…',
  label: 'Search cocktails by name'
})

const model = defineModel<string>({ required: true })
const inputId = useId()
</script>

<template>
  <div
    class="glass-panel glass-panel-strong focus-ring-within flex items-center gap-3 rounded-full px-5 py-1.5 transition-[border-color,box-shadow] duration-300 ease-lab focus-within:border-lab-amber/45"
  >
    <UIcon name="i-lucide-search" class="size-5 shrink-0 text-accent" />

    <label :for="inputId" class="sr-only">{{ label }}</label>
    <input
      :id="inputId"
      v-model="model"
      type="search"
      name="q"
      autocomplete="off"
      enterkeyhint="search"
      :placeholder="placeholder"
      :aria-label="label"
      class="w-full appearance-none bg-transparent py-3 text-base text-highlighted placeholder:text-dimmed focus:outline-none sm:text-lg [&::-webkit-search-cancel-button]:appearance-none"
    >

    <Transition name="clear">
      <button
        v-if="model"
        type="button"
        aria-label="Clear search"
        class="flex size-8 shrink-0 items-center justify-center rounded-full border border-default/60 bg-elevated/50 text-muted transition-[color,border-color,transform] duration-300 ease-lab hover:border-lab-rose/50 hover:text-accent-rose active:scale-90"
        @click="model = ''"
      >
        <UIcon name="i-lucide-x" class="size-4" />
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.clear-enter-active,
.clear-leave-active {
  transition:
    opacity 0.25s var(--ease-lab),
    transform 0.25s var(--ease-lab);
}

.clear-enter-from,
.clear-leave-to {
  opacity: 0;
  transform: scale(0.7);
}

@media (prefers-reduced-motion: reduce) {
  .clear-enter-active,
  .clear-leave-active {
    transition: none;
  }
}
</style>
