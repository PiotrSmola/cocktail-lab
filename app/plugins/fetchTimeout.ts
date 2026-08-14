const FETCH_TIMEOUT_MS = 10_000

// Wrap the global $fetch with a timeout so a hanging request surfaces
// as an error (pages already render error/empty states) instead of an
// infinite loading spinner.
export default defineNuxtPlugin({
  name: 'fetch-timeout',
  enforce: 'pre',
  setup() {
    globalThis.$fetch = $fetch.create({ timeout: FETCH_TIMEOUT_MS })
  }
})
