<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
  description?: string
}>(), {
  title: 'Cocktail Lab',
  description: 'Craft cocktail encyclopedia, pantry matcher and bartender calculator.'
})

const TITLE_SIZES: { max: number, size: number, height: number }[] = [
  { max: 18, size: 104, height: 110 },
  { max: 30, size: 84, height: 92 },
  { max: 44, size: 68, height: 76 }
]
const TITLE_FALLBACK = { size: 56, height: 64 }
const DESCRIPTION_LENGTH = 130

const displayTitle = computed(() => props.title.trim() || 'Cocktail Lab')

const titleStyle = computed(() => {
  const metrics = TITLE_SIZES.find(entry => displayTitle.value.length <= entry.max) ?? TITLE_FALLBACK
  return { fontSize: `${metrics.size}px`, lineHeight: `${metrics.height}px` }
})

const displayDescription = computed(() => {
  const text = props.description.trim()
  return text.length > DESCRIPTION_LENGTH
    ? `${text.slice(0, DESCRIPTION_LENGTH - 1).trimEnd()}…`
    : text
})
</script>

<template>
  <div
    style="display: flex; position: relative; width: 1200px; height: 630px; background-color: #120F19; font-family: Inter, sans-serif;"
  >
    <div
      style="display: flex; position: absolute; top: 0px; left: 0px; width: 1200px; height: 630px; background-image: linear-gradient(120deg, rgba(244,183,64,0.18) 0%, rgba(18,15,25,0) 40%, rgba(18,15,25,0) 58%, rgba(154,92,240,0.28) 100%);"
    />

    <div
      style="display: flex; position: absolute; top: 0px; left: 0px; width: 1200px; height: 10px; background-image: linear-gradient(100deg, #F4B740 0%, #ED5E70 48%, #9A5CF0 100%);"
    />

    <div
      style="display: flex; flex-direction: column; justify-content: space-between; position: relative; width: 1200px; height: 630px; padding: 74px 76px 68px 76px;"
    >
      <div style="display: flex; align-items: center;">
        <div
          style="display: flex; width: 18px; height: 18px; border-radius: 999px; margin-right: 18px; background-image: linear-gradient(100deg, #F4B740 0%, #ED5E70 55%, #9A5CF0 100%);"
        />
        <span
          style="font-family: Inter, sans-serif; font-size: 24px; font-weight: 600; letter-spacing: 7px; text-transform: uppercase; color: #C6BBD4;"
        >
          Cocktail Lab
        </span>
      </div>

      <div style="display: flex; flex-direction: column; width: 1000px;">
        <span
          style="font-family: Fraunces, serif; font-weight: 600; letter-spacing: -1px; color: #FBF7FF;"
          :style="titleStyle"
        >
          {{ displayTitle }}
        </span>
        <span
          style="font-family: Inter, sans-serif; font-size: 30px; font-weight: 400; line-height: 42px; color: #A99EB8; margin-top: 26px;"
        >
          {{ displayDescription }}
        </span>
      </div>

      <div style="display: flex; align-items: center;">
        <div
          style="display: flex; width: 120px; height: 4px; border-radius: 999px; margin-right: 22px; background-image: linear-gradient(100deg, #F4B740 0%, #ED5E70 55%, #9A5CF0 100%);"
        />
        <span
          style="font-family: Inter, sans-serif; font-size: 21px; font-weight: 400; color: #8C819B;"
        >
          Recipes · Ingredients · Pantry matching · ABV maths
        </span>
      </div>
    </div>
  </div>
</template>
