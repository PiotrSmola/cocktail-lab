<script setup lang="ts">
// Ambient page dressing on every page: slow drink bubbles rising along both
// screen edges (pure CSS, GPU transform-only) and line-art garnish — bottle,
// citrus wheel, mint leaf, cherry — drifting on scroll at different depths.
// Fixed, pointer-events none, fully hidden for reduced motion. Decorative.
const { y: scrollY } = useWindowScroll()
const reducedMotion = usePreferredReducedMotion()

interface Bubble {
  left: string
  size: number
  duration: string
  delay: string
  drift: string
  tint: string
  opacity: number
  hideSm?: boolean
}

// Fixed, varied values keep SSR deterministic while giving the bubbles a
// natural random-sized feel. Every bubble is deliberately between 30–50 px.
const leftBubbles: Bubble[] = [
  { left: '4%', size: 42, duration: '24s', delay: '-3s', drift: '26px', tint: 'var(--color-lab-amber)', opacity: 0.42 },
  { left: '58%', size: 34, duration: '29s', delay: '-9s', drift: '-22px', tint: 'var(--color-lab-rose)', opacity: 0.32 },
  { left: '28%', size: 49, duration: '27s', delay: '-16s', drift: '30px', tint: 'var(--color-lab-mint)', opacity: 0.36, hideSm: true },
  { left: '70%', size: 31, duration: '20s', delay: '-1.5s', drift: '18px', tint: 'var(--color-lab-violet)', opacity: 0.4 },
  { left: '12%', size: 38, duration: '31s', delay: '-12s', drift: '-28px', tint: 'var(--color-lab-rose)', opacity: 0.3, hideSm: true },
  { left: '46%', size: 45, duration: '25s', delay: '-7.5s', drift: '24px', tint: 'var(--color-lab-amber)', opacity: 0.4 },
  { left: '76%', size: 33, duration: '28s', delay: '-4.2s', drift: '-20px', tint: 'var(--color-lab-mint)', opacity: 0.34, hideSm: true },
  { left: '20%', size: 47, duration: '22s', delay: '-10s', drift: '32px', tint: 'var(--color-lab-violet)', opacity: 0.38 },
  { left: '62%', size: 36, duration: '30s', delay: '-18s', drift: '-24px', tint: 'var(--color-lab-amber)', opacity: 0.32, hideSm: true },
  { left: '36%', size: 40, duration: '23s', delay: '-5.4s', drift: '20px', tint: 'var(--color-lab-rose)', opacity: 0.38 },
  { left: '80%', size: 30, duration: '26s', delay: '-14s', drift: '-18px', tint: 'var(--color-lab-mint)', opacity: 0.34, hideSm: true },
  { left: '8%', size: 44, duration: '32s', delay: '-21s', drift: '28px', tint: 'var(--color-lab-violet)', opacity: 0.3 },
  { left: '52%', size: 35, duration: '21s', delay: '-6.8s', drift: '-26px', tint: 'var(--color-lab-amber)', opacity: 0.4, hideSm: true },
  { left: '68%', size: 48, duration: '28s', delay: '-11.2s', drift: '22px', tint: 'var(--color-lab-rose)', opacity: 0.34 }
]

const rightBubbles: Bubble[] = [
  { left: '10%', size: 46, duration: '26s', delay: '-5s', drift: '-28px', tint: 'var(--color-lab-rose)', opacity: 0.38 },
  { left: '64%', size: 32, duration: '30s', delay: '-2s', drift: '22px', tint: 'var(--color-lab-amber)', opacity: 0.32 },
  { left: '30%', size: 50, duration: '24s', delay: '-8s', drift: '-30px', tint: 'var(--color-lab-violet)', opacity: 0.36, hideSm: true },
  { left: '76%', size: 37, duration: '29s', delay: '-11s', drift: '26px', tint: 'var(--color-lab-mint)', opacity: 0.3 },
  { left: '42%', size: 43, duration: '27s', delay: '-6.8s', drift: '-24px', tint: 'var(--color-lab-amber)', opacity: 0.38, hideSm: true },
  { left: '4%', size: 31, duration: '21s', delay: '-4s', drift: '18px', tint: 'var(--color-lab-rose)', opacity: 0.4 },
  { left: '56%', size: 48, duration: '31s', delay: '-13s', drift: '-32px', tint: 'var(--color-lab-mint)', opacity: 0.32, hideSm: true },
  { left: '22%', size: 35, duration: '23s', delay: '-9.4s', drift: '20px', tint: 'var(--color-lab-violet)', opacity: 0.38 },
  { left: '82%', size: 41, duration: '28s', delay: '-17s', drift: '-26px', tint: 'var(--color-lab-amber)', opacity: 0.34, hideSm: true },
  { left: '48%', size: 30, duration: '20s', delay: '-3.2s', drift: '16px', tint: 'var(--color-lab-rose)', opacity: 0.4 },
  { left: '14%', size: 45, duration: '32s', delay: '-22s', drift: '-28px', tint: 'var(--color-lab-mint)', opacity: 0.3, hideSm: true },
  { left: '70%', size: 39, duration: '25s', delay: '-7.4s', drift: '24px', tint: 'var(--color-lab-violet)', opacity: 0.36 },
  { left: '34%', size: 47, duration: '29s', delay: '-15s', drift: '-30px', tint: 'var(--color-lab-amber)', opacity: 0.32, hideSm: true },
  { left: '60%', size: 33, duration: '22s', delay: '-10.6s', drift: '22px', tint: 'var(--color-lab-rose)', opacity: 0.4 }
]

function bubbleStyle(b: Bubble): Record<string, string> {
  return {
    left: b.left,
    width: `${b.size}px`,
    height: `${b.size}px`,
    animationDuration: b.duration,
    animationDelay: b.delay,
    '--bubble-drift': b.drift,
    '--bubble-tint': b.tint,
    '--bubble-opacity': String(b.opacity)
  }
}

interface Garnish {
  shape: 'bottle' | 'citrus' | 'leaf' | 'cherry'
  side: 'left' | 'right'
  offset: string
  top: string
  speed: number
  size: number
  color: string
  rotate: string
  floatDuration: string
  floatDelay: string
  zIndex: number
  opacityPhase?: number
}

// The ingredients sit on several depth planes. Pairs with phases π apart
// cross-fade as the user scrolls, while higher-z leaves intentionally overlap
// fruit to make the edges feel like a loose, layered garnish arrangement.
const garnish: Garnish[] = [
  { shape: 'bottle', side: 'left', offset: '1rem', top: '18%', speed: -0.08, size: 144, color: 'text-lab-amber/35', rotate: '-8deg', floatDuration: '9s', floatDelay: '-1s', zIndex: 1, opacityPhase: 0 },
  { shape: 'citrus', side: 'right', offset: '1rem', top: '8%', speed: 0.07, size: 174, color: 'text-lab-rose/30', rotate: '10deg', floatDuration: '11s', floatDelay: '-4s', zIndex: 1, opacityPhase: Math.PI },
  { shape: 'leaf', side: 'right', offset: '4.5rem', top: '12%', speed: -0.1, size: 136, color: 'text-lab-mint/40', rotate: '-22deg', floatDuration: '8s', floatDelay: '-2.5s', zIndex: 3, opacityPhase: Math.PI },
  { shape: 'cherry', side: 'left', offset: '1.25rem', top: '58%', speed: 0.09, size: 145, color: 'text-lab-rose/35', rotate: '6deg', floatDuration: '10s', floatDelay: '-5s', zIndex: 1, opacityPhase: 1.1 },
  { shape: 'citrus', side: 'left', offset: '6rem', top: '42%', speed: -0.05, size: 108, color: 'text-lab-violet/28', rotate: '-18deg', floatDuration: '12s', floatDelay: '-7s', zIndex: 1, opacityPhase: 4.24 },
  { shape: 'leaf', side: 'left', offset: '3.5rem', top: '61%', speed: -0.12, size: 124, color: 'text-lab-mint/38', rotate: '24deg', floatDuration: '9s', floatDelay: '-3s', zIndex: 3, opacityPhase: 1.1 },
  { shape: 'bottle', side: 'right', offset: '7rem', top: '70%', speed: 0.06, size: 112, color: 'text-lab-violet/30', rotate: '12deg', floatDuration: '10s', floatDelay: '-6s', zIndex: 1, opacityPhase: 2.1 },
  { shape: 'cherry', side: 'right', offset: '1.5rem', top: '29%', speed: -0.07, size: 118, color: 'text-lab-amber/30', rotate: '-10deg', floatDuration: '11s', floatDelay: '-8s', zIndex: 2, opacityPhase: 5.24 },
  { shape: 'leaf', side: 'right', offset: '8.5rem', top: '33%', speed: 0.1, size: 116, color: 'text-lab-mint/34', rotate: '32deg', floatDuration: '9s', floatDelay: '-1.8s', zIndex: 3, opacityPhase: 5.24 },
  { shape: 'citrus', side: 'left', offset: '10rem', top: '10%', speed: 0.08, size: 128, color: 'text-lab-amber/30', rotate: '24deg', floatDuration: '13s', floatDelay: '-9s', zIndex: 1, opacityPhase: 3.14 },
  { shape: 'cherry', side: 'right', offset: '5rem', top: '55%', speed: -0.09, size: 132, color: 'text-lab-rose/32', rotate: '14deg', floatDuration: '10s', floatDelay: '-4.5s', zIndex: 1, opacityPhase: 2.1 },
  { shape: 'leaf', side: 'right', offset: '2rem', top: '57%', speed: -0.14, size: 142, color: 'text-lab-mint/42', rotate: '-28deg', floatDuration: '8s', floatDelay: '-6.5s', zIndex: 3, opacityPhase: 2.1 },
  { shape: 'bottle', side: 'left', offset: '7.5rem', top: '78%', speed: 0.05, size: 104, color: 'text-lab-violet/28', rotate: '-16deg', floatDuration: '12s', floatDelay: '-10s', zIndex: 1, opacityPhase: 4.24 },
  { shape: 'citrus', side: 'right', offset: '11rem', top: '80%', speed: 0.11, size: 120, color: 'text-lab-amber/28', rotate: '-12deg', floatDuration: '11s', floatDelay: '-2s', zIndex: 1, opacityPhase: 1.1 },
  { shape: 'leaf', side: 'left', offset: '1rem', top: '31%', speed: 0.11, size: 132, color: 'text-lab-mint/36', rotate: '-30deg', floatDuration: '10s', floatDelay: '-5.5s', zIndex: 3, opacityPhase: 3.14 },
  { shape: 'cherry', side: 'left', offset: '9.5rem', top: '30%', speed: -0.06, size: 110, color: 'text-lab-rose/30', rotate: '18deg', floatDuration: '12s', floatDelay: '-11s', zIndex: 2, opacityPhase: 0 }
]

function garnishStyle(g: Garnish): Record<string, string> {
  const y = reducedMotion.value === 'reduce' ? 0 : scrollY.value * g.speed
  const opacity = reducedMotion.value === 'reduce' || g.opacityPhase === undefined
    ? 1
    : 0.03 + 0.94 * ((Math.sin(scrollY.value / 520 + g.opacityPhase) + 1) / 2)

  return {
    top: g.top,
    [g.side]: g.offset,
    zIndex: String(g.zIndex),
    opacity: opacity.toFixed(2),
    transform: `translate3d(0, ${y.toFixed(1)}px, 0) rotate(${g.rotate})`
  }
}
</script>

<template>
  <div aria-hidden="true" class="ambient-scene">
    <div class="absolute inset-y-0 left-0 w-14 sm:w-20">
      <span
        v-for="(b, i) in leftBubbles"
        :key="i"
        class="ambient-bubble"
        :class="b.hideSm ? 'hidden sm:block' : ''"
        :style="bubbleStyle(b)"
      />
    </div>

    <div class="absolute inset-y-0 right-0 w-14 sm:w-20">
      <span
        v-for="(b, i) in rightBubbles"
        :key="i"
        class="ambient-bubble"
        :class="b.hideSm ? 'hidden sm:block' : ''"
        :style="bubbleStyle(b)"
      />
    </div>

    <div
      v-for="(g, i) in garnish"
      :key="i"
      class="ambient-garnish hidden lg:block"
      :class="g.color"
      :style="garnishStyle(g)"
    >
      <svg
        :width="g.size"
        :height="g.size"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="anim-float select-none"
        :style="{ animationDuration: g.floatDuration, animationDelay: g.floatDelay }"
      >
        <template v-if="g.shape === 'bottle'">
          <path d="M20 4h8v12c0 1.8.7 3.2 1.9 4.6C32.6 23.6 34 26 34 30v10a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4V30c0-4 1.4-6.4 4.1-9.4 1.2-1.4 1.9-2.8 1.9-4.6V4z" />
          <path d="M19 9h10" />
          <path d="M14 32h20" />
        </template>

        <template v-else-if="g.shape === 'citrus'">
          <circle cx="24" cy="24" r="19" />
          <circle cx="24" cy="24" r="13.5" />
          <path d="M24 10.5v27M10.5 24h27M14.5 14.5l19 19M33.5 14.5l-19 19" />
        </template>

        <template v-else-if="g.shape === 'leaf'">
          <path d="M40 8C24 10 11 21 9 39c18-2 29-13 31-31z" />
          <path d="M12 36C19 27 28 18 37 11" />
          <path d="M19 29l-4-1M26 22l-3-4M32 16l-2-4" />
        </template>

        <template v-else>
          <circle cx="16" cy="34" r="7.5" />
          <circle cx="33" cy="36" r="7.5" />
          <path d="M16 27C19 17 25 10 33 6" />
          <path d="M33 29C33 20 33 12 33 6" />
        </template>
      </svg>
    </div>
  </div>
</template>
