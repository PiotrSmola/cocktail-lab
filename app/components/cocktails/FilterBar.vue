<script setup lang="ts">
interface Facet {
  value: string
  count: number
}

interface FacetOption {
  label: string
  value: string
  count: number
}

const props = defineProps<{
  categories: Facet[]
  glasses: Facet[]
  loading?: boolean
}>()

const category = defineModel<string>('category', { required: true })
const glass = defineModel<string>('glass', { required: true })
const alcoholic = defineModel<string>('alcoholic', { required: true })
const sort = defineModel<string>('sort', { required: true })

const ALCOHOL_OPTIONS = [
  { value: '', label: 'All', icon: 'i-lucide-layers' },
  { value: 'true', label: 'Alcoholic', icon: 'i-lucide-wine' },
  { value: 'false', label: 'Zero proof', icon: 'i-lucide-leaf' }
]

const SORT_OPTIONS = [
  { value: 'name', label: 'A–Z' },
  { value: '-name', label: 'Z–A' },
  { value: 'recent', label: 'Recently updated' },
  { value: 'random', label: 'Surprise order' }
]

function toOptions(facets: Facet[]): FacetOption[] {
  return facets.map(facet => ({ label: facet.value, value: facet.value, count: facet.count }))
}

const categoryOptions = computed(() => toOptions(props.categories))
const glassOptions = computed(() => toOptions(props.glasses))

const categoryValue = computed<string | undefined>({
  get: () => category.value || undefined,
  set: (value) => {
    category.value = value ?? ''
  }
})

const glassValue = computed<string | undefined>({
  get: () => glass.value || undefined,
  set: (value) => {
    glass.value = value ?? ''
  }
})

const strengthLabelId = useId()

const selectUi = {
  base: 'rounded-xl bg-elevated/40 ring-default/70 backdrop-blur',
  content: 'rounded-xl'
}
</script>

<template>
  <GlassPanel :padded="false" class="p-4 sm:p-5">
    <div class="grid gap-4 lg:grid-cols-[repeat(2,minmax(0,1fr))_auto_auto] lg:items-end">
      <UFormField label="Category" size="lg">
        <USelectMenu
          v-model="categoryValue"
          :items="categoryOptions"
          value-key="value"
          label-key="label"
          placeholder="All categories"
          icon="i-lucide-shapes"
          :loading="loading"
          clear
          :ui="selectUi"
          class="w-full"
        >
          <template #item-trailing="{ item }">
            <span class="text-xs tabular-nums text-dimmed">{{ item.count }}</span>
          </template>
        </USelectMenu>
      </UFormField>

      <UFormField label="Glass" size="lg">
        <USelectMenu
          v-model="glassValue"
          :items="glassOptions"
          value-key="value"
          label-key="label"
          placeholder="Any glass"
          icon="i-lucide-martini"
          :loading="loading"
          clear
          :ui="selectUi"
          class="w-full"
        >
          <template #item-trailing="{ item }">
            <span class="text-xs tabular-nums text-dimmed">{{ item.count }}</span>
          </template>
        </USelectMenu>
      </UFormField>

      <div>
        <p :id="strengthLabelId" class="mb-1.5 block text-sm font-medium text-default">
          Strength
        </p>
        <div
          role="group"
          :aria-labelledby="strengthLabelId"
          class="flex items-center gap-1 rounded-xl border border-default/70 bg-elevated/40 p-1 backdrop-blur"
        >
          <button
            v-for="option in ALCOHOL_OPTIONS"
            :key="option.label"
            type="button"
            :aria-pressed="alcoholic === option.value"
            class="flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-[color,background-color,box-shadow] duration-300 ease-lab lg:flex-none"
            :class="alcoholic === option.value
              ? 'bg-lab-amber/20 text-accent shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-lab-amber)_35%,transparent)]'
              : 'text-muted hover:text-highlighted'"
            @click="alcoholic = option.value"
          >
            <UIcon :name="option.icon" class="size-4 shrink-0" />
            {{ option.label }}
          </button>
        </div>
      </div>

      <UFormField label="Sort" size="lg">
        <USelect
          v-model="sort"
          :items="SORT_OPTIONS"
          value-key="value"
          label-key="label"
          icon="i-lucide-arrow-down-up"
          :ui="selectUi"
          class="w-full lg:w-52"
        />
      </UFormField>
    </div>
  </GlassPanel>
</template>
