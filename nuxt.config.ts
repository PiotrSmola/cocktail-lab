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
  fonts: {
    families: [
      { name: 'Inter', provider: 'google', weights: [400, 500, 600, 700], global: true },
      { name: 'Fraunces', provider: 'google', weights: [400, 600], global: true }
    ]
  },
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
    '/me': { ssr: true, robots: false, ogImage: false },
    '/login': { ssr: true, robots: false, ogImage: false },
    '/register': { ssr: true, robots: false, ogImage: false },
    '/': {
      ogImage: {
        component: 'Default',
        props: {
          title: 'Cocktail Lab',
          description: 'A craft cocktail encyclopedia with pantry matching and bartender maths.'
        }
      }
    },
    '/cocktails': {
      ogImage: {
        component: 'Default',
        props: {
          title: 'The cocktail catalog',
          description: 'Filter every drink by spirit, category, glass or ingredient, then pour it.'
        }
      }
    },
    '/ingredients': {
      ogImage: {
        component: 'Default',
        props: {
          title: 'The ingredient shelf',
          description: 'Every bottle, mixer and garnish, with the drinks each one unlocks.'
        }
      }
    },
    '/pantry': {
      ogImage: {
        component: 'Default',
        props: {
          title: 'Your pantry',
          description: 'Tick what you own and see what you can pour right now, plus the bottle that unlocks the most.'
        }
      }
    }
  },
  ogImage: {
    defaults: {
      width: 1200,
      height: 630,
      extension: 'png',
      emojis: false
    },
    fontSubsets: ['latin'],
    security: {
      secret: process.env.NUXT_OG_IMAGE_SECRET || 'cocktail-lab-og-image-local'
    }
  },
  sitemap: {
    sources: ['/api/__sitemap__/urls'],
    exclude: ['/me', '/login', '/register']
  },
  robots: {
    disallow: ['/me', '/login', '/register', '/api/*']
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
