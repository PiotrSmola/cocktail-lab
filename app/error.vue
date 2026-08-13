<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const status = computed(() => props.error?.statusCode ?? 500)
const isNotFound = computed(() => status.value === 404)

const heading = computed(() => (isNotFound.value ? 'This drink doesn\'t exist' : 'The lab lost a beaker'))

const blurb = computed(() => isNotFound.value
  ? 'We searched the whole shelf and came up empty. The recipe you were after may have been renamed, retired, or never poured at all.'
  : 'Something broke on our side while mixing this page. The bar is still open — give it another shake in a moment.')

useSeoMeta({
  title: isNotFound.value ? 'Page not found' : 'Something went wrong',
  description: blurb.value,
  robots: 'noindex'
})

function retry() {
  return clearError({ redirect: '/' })
}
</script>

<template>
  <div class="relative flex min-h-screen flex-col overflow-hidden bg-default text-default grain">
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10">
      <span class="orb -left-24 -top-24 size-96 bg-lab-amber/45" style="animation-duration: 27s" />
      <span
        class="orb -right-28 top-1/3 size-[26rem] bg-lab-violet/45"
        style="animation-duration: 33s; animation-delay: -11s"
      />
      <span
        class="orb bottom-0 left-1/3 size-80 bg-lab-rose/40"
        style="animation-duration: 30s; animation-delay: -6s"
      />
    </div>

    <header class="mx-auto flex h-16 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
      <NuxtLink to="/" class="font-display text-lg font-semibold text-highlighted">
        Cocktail<span class="text-gradient"> Lab</span>
      </NuxtLink>
    </header>

    <main
      class="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center gap-12 px-4 py-16 sm:px-6 lg:flex-row lg:gap-20 lg:px-8"
    >
      <div class="animate-rise-in order-2 w-full max-w-md shrink-0 lg:order-1 lg:max-w-sm">
        <svg
          viewBox="0 0 320 300"
          class="w-full"
          role="img"
          :aria-label="isNotFound ? 'A tipped-over cocktail glass with its contents spilled' : 'A cracked laboratory beaker'"
        >
          <defs>
            <linearGradient id="spillGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="var(--lab-accent)" />
              <stop offset="52%" stop-color="var(--lab-accent-rose)" />
              <stop offset="100%" stop-color="var(--lab-accent-violet)" />
            </linearGradient>
            <linearGradient id="spillFade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="var(--lab-accent)" stop-opacity="0.65" />
              <stop offset="100%" stop-color="var(--lab-accent-violet)" stop-opacity="0.15" />
            </linearGradient>
          </defs>

          <ellipse cx="160" cy="252" rx="118" ry="16" fill="url(#spillFade)" opacity="0.35" />

          <path
            d="M52 232c26-14 58-6 86-14 22-6 34-22 58-22 22 0 36 12 58 10"
            fill="none"
            stroke="url(#spillFade)"
            stroke-width="10"
            stroke-linecap="round"
            opacity="0.55"
          />

          <g transform="rotate(-38 160 150)">
            <path
              d="M96 78h128l-56 66v58h22a10 10 0 0 1 0 20h-60a10 10 0 0 1 0-20h22v-58L96 78Z"
              fill="none"
              stroke="url(#spillGrad)"
              stroke-width="5"
              stroke-linejoin="round"
            />
            <path d="M118 96h84l-34 40h-16l-34-40Z" fill="url(#spillGrad)" opacity="0.35" />
          </g>

          <circle cx="118" cy="236" r="7" fill="url(#spillGrad)" opacity="0.7" />
          <circle cx="204" cy="242" r="5" fill="url(#spillGrad)" opacity="0.55" />
          <circle cx="246" cy="230" r="4" fill="url(#spillGrad)" opacity="0.4" />

          <g class="drip-group">
            <circle cx="150" cy="196" r="5" fill="var(--lab-accent)" />
          </g>
        </svg>
      </div>

      <div class="order-1 max-w-xl lg:order-2">
        <p
          class="animate-rise-in inline-flex items-center gap-2 rounded-full border border-default/70 bg-elevated/40 px-3.5 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted backdrop-blur"
        >
          <span class="size-1.5 rounded-full bg-accent-rose" />
          Error {{ status }}
        </p>

        <h1
          class="animate-rise-in mt-6 font-display text-4xl font-semibold leading-[1.05] text-highlighted sm:text-5xl lg:text-6xl"
          style="animation-delay: 80ms"
        >
          <span class="text-gradient text-gradient-anim">{{ heading }}</span>
        </h1>

        <p
          class="animate-rise-in mt-5 text-base leading-relaxed text-muted sm:text-lg"
          style="animation-delay: 160ms"
        >
          {{ blurb }}
        </p>

        <p
          v-if="!isNotFound && error?.message"
          class="animate-rise-in mt-4 rounded-xl border border-default/60 bg-elevated/40 px-4 py-3 font-mono text-xs text-dimmed"
          style="animation-delay: 200ms"
        >
          {{ error.message }}
        </p>

        <div class="animate-rise-in mt-9 flex flex-wrap items-center gap-3" style="animation-delay: 240ms">
          <UButton
            size="xl"
            color="primary"
            icon="i-lucide-house"
            class="rounded-full px-6 font-semibold glow-amber"
            @click="retry"
          >
            Back to the bar
          </UButton>
          <UButton
            to="/cocktails"
            size="xl"
            variant="outline"
            color="neutral"
            trailing-icon="i-lucide-arrow-up-right"
            class="rounded-full px-6 hover:border-accent/60 hover:text-accent"
          >
            Browse all cocktails
          </UButton>
        </div>

        <p class="animate-rise-in mt-8 text-sm text-dimmed" style="animation-delay: 300ms">
          Still thirsty? Try the
          <NuxtLink to="/pantry" class="nav-link font-medium text-accent">
            pantry matcher
          </NuxtLink>
          and see what your own shelf can make.
        </p>
      </div>
    </main>

    <footer class="mx-auto w-full max-w-7xl px-4 py-8 text-xs text-dimmed sm:px-6 lg:px-8">
      Data by
      <a
        href="https://www.thecocktaildb.com/"
        target="_blank"
        rel="noopener noreferrer"
        class="font-medium text-accent underline decoration-accent/40 underline-offset-4"
      >TheCocktailDB</a>
      · Built with Nuxt 4 · Prisma · PostgreSQL
    </footer>
  </div>
</template>

<style scoped>
.drip-group circle {
  animation: drip 3.4s ease-in-out infinite;
  transform-origin: center;
}

@media (prefers-reduced-motion: reduce) {
  .drip-group {
    display: none;
  }
}
</style>
