import type { PantryListResponse, PantryMergeResponse } from '#shared/types/pantryAccount'
import { usePantryNames } from '~/components/pantry/usePantryNames'
import {
  GUEST_PANTRY_LIMIT,
  addWithinLimit,
  buildMergeSlugs,
  capList,
  indexIngredientIds,
  withoutEntry
} from '#shared/utils/pantryCookie'

const PANTRY_COOKIE = 'pantry'
const PANTRY_MAX_AGE = 15552000
const ACCOUNT_STATE = 'account-pantry'
const ACCOUNT_INDEX_STATE = 'account-pantry-index'
const ACCOUNT_LOADED_STATE = 'account-pantry-loaded'

export function usePantry() {
  const { loggedIn } = useUserSession()
  const { remember } = usePantryNames()
  const toast = useToast()
  const requestFetch = useRequestFetch()

  const cookie = useCookie<string[]>(PANTRY_COOKIE, {
    default: () => [],
    maxAge: PANTRY_MAX_AGE
  })

  const guestSlugs = useState<string[]>(PANTRY_COOKIE, () => capList(cookie.value ?? [], GUEST_PANTRY_LIMIT))
  const accountSlugs = useState<string[]>(ACCOUNT_STATE, () => [])
  const accountIndex = useState<Record<string, number>>(ACCOUNT_INDEX_STATE, () => ({}))
  const accountLoaded = useState<boolean>(ACCOUNT_LOADED_STATE, () => false)

  function setGuestSlugs(value: string[]): void {
    const next = capList(value, GUEST_PANTRY_LIMIT)
    guestSlugs.value = next
    cookie.value = next
  }

  const slugs = computed<string[]>({
    get: () => (loggedIn.value ? accountSlugs.value : guestSlugs.value),
    set: (value) => {
      if (loggedIn.value) {
        accountSlugs.value = [...new Set(value)]
        return
      }
      setGuestSlugs(value)
    }
  })

  const count = computed(() => slugs.value.length)
  const synced = computed(() => loggedIn.value)
  const atLimit = computed(() => !loggedIn.value && guestSlugs.value.length >= GUEST_PANTRY_LIMIT)

  function has(slug: string): boolean {
    return slugs.value.includes(slug)
  }

  function rememberIds(items: { id: number, slug: string }[]): void {
    if (items.length === 0) {
      return
    }
    accountIndex.value = { ...accountIndex.value, ...indexIngredientIds(items) }
  }

  function warnLimitReached(): void {
    toast.add({
      title: 'Guest pantry is full',
      description: `A browser cookie holds ${GUEST_PANTRY_LIMIT} ingredients. Sign in for an unlimited pantry that follows you across devices.`,
      icon: 'i-lucide-refrigerator',
      color: 'warning',
      actions: [{ label: 'Sign in', to: '/login?redirect=/pantry', color: 'neutral', variant: 'outline' }]
    })
  }

  async function loadIndex(): Promise<void> {
    const response = await requestFetch<PantryListResponse>('/api/pantry')
    accountIndex.value = indexIngredientIds(response.items)
  }

  async function loadAccountPantry(): Promise<void> {
    accountLoaded.value = true
    const response = await requestFetch<PantryListResponse>('/api/pantry').catch(() => null)
    if (!response) {
      return
    }
    accountSlugs.value = response.items.map(item => item.slug)
    accountIndex.value = indexIngredientIds(response.items)
    remember(response.items.map(item => ({ slug: item.slug, name: item.name, imageUrl: item.imageUrl })))
  }

  async function addToAccount(slug: string): Promise<void> {
    const known = accountIndex.value[slug]

    if (known !== undefined) {
      await $fetch('/api/pantry', { method: 'POST', body: { ingredientId: known } })
      return
    }

    const response = await $fetch<PantryMergeResponse>('/api/pantry/merge', {
      method: 'POST',
      body: { slugs: [slug] }
    })

    if (response.merged === 0) {
      throw new Error(`Unknown ingredient: ${slug}`)
    }

    await loadIndex()
  }

  async function removeFromAccount(slug: string): Promise<void> {
    let known = accountIndex.value[slug]

    if (known === undefined) {
      await loadIndex()
      known = accountIndex.value[slug]
    }

    if (known === undefined) {
      return
    }

    await $fetch(`/api/pantry/${known}`, { method: 'DELETE' })
  }

  async function toggle(slug: string): Promise<void> {
    if (!loggedIn.value) {
      if (guestSlugs.value.includes(slug)) {
        setGuestSlugs(withoutEntry(guestSlugs.value, slug))
        return
      }

      const { values, capped } = addWithinLimit(guestSlugs.value, slug, GUEST_PANTRY_LIMIT)

      if (capped) {
        warnLimitReached()
        return
      }

      setGuestSlugs(values)
      return
    }

    const removing = accountSlugs.value.includes(slug)
    accountSlugs.value = removing
      ? withoutEntry(accountSlugs.value, slug)
      : [...accountSlugs.value, slug]

    try {
      if (removing) {
        await removeFromAccount(slug)
      }
      else {
        await addToAccount(slug)
      }
    }
    catch {
      if (removing) {
        accountSlugs.value = accountSlugs.value.includes(slug)
          ? accountSlugs.value
          : [...accountSlugs.value, slug]
      }
      else {
        accountSlugs.value = withoutEntry(accountSlugs.value, slug)
      }
    }
  }

  async function clearAccount(previous: string[]): Promise<void> {
    try {
      const response = await requestFetch<PantryListResponse>('/api/pantry')
      accountIndex.value = indexIngredientIds(response.items)
      await Promise.all(response.items.map(item => $fetch(`/api/pantry/${item.id}`, { method: 'DELETE' })))
    }
    catch {
      accountSlugs.value = previous
    }
  }

  function clear(): void {
    if (!loggedIn.value) {
      setGuestSlugs([])
      return
    }

    const previous = [...accountSlugs.value]
    accountSlugs.value = []
    void clearAccount(previous)
  }

  async function refresh(): Promise<void> {
    if (loggedIn.value) {
      await loadAccountPantry()
      return
    }
    guestSlugs.value = capList(cookie.value ?? [], GUEST_PANTRY_LIMIT)
  }

  async function hydrate(): Promise<void> {
    if (!loggedIn.value || accountLoaded.value) {
      return
    }
    await loadAccountPantry()
  }

  async function mergeGuestPantry(): Promise<void> {
    const pending = buildMergeSlugs(guestSlugs.value)

    if (pending.length > 0) {
      try {
        await $fetch('/api/pantry/merge', { method: 'POST', body: { slugs: pending } })
        setGuestSlugs([])
      }
      catch {
        return
      }
    }

    await loadAccountPantry()
  }

  if (import.meta.client) {
    if (loggedIn.value && !accountLoaded.value) {
      void loadAccountPantry()
    }
    else if (!loggedIn.value && (cookie.value?.length ?? 0) > GUEST_PANTRY_LIMIT) {
      setGuestSlugs(cookie.value ?? [])
    }
  }

  return {
    slugs,
    has,
    toggle,
    clear,
    count,
    synced,
    atLimit,
    guestLimit: GUEST_PANTRY_LIMIT,
    rememberIds,
    refresh,
    hydrate,
    mergeGuestPantry
  }
}
