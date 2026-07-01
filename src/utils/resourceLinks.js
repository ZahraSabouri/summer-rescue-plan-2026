// Encode a filesystem path for use in a URL. encodeURI (not encodeURIComponent)
// preserves "/" and "&" while still escaping spaces — important because some
// study-asset folders contain "&" (e.g. "overview & data preprocessing"), which
// the dev server's static handler fails to match when double-encoded as %26.
function encodePath(path) {
  return encodeURI(path.replace(/\\/g, '/'))
}

export function moduleFileUrl(moduleFolder, relativePath) {
  const base = import.meta.env?.BASE_URL || '/'
  return `${base}study-assets/${encodePath(`${moduleFolder}/${relativePath}`)}`
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

export function youtubeEmbedUrl(url = '') {
  if (/PASTE_/i.test(url)) return null

  const listMatch = url.match(/[?&]list=([\w-]+)/i)
  if (listMatch) return `https://www.youtube.com/embed/videoseries?list=${listMatch[1]}`

  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i,
  )
  return match ? `https://www.youtube.com/embed/${match[1]}` : null
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
