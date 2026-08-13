<script setup lang="ts">
withDefaults(defineProps<{
  placeholder?: string
  autocomplete?: string
}>(), {
  placeholder: '••••••••',
  autocomplete: 'current-password'
})

const model = defineModel<string>({ default: '' })
const visible = ref(false)
</script>

<template>
  <UInput
    v-model="model"
    :type="visible ? 'text' : 'password'"
    icon="i-lucide-lock"
    :placeholder="placeholder"
    :autocomplete="autocomplete"
    size="lg"
    class="w-full"
    :ui="{ trailing: 'pe-1.5' }"
  >
    <template #trailing>
      <UButton
        type="button"
        color="neutral"
        variant="ghost"
        size="xs"
        :icon="visible ? 'i-lucide-eye-off' : 'i-lucide-eye'"
        :aria-label="visible ? 'Hide password' : 'Show password'"
        :aria-pressed="visible"
        @click="visible = !visible"
      />
    </template>
  </UInput>
</template>
