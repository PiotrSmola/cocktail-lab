<script setup lang="ts">
const props = defineProps<{
  active: boolean
  name: string
}>()

const emit = defineEmits<{ toggle: [] }>()

const popping = ref(false)

async function onClick(): Promise<void> {
  const wasActive = props.active
  emit('toggle')

  if (wasActive) {
    popping.value = false
    return
  }

  popping.value = false
  await nextTick()
  popping.value = true
}
</script>

<template>
  <button
    type="button"
    :aria-pressed="active"
    :aria-label="active ? `Remove ${name} from favorites` : `Save ${name} to favorites`"
    :title="active ? 'Saved to favorites' : 'Save to favorites'"
    class="heart flex size-9 items-center justify-center rounded-full border backdrop-blur-md transition-[color,background-color,border-color,box-shadow,transform] duration-300 ease-lab hover:scale-110 active:scale-90"
    :class="[
      active
        ? 'border-lab-rose/60 bg-lab-rose/25 text-accent-rose glow-rose'
        : 'border-white/20 bg-black/45 text-white/80 hover:border-lab-rose/50 hover:text-accent-rose',
      popping && 'is-popping'
    ]"
    @animationend="popping = false"
    @click="onClick"
  >
    <UIcon name="i-lucide-heart" class="size-4" :class="active && 'scale-110'" />
  </button>
</template>

<style scoped>
@keyframes heart-pop {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.35);
  }
  60% {
    transform: scale(0.92);
  }
  100% {
    transform: scale(1);
  }
}

.heart.is-popping {
  animation: heart-pop 0.42s var(--ease-lab);
}

@media (prefers-reduced-motion: reduce) {
  .heart.is-popping {
    animation: none;
  }
}
</style>
