<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

useSeoMeta({
  title: 'Sign in',
  description: 'Sign in to Cocktail Lab to keep your favourite cocktails and tasting notes in one place.',
  robots: 'noindex'
})

const route = useRoute()
const { loggedIn, fetch: refreshSession } = useUserSession()
const { mergeGuestToAccount } = useFavorites()
const { mergeGuestPantry } = usePantry()

const schema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password')
})

type Schema = z.output<typeof schema>

const state = reactive({ email: '', password: '' })
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

  if (status === 401) {
    errorTitle.value = 'Invalid email or password.'
  }
  else if (status === 429) {
    errorTitle.value = 'Too many attempts — wait a few minutes.'
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
    await $fetch('/api/auth/login', { method: 'POST', body: event.data })
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
    title="Welcome back"
    subtitle="Sign in to pick up your saved cocktails and tasting notes exactly where you left them."
  >
    <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
      <AuthAlert v-if="errorTitle" :title="errorTitle" :issues="errorIssues" />

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
        <AuthPasswordInput v-model="state.password" autocomplete="current-password" />
      </UFormField>

      <UButton
        type="submit"
        size="lg"
        color="primary"
        block
        :loading="submitting"
        trailing-icon="i-lucide-arrow-right"
        class="glow-amber rounded-full font-semibold"
      >
        Sign in
      </UButton>
    </UForm>

    <template #footer>
      New here?
      <NuxtLink
        :to="{ path: '/register', query: redirectQuery }"
        class="nav-link font-medium text-accent"
      >
        Create an account
      </NuxtLink>
    </template>
  </AuthCard>
</template>
