<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  issues?: string[]
}>(), {
  issues: () => []
})
</script>

<template>
  <div
    role="alert"
    class="animate-rise-in flex items-start gap-3 rounded-xl border border-lab-rose/45 bg-lab-rose/10 p-4 text-sm"
  >
    <UIcon name="i-lucide-triangle-alert" class="mt-0.5 size-4.5 shrink-0 text-accent-rose" />

    <div class="min-w-0 space-y-1.5">
      <p class="font-semibold text-highlighted">
        {{ title }}
      </p>
      <ul v-if="issues.length" class="list-disc space-y-1 ps-4 text-muted">
        <li v-for="issue in issues" :key="issue">
          {{ issue }}
        </li>
      </ul>
    </div>
  </div>
</template>
