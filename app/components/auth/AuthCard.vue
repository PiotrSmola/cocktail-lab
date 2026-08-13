<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  subtitle: string
}>()
</script>

<template>
  <section class="relative isolate overflow-hidden">
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10">
      <span class="orb -left-28 -top-32 size-80 bg-lab-amber/45" style="animation-duration: 27s" />
      <span class="orb -right-24 top-16 size-96 bg-lab-violet/45" style="animation-duration: 34s; animation-delay: -11s" />
      <span class="orb -bottom-24 left-1/3 size-72 bg-lab-rose/35" style="animation-duration: 30s; animation-delay: -6s" />
    </div>

    <div class="mx-auto flex w-full max-w-7xl justify-center px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <GlassPanel strong grain :padded="false" class="animate-rise-in w-full max-w-md p-7 sm:p-9">
        <div class="flex flex-col items-center text-center">
          <NuxtLink to="/" class="group rounded-2xl" aria-label="Cocktail Lab — home">
            <span
              class="flex size-14 items-center justify-center rounded-2xl border border-default/60 bg-elevated/40 transition-transform duration-500 ease-lab group-hover:-rotate-6 group-hover:scale-105"
            >
              <svg viewBox="0 0 32 32" class="size-8" aria-hidden="true">
                <defs>
                  <linearGradient id="auth-logo-gradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="var(--lab-accent)" />
                    <stop offset="52%" stop-color="var(--lab-accent-rose)" />
                    <stop offset="100%" stop-color="var(--lab-accent-violet)" />
                  </linearGradient>
                </defs>
                <path
                  d="M5 6h22L17.4 17.2v8.1h4.7a1.15 1.15 0 0 1 0 2.3H9.9a1.15 1.15 0 0 1 0-2.3h4.7v-8.1L5 6Z"
                  fill="none"
                  stroke="url(#auth-logo-gradient)"
                  stroke-width="1.8"
                  stroke-linejoin="round"
                />
                <path d="M9.2 9.6h13.6L17.4 15.8h-2.8L9.2 9.6Z" fill="url(#auth-logo-gradient)" opacity="0.55" />
                <circle cx="24.4" cy="8.4" r="2.1" fill="var(--lab-accent)" opacity="0.9" />
              </svg>
            </span>
          </NuxtLink>

          <p class="mt-5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-accent">
            {{ eyebrow }}
          </p>

          <h1 class="mt-3 font-display text-3xl font-semibold leading-tight text-highlighted sm:text-4xl">
            <span class="text-gradient text-gradient-anim">{{ title }}</span>
          </h1>

          <p class="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            {{ subtitle }}
          </p>
        </div>

        <div class="mt-7">
          <slot />
        </div>

        <div v-if="$slots.footer" class="mt-7 border-t border-default/60 pt-5 text-center text-sm text-muted">
          <slot name="footer" />
        </div>

        <div v-if="$slots.fine" class="mt-4 text-center text-xs leading-relaxed text-dimmed">
          <slot name="fine" />
        </div>
      </GlassPanel>
    </div>
  </section>
</template>
