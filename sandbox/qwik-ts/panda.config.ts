export default {
  presets: ['@pandacss/preset-base', '@pandacss/preset-panda'],

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
      recipes: {
        badge: {
          className: 'badge',
          base: { px: '2', borderRadius: 'full' },
          variants: {
            tone: {
              info: { bg: 'blue.200', color: 'blue.900' },
              danger: { bg: 'red.200', color: 'red.900' },
            },
          },
          defaultVariants: { tone: 'info' },
        },
      },
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
}
