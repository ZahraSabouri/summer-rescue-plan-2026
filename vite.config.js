import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
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
})
