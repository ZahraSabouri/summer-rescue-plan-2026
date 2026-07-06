import { Buffer } from 'node:buffer'
import fs from 'node:fs/promises'
import path from 'node:path'

const STATE_ENDPOINTS = new Set(['/api/local-tracker-state', '/api/state'])

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function routePath(url = '') {
  return url.split('?')[0]
}

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function makeEventId() {
  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normaliseEvent(payload) {
  const now = new Date().toISOString()
  return {
    id: payload?.id || makeEventId(),
    occurredAt: payload?.occurredAt || payload?.occurred_at || now,
    entityType: payload?.entityType || payload?.entity_type || 'tracker',
    entityId: payload?.entityId || payload?.entity_id || 'state',
    eventType: payload?.eventType || payload?.event_type || 'state.updated',
    payload: payload?.payload ?? {},
  }
}

function resolveLocalPaths(options = {}) {
  const projectRoot = options.projectRoot ? path.resolve(options.projectRoot) : path.resolve('.')
  const localDataDir = options.localDataDir ? path.resolve(options.localDataDir) : path.join(projectRoot, 'local-data')
  return {
    projectRoot,
    localDataDir,
    trackerStatePath: options.trackerStatePath ?? path.join(localDataDir, 'summer-rescue-tracker-state.json'),
    progressLogPath: options.progressLogPath ?? path.join(localDataDir, 'progress-log.ndjson'),
  }
}

async function readRecentEvents(progressLogPath, limit = 200) {
  try {
    const raw = await fs.readFile(progressLogPath, 'utf8')
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-limit)
      .map((line) => JSON.parse(line))
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

export function createLocalTrackerApi(options = {}) {
  const paths = resolveLocalPaths(options)

  return async function localTrackerApi(req, res, next) {
    const pathname = routePath(req.url)

    if (pathname === '/api/health') {
      sendJson(res, 200, {
        ok: true,
        app: 'summer-rescue-plan-app',
        storage: 'local-file',
        localDataDir: paths.localDataDir,
        statePath: paths.trackerStatePath,
        progressLogPath: paths.progressLogPath,
        endpoints: ['/api/health', '/api/state', '/api/local-tracker-state', '/api/events'],
      })
      return
    }

    if (STATE_ENDPOINTS.has(pathname)) {
      if (req.method === 'GET') {
        try {
          const raw = await fs.readFile(paths.trackerStatePath, 'utf8')
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
          await fs.mkdir(paths.localDataDir, { recursive: true })
          const tmpPath = `${paths.trackerStatePath}.tmp`
          await fs.writeFile(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
          await fs.rename(tmpPath, paths.trackerStatePath)
          sendJson(res, 200, { ok: true, savedAt: new Date().toISOString(), path: paths.trackerStatePath })
        } catch (error) {
          sendJson(res, 400, { ok: false, error: error.message })
        }
        return
      }

      res.statusCode = 405
      res.setHeader('Allow', 'GET, PUT')
      res.end()
      return
    }

    if (pathname === '/api/events') {
      if (req.method === 'GET') {
        try {
          sendJson(res, 200, { ok: true, events: await readRecentEvents(paths.progressLogPath) })
        } catch (error) {
          sendJson(res, 500, { ok: false, error: error.message })
        }
        return
      }

      if (req.method === 'POST') {
        try {
          const raw = await readRequestBody(req)
          const event = normaliseEvent(JSON.parse(raw))
          await fs.mkdir(paths.localDataDir, { recursive: true })
          await fs.appendFile(paths.progressLogPath, `${JSON.stringify(event)}\n`, 'utf8')
          sendJson(res, 201, { ok: true, event })
        } catch (error) {
          sendJson(res, 400, { ok: false, error: error.message })
        }
        return
      }

      res.statusCode = 405
      res.setHeader('Allow', 'GET, POST')
      res.end()
      return
    }

    if (typeof next === 'function') next()
  }
}

export function localTrackerStatePlugin(options = {}) {
  const handler = createLocalTrackerApi(options)

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
