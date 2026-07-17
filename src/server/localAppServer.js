import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { APP_CSP, createLocalTrackerApi } from './localTrackerApi.js'

export const LOCAL_APP_HOST = '127.0.0.1'
export const LOCAL_APP_PORT = 5173

const CONTENT_TYPES = new Map([
  ['.avif', 'image/avif'],
  ['.css', 'text/css; charset=utf-8'],
  ['.csv', 'text/csv; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.mp3', 'audio/mpeg'],
  ['.mp4', 'video/mp4'],
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
  ['.webm', 'video/webm'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
])

function sendText(res, statusCode, text) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(text)
}

function setStaticHeaders(res, filePath, stat, isIndex) {
  const extension = path.extname(filePath).toLowerCase()
  res.setHeader('Content-Type', CONTENT_TYPES.get(extension) ?? 'application/octet-stream')
  res.setHeader('Content-Length', String(stat.size))
  res.setHeader('Last-Modified', stat.mtime.toUTCString())
  res.setHeader('X-Content-Type-Options', 'nosniff')
  // YouTube embeds require the parent page's origin in the Referer header.
  // This policy shares only the origin cross-site, never the route or query.
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Content-Security-Policy', APP_CSP)
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.setHeader('Accept-Ranges', 'bytes')
  res.setHeader('Cache-Control', isIndex || extension === '.webmanifest' ? 'no-cache' : 'public, max-age=3600')
}

function parseSingleByteRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(String(header ?? '').trim())
  if (!match) return null

  const startText = match[1]
  const endText = match[2]
  if (!startText && !endText) return null

  let start
  let end
  if (!startText) {
    const suffixLength = Number(endText)
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return null
    start = Math.max(size - suffixLength, 0)
    end = size - 1
  } else {
    start = Number(startText)
    end = endText ? Number(endText) : size - 1
  }

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= size || end < start) {
    return null
  }

  return { start, end: Math.min(end, size - 1) }
}

async function sendFile(req, res, filePath, { isIndex = false } = {}) {
  const stat = await fs.stat(filePath)
  if (!stat.isFile()) return false

  const requestedRange = req.headers.range
  if (requestedRange) {
    const range = parseSingleByteRange(requestedRange, stat.size)
    if (!range) {
      res.statusCode = 416
      res.setHeader('Content-Range', `bytes */${stat.size}`)
      res.end()
      return true
    }

    const bodyLength = range.end - range.start + 1
    setStaticHeaders(res, filePath, { size: bodyLength, mtime: stat.mtime }, isIndex)
    res.statusCode = 206
    res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${stat.size}`)
    if (req.method === 'HEAD') res.end()
    else createReadStream(filePath, { start: range.start, end: range.end }).pipe(res)
    return true
  }

  setStaticHeaders(res, filePath, stat, isIndex)
  res.statusCode = 200
  if (req.method === 'HEAD') res.end()
  else createReadStream(filePath).pipe(res)
  return true
}

function requestPath(req) {
  try {
    return decodeURIComponent(new URL(req.url ?? '/', 'http://local.invalid').pathname)
  } catch {
    return null
  }
}

function safeStaticPath(distDir, pathname) {
  const relativePath = pathname.replace(/^\/+/, '')
  const candidate = path.resolve(distDir, relativePath)
  const rootPrefix = `${path.resolve(distDir)}${path.sep}`
  if (candidate !== path.resolve(distDir) && !candidate.startsWith(rootPrefix)) return null
  return candidate
}

export function createLocalAppHandler(options = {}) {
  const projectRoot = path.resolve(options.projectRoot ?? '.')
  const distDir = path.resolve(options.distDir ?? path.join(projectRoot, 'dist'))
  const apiHandler = createLocalTrackerApi({
    projectRoot,
    ...(options.apiOptions ?? {}),
  })

  return function localAppHandler(req, res) {
    apiHandler(req, res, async () => {
      try {
        const pathname = requestPath(req)
        if (!pathname) {
          sendText(res, 400, 'Bad request')
          return
        }

        if (pathname.startsWith('/api/')) {
          sendText(res, 404, 'API endpoint not found')
          return
        }

        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.setHeader('Allow', 'GET, HEAD')
          sendText(res, 405, 'Method not allowed')
          return
        }

        const requestedFile = pathname === '/' ? path.join(distDir, 'index.html') : safeStaticPath(distDir, pathname)
        if (!requestedFile) {
          sendText(res, 403, 'Forbidden')
          return
        }

        try {
          if (await sendFile(req, res, requestedFile, { isIndex: pathname === '/' })) return
        } catch (error) {
          if (error.code !== 'ENOENT' && error.code !== 'EISDIR') throw error
        }

        // Hash routes never reach the server, but an extensionless fallback keeps
        // direct navigation robust if a future view adopts path-based routing.
        if (!path.extname(pathname)) {
          try {
            if (await sendFile(req, res, path.join(distDir, 'index.html'), { isIndex: true })) return
          } catch (error) {
            if (error.code !== 'ENOENT') throw error
          }
        }

        sendText(res, 404, 'Not found')
      } catch (error) {
        console.error('Local app server request failed:', error)
        if (!res.headersSent) sendText(res, 500, 'Local app server error')
        else res.end()
      }
    }).catch((error) => {
      console.error('Local tracker API request failed:', error)
      if (!res.headersSent) sendText(res, 500, 'Local tracker API error')
      else res.end()
    })
  }
}

export async function startLocalAppServer(options = {}) {
  const projectRoot = path.resolve(options.projectRoot ?? '.')
  const distDir = path.resolve(options.distDir ?? path.join(projectRoot, 'dist'))
  const host = options.host ?? LOCAL_APP_HOST
  const port = options.port ?? LOCAL_APP_PORT

  try {
    await fs.access(path.join(distDir, 'index.html'))
  } catch {
    throw new Error(`Production build not found at ${distDir}. Run "npm run build" first.`)
  }

  const server = http.createServer(
    createLocalAppHandler({ projectRoot, distDir, apiOptions: options.apiOptions }),
  )

  server.on('clientError', (_error, socket) => {
    socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n')
  })

  await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening)
      reject(error)
    }
    const onListening = () => {
      server.off('error', onError)
      resolve()
    }
    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(port, host)
  })

  return server
}
