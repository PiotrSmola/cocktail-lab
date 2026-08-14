<script setup lang="ts">
import type { CocktailIngredientLine } from '#shared/types/catalog'

const props = defineProps<{
  lines: CocktailIngredientLine[]
}>()

const MIN_SERVINGS = 1
const MAX_SERVINGS = 8

const servings = ref(MIN_SERVINGS)
const pantry = usePantry()

function step(delta: number): void {
  servings.value = Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, servings.value + delta))
}

function amountText(line: CocktailIngredientLine): string {
  const formatted = formatAmount({
    amount: scaleAmount(line.amount, servings.value),
    amountMax: scaleAmount(line.amountMax, servings.value),
    unit: line.unit
  })

  if (formatted) return formatted
  if (!line.rawMeasure) return ''

  return servings.value === MIN_SERVINGS
    ? line.rawMeasure
    : `${line.rawMeasure} ×${servings.value}`
}

function millilitreText(line: CocktailIngredientLine): string {
  return line.amountMl === null ? '' : formatMl(line.amountMl * servings.value)
}

const measuredLines = computed(() => props.lines.filter(line => line.amountMl !== null))

const totalMl = computed(() => measuredLines.value.reduce(
  (sum, line) => sum + (line.amountMl ?? 0),
  0
) * servings.value)

const showTotal = computed(() => measuredLines.value.length >= 2)
</script>

<template>
  <GlassPanel class="relative">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          The build
        </p>
        <h2 class="mt-2 font-display text-2xl font-semibold text-highlighted sm:text-3xl">
          Ingredients
        </h2>
      </div>

      <div class="flex items-center gap-3">
        <span class="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-dimmed">
          Servings
        </span>
        <div class="flex items-center gap-1 rounded-full border border-default/60 bg-elevated/40 p-1">
          <button
            type="button"
            class="flex size-8 items-center justify-center rounded-full text-muted transition-all duration-300 ease-lab hover:bg-elevated hover:text-accent active:scale-95 disabled:pointer-events-none disabled:opacity-35"
            :disabled="servings <= MIN_SERVINGS"
            aria-label="Fewer servings"
            @click="step(-1)"
          >
            <UIcon name="i-lucide-minus" class="size-4" />
          </button>

          <span
            class="relative flex h-8 w-9 items-center justify-center overflow-hidden font-display text-lg font-semibold text-highlighted tabular-nums"
            aria-live="polite"
          >
            <Transition name="count" mode="out-in">
              <span :key="servings">{{ servings }}</span>
            </Transition>
          </span>

          <button
            type="button"
            class="flex size-8 items-center justify-center rounded-full text-muted transition-all duration-300 ease-lab hover:bg-elevated hover:text-accent active:scale-95 disabled:pointer-events-none disabled:opacity-35"
            :disabled="servings >= MAX_SERVINGS"
            aria-label="More servings"
            @click="step(1)"
          >
            <UIcon name="i-lucide-plus" class="size-4" />
          </button>
        </div>
      </div>
    </div>

    <hr aria-hidden="true" class="rule-gradient mt-6">

    <RevealOnScroll as="ul" :stagger="70" :y="12" class="mt-2 divide-y divide-default/45">
      <li
        v-for="(line, index) in lines"
        :key="line.position"
        class="flex items-start gap-3 rounded-xl px-1 py-3.5 transition-colors duration-300 hover:bg-elevated/35 sm:gap-4 sm:px-2"
      >
        <span class="mt-2 w-5 shrink-0 text-right font-display text-sm font-semibold text-accent/85 tabular-nums">
          {{ index + 1 }}
        </span>

        <span
          class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-default/60 bg-elevated/50"
        >
          <NuxtImg
            v-if="line.ingredient.imageUrl"
            :src="line.ingredient.imageUrl"
            :alt="line.ingredient.name"
            width="40"
            height="40"
            sizes="40px"
            loading="lazy"
            format="webp"
            class="size-full object-cover"
          />
          <UIcon v-else name="i-lucide-flask-conical" class="size-4 text-dimmed" />
        </span>

        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <NuxtLink
              :to="`/ingredients/${line.ingredient.slug}`"
              class="nav-link text-sm font-medium text-highlighted transition-colors duration-300 hover:text-accent sm:text-base"
            >
              {{ line.ingredient.name }}
            </NuxtLink>
            <span v-if="line.optional" class="text-xs text-dimmed">(optional)</span>
          </div>

          <div class="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              v-if="line.garnish"
              class="inline-flex items-center gap-1 rounded-full border border-lab-rose/45 bg-lab-rose/12 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-accent-rose"
            >
              <UIcon name="i-lucide-cherry" class="size-3" />
              garnish
            </span>

            <span
              v-if="line.topUp"
              class="inline-flex items-center gap-1 rounded-full border border-lab-violet/45 bg-lab-violet/12 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-accent-violet"
            >
              <UIcon name="i-lucide-arrow-up-narrow-wide" class="size-3" />
              top up
            </span>

            <span
              v-if="line.toTaste"
              class="inline-flex items-center rounded-full border border-default/60 bg-elevated/40 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted"
            >
              to taste
            </span>

            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider transition-all duration-300 ease-lab active:scale-95"
              :class="pantry.has(line.ingredient.slug)
                ? 'border-lab-mint/50 bg-lab-mint/12 text-accent-mint'
                : 'border-default/60 bg-elevated/40 text-dimmed hover:border-accent/50 hover:text-accent'"
              :aria-pressed="pantry.has(line.ingredient.slug)"
              :aria-label="pantry.has(line.ingredient.slug)
                ? `Remove ${line.ingredient.name} from your pantry`
                : `Add ${line.ingredient.name} to your pantry`"
              @click="pantry.toggle(line.ingredient.slug)"
            >
              <UIcon v-if="pantry.has(line.ingredient.slug)" name="i-lucide-check" class="size-3" />
              <span v-else aria-hidden="true" class="size-1.5 rounded-full bg-current" />
              {{ pantry.has(line.ingredient.slug) ? 'in your pantry' : 'add' }}
            </button>

            <span v-if="line.note" class="text-[0.7rem] text-dimmed">
              {{ line.note }}
            </span>
          </div>
        </div>

        <div class="shrink-0 pt-1 text-right">
          <p class="font-display text-sm font-semibold text-highlighted tabular-nums sm:text-base">
            {{ amountText(line) }}
          </p>
          <p v-if="line.amountMl !== null" class="mt-0.5 text-xs text-dimmed tabular-nums">
            {{ millilitreText(line) }}
          </p>
        </div>
      </li>
    </RevealOnScroll>

    <div
      v-if="showTotal"
      class="mt-5 flex items-center justify-between border-t border-default/60 pt-4 text-sm"
    >
      <span class="flex items-center gap-2 text-dimmed">
        <UIcon name="i-lucide-beaker" class="size-4 text-accent-violet" />
        Total volume
      </span>
      <span class="font-display text-base font-semibold text-highlighted tabular-nums">
        {{ formatMl(totalMl) }}
      </span>
    </div>
  </GlassPanel>
</template>

<style scoped>
.count-enter-active,
.count-leave-active {
  transition:
    opacity 0.22s var(--ease-lab),
    transform 0.22s var(--ease-lab);
}

.count-enter-from {
  opacity: 0;
  transform: translateY(60%) scale(0.85);
}

.count-leave-to {
  opacity: 0;
  transform: translateY(-60%) scale(0.85);
}
</style>
