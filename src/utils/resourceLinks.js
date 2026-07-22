// Encode a filesystem path for use in a URL. encodeURI (not encodeURIComponent)
// preserves "/" and "&" while still escaping spaces — important because some
// study-asset folders contain "&" (e.g. "overview & data preprocessing"), which
// the dev server's static handler fails to match when double-encoded as %26.
function encodePath(path) {
  return encodeURI(path.replace(/\\/g, '/'))
}

// Study-asset responses are cached hard (Cache-Control: max-age=3600) since the
// files themselves never change — but that means a browser that already
// fetched one before a *server-side* header fix (e.g. the CSP frame-ancestors
// bug) keeps replaying the old, broken response for up to an hour, and no
// server-side change can retroactively invalidate an entry the browser has
// already decided is fresh. A query-string cache-buster sidesteps that: it
// makes the URL itself new, so there is no existing cache entry to reuse —
// every browser gets a real network request on the very next load. Bump this
// only when a change to how study-assets are SERVED (not their content) needs
// every browser to drop what it cached.
const ASSET_CACHE_BUST = 'v2'

export function moduleFileUrl(moduleFolder, relativePath) {
  const base = import.meta.env?.BASE_URL || '/'
  return `${base}study-assets/${encodePath(`${moduleFolder}/${relativePath}`)}?v=${ASSET_CACHE_BUST}`
}

// Code / script file extensions -> human-readable language label.
const CODE_TYPES = {
  py: 'Python',
  ipy: 'Python',
  js: 'JavaScript',
  mjs: 'JavaScript',
  jsx: 'JavaScript',
  ts: 'TypeScript',
  tsx: 'TypeScript',
  r: 'R',
  rmd: 'R Markdown',
  java: 'Java',
  c: 'C',
  h: 'C',
  cpp: 'C++',
  cc: 'C++',
  cs: 'C#',
  sql: 'SQL',
  sh: 'Shell',
  bash: 'Shell',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  toml: 'TOML',
  css: 'CSS',
  m: 'MATLAB',
  rb: 'Ruby',
  go: 'Go',
  php: 'PHP',
  scala: 'Scala',
  jl: 'Julia',
}

export function codeLanguage(path) {
  const extension = path.split('.').pop()?.toLowerCase() ?? ''
  return CODE_TYPES[extension] ?? null
}

export function isYouTube(url = '') {
  return /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|playlist\?)|youtu\.be\/)/i.test(url)
}

// A specific video always wins over the playlist it belongs to.
//
// Study-plan video URLs are of the form watch?v=VIDEO&list=PLAYLIST — the list is
// there so YouTube shows the surrounding course, not because the playlist is the
// target. Checking for `list` first (as this did) meant every per-lecture link
// opened the whole playlist instead, which is the behaviour the per-video split
// exists to eliminate. Only a URL with no video id at all is a playlist link.
//
// `start`/`end` (seconds) scope a segment of a long recording, so a card pointing
// at 2:55–3:30 of a 6h52m course opens there rather than at the beginning.
export function youtubeEmbedUrl(url = '', { start, end } = {}) {
  if (/PASTE_/i.test(url)) return null

  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i,
  )

  if (match) {
    const params = new URLSearchParams()
    const startAt = start ?? timestampParam(url)
    if (startAt != null) params.set('start', String(Math.floor(startAt)))
    if (end != null) params.set('end', String(Math.floor(end)))
    const query = params.toString()
    return `https://www.youtube.com/embed/${match[1]}${query ? `?${query}` : ''}`
  }

  const listMatch = url.match(/[?&]list=([\w-]+)/i)
  if (listMatch) return `https://www.youtube.com/embed/videoseries?list=${listMatch[1]}`

  return null
}

// Reads a `t=123s` / `t=123` / `start=123` param off a watch URL.
function timestampParam(url) {
  const match = url.match(/[?&](?:t|start)=(\d+)s?/i)
  return match ? Number(match[1]) : null
}

export function isPlaceholderResourceUrl(url = '') {
  return /PASTE_/i.test(url)
}

export function fileType(path) {
  if (isYouTube(path)) return 'YOUTUBE'
  const extension = path.split('.').pop()?.toLowerCase() ?? ''
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
  if (CODE_TYPES[extension]) return extension.toUpperCase()
  return 'FILE'
}

export function viewerFor(path) {
  if (isYouTube(path)) return 'youtube'
  const type = fileType(path)
  if (['HTML', 'PDF'].includes(type)) return 'frame'
  if (type === 'MD') return 'markdown'
  if (['TXT', 'CSV'].includes(type)) return 'text'
  if (type === 'IPYNB') return 'notebook'
  if (['MP4', 'WEBM', 'MOV'].includes(type)) return 'video'
  if (['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF'].includes(type)) return 'image'
  if (codeLanguage(path)) return 'code'
  return 'file'
}
