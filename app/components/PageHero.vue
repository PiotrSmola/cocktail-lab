<script setup lang="ts">
withDefaults(defineProps<{
  eyebrow?: string
  title: string
  gradient?: boolean
  align?: 'left' | 'center'
  orbs?: boolean
}>(), {
  eyebrow: '',
  gradient: true,
  align: 'left',
  orbs: true
})
</script>

<template>
  <section class="relative isolate overflow-hidden border-b border-default/60">
    <div v-if="orbs" aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10">
      <span class="orb -left-24 -top-32 size-80 bg-lab-amber/40" style="animation-duration: 26s" />
      <span class="orb right-0 -top-40 size-96 bg-lab-violet/40" style="animation-duration: 32s; animation-delay: -8s" />
    </div>

    <div
      class="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8"
      :class="align === 'center' && 'text-center'"
    >
      <p
        v-if="eyebrow"
        class="animate-rise-in mb-4 inline-flex items-center gap-2 rounded-full border border-default/70 bg-elevated/40 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted backdrop-blur"
      >
        <span class="size-1.5 rounded-full bg-accent" />
        {{ eyebrow }}
      </p>

      <h1
        class="animate-rise-in font-display text-4xl font-semibold leading-[1.05] text-highlighted sm:text-5xl lg:text-6xl"
        style="animation-delay: 90ms"
      >
        <span :class="gradient && 'text-gradient text-gradient-anim'">{{ title }}</span>
      </h1>

      <div
        v-if="$slots.description"
        class="animate-rise-in mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg"
        :class="align === 'center' && 'mx-auto'"
        style="animation-delay: 170ms"
      >
        <slot name="description" />
      </div>

      <div
        v-if="$slots.actions"
        class="animate-rise-in mt-8 flex flex-wrap items-center gap-3"
        :class="align === 'center' && 'justify-center'"
        style="animation-delay: 240ms"
      >
        <slot name="actions" />
      </div>

      <slot />
    </div>
  </section>
</template>
