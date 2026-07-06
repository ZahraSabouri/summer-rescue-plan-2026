import { Buffer } from 'node:buffer'
import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

const STATE_ENDPOINTS = new Set(['/api/local-tracker-state', '/api/state'])
const MAX_STATE_BYTES = 15 * 1024 * 1024
const MAX_EVENT_BYTES = 512 * 1024
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
const MAX_UPLOAD_BODY_BYTES = Math.ceil(MAX_UPLOAD_BYTES * 1.4) + 1024 * 1024

const CODE_TYPES = new Set([
  'py',
  'ipy',
  'js',
  'mjs',
  'jsx',
  'ts',
  'tsx',
  'r',
  'rmd',
  'java',
  'c',
  'h',
  'cpp',
  'cc',
  'cs',
  'sql',
  'sh',
  'bash',
  'json',
  'yaml',
  'yml',
  'toml',
  'css',
  'm',
  'rb',
  'go',
  'php',
  'scala',
  'jl',
])

function readRequestBody(req, maxBytes = MAX_STATE_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let byteLength = 0
    req.on('data', (chunk) => {
      byteLength += chunk.length
      if (byteLength > maxBytes) {
        const error = new Error(`Request body is larger than ${maxBytes} bytes`)
        error.statusCode = 413
        reject(error)
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
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

function sendError(res, error, fallbackStatus = 400) {
  sendJson(res, error.statusCode ?? fallbackStatus, { ok: false, error: error.message })
}

function makeEventId() {
  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function slug(value, fallback = 'resource') {
  const clean = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return clean || fallback
}

function safeFileName(value) {
  const parsed = path.parse(path.basename(String(value || 'resource.bin')))
  const name = (parsed.name || 'resource')
    .replace(/[^a-zA-Z0-9._ -]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
    .replace(/^\.+/, '')
  const ext = parsed.ext.replace(/[^a-zA-Z0-9.]+/g, '').slice(0, 24)
  return `${name || 'resource'}${ext || '.bin'}`
}

function fileType(filePath = '') {
  const extension = filePath.split('.').pop()?.toLowerCase() ?? ''
  if (extension === 'pdf') return 'PDF'
  if (extension === 'html' || extension === 'htm') return 'HTML'
  if (extension === 'md') return 'MD'
  if (extension === 'ipynb') return 'IPYNB'
  if (extension === 'csv') return 'CSV'
  if (extension === 'txt') return 'TXT'
  if (['mp4', 'webm', 'mov'].includes(extension)) return extension.toUpperCase()
  if (extension === 'docx') return 'DOCX'
  if (extension === 'zip') return 'ZIP'
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension)) return extension.toUpperCase()
  if (CODE_TYPES.has(extension)) return extension.toUpperCase()
  return 'FILE'
}

function viewerFor(filePath = '') {
  const type = fileType(filePath)
  if (['HTML', 'PDF'].includes(type)) return 'frame'
  if (type === 'MD') return 'markdown'
  if (['TXT', 'CSV'].includes(type)) return 'text'
  if (type === 'IPYNB') return 'notebook'
  if (['MP4', 'WEBM', 'MOV'].includes(type)) return 'video'
  if (['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF'].includes(type)) return 'image'
  const extension = filePath.split('.').pop()?.toLowerCase() ?? ''
  if (CODE_TYPES.has(extension)) return 'code'
  return 'file'
}

function contentTypeFor(filePath = '') {
  const extension = filePath.split('.').pop()?.toLowerCase() ?? ''
  const types = {
    csv: 'text/csv; charset=utf-8',
    gif: 'image/gif',
    htm: 'text/html; charset=utf-8',
    html: 'text/html; charset=utf-8',
    ipynb: 'application/json; charset=utf-8',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    js: 'text/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8',
    md: 'text/markdown; charset=utf-8',
    mov: 'video/quicktime',
    mp4: 'video/mp4',
    pdf: 'application/pdf',
    png: 'image/png',
    py: 'text/x-python; charset=utf-8',
    txt: 'text/plain; charset=utf-8',
    webm: 'video/webm',
    webp: 'image/webp',
    zip: 'application/zip',
  }
  return types[extension] ?? 'application/octet-stream'
}

function encodeResourceUrl(moduleDir, fileName) {
  return `/api/resources/file/${encodeURIComponent(moduleDir)}/${encodeURIComponent(fileName)}`
}

function normaliseEvent(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Event payload must be an object.')
  const eventType = payload.eventType || payload.event_type
  if (!eventType) throw new Error('Event payload must include eventType.')
  const now = new Date().toISOString()
  return {
    id: payload?.id || makeEventId(),
    occurredAt: payload?.occurredAt || payload?.occurred_at || now,
    entityType: payload?.entityType || payload?.entity_type || 'tracker',
    entityId: payload?.entityId || payload?.entity_id || 'state',
    eventType,
    payload: payload?.payload ?? {},
  }
}

function resolveLocalPaths(options = {}) {
  const projectRoot = options.projectRoot ? path.resolve(options.projectRoot) : path.resolve('.')
  const localDataDir = options.localDataDir ? path.resolve(options.localDataDir) : path.join(projectRoot, 'local-data')
  const resourceRootPath = options.resourceRootPath
    ? path.resolve(options.resourceRootPath)
    : path.join(localDataDir, 'resources')
  return {
    projectRoot,
    localDataDir,
    trackerStatePath: options.trackerStatePath ?? path.join(localDataDir, 'summer-rescue-tracker-state.json'),
    progressLogPath: options.progressLogPath ?? path.join(localDataDir, 'progress-log.ndjson'),
    resourceRootPath,
    resourceIndexPath: options.resourceIndexPath ?? path.join(resourceRootPath, 'resources.json'),
    dbPath: options.dbPath ?? path.join(localDataDir, 'app.sqlite'),
    dbEnabled: options.dbEnabled ?? true,
  }
}

async function readAllProgressEvents(progressLogPath) {
  try {
    const raw = await fs.readFile(progressLogPath, 'utf8')
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line)
        } catch {
          return null
        }
      })
      .filter(Boolean)
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

// Open the SQLite mirror for a single operation and always close it afterwards.
// Opening per request keeps the file unlocked between calls (important on
// Windows and for temp-directory test cleanup) and degrades gracefully if the
// runtime lacks node:sqlite support.
async function withTrackerDb(dbPath, run) {
  const mod = await import('./trackerDb.js')
  const db = mod.openTrackerDb(dbPath)
  try {
    return await run(db, mod)
  } finally {
    db.close()
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

async function readResourceIndex(resourceIndexPath) {
  try {
    const raw = await fs.readFile(resourceIndexPath, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : Array.isArray(parsed.resources) ? parsed.resources : []
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

async function writeResourceIndex(resourceIndexPath, resources) {
  await fs.mkdir(path.dirname(resourceIndexPath), { recursive: true })
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    resources,
  }
  await fs.writeFile(resourceIndexPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

async function uniqueFileTarget(moduleDirPath, requestedName) {
  const parsed = path.parse(requestedName)
  const baseName = parsed.name || 'resource'
  const extension = parsed.ext || '.bin'

  for (let counter = 0; counter < 1000; counter += 1) {
    const fileName = counter === 0 ? `${baseName}${extension}` : `${baseName}-${counter + 1}${extension}`
    const targetPath = path.join(moduleDirPath, fileName)
    try {
      await fs.access(targetPath)
    } catch (error) {
      if (error.code === 'ENOENT') return { fileName, targetPath }
      throw error
    }
  }

  throw new Error('Could not create a unique filename for the uploaded resource.')
}

function normaliseTags(value) {
  if (Array.isArray(value)) return value.map((tag) => String(tag).trim()).filter(Boolean)
  return String(value ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function resourceFromUpload(payload, stored) {
  const moduleId = String(payload.moduleId || payload.moduleKey || 'uploaded')
  const moduleDir = stored.moduleDir
  const fileName = stored.fileName
  const title = String(payload.title || path.parse(fileName).name || 'Uploaded resource').trim()
  const now = new Date().toISOString()

  return {
    id: `local-${moduleDir}-${slug(title)}-${Date.now().toString(36)}`,
    moduleId,
    moduleKey: String(payload.moduleKey || moduleId),
    moduleGroup: String(payload.moduleGroup || ''),
    group: String(payload.group || 'Uploaded').trim() || 'Uploaded',
    title: title || 'Uploaded resource',
    path: `local-data/resources/${moduleDir}/${fileName}`,
    type: fileType(fileName),
    viewer: viewerFor(fileName),
    url: encodeResourceUrl(moduleDir, fileName),
    description: String(payload.description || '').trim(),
    tags: normaliseTags(payload.tags),
    priority: payload.priority === 'high' ? 'high' : 'normal',
    uploadedAt: now,
    size: stored.size,
    local: true,
  }
}

function routeResourceFile(pathname) {
  const prefix = '/api/resources/file/'
  if (!pathname.startsWith(prefix)) return null
  const parts = pathname.slice(prefix.length).split('/')
  if (parts.length !== 2) return null
  return {
    moduleDir: slug(decodeURIComponent(parts[0]), 'uploaded'),
    fileName: path.basename(decodeURIComponent(parts[1])),
  }
}

async function sendResourceFile(res, paths, resourceRoute) {
  const root = path.resolve(paths.resourceRootPath)
  const resourcePath = path.resolve(root, resourceRoute.moduleDir, resourceRoute.fileName)
  if (!resourcePath.startsWith(`${root}${path.sep}`)) {
    sendJson(res, 403, { ok: false, error: 'Resource path is outside the local resources directory.' })
    return
  }

  try {
    const stat = await fs.stat(resourcePath)
    if (!stat.isFile()) {
      sendJson(res, 404, { ok: false, error: 'Resource file was not found.' })
      return
    }
    res.statusCode = 200
    res.setHeader('Content-Type', contentTypeFor(resourcePath))
    res.setHeader('Content-Length', String(stat.size))
    fsSync.createReadStream(resourcePath).pipe(res)
  } catch (error) {
    if (error.code === 'ENOENT') {
      sendJson(res, 404, { ok: false, error: 'Resource file was not found.' })
      return
    }
    sendJson(res, 500, { ok: false, error: error.message })
  }
}

async function handleResourceUpload(req, res, paths) {
  const raw = await readRequestBody(req, MAX_UPLOAD_BODY_BYTES)
  const payload = JSON.parse(raw)
  const dataBase64 = String(payload.dataBase64 || '')
  if (!dataBase64) throw new Error('Missing uploaded file data.')

  const buffer = Buffer.from(dataBase64, 'base64')
  if (buffer.length > MAX_UPLOAD_BYTES) {
    const error = new Error(`Uploaded files must be ${MAX_UPLOAD_BYTES} bytes or smaller.`)
    error.statusCode = 413
    throw error
  }

  const moduleDir = slug(payload.moduleId || payload.moduleKey || 'uploaded', 'uploaded')
  const moduleDirPath = path.join(paths.resourceRootPath, moduleDir)
  await fs.mkdir(moduleDirPath, { recursive: true })

  const requestedName = safeFileName(payload.fileName)
  const target = await uniqueFileTarget(moduleDirPath, requestedName)
  await fs.writeFile(target.targetPath, buffer)

  const resource = resourceFromUpload(payload, {
    moduleDir,
    fileName: target.fileName,
    size: buffer.length,
  })
  const existingResources = await readResourceIndex(paths.resourceIndexPath)
  const resources = [resource, ...existingResources.filter((item) => item.id !== resource.id)]
  await writeResourceIndex(paths.resourceIndexPath, resources)

  sendJson(res, 201, { ok: true, resource })
}

export function createLocalTrackerApi(options = {}) {
  const paths = resolveLocalPaths(options)

  return async function localTrackerApi(req, res, next) {
    const pathname = routePath(req.url)

    if (pathname === '/api/health') {
      sendJson(res, 200, {
        ok: true,
        app: 'summer-rescue-plan-app',
        storage: 'local-file+sqlite',
        localDataDir: paths.localDataDir,
        statePath: paths.trackerStatePath,
        progressLogPath: paths.progressLogPath,
        resourceRootPath: paths.resourceRootPath,
        resourceIndexPath: paths.resourceIndexPath,
        dbPath: paths.dbPath,
        endpoints: [
          '/api/health',
          '/api/state',
          '/api/local-tracker-state',
          '/api/events',
          '/api/resources',
          '/api/resources/upload',
          '/api/resources/file/:moduleId/:fileName',
          '/api/db/health',
          '/api/db/summary',
          '/api/db/rebuild',
        ],
      })
      return
    }

    if (pathname === '/api/db/health' || pathname === '/api/db/summary') {
      if (req.method !== 'GET') {
        res.statusCode = 405
        res.setHeader('Allow', 'GET')
        res.end()
        return
      }
      if (!paths.dbEnabled) {
        sendJson(res, 200, { ok: false, available: false, dbPath: paths.dbPath, error: 'SQLite mirror disabled.' })
        return
      }
      let existedBefore = true
      try {
        await fs.access(paths.dbPath)
      } catch {
        existedBefore = false
      }
      try {
        const info = await withTrackerDb(paths.dbPath, (db) => {
          const counts = db.counts()
          const done = db.db.prepare('SELECT COUNT(*) AS n FROM card_progress WHERE done = 1').get()
          const hours = db.db.prepare('SELECT COALESCE(SUM(actual_hours), 0) AS h FROM card_progress').get()
          return {
            schemaVersion: db.getSchemaVersion(),
            counts,
            doneCards: Number(done?.n ?? 0),
            loggedHours: Math.round(Number(hours?.h ?? 0) * 100) / 100,
          }
        })
        sendJson(res, 200, { ok: true, available: true, dbPath: paths.dbPath, existedBefore, ...info })
      } catch (error) {
        sendJson(res, 200, { ok: false, available: false, dbPath: paths.dbPath, error: error.message })
      }
      return
    }

    if (pathname === '/api/db/rebuild') {
      if (req.method !== 'GET' && req.method !== 'POST') {
        res.statusCode = 405
        res.setHeader('Allow', 'GET, POST')
        res.end()
        return
      }
      if (!paths.dbEnabled) {
        sendJson(res, 200, { ok: false, available: false, dbPath: paths.dbPath, error: 'SQLite mirror disabled.' })
        return
      }
      try {
        const events = await readAllProgressEvents(paths.progressLogPath)
        const recovery = await withTrackerDb(paths.dbPath, (db) => db.recover(events))
        sendJson(res, 200, { ok: true, eventCount: events.length, ...recovery })
      } catch (error) {
        sendJson(res, 500, { ok: false, error: error.message })
      }
      return
    }

    const resourceRoute = routeResourceFile(pathname)
    if (resourceRoute) {
      if (req.method !== 'GET') {
        res.statusCode = 405
        res.setHeader('Allow', 'GET')
        res.end()
        return
      }
      await sendResourceFile(res, paths, resourceRoute)
      return
    }

    if (pathname === '/api/resources') {
      if (req.method === 'GET') {
        try {
          sendJson(res, 200, { ok: true, resources: await readResourceIndex(paths.resourceIndexPath) })
        } catch (error) {
          sendJson(res, 500, { ok: false, error: error.message })
        }
        return
      }

      res.statusCode = 405
      res.setHeader('Allow', 'GET')
      res.end()
      return
    }

    if (pathname === '/api/resources/upload') {
      if (req.method === 'POST') {
        try {
          await handleResourceUpload(req, res, paths)
        } catch (error) {
          sendError(res, error, 400)
        }
        return
      }

      res.statusCode = 405
      res.setHeader('Allow', 'POST')
      res.end()
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
          const raw = await readRequestBody(req, MAX_STATE_BYTES)
          const payload = JSON.parse(raw)
          await fs.mkdir(paths.localDataDir, { recursive: true })
          const tmpPath = `${paths.trackerStatePath}.tmp`
          await fs.writeFile(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
          await fs.rename(tmpPath, paths.trackerStatePath)

          // Best-effort: mirror the saved state into the SQLite store. A failure
          // here (e.g. no node:sqlite) must never fail the JSON save, which is
          // the app's primary persistence path.
          let dbMirrored = false
          if (paths.dbEnabled) {
            try {
              await withTrackerDb(paths.dbPath, (db) => db.projectState(payload))
              dbMirrored = true
            } catch (error) {
              console.warn('SQLite projection skipped:', error.message)
            }
          }

          sendJson(res, 200, { ok: true, savedAt: new Date().toISOString(), path: paths.trackerStatePath, dbMirrored })
        } catch (error) {
          sendError(res, error, 400)
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
          const raw = await readRequestBody(req, MAX_EVENT_BYTES)
          const event = normaliseEvent(JSON.parse(raw))
          await fs.mkdir(paths.localDataDir, { recursive: true })
          await fs.appendFile(paths.progressLogPath, `${JSON.stringify(event)}\n`, 'utf8')
          sendJson(res, 201, { ok: true, event })
        } catch (error) {
          sendError(res, error, 400)
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
