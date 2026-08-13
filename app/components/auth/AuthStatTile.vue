<script setup lang="ts">
const props = withDefaults(defineProps<{
  icon: string
  label: string
  value: number
  hint?: string
  tone?: 'amber' | 'rose' | 'mint'
}>(), {
  hint: '',
  tone: 'amber'
})

const TONES = {
  amber: 'text-accent',
  rose: 'text-accent-rose',
  mint: 'text-accent-mint'
}

const toneClass = computed(() => TONES[props.tone])
</script>

<template>
  <GlassPanel hover :padded="false" class="flex items-center gap-4 p-5">
    <span
      class="flex size-11 shrink-0 items-center justify-center rounded-full border border-default/60 bg-elevated/40"
    >
      <UIcon :name="icon" class="size-5" :class="toneClass" />
    </span>

    <div class="min-w-0">
      <p class="font-display text-3xl font-semibold leading-none text-highlighted">
        <AnimatedNumber :value="value" :duration="1200" />
      </p>
      <p class="mt-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.16em]" :class="toneClass">
        {{ label }}
      </p>
      <p v-if="hint" class="mt-1 truncate text-xs text-dimmed">
        {{ hint }}
      </p>
    </div>
  </GlassPanel>
</template>
