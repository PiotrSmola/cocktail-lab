<script setup lang="ts">
// Hand-drawn hero scene: a coupe glass mid-experiment — swirling liquid,
// rising bubbles, aroma vapors, a spinning citrus wheel and floating
// botanicals. Pure SVG + CSS on the GPU, with mouse parallax per layer
// for a pseudo-3D feel. Decorative only.
const root = ref<HTMLElement | null>(null)
const { elementX, elementY, elementWidth, elementHeight } = useMouseInElement(root)
const reducedMotion = usePreferredReducedMotion()

const mx = computed(() => (elementWidth.value > 0 ? elementX.value / elementWidth.value - 0.5 : 0))
const my = computed(() => (elementHeight.value > 0 ? elementY.value / elementHeight.value - 0.5 : 0))

function layerStyle(depth: number): Record<string, string> | undefined {
  if (reducedMotion.value === 'reduce') return undefined
  const x = (mx.value * depth * 26).toFixed(2)
  const y = (my.value * depth * 20).toFixed(2)
  return { transform: `translate3d(${x}px, ${y}px, 0)` }
}

const bubbles = [
  { cx: 205, r: 2.5, duration: '5.6s', delay: '-1s' },
  { cx: 232, r: 3.5, duration: '7s', delay: '-3.2s' },
  { cx: 258, r: 2, duration: '4.6s', delay: '-0.6s' },
  { cx: 283, r: 3, duration: '6.4s', delay: '-4.1s' },
  { cx: 308, r: 2.5, duration: '5.1s', delay: '-2.3s' },
  { cx: 332, r: 3.5, duration: '7.8s', delay: '-5.4s' },
  { cx: 246, r: 2, duration: '6.9s', delay: '-3.8s' },
  { cx: 296, r: 1.8, duration: '4.2s', delay: '-1.7s' }
]

const vapors = [
  { d: 'M 235 235 C 220 200, 250 185, 238 150 C 228 120, 252 105, 244 75', delay: '0s' },
  { d: 'M 270 230 C 282 200, 258 180, 272 148 C 283 120, 262 100, 274 70', delay: '-2s' },
  { d: 'M 305 235 C 316 205, 292 190, 306 158 C 316 130, 298 112, 310 84', delay: '-4s' }
]

const sparkles = [
  { x: 168, y: 92, scale: 1, delay: '0s' },
  { x: 352, y: 68, scale: 0.8, delay: '-1.2s' },
  { x: 452, y: 212, scale: 0.9, delay: '-2.3s' },
  { x: 96, y: 222, scale: 0.7, delay: '-0.7s' }
]
</script>

<template>
  <div ref="root" class="hero-alchemy" aria-hidden="true">
    <svg viewBox="0 0 520 600" fill="none" class="h-auto w-full select-none">
      <defs>
        <radialGradient id="alchemyGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stop-color="#f5c05e" stop-opacity="0.32" />
          <stop offset="55%" stop-color="#e0657a" stop-opacity="0.14" />
          <stop offset="100%" stop-color="#8b6ff0" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="alchemyShadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stop-color="#000" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#000" stop-opacity="0" />
        </radialGradient>
        <linearGradient
          id="liquidGrad"
          gradientUnits="userSpaceOnUse"
          x1="150"
          y1="255"
          x2="390"
          y2="400"
        >
          <stop offset="0%" stop-color="#f5c05e" />
          <stop offset="52%" stop-color="#e0657a" />
          <stop offset="100%" stop-color="#8b6ff0" />
        </linearGradient>
        <linearGradient
          id="glassStroke"
          gradientUnits="userSpaceOnUse"
          x1="260"
          y1="240"
          x2="260"
          y2="490"
        >
          <stop offset="0%" stop-color="#fff" stop-opacity="0.85" />
          <stop offset="100%" stop-color="#fff" stop-opacity="0.18" />
        </linearGradient>
        <linearGradient
          id="vaporGrad"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="240"
          x2="0"
          y2="60"
        >
          <stop offset="0%" stop-color="#fff" stop-opacity="0" />
          <stop offset="35%" stop-color="#fff" stop-opacity="0.5" />
          <stop offset="100%" stop-color="#fff" stop-opacity="0" />
        </linearGradient>
        <clipPath id="bowlClip">
          <path d="M 140 250 C 140 345, 195 390, 260 390 C 325 390, 380 345, 380 250 Z" />
        </clipPath>
      </defs>

      <!-- ambient glow -->
      <g class="alchemy-layer" :style="layerStyle(0.15)">
        <ellipse cx="260" cy="300" rx="215" ry="195" fill="url(#alchemyGlow)" />
      </g>

      <!-- blueprint rings -->
      <g class="alchemy-layer" :style="layerStyle(0.35)">
        <circle
          cx="260"
          cy="300"
          r="206"
          stroke="#fff"
          stroke-opacity="0.09"
          stroke-width="1.5"
          stroke-dasharray="1 12"
          class="anim-spin-slower"
          style="transform-box: fill-box; transform-origin: center"
        />
        <circle
          cx="260"
          cy="300"
          r="240"
          stroke="#f5c05e"
          stroke-opacity="0.16"
          stroke-width="1"
          stroke-dasharray="1 18"
          class="anim-spin-slower"
          style="transform-box: fill-box; transform-origin: center; animation-duration: 130s; animation-direction: reverse"
        />
        <circle cx="260" cy="62" r="3" fill="#f5c05e" fill-opacity="0.5" />
        <circle cx="500" cy="300" r="3" fill="#fff" fill-opacity="0.25" />
      </g>

      <!-- shadow under the glass -->
      <g class="alchemy-layer" :style="layerStyle(0.45)">
        <ellipse cx="260" cy="484" rx="105" ry="14" fill="url(#alchemyShadow)" />
      </g>

      <!-- aroma vapors -->
      <g class="alchemy-layer" :style="layerStyle(0.55)">
        <path
          v-for="vapor in vapors"
          :key="vapor.d"
          :d="vapor.d"
          stroke="url(#vaporGrad)"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-dasharray="4 16"
          class="anim-vapor"
          :style="{ animationDelay: vapor.delay }"
        />
      </g>

      <!-- the coupe -->
      <g class="alchemy-layer" :style="layerStyle(0.62)">
        <!-- liquid -->
        <g clip-path="url(#bowlClip)">
          <path
            d="M70 268 Q85 261 100 268 T160 268 T220 268 T280 268 T340 268 T400 268 T460 268 L460 400 L70 400 Z"
            fill="url(#liquidGrad)"
            opacity="0.55"
            class="anim-wave-rev"
          />
          <path
            d="M70 263 Q85 255 100 263 T160 263 T220 263 T280 263 T340 263 T400 263 T460 263 L460 400 L70 400 Z"
            fill="url(#liquidGrad)"
            opacity="0.9"
            class="anim-wave"
          />
          <circle
            v-for="bubble in bubbles"
            :key="bubble.cx"
            :cx="bubble.cx"
            cy="372"
            :r="bubble.r"
            fill="#fff"
            fill-opacity="0.55"
            class="anim-bubble"
            :style="{ animationDuration: bubble.duration, animationDelay: bubble.delay }"
          />
        </g>

        <!-- glass body -->
        <path
          d="M 140 250 C 140 345, 195 390, 260 390 C 325 390, 380 345, 380 250"
          stroke="url(#glassStroke)"
          stroke-width="2"
          fill="#fff"
          fill-opacity="0.04"
        />
        <path d="M 140 250 L 380 250" stroke="#fff" stroke-opacity="0.3" stroke-width="1.5" />
        <path
          d="M 158 268 C 152 310, 168 348, 198 368"
          stroke="#fff"
          stroke-opacity="0.18"
          stroke-width="3"
          stroke-linecap="round"
        />
        <!-- stem + base -->
        <path d="M 260 390 L 260 462" stroke="url(#glassStroke)" stroke-width="2" />
        <circle cx="260" cy="402" r="3.5" stroke="#fff" stroke-opacity="0.4" stroke-width="1.5" />
        <ellipse
          cx="260"
          cy="470"
          rx="62"
          ry="8"
          stroke="url(#glassStroke)"
          stroke-width="2"
          fill="#fff"
          fill-opacity="0.03"
        />
      </g>

      <!-- citrus wheel on the rim -->
      <g class="alchemy-layer" :style="layerStyle(0.8)">
        <g transform="translate(362 238) rotate(18)">
          <g
            class="anim-spin-slower"
            style="transform-box: fill-box; transform-origin: center; animation-duration: 46s"
          >
            <circle r="25" fill="#f5c05e" fill-opacity="0.14" stroke="#f5c05e" stroke-width="4" />
            <circle r="18" stroke="#f5c05e" stroke-opacity="0.55" stroke-width="1.5" />
            <g stroke="#f5c05e" stroke-opacity="0.8" stroke-width="1.5" stroke-linecap="round">
              <line x1="0" y1="-16" x2="0" y2="16" />
              <line x1="-13.9" y1="-8" x2="13.9" y2="8" />
              <line x1="-13.9" y1="8" x2="13.9" y2="-8" />
            </g>
            <circle r="2.5" fill="#f5c05e" />
          </g>
        </g>
      </g>

      <!-- floating botanicals -->
      <g class="alchemy-layer" :style="layerStyle(1)">
        <!-- star anise -->
        <g transform="translate(118 152)">
          <g class="anim-float">
            <g stroke="#e0657a" stroke-width="3.5" stroke-linecap="round">
              <line x1="0" y1="-15" x2="0" y2="15" />
              <line x1="-15" y1="0" x2="15" y2="0" />
              <line x1="-10.6" y1="-10.6" x2="10.6" y2="10.6" />
              <line x1="-10.6" y1="10.6" x2="10.6" y2="-10.6" />
            </g>
            <circle r="4" fill="#e0657a" />
          </g>
        </g>
        <!-- juniper berries -->
        <g transform="translate(414 128)">
          <g class="anim-float" style="animation-duration: 8.5s; animation-delay: -2s">
            <circle cx="-8" cy="4" r="6.5" fill="#8b6ff0" fill-opacity="0.75" />
            <circle cx="7" cy="-5" r="5" fill="#8b6ff0" fill-opacity="0.6" />
            <circle cx="6" cy="9" r="4" fill="#8b6ff0" fill-opacity="0.85" />
            <circle cx="-10" cy="2" r="1.6" fill="#fff" fill-opacity="0.7" />
            <circle cx="5.5" cy="-7" r="1.2" fill="#fff" fill-opacity="0.6" />
          </g>
        </g>
        <!-- mint leaves -->
        <g transform="translate(104 336)">
          <g class="anim-float" style="animation-duration: 6.5s; animation-delay: -4s">
            <path
              d="M0 0 C -16 -6 -22 -24 -12 -40 C 3 -35 11 -18 0 0 Z"
              fill="#5fd9a4"
              fill-opacity="0.2"
              stroke="#5fd9a4"
              stroke-opacity="0.75"
              stroke-width="1.5"
            />
            <path d="M -3 -6 C -7 -16 -9 -26 -10 -34" stroke="#5fd9a4" stroke-opacity="0.6" stroke-width="1" />
          </g>
        </g>
        <g transform="translate(432 326) scale(-0.75 0.75)">
          <g class="anim-float" style="animation-duration: 7.5s; animation-delay: -1.5s">
            <path
              d="M0 0 C -16 -6 -22 -24 -12 -40 C 3 -35 11 -18 0 0 Z"
              fill="#5fd9a4"
              fill-opacity="0.16"
              stroke="#5fd9a4"
              stroke-opacity="0.6"
              stroke-width="1.5"
            />
          </g>
        </g>
      </g>

      <!-- sparkles -->
      <g class="alchemy-layer" :style="layerStyle(1.25)">
        <g v-for="s in sparkles" :key="`${s.x}-${s.y}`" :transform="`translate(${s.x} ${s.y}) scale(${s.scale})`">
          <path
            d="M0 -9 C 1.2 -3 3 -1.2 9 0 C 3 1.2 1.2 3 0 9 C -1.2 3 -3 1.2 -9 0 C -3 -1.2 -1.2 -3 0 -9 Z"
            fill="#f5c05e"
            class="anim-twinkle"
            style="transform-box: fill-box; transform-origin: center"
            :style="{ animationDelay: s.delay }"
          />
        </g>
      </g>
    </svg>
  </div>
</template>
