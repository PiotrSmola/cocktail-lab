<template>
  <div class="flex min-h-screen flex-col bg-default text-default">
    <a
      href="#main"
      class="sr-only z-100 rounded-lg bg-default px-4 py-2 text-sm font-medium text-highlighted ring-2 ring-lab-amber focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
    >
      Skip to content
    </a>

    <AppHeader />

    <main id="main" class="flex-1">
      <slot />
    </main>

    <AppFooter />
  </div>
</template>
