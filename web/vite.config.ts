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
    // The conference dataset alone is ~230 kB gzip of irreducible content and
    // lives in its own `data` chunk, so the default 500 kB warning would fire
    // on data, not on avoidable code bloat. Set the limit above the data chunk.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Emit each per-conference dataset chunk under assets/data/ so the
        // service worker can tell datasets apart from app code — it precaches the
        // app shell but runtime-caches datasets on first visit (see scripts/build-sw.mjs).
        chunkFileNames: (info) =>
          (info.facadeModuleId ?? "").includes("/src/data/conferences/")
            ? "assets/data/[name]-[hash].js"
            : "assets/[name]-[hash].js",
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
