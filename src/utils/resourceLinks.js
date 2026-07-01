function encodePath(path) {
  return path
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

export function moduleFileUrl(moduleFolder, relativePath) {
  const base = import.meta.env?.BASE_URL || '/'
  return `${base}study-assets/${encodePath(moduleFolder)}/${encodePath(relativePath)}`
}

export function fileType(path) {
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
  return 'FILE'
}

export function viewerFor(path) {
  const type = fileType(path)
  if (['HTML', 'PDF'].includes(type)) return 'frame'
  if (type === 'MD') return 'markdown'
  if (['TXT', 'CSV'].includes(type)) return 'text'
  if (type === 'IPYNB') return 'notebook'
  if (['MP4', 'WEBM', 'MOV'].includes(type)) return 'video'
  if (['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF'].includes(type)) return 'image'
  return 'file'
}
