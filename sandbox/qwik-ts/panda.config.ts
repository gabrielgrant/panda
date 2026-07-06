import { defineConfig } from '@pandacss/dev'

export default defineConfig({
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ['./src/**/*.{js,jsx,ts,tsx}', './pages/**/*.{js,jsx,ts,tsx}'],

  // Files to exclude
  exclude: [],

  // The output directory for your css system
  outdir: 'styled-system',

  // The jsx framework to use
  jsxFramework: 'qwik',

  theme: {
    extend: {
      slotRecipes: {
        card: {
          className: 'card',
          slots: ['root', 'title', 'body'],
          base: {
            root: { padding: '6', borderRadius: 'lg', bg: 'white', color: 'gray.900' },
            title: { fontWeight: 'bold' },
            body: { color: 'gray.600' },
          },
          variants: {
            size: {
              md: { root: { fontSize: 'md' }, title: { fontSize: 'lg' } },
              lg: { root: { fontSize: 'lg' }, title: { fontSize: '2xl' } },
            },
          },
          defaultVariants: { size: 'md' },
        },
      },
    },
  },
})
