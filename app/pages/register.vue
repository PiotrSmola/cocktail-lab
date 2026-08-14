<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

useSeoMeta({
  title: 'Create an account',
  description: 'Create a Cocktail Lab account to save favourites, keep tasting notes and carry your bar between devices.',
  robots: 'noindex'
})

const route = useRoute()
const { loggedIn, fetch: refreshSession } = useUserSession()
const { mergeGuestToAccount, count: guestCount } = useFavorites()
const { mergeGuestPantry, count: guestPantryCount } = usePantry()

const schema = z.object({
  name: z.string().trim().min(1, 'Tell us what to call you').max(50, 'Keep it under 50 characters'),
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'At least 8 characters').max(72, 'At most 72 characters'),
  confirm: z.string().min(1, 'Repeat your password')
}).refine(data => data.password === data.confirm, {
  message: 'Passwords do not match',
  path: ['confirm']
})

type Schema = z.output<typeof schema>

const state = reactive({ name: '', email: '', password: '', confirm: '' })
const submitting = ref(false)
const errorTitle = ref('')
const errorIssues = ref<string[]>([])

const redirectQuery = computed(() => (typeof route.query.redirect === 'string' ? { redirect: route.query.redirect } : undefined))

const redirectTarget = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : '/me'
})

watchEffect(() => {
  if (submitting.value || !loggedIn.value) {
    return
  }

  void navigateTo(redirectTarget.value, { replace: true })
})

interface FieldIssue {
  path?: (string | number)[]
  message?: string
}

interface ApiError {
  status?: number
  statusCode?: number
  data?: {
    message?: string
    data?: { issues?: FieldIssue[], message?: string }
  }
}

function statusOf(error: unknown): number {
  const candidate = error as ApiError | null
  return candidate?.status ?? candidate?.statusCode ?? 0
}

function parseIssues(value: unknown): FieldIssue[] | null {
  if (typeof value !== 'string' || !value.trimStart().startsWith('[')) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed as FieldIssue[] : null
  }
  catch {
    return null
  }
}

function issuesOf(error: unknown): string[] {
  const body = (error as ApiError | null)?.data
  const raw = body?.data?.issues ?? parseIssues(body?.data?.message) ?? parseIssues(body?.message)

  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((issue) => {
      if (typeof issue?.message !== 'string') {
        return ''
      }
      const field = issue.path?.[0]
      return field ? `${String(field)} — ${issue.message}` : issue.message
    })
    .filter(message => message.length > 0)
}

function applyError(error: unknown) {
  const status = statusOf(error)

  if (status === 409) {
    errorTitle.value = 'That email is already registered.'
  }
  else if (status === 429) {
    errorTitle.value = 'Too many attempts — wait a few minutes.'
  }
  else if (status === 401) {
    errorTitle.value = 'Invalid email or password.'
  }
  else if (status === 400) {
    const issues = issuesOf(error)
    errorTitle.value = issues.length > 0 ? 'Check the details below.' : 'Those details do not look right.'
    errorIssues.value = issues
  }
  else {
    errorTitle.value = 'Could not reach the bar. Check your connection and try again.'
  }
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  submitting.value = true
  errorTitle.value = ''
  errorIssues.value = []

  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: { name: event.data.name, email: event.data.email, password: event.data.password }
    })
  }
  catch (error) {
    applyError(error)
    submitting.value = false
    return
  }

  await refreshSession()
  await mergeGuestToAccount().catch(() => undefined)
  await mergeGuestPantry().catch(() => undefined)
  await navigateTo(redirectTarget.value, { replace: true })
  submitting.value = false
}
</script>

<template>
  <AuthCard
    eyebrow="Cocktail Lab"
    title="Join the lab"
    subtitle="Save the drinks you love, keep tasting notes on every experiment, and take your bar with you."
  >
    <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
      <AuthAlert v-if="errorTitle" :title="errorTitle" :issues="errorIssues" />

      <UFormField label="Name" name="name">
        <UInput
          v-model="state.name"
          type="text"
          icon="i-lucide-user-round"
          placeholder="Ada Bartender"
          autocomplete="name"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Email" name="email">
        <UInput
          v-model="state.email"
          type="email"
          icon="i-lucide-mail"
          placeholder="you@example.com"
          autocomplete="email"
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Password" name="password">
        <AuthPasswordInput v-model="state.password" autocomplete="new-password" />
        <AuthStrengthMeter :password="state.password" />
      </UFormField>

      <UFormField label="Confirm password" name="confirm">
        <AuthPasswordInput v-model="state.confirm" autocomplete="new-password" />
      </UFormField>

      <p v-if="guestCount > 0" class="flex items-start gap-2 text-xs text-muted">
        <UIcon name="i-lucide-heart" class="mt-0.5 size-3.5 shrink-0 text-accent-rose" />
        <span>{{ guestCount }} cocktail{{ guestCount === 1 ? '' : 's' }} you already hearted will move into your new account.</span>
      </p>

      <p v-if="guestPantryCount > 0" class="flex items-start gap-2 text-xs text-muted">
        <UIcon name="i-lucide-refrigerator" class="mt-0.5 size-3.5 shrink-0 text-accent-mint" />
        <span>{{ guestPantryCount }} pantry ingredient{{ guestPantryCount === 1 ? '' : 's' }} will move across too, and stop living in a cookie.</span>
      </p>

      <UButton
        type="submit"
        size="lg"
        color="primary"
        block
        :loading="submitting"
        trailing-icon="i-lucide-arrow-right"
        class="glow-amber rounded-full font-semibold"
      >
        Create account
      </UButton>
    </UForm>

    <template #footer>
      Already have an account?
      <NuxtLink
        :to="{ path: '/login', query: redirectQuery }"
        class="nav-link font-medium text-accent"
      >
        Sign in
      </NuxtLink>
    </template>

    <template #fine>
      Cocktail Lab is a local portfolio project. Accounts stay on this machine, no real emails are ever sent,
      and nothing is shared with anyone.
    </template>
  </AuthCard>
</template>
