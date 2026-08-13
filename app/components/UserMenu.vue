<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { SessionUser } from '#shared/types/auth'

const { loggedIn, user, clear } = useUserSession()

const profile = computed<SessionUser | null>(() => user.value ?? null)
const initial = computed(() => (profile.value?.name || profile.value?.email || '?').trim().charAt(0).toUpperCase())

async function signOut() {
  await clear()
  await navigateTo('/')
}

const items = computed<DropdownMenuItem[][]>(() => [
  [{
    label: profile.value?.name || 'Signed in',
    description: profile.value?.email,
    type: 'label'
  }],
  [{
    label: 'Your bar',
    icon: 'i-lucide-martini',
    to: '/me'
  }],
  [{
    label: 'Sign out',
    icon: 'i-lucide-log-out',
    color: 'error',
    onSelect: () => { void signOut() }
  }]
])
</script>

<template>
  <UDropdownMenu
    v-if="loggedIn"
    :items="items"
    :content="{ align: 'end', sideOffset: 10 }"
    :ui="{ content: 'glass-panel-strong backdrop-blur-xl' }"
  >
    <button
      type="button"
      class="group flex size-9 items-center justify-center rounded-full border border-default/70 bg-gradient-to-br from-lab-amber/80 via-lab-rose/70 to-lab-violet/80 text-sm font-semibold text-ink-950 transition-transform duration-300 ease-lab hover:scale-105 active:scale-95"
      :aria-label="`Account menu for ${profile?.name || profile?.email || 'your account'}`"
    >
      {{ initial }}
    </button>
  </UDropdownMenu>

  <div v-else class="flex items-center gap-2">
    <NuxtLink
      to="/login"
      class="nav-link hidden items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-muted transition-colors duration-300 hover:text-highlighted sm:inline-flex"
    >
      <UIcon name="i-lucide-user-round" class="size-4" />
      Sign in
    </NuxtLink>

    <UButton
      to="/register"
      size="sm"
      color="primary"
      class="rounded-full px-3.5 font-semibold"
    >
      Join
    </UButton>
  </div>
</template>
