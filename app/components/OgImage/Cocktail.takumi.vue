<script setup lang="ts">
const props = withDefaults(defineProps<{
  name?: string
  imageUrl?: string | null
  category?: string | null
  glass?: string | null
  isAlcoholic?: boolean
  abv?: number | null
}>(), {
  name: 'Cocktail Lab',
  imageUrl: null,
  category: null,
  glass: null,
  isAlcoholic: true,
  abv: null
})

const NAME_SIZES: { max: number, size: number, height: number }[] = [
  { max: 12, size: 96, height: 100 },
  { max: 20, size: 78, height: 84 },
  { max: 28, size: 64, height: 70 },
  { max: 40, size: 54, height: 60 }
]
const NAME_FALLBACK = { size: 44, height: 50 }
const BADGE_LIMIT = 3

const displayName = computed(() => props.name.trim() || 'Cocktail Lab')

const nameMetrics = computed(() => {
  const length = displayName.value.length
  return NAME_SIZES.find(entry => length <= entry.max) ?? NAME_FALLBACK
})

const nameStyle = computed(() => ({
  fontSize: `${nameMetrics.value.size}px`,
  lineHeight: `${nameMetrics.value.height}px`
}))

const initial = computed(() => displayName.value.slice(0, 1).toUpperCase())

const badges = computed(() => {
  const items: { label: string, tone: 'neutral' | 'mint' | 'amber' }[] = []

  if (props.category) {
    items.push({ label: props.category, tone: 'neutral' })
  }
  if (props.glass) {
    items.push({ label: props.glass, tone: 'neutral' })
  }
  if (!props.isAlcoholic) {
    items.push({ label: 'Zero proof', tone: 'mint' })
  }
  else if (props.abv !== null && props.abv > 0) {
    items.push({ label: `Est. ${props.abv}% ABV`, tone: 'amber' })
  }

  return items.slice(0, BADGE_LIMIT)
})

const TONE_STYLES: Record<'neutral' | 'mint' | 'amber', Record<string, string>> = {
  neutral: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.16)',
    color: '#CFC4DB'
  },
  mint: {
    backgroundColor: 'rgba(63,217,164,0.14)',
    borderColor: 'rgba(63,217,164,0.45)',
    color: '#7FE9C6'
  },
  amber: {
    backgroundColor: 'rgba(244,183,64,0.14)',
    borderColor: 'rgba(244,183,64,0.48)',
    color: '#F7CB7C'
  }
}

function badgeStyle(tone: 'neutral' | 'mint' | 'amber'): Record<string, string> {
  return TONE_STYLES[tone]
}
</script>

<template>
  <div
    style="display: flex; position: relative; width: 1200px; height: 630px; background-color: #120F19; font-family: Inter, sans-serif;"
  >
    <div
      style="display: flex; position: absolute; top: 0px; left: 0px; width: 1200px; height: 630px; background-image: linear-gradient(120deg, rgba(244,183,64,0.16) 0%, rgba(18,15,25,0) 38%, rgba(18,15,25,0) 60%, rgba(154,92,240,0.26) 100%);"
    />

    <div
      style="display: flex; position: absolute; top: 0px; left: 0px; width: 1200px; height: 10px; background-image: linear-gradient(100deg, #F4B740 0%, #ED5E70 48%, #9A5CF0 100%);"
    />

    <div
      style="display: flex; position: relative; width: 1200px; height: 630px; padding: 66px 64px 60px 64px;"
    >
      <div
        style="display: flex; flex-direction: column; justify-content: space-between; width: 616px; padding-right: 48px;"
      >
        <div style="display: flex; align-items: center;">
          <div
            style="display: flex; width: 16px; height: 16px; border-radius: 999px; margin-right: 16px; background-image: linear-gradient(100deg, #F4B740 0%, #ED5E70 55%, #9A5CF0 100%);"
          />
          <span
            style="font-family: Inter, sans-serif; font-size: 22px; font-weight: 600; letter-spacing: 6px; text-transform: uppercase; color: #C6BBD4;"
          >
            Cocktail Lab
          </span>
        </div>

        <div style="display: flex; flex-direction: column;">
          <span
            style="font-family: Fraunces, serif; font-weight: 600; letter-spacing: -1px; color: #FBF7FF;"
            :style="nameStyle"
          >
            {{ displayName }}
          </span>

          <div style="display: flex; flex-wrap: wrap; margin-top: 34px;">
            <div
              v-for="badge in badges"
              :key="badge.label"
              style="display: flex; align-items: center; border-width: 1px; border-style: solid; border-radius: 999px; padding: 9px 22px; margin-right: 12px; margin-top: 12px;"
              :style="badgeStyle(badge.tone)"
            >
              <span
                style="font-family: Inter, sans-serif; font-size: 21px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;"
              >
                {{ badge.label }}
              </span>
            </div>
          </div>
        </div>

        <span
          style="font-family: Inter, sans-serif; font-size: 21px; font-weight: 400; color: #8C819B;"
        >
          Recipes, pantry matching and bartender maths
        </span>
      </div>

      <div
        style="display: flex; align-items: center; justify-content: center; width: 424px; height: 424px; margin-top: 40px; padding: 12px; border-radius: 34px; border-width: 1px; border-style: solid; border-color: rgba(255,255,255,0.14); background-color: rgba(255,255,255,0.05);"
      >
        <img
          v-if="imageUrl"
          :src="imageUrl"
          width="400"
          height="400"
          style="width: 400px; height: 400px; border-radius: 24px; object-fit: cover;"
        >

        <div
          v-else
          style="display: flex; align-items: center; justify-content: center; width: 400px; height: 400px; border-radius: 24px; background-image: linear-gradient(140deg, rgba(244,183,64,0.32) 0%, rgba(237,94,112,0.28) 50%, rgba(154,92,240,0.36) 100%);"
        >
          <span
            style="font-family: Fraunces, serif; font-size: 200px; font-weight: 600; line-height: 220px; color: rgba(255,255,255,0.82);"
          >
            {{ initial }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
