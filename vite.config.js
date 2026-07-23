import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { localTrackerStatePlugin } from './src/server/localTrackerApi.js'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localTrackerStatePlugin({ projectRoot })],
  // In Docker (see Dockerfile.dev / docker-compose.yml), bind-mount file events
  // from a Windows/macOS host don't reach the Linux container, so fall back to
  // polling and bind to all interfaces. Gated behind VITE_DOCKER so native local
  // dev keeps using fast, event-based file watching on localhost.
  server: process.env.VITE_DOCKER
    ? { host: true, watch: { usePolling: true, interval: 100 } }
    : {},
  build: {
    rollupOptions: {
      output: {
        // React itself is a meaningful slice of the >500kB main-entry chunk
        // warning — split it into its own cacheable vendor chunk rather than
        // bundling it with app code that changes on every edit. This app
        // builds with Rolldown (Vite's Rust bundler), which — unlike classic
        // Rollup — requires manualChunks as a function, not an id-list object.
        manualChunks(id) {
          if (id.includes('node_modules/react-dom/') || id.includes('node_modules/react/')) {
            return 'vendor-react'
          }
        },
      },
    },
  },
})
