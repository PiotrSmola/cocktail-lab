<script setup lang="ts">
import type { CocktailCard } from '#shared/types/catalog'

withDefaults(defineProps<{
  cocktail: CocktailCard
  eager?: boolean
  compact?: boolean
}>(), {
  eager: false,
  compact: false
})
</script>

<template>
  <article
    class="group glass-panel glass-hover focus-ring-within relative isolate flex flex-col overflow-hidden rounded-2xl"
  >
    <div class="relative aspect-square w-full overflow-hidden bg-elevated/50">
      <NuxtImg
        v-if="cocktail.imageUrl"
        :src="cocktail.imageUrl"
        :alt="cocktail.name"
        width="420"
        height="420"
        sizes="(max-width: 640px) 70vw, (max-width: 1024px) 40vw, 320px"
        :loading="eager ? 'eager' : 'lazy'"
        :fetchpriority="eager ? 'high' : 'auto'"
        format="webp"
        class="size-full object-cover transition-transform duration-500 ease-lab group-hover:scale-105"
      />

      <div
        v-else
        class="flex size-full items-center justify-center bg-gradient-to-br from-lab-amber/25 via-lab-rose/20 to-lab-violet/30"
      >
        <span
          class="flex size-16 items-center justify-center rounded-full border border-white/15 bg-white/10 backdrop-blur-md transition-transform duration-500 ease-lab group-hover:scale-110"
        >
          <UIcon name="i-lucide-martini" class="size-7 text-white/80" />
        </span>
      </div>

      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/10 to-transparent opacity-90 dark:from-ink-950/90"
      />

      <div class="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap gap-1.5">
        <span
          v-if="!cocktail.isAlcoholic"
          class="inline-flex items-center gap-1 rounded-full border border-lab-mint/45 bg-lab-mint/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-lab-mint backdrop-blur-sm"
        >
          <UIcon name="i-lucide-leaf" class="size-3" />
          Zero proof
        </span>
        <span
          v-if="cocktail.category"
          class="inline-flex items-center rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-white/85 backdrop-blur-sm"
        >
          {{ cocktail.category }}
        </span>
      </div>
    </div>

    <div class="flex flex-1 flex-col gap-1 p-4">
      <h3 class="font-display text-base font-semibold leading-snug text-highlighted sm:text-lg">
        <NuxtLink
          :to="`/cocktails/${cocktail.slug}`"
          class="rounded-sm outline-none after:absolute after:inset-0 after:z-0 after:content-['']"
        >
          {{ cocktail.name }}
        </NuxtLink>
      </h3>

      <p v-if="!compact && cocktail.glass" class="truncate text-xs text-dimmed">
        {{ cocktail.glass }}
      </p>

      <span
        aria-hidden="true"
        class="mt-2 h-px w-8 origin-left rounded-full bg-lab-amber/70 transition-all duration-500 ease-lab group-hover:w-16"
      />
    </div>

    <div v-if="$slots.actions" class="absolute right-3 top-3 z-10">
      <slot name="actions" />
    </div>
  </article>
</template>
