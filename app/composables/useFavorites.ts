const GUEST_COOKIE = 'guest-favorites'
const GUEST_MAX_AGE = 15552000
const ACCOUNT_STATE = 'account-favorites'
const ACCOUNT_LOADED_STATE = 'account-favorites-loaded'

interface FavoritesResponse {
  items: { id: number }[]
}

export function useFavorites() {
  const { loggedIn } = useUserSession()

  const guestCookie = useCookie<number[]>(GUEST_COOKIE, {
    default: () => [],
    maxAge: GUEST_MAX_AGE,
  })

  const guestIds = useState<number[]>(GUEST_COOKIE, () => [...(guestCookie.value ?? [])])
  const accountIds = useState<number[]>(ACCOUNT_STATE, () => [])
  const accountLoaded = useState<boolean>(ACCOUNT_LOADED_STATE, () => false)

  function setGuestIds(value: number[]): void {
    const next = [...new Set(value)]
    guestIds.value = next
    guestCookie.value = next
  }

  const ids = computed<number[]>({
    get: () => (loggedIn.value ? accountIds.value : guestIds.value),
    set: (value) => {
      if (loggedIn.value) {
        accountIds.value = [...new Set(value)]
        return
      }
      setGuestIds(value)
    },
  })

  const count = computed(() => ids.value.length)

  function isFavorite(id: number): boolean {
    return ids.value.includes(id)
  }

  async function loadAccountFavorites(): Promise<void> {
    accountLoaded.value = true
    const response = await $fetch<FavoritesResponse>('/api/favorites').catch(() => null)
    if (response) {
      accountIds.value = response.items.map(item => item.id)
    }
  }

  async function refresh(): Promise<void> {
    if (loggedIn.value) {
      await loadAccountFavorites()
      return
    }
    guestIds.value = [...(guestCookie.value ?? [])]
  }

  async function toggle(id: number): Promise<void> {
    if (!loggedIn.value) {
      setGuestIds(isFavorite(id) ? guestIds.value.filter(entry => entry !== id) : [id, ...guestIds.value])
      return
    }

    const previous = [...accountIds.value]
    const adding = !previous.includes(id)
    accountIds.value = adding ? [id, ...previous] : previous.filter(entry => entry !== id)

    try {
      if (adding) {
        await $fetch('/api/favorites', { method: 'POST', body: { cocktailId: id } })
      }
      else {
        await $fetch(`/api/favorites/${id}`, { method: 'DELETE' })
      }
    }
    catch {
      accountIds.value = previous
    }
  }

  async function mergeGuestToAccount(): Promise<void> {
    const cocktailIds = [...guestIds.value]
    if (cocktailIds.length === 0) {
      return
    }

    try {
      await $fetch('/api/favorites/merge', { method: 'POST', body: { cocktailIds } })
    }
    catch {
      return
    }

    setGuestIds([])
    await loadAccountFavorites()
  }

  if (import.meta.client && loggedIn.value && !accountLoaded.value) {
    void loadAccountFavorites()
  }

  return { ids, isFavorite, toggle, count, refresh, mergeGuestToAccount }
}
