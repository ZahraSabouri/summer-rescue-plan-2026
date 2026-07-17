import { Buffer } from 'node:buffer'
import { createHash, randomUUID } from 'node:crypto'
import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

const STATE_ENDPOINTS = new Set(['/api/local-tracker-state', '/api/state'])
const MAX_STATE_BYTES = 15 * 1024 * 1024
const MAX_EVENT_BYTES = 512 * 1024
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
const MAX_UPLOAD_BODY_BYTES = Math.ceil(MAX_UPLOAD_BYTES * 1.4) + 1024 * 1024
const LOCAL_HOSTNAMES = new Set(['127.0.0.1', 'localhost', '::1'])
const API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
export const APP_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss:",
  "media-src 'self' blob: https://open.spotify.com",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://open.spotify.com",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const DEV_SCRIPT_NONCE = 'summer-rescue-local-dev'
const DEV_APP_CSP = APP_CSP.replace("script-src 'self'", `script-src 'self' 'nonce-${DEV_SCRIPT_NONCE}'`)

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

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Content-Security-Policy', API_CSP)
  res.setHeader('Cache-Control', 'no-store')
}

function setAppSecurityHeaders(res, { development = false } = {}) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  // Embedded YouTube players return Error 153 when no parent origin is sent.
  // Keep API responses at no-referrer; the app shell shares only its origin.
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Content-Security-Policy', development ? DEV_APP_CSP : APP_CSP)
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
}

function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  setSecurityHeaders(res)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Length', String(Buffer.byteLength(body)))
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value)
  res.end(body)
}

function sendError(res, error, fallbackStatus = 400) {
  sendJson(res, error.statusCode ?? fallbackStatus, { ok: false, error: error.message })
}

function makeEventId() {
  return `event-${randomUUID()}`
}

function eventChecksum(event) {
  const canonical = JSON.stringify({
    id: event.id,
    occurredAt: event.occurredAt,
    entityType: event.entityType,
    entityId: event.entityId,
    eventType: event.eventType,
    payload: event.payload,
  })
  return createHash('sha256').update(canonical).digest('hex')
}

function revisionEtag(revision) {
  return `"${Math.max(0, Number(revision) || 0)}"`
}

function payloadRevision(payload) {
  return Math.max(0, Number(payload?.revision) || 0)
}

function parseExpectedRevision(value) {
  const match = /^(?:W\/)?"?(\d+)"?$/.exec(String(value ?? '').trim())
  return match ? Number(match[1]) : null
}

function stateContent(payload) {
  return payload?.state ?? payload ?? null
}

function semanticallyEqualState(left, right) {
  return JSON.stringify(stateContent(left)) === JSON.stringify(stateContent(right))
}

function requestHostname(req) {
  const host = String(req.headers.host ?? '').trim()
  if (!host) return ''
  try {
    return new URL(`http://${host}`).hostname
  } catch {
    return ''
  }
}

function localRequestAllowed(req) {
  if (!LOCAL_HOSTNAMES.has(requestHostname(req))) return false
  if (String(req.headers['sec-fetch-site'] ?? '').toLowerCase() === 'cross-site') return false
  const origin = String(req.headers.origin ?? '').trim()
  if (!origin || origin === 'null') return true
  try {
    return LOCAL_HOSTNAMES.has(new URL(origin).hostname)
  } catch {
    return false
  }
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
  const event = {
    id: payload?.id || makeEventId(),
    occurredAt: payload?.occurredAt || payload?.occurred_at || now,
    entityType: payload?.entityType || payload?.entity_type || 'tracker',
    entityId: payload?.entityId || payload?.entity_id || 'state',
    eventType,
    payload: payload?.payload ?? {},
  }
  const checksum = eventChecksum(event)
  if (payload?.checksum && payload.checksum !== checksum) {
    const error = new Error('Event checksum does not match its content.')
    error.statusCode = 409
    throw error
  }
  return { ...event, checksum }
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

async function readProgressLog(progressLogPath, { quarantine = false } = {}) {
  try {
    const raw = await fs.readFile(progressLogPath, 'utf8')
    const events = []
    const malformed = []
    raw.split(/\r?\n/).forEach((line, index) => {
      if (!line.trim()) return
      try {
        events.push(JSON.parse(line))
      } catch (error) {
        malformed.push({
          lineNumber: index + 1,
          raw: line,
          error: error.message,
        })
      }
    })

    if (quarantine && malformed.length > 0) {
      const quarantinedAt = new Date().toISOString()
      const quarantinePath = `${progressLogPath}.quarantine.ndjson`
      await fs.mkdir(path.dirname(progressLogPath), { recursive: true })
      await fs.appendFile(
        quarantinePath,
        malformed.map((item) => JSON.stringify({ ...item, quarantinedAt })).join('\n') + '\n',
        'utf8',
      )
      const tmpPath = `${progressLogPath}.repair.tmp`
      const repaired = events.map((event) => JSON.stringify(event)).join('\n')
      await fs.writeFile(tmpPath, repaired ? `${repaired}\n` : '', 'utf8')
      await fs.rename(tmpPath, progressLogPath)
    }

    return { events, malformed, quarantinePath: `${progressLogPath}.quarantine.ndjson` }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { events: [], malformed: [], quarantinePath: `${progressLogPath}.quarantine.ndjson` }
    }
    throw error
  }
}

async function readAllProgressEvents(progressLogPath) {
  return (await readProgressLog(progressLogPath, { quarantine: true })).events
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
  const result = await readProgressLog(progressLogPath, { quarantine: true })
  return {
    events: result.events.slice(-limit),
    malformedCount: result.malformed.length,
    quarantinePath: result.malformed.length > 0 ? result.quarantinePath : '',
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
    setSecurityHeaders(res)
    if (fileType(resourcePath) === 'HTML') {
      res.setHeader(
        'Content-Security-Policy',
        "sandbox; default-src 'self' data: blob:; script-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'",
      )
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

// Deletion is deliberately limited to card-attachment files: study resources
// are curated material and must never be removable through evidence cleanup.
const DELETABLE_MODULE_DIR = 'card-attachments'

async function deleteAttachmentFile(res, paths, resourceRoute) {
  if (resourceRoute.moduleDir !== DELETABLE_MODULE_DIR) {
    sendJson(res, 403, { ok: false, error: 'Only card-attachment files can be deleted.' })
    return
  }

  const root = path.resolve(paths.resourceRootPath)
  const resourcePath = path.resolve(root, resourceRoute.moduleDir, resourceRoute.fileName)
  if (!resourcePath.startsWith(`${root}${path.sep}`)) {
    sendJson(res, 403, { ok: false, error: 'Resource path is outside the local resources directory.' })
    return
  }

  let fileDeleted = false
  try {
    await fs.unlink(resourcePath)
    fileDeleted = true
  } catch (error) {
    if (error.code !== 'ENOENT') {
      sendJson(res, 500, { ok: false, error: error.message })
      return
    }
  }

  let indexDeleted = false
  try {
    const relativePath = `local-data/resources/${resourceRoute.moduleDir}/${resourceRoute.fileName}`
    const resources = await readResourceIndex(paths.resourceIndexPath)
    const remaining = resources.filter((item) => item.path !== relativePath)
    if (remaining.length !== resources.length) {
      await writeResourceIndex(paths.resourceIndexPath, remaining)
      indexDeleted = true
    }
  } catch (error) {
    console.warn('Attachment index cleanup skipped:', error.message)
  }

  sendJson(res, 200, { ok: true, fileDeleted, indexDeleted })
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
  let stateWriteQueue = Promise.resolve()
  let eventAppendQueue = Promise.resolve()
  let eventIndex = null
  const rebuildTokens = new Map()

  function serializeStateWrite(task) {
    const operation = stateWriteQueue.then(task, task)
    stateWriteQueue = operation.catch(() => {})
    return operation
  }

  function serializeEventAppend(task) {
    const operation = eventAppendQueue.then(task, task)
    eventAppendQueue = operation.catch(() => {})
    return operation
  }

  async function readStatePayload() {
    try {
      return JSON.parse(await fs.readFile(paths.trackerStatePath, 'utf8'))
    } catch (error) {
      if (error.code === 'ENOENT') return null
      throw error
    }
  }

  async function appendEvent(event) {
    return serializeEventAppend(async () => {
      if (!eventIndex) {
        const existing = await readProgressLog(paths.progressLogPath, { quarantine: true })
        eventIndex = new Map(existing.events.map((item) => [item.id, item.checksum || eventChecksum(item)]))
      }
      const existingChecksum = eventIndex.get(event.id)
      if (existingChecksum) {
        if (existingChecksum !== event.checksum) {
          const error = new Error(`Event id ${event.id} already exists with different content.`)
          error.statusCode = 409
          throw error
        }
        return { duplicate: true }
      }
      await fs.mkdir(paths.localDataDir, { recursive: true })
      await fs.appendFile(paths.progressLogPath, `${JSON.stringify(event)}\n`, 'utf8')
      eventIndex.set(event.id, event.checksum)
      return { duplicate: false }
    })
  }

  return async function localTrackerApi(req, res, next) {
    const pathname = routePath(req.url)

    if (pathname.startsWith('/api/')) {
      if (!localRequestAllowed(req)) {
        sendJson(res, 403, { ok: false, error: 'The local API only accepts same-device requests.' })
        return
      }
      setSecurityHeaders(res)
    } else {
      setAppSecurityHeaders(res, { development: Boolean(options.development) })
    }

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
          '/api/data-health',
          '/api/db/rebuild-token',
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

    if (pathname === '/api/data-health') {
      if (req.method !== 'GET') {
        res.statusCode = 405
        res.setHeader('Allow', 'GET')
        res.end()
        return
      }
      try {
        const [stored, progress, database, assets] = await Promise.all([
          readStatePayload(),
          readProgressLog(paths.progressLogPath),
          (async () => {
            if (!paths.dbEnabled) return { available: false, integrity: 'unavailable' }
            try {
              const stat = await fs.stat(paths.dbPath)
              return {
                available: stat.isFile(),
                path: paths.dbPath,
                sizeBytes: stat.size,
                integrity: 'not checked during normal use',
              }
            } catch (error) {
              return {
                available: false,
                path: paths.dbPath,
                integrity: error.code === 'ENOENT' ? 'missing' : 'error',
                error: error.code === 'ENOENT' ? undefined : error.message,
              }
            }
          })(),
          (async () => {
            try {
              const manifest = JSON.parse(
                await fs.readFile(path.join(paths.projectRoot, 'public', 'study-assets-manifest.json'), 'utf8'),
              )
              return {
                available: true,
                syncedAt: manifest.syncedAt ?? '',
                count: Array.isArray(manifest.assets)
                  ? manifest.assets.length
                  : Number(manifest.assetCount ?? manifest.available ?? manifest.checked ?? 0),
              }
            } catch {
              // The app still works without study assets; the health readout reports that honestly.
              return { available: false }
            }
          })(),
        ])
        sendJson(res, 200, {
          ok: true,
          authoritativeStore: 'JSON state file',
          state: {
            path: paths.trackerStatePath,
            exists: Boolean(stored),
            schemaVersion: Number(stored?.schemaVersion ?? stateContent(stored)?.version ?? 0),
            revision: payloadRevision(stored),
            writtenAt: stored?.writtenAt ?? stored?.exportedAt ?? stateContent(stored)?.updatedAt ?? '',
            writerId: stored?.writerId ?? 'legacy',
          },
          eventLog: (() => {
            const lastValid = progress.events[progress.events.length - 1] ?? null
            return {
              path: paths.progressLogPath,
              validCount: progress.events.length,
              malformedCount: progress.malformed.length,
              quarantinePath: progress.quarantinePath,
              lastValidEvent: lastValid
                ? {
                    id: lastValid.id ?? '',
                    eventType: lastValid.eventType ?? '',
                    entityType: lastValid.entityType ?? '',
                    entityId: lastValid.entityId ?? '',
                    occurredAt: lastValid.occurredAt ?? '',
                  }
                : null,
              recoveryCoverage: 'partial audit history; not a complete recovery source',
            }
          })(),
          database,
          assets,
        })
      } catch (error) {
        sendJson(res, 500, { ok: false, error: error.message })
      }
      return
    }

    if (pathname === '/api/db/rebuild-token') {
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.setHeader('Allow', 'POST')
        res.end()
        return
      }
      const token = randomUUID()
      rebuildTokens.set(token, Date.now() + 60_000)
      sendJson(res, 201, { ok: true, token, expiresInSeconds: 60 })
      return
    }

    if (pathname === '/api/db/rebuild') {
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.setHeader('Allow', 'POST')
        res.end()
        return
      }
      const token = String(req.headers['x-rebuild-token'] ?? '')
      const expiresAt = rebuildTokens.get(token) ?? 0
      rebuildTokens.delete(token)
      if (!token || expiresAt < Date.now()) {
        sendJson(res, 403, { ok: false, error: 'A fresh one-use rebuild token is required.' })
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
      if (req.method === 'GET') {
        await sendResourceFile(res, paths, resourceRoute)
        return
      }
      if (req.method === 'DELETE') {
        await deleteAttachmentFile(res, paths, resourceRoute)
        return
      }
      res.statusCode = 405
      res.setHeader('Allow', 'GET, DELETE')
      res.end()
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
          const payload = await readStatePayload()
          const revision = payloadRevision(payload)
          if (!payload) {
            res.statusCode = 204
            setSecurityHeaders(res)
            res.setHeader('ETag', revisionEtag(0))
            res.setHeader('X-State-Revision', '0')
            res.end()
            return
          }
          sendJson(res, 200, payload, {
            ETag: revisionEtag(revision),
            'X-State-Revision': String(revision),
          })
        } catch (error) {
          sendJson(res, 500, { ok: false, error: error.message })
        }
        return
      }

      if (req.method === 'PUT') {
        try {
          const raw = await readRequestBody(req, MAX_STATE_BYTES)
          const payload = JSON.parse(raw)
          const expectedRevision = parseExpectedRevision(req.headers['if-match'])
          if (expectedRevision == null) {
            sendJson(res, 428, { ok: false, error: 'If-Match with the last observed state revision is required.' })
            return
          }
          const result = await serializeStateWrite(async () => {
            const current = await readStatePayload()
            const currentRevision = payloadRevision(current)
            if (expectedRevision !== currentRevision) {
              return {
                conflict: true,
                revision: currentRevision,
                writtenAt: current?.writtenAt ?? current?.exportedAt ?? stateContent(current)?.updatedAt ?? '',
                writerId: current?.writerId ?? 'legacy',
              }
            }
            if (current && semanticallyEqualState(current, payload)) {
              return {
                noChange: true,
                revision: currentRevision,
                savedAt: current?.writtenAt ?? current?.exportedAt ?? stateContent(current)?.updatedAt ?? '',
                writerId: current?.writerId ?? 'legacy',
              }
            }

            const writtenAt = new Date().toISOString()
            const revision = currentRevision + 1
            const stored = {
              schemaVersion: Number(payload.schemaVersion ?? stateContent(payload)?.version ?? 4),
              revision,
              writtenAt,
              writerId: String(req.headers['x-writer-id'] ?? payload.writerId ?? 'unknown'),
              exportedAt: payload.exportedAt ?? writtenAt,
              app: payload.app ?? 'summer-rescue-plan-app',
              state: stateContent(payload),
            }
            await fs.mkdir(paths.localDataDir, { recursive: true })
            const tmpPath = `${paths.trackerStatePath}.tmp`
            await fs.writeFile(tmpPath, `${JSON.stringify(stored, null, 2)}\n`, 'utf8')
            await fs.rename(tmpPath, paths.trackerStatePath)

            let dbMirrored = false
            if (paths.dbEnabled) {
              try {
                await withTrackerDb(paths.dbPath, (db) => db.projectState(stored))
                dbMirrored = true
              } catch (error) {
                console.warn('SQLite projection skipped:', error.message)
              }
            }
            return { revision, savedAt: writtenAt, writerId: stored.writerId, dbMirrored }
          })

          if (result.conflict) {
            sendJson(
              res,
              409,
              { ok: false, error: 'State revision conflict.', current: result },
              { ETag: revisionEtag(result.revision), 'X-State-Revision': String(result.revision) },
            )
            return
          }
          sendJson(
            res,
            200,
            { ok: true, path: paths.trackerStatePath, ...result },
            { ETag: revisionEtag(result.revision), 'X-State-Revision': String(result.revision) },
          )
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
          const result = await readRecentEvents(paths.progressLogPath)
          sendJson(res, 200, { ok: true, ...result })
        } catch (error) {
          sendJson(res, 500, { ok: false, error: error.message })
        }
        return
      }

      if (req.method === 'POST') {
        try {
          const raw = await readRequestBody(req, MAX_EVENT_BYTES)
          const event = normaliseEvent(JSON.parse(raw))
          const result = await appendEvent(event)
          sendJson(res, result.duplicate ? 200 : 201, { ok: true, event, duplicate: result.duplicate })
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
  const handler = createLocalTrackerApi({ ...options, development: true })

  return {
    name: 'summer-rescue-local-tracker-state',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(/<script(?=\s|>)(?![^>]*\bnonce=)/g, `<script nonce="${DEV_SCRIPT_NONCE}"`)
      },
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        handler(req, res, next).catch(next)
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        handler(req, res, next).catch(next)
      })
    },
  }
}
