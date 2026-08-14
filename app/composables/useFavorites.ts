import { GUEST_FAVORITES_LIMIT, addWithinLimit, capList, withoutEntry } from '#shared/utils/pantryCookie'

const GUEST_COOKIE = 'guest-favorites'
const GUEST_MAX_AGE = 15552000
const ACCOUNT_STATE = 'account-favorites'
const ACCOUNT_LOADED_STATE = 'account-favorites-loaded'

interface FavoritesResponse {
  items: { id: number }[]
}

export function useFavorites() {
  const { loggedIn } = useUserSession()
  const toast = useToast()

  const guestCookie = useCookie<number[]>(GUEST_COOKIE, {
    default: () => [],
    maxAge: GUEST_MAX_AGE,
  })

  const guestIds = useState<number[]>(GUEST_COOKIE, () => capList(guestCookie.value ?? [], GUEST_FAVORITES_LIMIT))
  const accountIds = useState<number[]>(ACCOUNT_STATE, () => [])
  const accountLoaded = useState<boolean>(ACCOUNT_LOADED_STATE, () => false)

  function setGuestIds(value: number[]): void {
    const next = capList(value, GUEST_FAVORITES_LIMIT)
    guestIds.value = next
    guestCookie.value = next
  }

  function warnLimitReached(): void {
    toast.add({
      title: 'Guest favourites are full',
      description: `A browser cookie holds ${GUEST_FAVORITES_LIMIT} cocktails. Sign in to save as many as you like on every device.`,
      icon: 'i-lucide-heart',
      color: 'warning',
      actions: [{ label: 'Sign in', to: '/login', color: 'neutral', variant: 'outline' }],
    })
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
    guestIds.value = capList(guestCookie.value ?? [], GUEST_FAVORITES_LIMIT)
  }

  async function toggle(id: number): Promise<void> {
    if (!loggedIn.value) {
      if (guestIds.value.includes(id)) {
        setGuestIds(withoutEntry(guestIds.value, id))
        return
      }

      const { values, capped } = addWithinLimit(guestIds.value, id, GUEST_FAVORITES_LIMIT, true)

      if (capped) {
        warnLimitReached()
        return
      }

      setGuestIds(values)
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

  if (import.meta.client) {
    if (loggedIn.value && !accountLoaded.value) {
      void loadAccountFavorites()
    }
    else if (!loggedIn.value && (guestCookie.value?.length ?? 0) > GUEST_FAVORITES_LIMIT) {
      setGuestIds(guestCookie.value ?? [])
    }
  }

  return { ids, isFavorite, toggle, count, refresh, mergeGuestToAccount }
}
