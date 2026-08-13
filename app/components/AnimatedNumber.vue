<script setup lang="ts">
const props = withDefaults(defineProps<{
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  decimals?: number
}>(), {
  duration: 1800,
  prefix: '',
  suffix: '',
  decimals: 0
})

const root = ref<HTMLElement | null>(null)
const current = ref(props.value)
const started = ref(false)
const reducedMotion = usePreferredReducedMotion()

const formatter = computed(() => new Intl.NumberFormat('en-US', {
  minimumFractionDigits: props.decimals,
  maximumFractionDigits: props.decimals
}))

const formatted = computed(() => `${props.prefix}${formatter.value.format(current.value)}${props.suffix}`)

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - 2 ** (-10 * t)
}

function run() {
  if (started.value) return
  started.value = true

  if (reducedMotion.value === 'reduce') {
    current.value = props.value
    return
  }

  const from = 0
  const to = props.value
  const start = performance.now()

  const tick = (now: number) => {
    const progress = Math.min((now - start) / props.duration, 1)
    const eased = easeOutExpo(progress)
    current.value = from + (to - from) * eased
    if (progress < 1) requestAnimationFrame(tick)
    else current.value = to
  }

  requestAnimationFrame(tick)
}

const { stop } = useIntersectionObserver(
  root,
  (entries) => {
    if (!entries[0]?.isIntersecting) return
    stop()
    run()
  },
  { threshold: 0.4 }
)

onMounted(() => {
  if (reducedMotion.value === 'reduce') {
    stop()
    return
  }
  if (!started.value) current.value = 0
})
</script>

<template>
  <span ref="root" class="tabular-nums">{{ formatted }}</span>
</template>
