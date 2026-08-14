import withNuxt from './.nuxt/eslint.config.mjs'
import vuejsAccessibility from 'eslint-plugin-vuejs-accessibility'

export default withNuxt(
  ...vuejsAccessibility.configs['flat/recommended'],
  {
    name: 'cocktail-lab/house-style',
    rules: {
      'vue/max-attributes-per-line': 'off',
      '@stylistic/quote-props': ['error', 'as-needed'],
      'vuejs-accessibility/label-has-for': ['error', { required: { some: ['nesting', 'id'] } }]
    }
  },
  {
    name: 'cocktail-lab/og-image-components',
    files: ['app/components/OgImage/**'],
    rules: {
      ...Object.fromEntries(
        Object.keys(vuejsAccessibility.rules).map(rule => [`vuejs-accessibility/${rule}`, 'off'])
      )
    }
  }
)
