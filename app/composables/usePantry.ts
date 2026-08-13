const PANTRY_COOKIE = 'pantry'
const PANTRY_MAX_AGE = 15552000

export function usePantry() {
  const cookie = useCookie<string[]>(PANTRY_COOKIE, {
    default: () => [],
    maxAge: PANTRY_MAX_AGE,
  })

  const stored = useState<string[]>(PANTRY_COOKIE, () => [...(cookie.value ?? [])])

  const slugs = computed<string[]>({
    get: () => stored.value,
    set: (value) => {
      const next = [...new Set(value)]
      stored.value = next
      cookie.value = next
    },
  })

  function has(slug: string): boolean {
    return stored.value.includes(slug)
  }

  function toggle(slug: string): void {
    slugs.value = has(slug)
      ? stored.value.filter(entry => entry !== slug)
      : [...stored.value, slug]
  }

  function clear(): void {
    slugs.value = []
  }

  const count = computed(() => stored.value.length)

  return { slugs, has, toggle, clear, count }
}
