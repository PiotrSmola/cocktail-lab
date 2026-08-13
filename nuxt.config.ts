export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: [
    '@nuxt/ui',
    '@nuxt/image',
    '@vueuse/nuxt',
    '@vueuse/motion/nuxt',
    'nuxt-auth-utils',
    '@nuxtjs/seo'
  ],
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'dark',
    fallback: 'dark'
  },
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    name: 'Cocktail Lab',
    description: 'Craft cocktail encyclopedia, pantry matcher and bartender calculator built with Nuxt 4.'
  },
  linkChecker: { enabled: false },
  image: {
    domains: ['www.thecocktaildb.com']
  },
  vite: {
    server: {
      watch: { usePolling: true }
    }
  }
})
