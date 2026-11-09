import pandacss from '@pandacss/vite'
import { defineConfig } from 'vite'
import { qwikVite } from '@qwik.dev/core/optimizer'
import { qwikRouter } from '@qwik.dev/router/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(() => {
  return {
    plugins: [pandacss(), qwikRouter(), qwikVite(), tsconfigPaths()],
    preview: {
      headers: {
        'Cache-Control': 'public, max-age=600',
      },
    },
    resolve: {
      conditions: ['source'],
    },
  }
})
