<script setup lang="ts">
const props = defineProps<{
  password: string
}>()

const LEVELS = [
  { label: 'Add at least 8 characters', bar: 'bg-lab-rose/70', text: 'text-accent-rose' },
  { label: 'Weak — mix in more variety', bar: 'bg-lab-rose/80', text: 'text-accent-rose' },
  { label: 'Fair — a symbol would help', bar: 'bg-lab-gold', text: 'text-accent' },
  { label: 'Good passphrase', bar: 'bg-lab-amber', text: 'text-accent' },
  { label: 'Strong passphrase', bar: 'bg-lab-mint', text: 'text-accent-mint' }
]

const score = computed(() => {
  const value = props.password
  if (value.length === 0) {
    return 0
  }

  let points = 0
  if (value.length >= 8) points += 1
  if (value.length >= 12) points += 1
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) points += 1
  if (/\d/.test(value)) points += 1
  if (/[^\w\s]/.test(value)) points += 1

  return value.length < 8 ? 0 : Math.min(points, 4)
})

const level = computed(() => LEVELS[score.value] ?? LEVELS[0]!)
</script>

<template>
  <div class="mt-2 space-y-1.5">
    <div class="flex gap-1.5" aria-hidden="true">
      <span
        v-for="segment in 4"
        :key="segment"
        class="h-1 flex-1 rounded-full transition-colors duration-500 ease-lab"
        :class="password.length > 0 && segment <= score ? level.bar : 'bg-elevated'"
      />
    </div>

    <p class="text-xs transition-colors duration-500" :class="password.length > 0 ? level.text : 'text-dimmed'" aria-live="polite">
      {{ password.length > 0 ? level.label : 'At least 8 characters' }}
    </p>
  </div>
</template>
