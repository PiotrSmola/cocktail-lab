<script setup lang="ts">
import type { PantryIngredientMeta } from './usePantryNames'
import { usePantryNames } from './usePantryNames'

interface StarterPack {
  id: string
  name: string
  tagline: string
  icon: string
  ring: string
  items: PantryIngredientMeta[]
}

const { has, toggle } = usePantry()
const { remember } = usePantryNames()
const reducedMotion = usePreferredReducedMotion()

const packs: StarterPack[] = [
  {
    id: 'classic-bar',
    name: 'Classic bar',
    tagline: 'The four base spirits plus the sours kit',
    icon: 'i-lucide-martini',
    ring: 'group-hover:border-lab-amber/45',
    items: [
      { slug: 'gin', name: 'Gin', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Gin.png' },
      { slug: 'vodka', name: 'Vodka', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Vodka.png' },
      { slug: 'light-rum', name: 'Light rum', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Light%20rum.png' },
      { slug: 'tequila', name: 'Tequila', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Tequila.png' },
      { slug: 'triple-sec', name: 'Triple sec', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Triple%20sec.png' },
      { slug: 'sweet-vermouth', name: 'Sweet Vermouth', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Sweet%20Vermouth.png' },
      { slug: 'angostura-bitters', name: 'Angostura bitters', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Angostura%20bitters.png' },
      { slug: 'lemon-juice', name: 'Lemon juice', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Lemon%20juice.png' },
      { slug: 'sugar', name: 'Sugar', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Sugar.png' },
    ],
  },
  {
    id: 'tiki-night',
    name: 'Tiki night',
    tagline: 'Two rums, tropical juice and a splash of red',
    icon: 'i-lucide-palmtree',
    ring: 'group-hover:border-lab-rose/45',
    items: [
      { slug: 'light-rum', name: 'Light rum', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Light%20rum.png' },
      { slug: 'dark-rum', name: 'Dark rum', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Dark%20rum.png' },
      { slug: 'triple-sec', name: 'Triple sec', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Triple%20sec.png' },
      { slug: 'pineapple-juice', name: 'Pineapple juice', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Pineapple%20juice.png' },
      { slug: 'orange-juice', name: 'Orange juice', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Orange%20juice.png' },
      { slug: 'grenadine', name: 'Grenadine', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Grenadine.png' },
      { slug: 'lime', name: 'Lime', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Lime.png' },
    ],
  },
  {
    id: 'zero-proof',
    name: 'Zero proof',
    tagline: 'Mixers and citrus for alcohol-free rounds',
    icon: 'i-lucide-leaf',
    ring: 'group-hover:border-lab-mint/45',
    items: [
      { slug: 'coca-cola', name: 'Coca-Cola', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Coca-Cola.png' },
      { slug: 'soda-water', name: 'Soda water', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Soda%20water.png' },
      { slug: 'orange-juice', name: 'Orange juice', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Orange%20juice.png' },
      { slug: 'pineapple-juice', name: 'Pineapple juice', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Pineapple%20juice.png' },
      { slug: 'lemon-juice', name: 'Lemon juice', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Lemon%20juice.png' },
      { slug: 'grenadine', name: 'Grenadine', imageUrl: 'https://www.thecocktaildb.com/images/ingredients/Grenadine.png' },
    ],
  },
]

const busy = ref('')

function ownedCount(pack: StarterPack): number {
  return pack.items.filter(item => has(item.slug)).length
}

function isComplete(pack: StarterPack): boolean {
  return ownedCount(pack) === pack.items.length
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function addAll(pack: StarterPack): Promise<void> {
  if (busy.value) {
    return
  }

  remember(pack.items)
  const pending = pack.items.filter(item => !has(item.slug))
  if (pending.length === 0) {
    return
  }

  if (reducedMotion.value === 'reduce') {
    for (const item of pending) {
      toggle(item.slug)
    }
    return
  }

  busy.value = pack.id
  for (const item of pending) {
    toggle(item.slug)
    await wait(75)
  }
  busy.value = ''
}
</script>

<template>
  <section aria-labelledby="pantry-packs-heading">
    <h3 id="pantry-packs-heading" class="text-xs font-semibold uppercase tracking-[0.18em] text-dimmed">
      Starter packs
    </h3>

    <RevealOnScroll as="ul" :stagger="90" class="mt-3 space-y-2.5">
      <li v-for="pack in packs" :key="pack.id">
        <div
          class="group flex items-center gap-3 rounded-xl border border-default/60 bg-elevated/25 p-3 transition-colors duration-500 ease-lab"
          :class="pack.ring"
        >
          <span
            class="flex size-9 shrink-0 items-center justify-center rounded-full border border-default/60 bg-elevated/50"
          >
            <UIcon :name="pack.icon" class="size-4 text-accent" />
          </span>

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-highlighted">
              {{ pack.name }}
            </p>
            <p class="truncate text-xs text-dimmed">
              {{ pack.items.length }} ingredients · {{ pack.tagline }}
            </p>

            <ul class="mt-2 flex items-center" :aria-label="`${pack.name} contents`">
              <li
                v-for="(item, index) in pack.items.slice(0, 5)"
                :key="item.slug"
                class="-ml-1.5 first:ml-0"
                :style="{ zIndex: 5 - index }"
              >
                <span
                  class="flex size-6 items-center justify-center overflow-hidden rounded-full border border-default/70 bg-default"
                  :title="item.name"
                >
                  <NuxtImg
                    v-if="item.imageUrl"
                    :src="item.imageUrl"
                    :alt="item.name"
                    width="48"
                    height="48"
                    loading="lazy"
                    format="webp"
                    class="size-full object-contain p-0.5"
                  />
                  <UIcon v-else name="i-lucide-flask-round" class="size-3 text-dimmed" />
                </span>
              </li>
              <li v-if="pack.items.length > 5" class="-ml-1.5">
                <span
                  class="flex size-6 items-center justify-center rounded-full border border-default/70 bg-elevated/70 text-[0.6rem] font-semibold text-muted"
                >
                  +{{ pack.items.length - 5 }}
                </span>
              </li>
            </ul>
          </div>

          <UButton
            size="xs"
            :color="isComplete(pack) ? 'neutral' : 'primary'"
            :variant="isComplete(pack) ? 'ghost' : 'soft'"
            :disabled="isComplete(pack)"
            :loading="busy === pack.id"
            :icon="isComplete(pack) ? 'i-lucide-check' : 'i-lucide-plus'"
            class="shrink-0 rounded-full"
            :aria-label="isComplete(pack)
              ? `${pack.name} already in your pantry`
              : `Add all ${pack.items.length} ${pack.name} ingredients to your pantry`"
            @click="addAll(pack)"
          >
            {{ isComplete(pack) ? 'Added' : 'Add all' }}
          </UButton>
        </div>
      </li>
    </RevealOnScroll>
  </section>
</template>
