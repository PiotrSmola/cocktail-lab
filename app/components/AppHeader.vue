<script setup lang="ts">
const links = [
  { label: 'Cocktails', to: '/cocktails', icon: 'i-lucide-martini' },
  { label: 'Ingredients', to: '/ingredients', icon: 'i-lucide-flask-round' },
  { label: 'Pantry', to: '/pantry', icon: 'i-lucide-refrigerator' }
]

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

function toggleColorMode() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

const mobileOpen = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => { mobileOpen.value = false })

const { y } = useWindowScroll()
const scrolled = computed(() => y.value > 12)
</script>

<template>
  <header
    class="sticky top-0 z-50 w-full border-b transition-[background-color,border-color,box-shadow] duration-500 ease-lab"
    :class="scrolled
      ? 'border-default/70 bg-default/70 shadow-[0_10px_40px_-28px_rgb(0_0_0/0.8)] backdrop-blur-xl backdrop-saturate-150'
      : 'border-transparent bg-default/30 backdrop-blur-md'"
  >
    <div class="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
      <NuxtLink
        to="/"
        class="group flex shrink-0 items-center gap-2.5 rounded-lg"
        aria-label="Cocktail Lab — home"
      >
        <svg
          viewBox="0 0 32 32"
          class="size-8 shrink-0 transition-transform duration-500 ease-lab group-hover:-rotate-6 group-hover:scale-110"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="clg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="var(--lab-accent)" />
              <stop offset="52%" stop-color="var(--lab-accent-rose)" />
              <stop offset="100%" stop-color="var(--lab-accent-violet)" />
            </linearGradient>
          </defs>
          <path
            d="M5 6h22L17.4 17.2v8.1h4.7a1.15 1.15 0 0 1 0 2.3H9.9a1.15 1.15 0 0 1 0-2.3h4.7v-8.1L5 6Z"
            fill="none"
            stroke="url(#clg)"
            stroke-width="1.8"
            stroke-linejoin="round"
          />
          <path d="M9.2 9.6h13.6L17.4 15.8h-2.8L9.2 9.6Z" fill="url(#clg)" opacity="0.55" />
          <circle cx="24.4" cy="8.4" r="2.1" fill="var(--lab-accent)" opacity="0.9" />
        </svg>

        <span class="font-display text-lg font-semibold tracking-tight text-highlighted sm:text-xl">
          Cocktail<span class="text-gradient text-gradient-anim"> Lab</span>
        </span>
      </NuxtLink>

      <nav aria-label="Main" class="ml-6 hidden items-center gap-7 md:flex">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="nav-link text-sm font-medium text-muted transition-colors duration-300 hover:text-highlighted"
        >
          {{ link.label }}
        </NuxtLink>
      </nav>

      <div class="ml-auto flex items-center gap-1.5 sm:gap-2">
        <ClientOnly>
          <button
            type="button"
            class="flex size-9 items-center justify-center rounded-full border border-default/60 bg-elevated/40 text-muted transition-all duration-300 ease-lab hover:border-accent/55 hover:text-accent active:scale-95"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            :aria-pressed="isDark"
            @click="toggleColorMode"
          >
            <UIcon :name="isDark ? 'i-lucide-sun' : 'i-lucide-moon-star'" class="size-4.5" />
          </button>
          <template #fallback>
            <div class="size-9 rounded-full border border-default/60 bg-elevated/40" aria-hidden="true" />
          </template>
        </ClientOnly>

        <UserMenu />

        <button
          type="button"
          class="flex size-9 items-center justify-center rounded-full border border-default/60 bg-elevated/40 text-muted transition-all duration-300 ease-lab hover:border-accent/55 hover:text-accent active:scale-95 md:hidden"
          :aria-label="mobileOpen ? 'Close navigation menu' : 'Open navigation menu'"
          :aria-expanded="mobileOpen"
          aria-controls="mobile-nav"
          @click="mobileOpen = !mobileOpen"
        >
          <UIcon :name="mobileOpen ? 'i-lucide-x' : 'i-lucide-menu'" class="size-4.5" />
        </button>
      </div>
    </div>

    <Transition name="mobile-nav">
      <nav
        v-show="mobileOpen"
        id="mobile-nav"
        aria-label="Mobile"
        class="overflow-hidden border-t border-default/60 bg-default/85 backdrop-blur-xl md:hidden"
      >
        <ul class="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
          <li v-for="link in links" :key="link.to">
            <NuxtLink
              :to="link.to"
              class="flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-muted transition-colors duration-300 hover:bg-elevated/60 hover:text-highlighted"
            >
              <UIcon :name="link.icon" class="size-4.5 text-accent" />
              {{ link.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </Transition>

    <div aria-hidden="true" class="rule-gradient absolute inset-x-0 bottom-0 opacity-30" />
  </header>
</template>

<style scoped>
.mobile-nav-enter-active,
.mobile-nav-leave-active {
  transition:
    max-height 0.4s var(--ease-lab),
    opacity 0.3s var(--ease-lab);
  max-height: 20rem;
}

.mobile-nav-enter-from,
.mobile-nav-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
