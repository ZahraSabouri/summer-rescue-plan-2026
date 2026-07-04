import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localDataDir = path.resolve(__dirname, 'local-data')
const trackerStatePath = path.join(localDataDir, 'summer-rescue-tracker-state.json')

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function localTrackerStatePlugin() {
  async function handler(req, res, next) {
    if (req.url !== '/api/local-tracker-state') {
      next()
      return
    }

    if (req.method === 'GET') {
      try {
        const raw = await fs.readFile(trackerStatePath, 'utf8')
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(raw)
      } catch (error) {
        if (error.code === 'ENOENT') {
          res.statusCode = 204
          res.end()
          return
        }
        sendJson(res, 500, { ok: false, error: error.message })
      }
      return
    }

    if (req.method === 'PUT') {
      try {
        const raw = await readRequestBody(req)
        const payload = JSON.parse(raw)
        await fs.mkdir(localDataDir, { recursive: true })
        const tmpPath = `${trackerStatePath}.tmp`
        await fs.writeFile(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
        await fs.rename(tmpPath, trackerStatePath)
        sendJson(res, 200, { ok: true, savedAt: new Date().toISOString(), path: trackerStatePath })
      } catch (error) {
        sendJson(res, 400, { ok: false, error: error.message })
      }
      return
    }

    res.statusCode = 405
    res.setHeader('Allow', 'GET, PUT')
    res.end()
  }

  return {
    name: 'summer-rescue-local-tracker-state',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localTrackerStatePlugin()],
})
