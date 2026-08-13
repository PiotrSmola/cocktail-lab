<script setup lang="ts">
const year = new Date().getFullYear()

const columns = [
  {
    title: 'Explore',
    links: [
      { label: 'Cocktails', to: '/cocktails' },
      { label: 'Ingredients', to: '/ingredients' },
      { label: 'Pantry matcher', to: '/pantry' }
    ]
  },
  {
    title: 'By spirit',
    links: [
      { label: 'Gin', to: '/cocktails?spirit=gin' },
      { label: 'Rum', to: '/cocktails?spirit=rum' },
      { label: 'Whiskey', to: '/cocktails?spirit=whiskey' }
    ]
  }
]
</script>

<template>
  <footer class="relative mt-24 border-t border-default/60 bg-default/40 backdrop-blur-xl">
    <div aria-hidden="true" class="rule-gradient absolute inset-x-0 top-0 opacity-60" />

    <div class="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr] lg:px-8">
      <div class="max-w-sm">
        <p class="font-display text-lg font-semibold text-highlighted">
          Cocktail<span class="text-gradient"> Lab</span>
        </p>
        <p class="mt-3 text-sm leading-relaxed text-muted">
          A craft cocktail encyclopedia: browse the classics, learn what each bottle unlocks, and see
          what you can shake tonight with what is already on your shelf.
        </p>

        <p class="mt-5 text-sm text-dimmed">
          Data by
          <a
            href="https://www.thecocktaildb.com/"
            target="_blank"
            rel="noopener noreferrer"
            class="font-medium text-accent underline decoration-accent/40 underline-offset-4 transition-colors duration-300 hover:decoration-accent"
          >TheCocktailDB</a>
          — recipes and images used under their terms.
        </p>
      </div>

      <div v-for="column in columns" :key="column.title">
        <h2 class="font-display text-sm font-semibold uppercase tracking-[0.16em] text-highlighted">
          {{ column.title }}
        </h2>
        <ul class="mt-4 space-y-2.5">
          <li v-for="link in column.links" :key="link.to">
            <NuxtLink
              :to="link.to"
              class="text-sm text-muted transition-colors duration-300 hover:text-accent"
            >
              {{ link.label }}
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>

    <div class="border-t border-default/50">
      <div
        class="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-dimmed sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"
      >
        <p>&copy; {{ year }} Cocktail Lab. Drink responsibly.</p>
        <p class="flex items-center gap-2">
          <UIcon name="i-lucide-flask-conical" class="size-3.5 text-accent-violet" />
          Built with Nuxt 4 · Prisma · PostgreSQL
        </p>
      </div>
    </div>
  </footer>
</template>
