<script setup lang="ts">
const props = withDefaults(defineProps<{
  as?: string
  delay?: number
  stagger?: number
  y?: number
  threshold?: number
  once?: boolean
}>(), {
  as: 'div',
  delay: 0,
  stagger: 0,
  y: 18,
  threshold: 0.12,
  once: true
})

const root = ref<HTMLElement | null>(null)
const visible = ref(false)
const reducedMotion = usePreferredReducedMotion()

const { stop } = useIntersectionObserver(
  root,
  (entries) => {
    const entry = entries[0]
    if (!entry) return
    if (entry.isIntersecting) {
      visible.value = true
      if (props.once) stop()
    } else if (!props.once) {
      visible.value = false
    }
  },
  { threshold: props.threshold, rootMargin: '0px 0px -8% 0px' }
)

onMounted(() => {
  if (reducedMotion.value === 'reduce') {
    visible.value = true
    stop()
  }
})

const style = computed(() => ({
  '--reveal-delay': `${props.delay}ms`,
  '--reveal-y': `${props.y}px`,
  '--reveal-stagger': `${props.stagger || 90}ms`
}))
</script>

<template>
  <component
    :is="as"
    ref="root"
    class="reveal"
    :class="{ 'is-visible': visible }"
    :data-stagger="stagger > 0 ? '' : undefined"
    :style="style"
  >
    <slot :visible="visible" />
  </component>
</template>
