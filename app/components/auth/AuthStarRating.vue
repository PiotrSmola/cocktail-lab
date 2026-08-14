<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: number | null
  readonly?: boolean
  label?: string
}>(), {
  readonly: false,
  label: 'Rating'
})

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const STARS = [1, 2, 3, 4, 5]

const active = computed(() => props.modelValue ?? 0)
const roving = computed(() => props.modelValue ?? 1)

function select(value: number) {
  emit('update:modelValue', props.modelValue === value ? null : value)
}

function move(event: KeyboardEvent, step: number) {
  const next = Math.min(5, Math.max(1, active.value + step))
  emit('update:modelValue', next)

  const group = event.currentTarget as HTMLElement | null
  group?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next - 1]?.focus()
}
</script>

<template>
  <p v-if="readonly && modelValue === null" class="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-dimmed">
    No rating
  </p>

  <div
    v-else-if="readonly"
    role="img"
    :aria-label="`Rated ${modelValue} out of 5`"
    class="flex items-center gap-0.5"
  >
    <UIcon
      v-for="star in STARS"
      :key="star"
      name="i-lucide-star"
      class="size-4"
      :class="star <= active ? 'text-accent' : 'text-dimmed/40'"
    />
  </div>

  <div v-else class="flex flex-wrap items-center gap-2">
    <!-- eslint-disable-next-line vuejs-accessibility/interactive-supports-focus -- radiogroup is a composite widget: focus belongs on the role="radio" children, which carry the roving tabindex below -->
    <div
      role="radiogroup"
      :aria-label="label"
      class="flex items-center"
      @keydown.left.prevent="move($event, -1)"
      @keydown.right.prevent="move($event, 1)"
    >
      <button
        v-for="star in STARS"
        :key="star"
        type="button"
        role="radio"
        :aria-checked="modelValue === star"
        :aria-label="`${star} out of 5`"
        :tabindex="star === roving ? 0 : -1"
        class="rounded-md p-1 transition-transform duration-300 ease-lab hover:scale-125 active:scale-95"
        @click="select(star)"
      >
        <UIcon
          name="i-lucide-star"
          class="size-5 transition-colors duration-300"
          :class="star <= active ? 'text-accent' : 'text-dimmed/40'"
        />
      </button>
    </div>

    <button
      v-if="modelValue !== null"
      type="button"
      class="rounded-md text-xs font-medium text-dimmed transition-colors duration-300 hover:text-accent-rose"
      @click="emit('update:modelValue', null)"
    >
      Clear rating
    </button>
  </div>
</template>
