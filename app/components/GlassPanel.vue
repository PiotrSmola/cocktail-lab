<script setup lang="ts">
withDefaults(defineProps<{
  as?: string
  padded?: boolean
  hover?: boolean
  strong?: boolean
  grain?: boolean
}>(), {
  as: 'div',
  padded: true,
  hover: false,
  strong: false,
  grain: false
})
</script>

<template>
  <component
    :is="as"
    class="glass-panel overflow-hidden"
    :class="[
      padded && 'p-6 sm:p-8',
      hover && 'glass-hover',
      strong && 'glass-panel-strong',
      grain && 'grain'
    ]"
  >
    <slot />
  </component>
</template>
