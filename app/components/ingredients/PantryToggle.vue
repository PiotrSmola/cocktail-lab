<script setup lang="ts">
const props = withDefaults(defineProps<{
  slug: string
  name: string
  full?: boolean
}>(), {
  full: false
})

const { has, toggle } = usePantry()

const active = computed(() => has(props.slug))
const bumping = ref(false)

let bumpTimer: ReturnType<typeof setTimeout> | undefined

function onToggle(): void {
  toggle(props.slug)
  bumping.value = true
  if (bumpTimer) clearTimeout(bumpTimer)
  bumpTimer = setTimeout(() => {
    bumping.value = false
  }, 520)
}

onBeforeUnmount(() => {
  if (bumpTimer) clearTimeout(bumpTimer)
})
</script>

<template>
  <button
    v-if="full"
    type="button"
    :aria-pressed="active"
    class="inline-flex items-center gap-2.5 rounded-full border px-6 py-3 text-sm font-semibold transition-[background-color,border-color,color,box-shadow] duration-300 ease-lab active:scale-[0.97]"
    :class="[
      active
        ? 'border-lab-mint/55 bg-lab-mint/15 text-accent-mint hover:bg-lab-mint/25'
        : 'border-lab-amber/55 bg-lab-amber/10 text-accent hover:bg-lab-amber/20 glow-amber',
      bumping && 'is-bumping'
    ]"
    @click="onToggle"
  >
    <UIcon :name="active ? 'i-lucide-check' : 'i-lucide-plus'" class="size-4 shrink-0" />
    {{ active ? 'In your pantry' : 'Add to pantry' }}
  </button>

  <button
    v-else
    type="button"
    :aria-pressed="active"
    :aria-label="`Add ${name} to pantry`"
    class="flex size-9 items-center justify-center rounded-full border backdrop-blur transition-[background-color,border-color,color] duration-300 ease-lab active:scale-[0.94]"
    :class="[
      active
        ? 'border-lab-mint/55 bg-lab-mint/20 text-accent-mint'
        : 'border-default/70 bg-elevated/60 text-muted hover:border-lab-amber/60 hover:text-accent',
      bumping && 'is-bumping'
    ]"
    @click="onToggle"
  >
    <UIcon :name="active ? 'i-lucide-check' : 'i-lucide-plus'" class="size-4" />
  </button>
</template>

<style scoped>
@keyframes pantry-pop {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.22);
  }
  62% {
    transform: scale(0.9);
  }
  82% {
    transform: scale(1.06);
  }
  100% {
    transform: scale(1);
  }
}

.is-bumping {
  animation: pantry-pop 0.5s var(--ease-lab);
}
</style>
