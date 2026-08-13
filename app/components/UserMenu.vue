<script setup lang="ts">
const { loggedIn, user, clear } = useUserSession()

const profile = computed(() => (user.value ?? null) as { name?: string, email?: string } | null)
const initial = computed(() => (profile.value?.name || profile.value?.email || '?').trim().charAt(0).toUpperCase())

async function signOut() {
  await clear()
  await navigateTo('/')
}

const items = computed(() => [
  [{
    label: profile.value?.name || 'Signed in',
    description: profile.value?.email,
    type: 'label' as const
  }],
  [{
    label: 'My bar',
    icon: 'i-lucide-flask-conical',
    to: '/me'
  }],
  [{
    label: 'Sign out',
    icon: 'i-lucide-log-out',
    color: 'error' as const,
    onSelect: () => { void signOut() }
  }]
])
</script>

<template>
  <ClientOnly>
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

    <NuxtLink
      v-else
      to="/login"
      class="nav-link inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-muted transition-colors duration-300 hover:text-highlighted"
    >
      <UIcon name="i-lucide-user-round" class="size-4" />
      Sign in
    </NuxtLink>

    <template #fallback>
      <div class="size-9 rounded-full border border-default/60 bg-elevated/50" aria-hidden="true" />
    </template>
  </ClientOnly>
</template>
