<script setup lang="ts">
const props = defineProps<{
  cocktailId: number
  name: string
}>()

const POP_DURATION = 460

const { isFavorite, toggle } = useFavorites()

const active = computed(() => isFavorite(props.cocktailId))
const popping = ref(false)
const pending = ref(false)

let popTimer: ReturnType<typeof setTimeout> | null = null

async function onToggle(): Promise<void> {
  if (pending.value) return

  const adding = !active.value
  pending.value = true

  try {
    await toggle(props.cocktailId)
  }
  finally {
    pending.value = false
  }

  if (!adding) return

  if (popTimer) clearTimeout(popTimer)
  popping.value = true
  popTimer = setTimeout(() => {
    popping.value = false
  }, POP_DURATION)
}

onBeforeUnmount(() => {
  if (popTimer) clearTimeout(popTimer)
})
</script>

<template>
  <button
    type="button"
    class="group inline-flex items-center gap-2.5 rounded-full border px-5 py-3 text-sm font-semibold transition-all duration-300 ease-lab active:scale-[0.97]"
    :class="active
      ? 'border-lab-rose/70 bg-lab-rose/20 text-accent-rose glow-rose'
      : 'border-default/70 bg-elevated/40 text-muted hover:border-lab-rose/50 hover:text-accent-rose'"
    :aria-pressed="active"
    :aria-label="active ? `Remove ${name} from your saved drinks` : `Save ${name} to your drinks`"
    @click="onToggle"
  >
    <UIcon
      name="i-lucide-heart"
      class="size-5 transition-transform duration-300 ease-lab group-hover:scale-110 [&_svg]:fill-current"
      :class="[active ? 'text-accent-rose' : 'text-current', popping && 'heart-pop']"
    />
    {{ active ? 'Saved' : 'Save' }}
  </button>
</template>

<style scoped>
.heart-pop {
  animation: heart-pop 0.46s var(--ease-lab);
}

@keyframes heart-pop {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.38);
  }
  60% {
    transform: scale(0.92);
  }
  100% {
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .heart-pop {
    animation: none;
  }
}
</style>
