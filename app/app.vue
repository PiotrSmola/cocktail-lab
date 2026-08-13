<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'en' },
  titleTemplate: (title?: string) => {
    if (!title) return 'Cocktail Lab'
    return title.includes('Cocktail Lab') ? title : `${title} · Cocktail Lab`
  }
})
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLoadingIndicator
      :height="3"
      color="linear-gradient(90deg, oklch(0.82 0.155 78) 0%, oklch(0.7 0.19 12) 55%, oklch(0.62 0.2 300) 100%)"
    />
    <NuxtLayout>
      <NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />
    </NuxtLayout>
  </UApp>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition:
    opacity 0.3s var(--ease-lab),
    transform 0.3s var(--ease-lab);
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (prefers-reduced-motion: reduce) {
  .page-enter-active,
  .page-leave-active {
    transition: none;
  }

  .page-enter-from,
  .page-leave-to {
    opacity: 1;
    transform: none;
  }
}
</style>
