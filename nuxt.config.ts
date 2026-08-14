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
  routeRules: {
    '/cocktails/**': { isr: 3600 },
    '/ingredients/**': { isr: 3600 },
    '/me': { ssr: true, robots: false },
    '/login': { ssr: true, robots: false },
    '/register': { ssr: true, robots: false }
  },
  sitemap: {
    sources: ['/api/__sitemap__/urls'],
    exclude: ['/me', '/login', '/register']
  },
  robots: {
    disallow: ['/me', '/login', '/register', '/api']
  },
  linkChecker: { enabled: false },
  icon: {
    serverBundle: { collections: ['lucide'] },
    clientBundle: { scan: true, sizeLimitKb: 512 }
  },
  image: {
    domains: ['www.thecocktaildb.com'],
    format: ['webp'],
    quality: 78
  },
  vite: {
    server: {
      watch: { usePolling: true }
    }
  }
})
