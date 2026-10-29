import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // App version (from package.json) exposed to the footer; bumped on release.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    rollupOptions: {
      output: {
        // Split into independently-cached chunks by how often each changes:
        //   motion — the animation library (largest dependency, rarely changes)
        //   vendor — the rest of node_modules (react/router, rarely changes)
        //   app code splits per-route via React.lazy (see App.tsx)
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('framer-motion') ||
              id.includes('motion-dom') ||
              id.includes('motion-utils')
            )
              return 'motion'
            return 'vendor'
          }
        },
      },
    },
  },
})
