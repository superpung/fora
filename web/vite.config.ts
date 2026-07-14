import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The conference dataset alone is ~230 kB gzip of irreducible content and
    // lives in its own `data` chunk, so the default 500 kB warning would fire
    // on data, not on avoidable code bloat. Set the limit above the data chunk.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split into independently-cached chunks by how often each changes:
        //   data   — the conference JSON (changes only when the dataset is rebuilt)
        //   motion — the animation library (largest dependency, rarely changes)
        //   vendor — the rest of node_modules (react/router, rarely changes)
        //   app code splits per-route via React.lazy (see App.tsx)
        manualChunks(id) {
          if (id.includes('src/data/conference.json')) return 'data'
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
