import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  checklistDoneCount,
  formatDate,
  getCardDate,
  sortCards,
  sumHours,
} from '../utils/progress'
import { isActionableOverdue } from '../utils/insights'
import { KNOWLEDGE_SEEDS } from '../data/knowledgeSeeds'
import { knowledgeSummary, resolveModuleNotes } from '../utils/knowledge'
import { ModuleKnowledge } from './ModuleKnowledge'
import { codeLanguage, isPlaceholderResourceUrl, isYouTube, youtubeEmbedUrl } from '../utils/resourceLinks.js'
import { averageResourceProgress } from '../utils/resourceProgress.js'
import { CardSummary } from './CardSummary'
import { ResourceStudyEditor } from './ResourceStudyEditor'

function percent(done, total) {
  if (!total) return 0
  return Math.round((done / total) * 100)
}

function hours(value) {
  const number = Number(value || 0)
  return Number.isInteger(number) ? `${number}h` : `${number.toFixed(1)}h`
}

const MODULE_VIEW_BY_KEY = {
  aml: 'aml',
  mat700: 'mat700',
  teamProject: 'team-project',
  timeSeries: 'time-series',
}
const MAX_LOCAL_RESOURCE_BYTES = 25 * 1024 * 1024

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  const chunks = []
  for (let index = 0; index < bytes.length; index += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + 0x8000)))
  }
  return window.btoa(chunks.join(''))
}

function titleFromFileName(fileName = '') {
  return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
}

function resourceAppTabUrl(resource) {
  if (typeof window === 'undefined' || !resource?.id) return resource?.url ?? '#'
  const url = new URL(window.location.href)
  const currentView = url.hash.replace(/^#\/?/, '').split('?')[0]
  const viewId = resource.moduleId || MODULE_VIEW_BY_KEY[resource.moduleKey] || currentView || 'today'
  url.hash = `/${viewId}?resource=${encodeURIComponent(resource.id)}&mode=reader`
  return url.toString()
}

function useTextResource(resource) {
  const [state, setState] = useState({ url: '', status: 'idle', text: '', error: '' })
  const url = resource?.url ?? ''

  useEffect(() => {
    if (!url) return undefined
    let cancelled = false

    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.text()
      })
      .then((text) => {
        if (cancelled) return
        const head = text.slice(0, 200).trim().toLowerCase()
        if (head.startsWith('<!doctype html') || head.startsWith('<html')) {
          throw new Error('File could not be loaded (the server returned the app page). Use “New tab”, or run npm run assets:sync.')
        }
        setState({ url, status: 'ready', text, error: '' })
      })
      .catch((error) => {
        if (!cancelled) setState({ url, status: 'error', text: '', error: error.message })
      })

    return () => {
      cancelled = true
    }
  }, [url])

  if (url && state.url !== url) return { status: 'loading', text: '', error: '' }
  return state
}

function safeHref(href) {
  if (!href) return null
  const hasProtocol = /^[a-z][a-z0-9+.-]*:/i.test(href)
  if (!hasProtocol || /^(https?:|mailto:)/i.test(href)) return href
  return null
}

function renderInline(text, keyPrefix) {
  const parts = []
  const pattern = /(`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g
  let lastIndex = 0
  let match

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    if (match[2]) {
      parts.push(<code key={`${keyPrefix}-code-${match.index}`}>{match[2]}</code>)
    } else {
      const href = safeHref(match[4])
      parts.push(
        href ? (
          <a key={`${keyPrefix}-link-${match.index}`} href={href} target="_blank" rel="noreferrer">
            {match[3]}
          </a>
        ) : (
          <span key={`${keyPrefix}-link-${match.index}`}>{match[3]}</span>
        ),
      )
    }
    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

function isMarkdownBlockStart(line) {
  return /^#{1,6}\s+/.test(line) || /^```/.test(line) || /^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line) || /^>\s?/.test(line)
}

function renderMarkdown(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const elements = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }

    if (/^```/.test(line)) {
      const code = []
      index += 1
      while (index < lines.length && !/^```/.test(lines[index])) {
        code.push(lines[index])
        index += 1
      }
      index += 1
      elements.push(
        <pre key={`code-${index}`}>
          <code>{code.join('\n')}</code>
        </pre>,
      )
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      const level = Math.min(heading[1].length, 4)
      const Tag = `h${level}`
      elements.push(<Tag key={`heading-${index}`}>{renderInline(heading[2], `heading-${index}`)}</Tag>)
      index += 1
      continue
    }

    if (/^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
      const ordered = /^\d+[.)]\s+/.test(line)
      const items = []
      while (index < lines.length && (ordered ? /^\d+[.)]\s+/.test(lines[index]) : /^[-*]\s+/.test(lines[index]))) {
        items.push(lines[index].replace(ordered ? /^\d+[.)]\s+/ : /^[-*]\s+/, ''))
        index += 1
      }
      const ListTag = ordered ? 'ol' : 'ul'
      elements.push(
        <ListTag key={`list-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item, `list-${index}-${itemIndex}`)}</li>
          ))}
        </ListTag>,
      )
      continue
    }

    if (/^>\s?/.test(line)) {
      const quote = []
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ''))
        index += 1
      }
      elements.push(<blockquote key={`quote-${index}`}>{renderInline(quote.join(' '), `quote-${index}`)}</blockquote>)
      continue
    }

    const paragraph = [line.trim()]
    index += 1
    while (index < lines.length && lines[index].trim() && !isMarkdownBlockStart(lines[index])) {
      paragraph.push(lines[index].trim())
      index += 1
    }
    elements.push(<p key={`paragraph-${index}`}>{renderInline(paragraph.join(' '), `paragraph-${index}`)}</p>)
  }

  return elements
}

function LoadingPreview({ label = 'Loading resource...' }) {
  return <p className="empty-state preview-state">{label}</p>
}

function TextPreview({ resource }) {
  const { status, text, error } = useTextResource(resource)
  if (status === 'loading') return <LoadingPreview />
  if (status === 'error') return <p className="empty-state preview-state">Could not load resource: {error}</p>
  return (
    <pre className="text-preview">
      <code>{text}</code>
    </pre>
  )
}

function CodePreview({ resource }) {
  const { status, text, error } = useTextResource(resource)
  if (status === 'loading') return <LoadingPreview label="Loading code..." />
  if (status === 'error') return <p className="empty-state preview-state">Could not load file: {error}</p>
  const language = codeLanguage(resource.path || resource.url || '') || resource.type
  const lines = text.replace(/\n$/, '').split('\n')
  return (
    <div className="code-preview">
      <div className="code-bar">
        <span className="code-lang">{language}</span>
        <span className="code-meta">{lines.length} lines</span>
      </div>
      <div className="code-body">
        <pre className="code-gutter" aria-hidden="true">
          {lines.map((_, index) => `${index + 1}\n`).join('')}
        </pre>
        <pre className="code-source">
          <code>{text}</code>
        </pre>
      </div>
    </div>
  )
}

function MarkdownPreview({ resource }) {
  const { status, text, error } = useTextResource(resource)
  if (status === 'loading') return <LoadingPreview />
  if (status === 'error') return <p className="empty-state preview-state">Could not load markdown: {error}</p>
  return <div className="markdown-preview">{renderMarkdown(text)}</div>
}

function cellSource(cell) {
  if (Array.isArray(cell?.source)) return cell.source.join('')
  return cell?.source ?? ''
}

function outputText(output) {
  const value = output?.text ?? output?.data?.['text/plain']
  if (Array.isArray(value)) return value.join('')
  return value ?? ''
}

function NotebookPreview({ resource }) {
  const { status, text, error } = useTextResource(resource)
  if (status === 'loading') return <LoadingPreview label="Loading notebook..." />
  if (status === 'error') return <p className="empty-state preview-state">Could not load notebook: {error}</p>

  let cells
  try {
    const notebook = JSON.parse(text)
    cells = Array.isArray(notebook.cells) ? notebook.cells : []
  } catch (parseError) {
    return <p className="empty-state preview-state">Could not parse notebook JSON: {parseError.message}</p>
  }

  return (
    <div className="notebook-preview">
      {cells.map((cell, index) => {
        const source = cellSource(cell)
        const outputs = (cell.outputs ?? []).map(outputText).filter(Boolean)
        return (
          <article key={index} className={`notebook-cell ${cell.cell_type === 'markdown' ? 'markdown' : 'code'}`}>
            <span>{cell.cell_type ?? 'cell'}</span>
            {cell.cell_type === 'markdown' ? (
              <div className="markdown-preview compact">{renderMarkdown(source)}</div>
            ) : (
              <pre>
                <code>{source}</code>
              </pre>
            )}
            {outputs.length > 0 && (
              <pre className="notebook-output">
                <code>{outputs.join('\n')}</code>
              </pre>
            )}
          </article>
        )
      })}
      {cells.length === 0 && <p className="empty-state">No notebook cells found.</p>}
    </div>
  )
}


const GROUP_ORDER = {
  aml: [
    'Study notes',
    'Session 1',
    'Session 2',
    'Session 3',
    'Session 4',
    'Session 5',
    'Weekly maps',
    'Video lectures',
    'Project',
    'Project figures',
    'Supplementary reading',
    'Python support',
    'Python bootcamp exercises',
  ],
  'time-series': [
    'Study packs',
    'Quick reference',
    'Past papers',
    'Exam-like exercises',
    'Exam-like solutions',
    'Lecture notes',
    'Lecture notes with gaps',
    'Video walkthroughs',
    'Visual maps',
  ],
  'team-project': [
    'Module admin',
    'Assessment',
    'Session 1',
    'Session 2',
    'Transcripts',
    'Practice',
  ],
  mat700: [
    'Formula sheets',
    'Lecture slides',
    'Lecture notes',
    'Question banks',
    'Past papers',
    'Tutorials',
    'Images',
    'Derivation notes',
    'Transcripts',
    'Module admin',
  ],
}

function groupRank(moduleId, group) {
  const order = GROUP_ORDER[moduleId] ?? []
  const index = order.indexOf(group)
  return index === -1 ? 999 : index
}

function collapseGroupByDefault(group, items) {
  return items.length >= 12 || /python|bootcamp|transcripts|images/i.test(group)
}

function ResourceCard({ resource, selected, progress, onSelect, onToggleReviewed = () => {}, onProgressChange = () => {} }) {
  const placeholder = isPlaceholderResourceUrl(resource.url)
  return (
    <article className={`study-resource-card ${selected ? 'selected' : ''} ${resource.priority === 'high' ? 'high' : ''} ${placeholder ? 'placeholder' : ''}`}>
      <button type="button" className="resource-card-open" onClick={() => onSelect(resource.id)}>
        <span className="type-badge">{resource.type}</span>
        <strong>{resource.title}</strong>
        <small>{resource.group}</small>
        <p>{placeholder ? 'Paste the real YouTube URL in studyModules.js to enable this slot.' : resource.description || resource.path}</p>
      </button>
      <ResourceStudyEditor
        resourceId={resource.id}
        progress={progress}
        onToggleReviewed={onToggleReviewed}
        onProgressChange={onProgressChange}
      />
    </article>
  )
}

function ResourceUploadPanel({ module, groups, onUpload, onUploaded }) {
  const fileInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [group, setGroup] = useState('Uploaded')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [priority, setPriority] = useState('normal')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const groupOptions = ['Uploaded', ...groups.filter((item) => item !== 'Uploaded')]
  const canUpload = Boolean(file && title.trim() && status !== 'saving')

  async function submitUpload(event) {
    event.preventDefault()
    if (!file || !onUpload) return
    if (file.size > MAX_LOCAL_RESOURCE_BYTES) {
      setError('File is larger than 25 MB.')
      return
    }

    setStatus('saving')
    setError('')

    try {
      const dataBase64 = await arrayBufferToBase64(await file.arrayBuffer())
      const resource = await onUpload(module, {
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        title: title.trim(),
        group,
        description: description.trim(),
        tags,
        priority,
        dataBase64,
      })
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setTitle('')
      setGroup('Uploaded')
      setDescription('')
      setTags('')
      setPriority('normal')
      setStatus('saved')
      onUploaded?.(resource.id)
    } catch (uploadError) {
      setStatus('error')
      setError(uploadError.message)
    }
  }

  return (
    <form className="resource-upload-panel" onSubmit={submitUpload}>
      <div className="resource-upload-head">
        <div>
          <p className="eyebrow">Local files</p>
          <h3>Add resource</h3>
        </div>
        <button type="submit" className="primary-button" disabled={!canUpload}>
          {status === 'saving' ? 'Uploading...' : 'Upload'}
        </button>
      </div>
      <div className="resource-upload-grid">
        <label className="file-pick-field">
          <span>File</span>
          <input
            ref={fileInputRef}
            type="file"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null
              setFile(nextFile)
              setError('')
              setStatus('idle')
              if (nextFile) setTitle((current) => current.trim() || titleFromFileName(nextFile.name))
            }}
          />
        </label>
        <label>
          <span>Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Resource title" />
        </label>
        <label>
          <span>Group</span>
          <select value={group} onChange={(event) => setGroup(event.target.value)}>
            {groupOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Priority</span>
          <select value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          <span>Tags</span>
          <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="comma separated" />
        </label>
        <label className="resource-upload-description">
          <span>Description</span>
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional note" />
        </label>
      </div>
      {file && (
        <p className="resource-upload-meta">
          {file.name} - {(file.size / 1024 / 1024).toFixed(file.size > 1024 * 1024 ? 1 : 3)} MB
        </p>
      )}
      {status === 'saved' && <p className="resource-upload-status">Resource uploaded.</p>}
      {error && <p className="resource-upload-status error">{error}</p>}
    </form>
  )
}

function isHtmlResource(resource) {
  return /\.html?(\?|#|$)/i.test(resource?.url || '') || resource?.viewer === 'html'
}

function ResourcePreview({ resource, frameRef }) {
  if (isPlaceholderResourceUrl(resource.url)) {
    return (
      <div className="file-preview">
        <span className="type-badge">{resource.type}</span>
        <h3>{resource.title}</h3>
        <p>Paste the real video or playlist URL into `studyModules.js` to activate this AML video slot.</p>
      </div>
    )
  }

  if (resource.viewer === 'youtube' || isYouTube(resource.url)) {
    const embed = youtubeEmbedUrl(resource.url, { start: resource.start, end: resource.end })
    if (embed) {
      return (
        <div className="youtube-preview">
          <iframe
            src={embed}
            title={resource.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )
    }
  }
  if (resource.viewer === 'image') {
    return (
      <div className="image-preview">
        <img src={resource.url} alt={resource.title} />
      </div>
    )
  }
  if (resource.viewer === 'frame') {
    // Local HTML is treated as untrusted static material. It receives a unique
    // origin and no script permission, so it cannot reach the parent app/API.
    const html = isHtmlResource(resource)
    return (
      <iframe
        ref={frameRef}
        className="reader-frame"
        title={resource.title}
        src={resource.url}
        {...(html ? { sandbox: 'allow-popups allow-forms' } : {})}
      />
    )
  }
  if (resource.viewer === 'markdown') return <MarkdownPreview resource={resource} />
  if (resource.viewer === 'text') return <TextPreview resource={resource} />
  if (resource.viewer === 'code') return <CodePreview resource={resource} />
  if (resource.viewer === 'notebook') return <NotebookPreview resource={resource} />
  if (resource.viewer === 'video') {
    return (
      <div className="video-preview">
        <video src={resource.url} controls preload="metadata" />
      </div>
    )
  }
  return (
    <div className="file-preview">
      <span className="type-badge">{resource.type}</span>
      <h3>{resource.title}</h3>
      <p>{resource.description || 'This file is best opened in its native application.'}</p>
      <a className="primary-button" href={resource.url} target="_blank" rel="noreferrer">
        Open resource
      </a>
    </div>
  )
}

export function ResourceReader({ resource, onClose, standalone = false }) {
  const frameRef = useRef(null)
  const html = isHtmlResource(resource)
  const appTabUrl = resourceAppTabUrl(resource)

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function printFrame() {
    try {
      frameRef.current?.contentWindow?.focus()
      frameRef.current?.contentWindow?.print()
    } catch {
      window.open(resource.url, '_blank', 'noopener')
    }
  }

  return createPortal(
    <div
      className={`reader-shell${standalone ? ' is-standalone' : ''}`}
      role={standalone ? 'main' : 'dialog'}
      {...(!standalone ? { 'aria-modal': 'true' } : {})}
      aria-label={resource.title}
      onClick={(event) => {
        if (!standalone && event.target === event.currentTarget) onClose()
      }}
    >
      <div className={`reader-window viewer-${resource.viewer}${html ? ' is-html' : ''}${standalone ? ' is-standalone' : ''}`}>
        <header className="reader-chrome">
          <span className="reader-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div className="reader-addr">
            <span className="type-badge">{resource.type}</span>
            <strong title={resource.path}>{resource.title}</strong>
          </div>
          <div className="reader-actions">
            {html && (
              <button type="button" className="reader-btn" onClick={printFrame} title="Print this sheet">
                Print
              </button>
            )}
            {!standalone && (
              <a className="reader-btn" href={appTabUrl} target="_blank" rel="noreferrer" title="Open in a full-screen reader tab">
                Full-screen tab
              </a>
            )}
            <button type="button" className="reader-btn reader-close" onClick={onClose} aria-label="Close reader">
              ✕
            </button>
          </div>
        </header>
        <div className="reader-body">
          <ResourcePreview resource={resource} frameRef={frameRef} />
        </div>
        {resource.description && <footer className="reader-foot">{resource.description}</footer>}
      </div>
    </div>,
    document.body,
  )
}

function ModuleStats({ moduleCards, referenceDate, onOpenPlanning }) {
  const done = moduleCards.filter((card) => card.done).length
  const open = moduleCards.length - done
  const overdue = moduleCards.filter((card) => isActionableOverdue(card, referenceDate)).length
  const checklistItems = moduleCards.reduce((sum, card) => sum + (card.checklist?.length ?? 0), 0)
  const checklistDone = moduleCards.reduce((sum, card) => sum + checklistDoneCount(card), 0)

  // Every tile is a doorway: clicking drills into the planning list behind the
  // number (overdue jumps to the module's Behind banner when one is showing).
  function goOverdue() {
    const banner = document.querySelector('.module-behind')
    if (banner) banner.scrollIntoView({ behavior: 'smooth', block: 'start' })
    else onOpenPlanning?.()
  }

  const tiles = [
    { key: 'cards', label: 'Cards', value: moduleCards.length, detail: `${open} open`, go: onOpenPlanning },
    { key: 'complete', label: 'Complete', value: `${percent(done, moduleCards.length)}%`, detail: `${done}/${moduleCards.length} cards`, go: onOpenPlanning },
    { key: 'hours', label: 'Hours', value: hours(sumHours(moduleCards, 'actualHours')), detail: `${hours(sumHours(moduleCards, 'estimatedHours'))} planned`, go: onOpenPlanning },
    { key: 'checklist', label: 'Checklist', value: `${percent(checklistDone, checklistItems)}%`, detail: `${checklistDone}/${checklistItems} items`, go: onOpenPlanning },
    { key: 'overdue', label: 'Overdue', value: overdue, detail: formatDate(referenceDate), go: goOverdue },
  ]

  return (
    <div className="module-workspace-stats">
      {tiles.map((tile) => (
        <article
          key={tile.key}
          role="button"
          tabIndex={0}
          className="module-stat-tile"
          title={`Open ${tile.label.toLowerCase()} details`}
          onClick={() => tile.go?.()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              tile.go?.()
            }
          }}
        >
          <span>{tile.label}</span>
          <strong>{tile.value}</strong>
          <p>{tile.detail}</p>
        </article>
      ))}
    </div>
  )
}

function ModuleGuidance({ module }) {
  return (
    <section className="module-guidance">
      <div>
        <p className="eyebrow">Objectives</p>
        <ul>
          {module.objectives.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="eyebrow">Operating rules</p>
        <ul>
          {module.operatingRules.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function DrillPanel({ module }) {
  return (
    <section className="module-tool-grid">
      <div className="module-tool-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Drills</p>
            <h2>Output-focused work</h2>
          </div>
        </div>
        <div className="module-drill-list">
          {module.drills.map((drill) => (
            <article key={drill.title}>
              <strong>{drill.title}</strong>
              <p>{drill.detail}</p>
              {drill.output && <span>{drill.output}</span>}
            </article>
          ))}
        </div>
      </div>

      {module.recipes?.length > 0 && (
        <div className="module-tool-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Recipes</p>
              <h2>Exam answer frames</h2>
            </div>
          </div>
          <div className="module-drill-list">
            {module.recipes.map((recipe) => (
              <article key={recipe.title}>
                <strong>{recipe.title}</strong>
                <p>{recipe.detail}</p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

const MODULE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'planning', label: 'Planning' },
  { id: 'materials', label: 'Materials' },
  { id: 'knowledge', label: 'Knowledge' },
]

function ModuleProgressBar({ moduleCards, referenceDate }) {
  const total = moduleCards.length
  const done = moduleCards.filter((card) => card.done).length
  const overdue = moduleCards.filter((card) => isActionableOverdue(card, referenceDate)).length
  const open = Math.max(0, total - done - overdue)
  const pct = percent(done, total)

  return (
    <section className="workspace-section module-progress wide">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Big picture</p>
          <h2>What&apos;s done vs. what&apos;s left</h2>
        </div>
        <span className="status-pill">{pct}% done</span>
      </div>
      <div className="progress-split" role="img" aria-label={`${done} done, ${open} to do, ${overdue} overdue`}>
        {done > 0 && <span className="seg done" style={{ flexGrow: done }} title={`${done} done`} />}
        {open > 0 && <span className="seg open" style={{ flexGrow: open }} title={`${open} to do`} />}
        {overdue > 0 && <span className="seg overdue" style={{ flexGrow: overdue }} title={`${overdue} overdue`} />}
        {total === 0 && <span className="seg empty" style={{ flexGrow: 1 }} />}
      </div>
      <div className="progress-legend">
        <span>
          <i className="dot done" />
          {done} done
        </span>
        <span>
          <i className="dot open" />
          {open} to do
        </span>
        <span>
          <i className="dot overdue" />
          {overdue} overdue
        </span>
      </div>
    </section>
  )
}

export function ModuleWorkspace({
  module,
  cards,
  actions,
  referenceDate,
  mat700Active,
  setActiveView,
  moduleNote,
  onModuleNoteChange,
  moduleExamDate,
  knowledge,
  knowledgeActions,
  focusKnowledgeNoteId = '',
  resourceProgress = {},
  recentResourceIds = [],
  onResourceOpen,
  onResourceReviewedToggle,
  onResourceProgressChange,
  onResourceUpload,
}) {
  const [tab, setTab] = useState('overview')

  // Arriving from a card's "concept notes" chip opens straight onto that note.
  // Adjusted during render rather than in an effect so the Knowledge tab is
  // already active on the first paint.
  const [lastFocusNoteId, setLastFocusNoteId] = useState(focusKnowledgeNoteId)
  if (focusKnowledgeNoteId !== lastFocusNoteId) {
    setLastFocusNoteId(focusKnowledgeNoteId)
    if (focusKnowledgeNoteId) setTab('knowledge')
  }
  const [openResourceId, setOpenResourceId] = useState(null)
  const [resourceQuery, setResourceQuery] = useState('')
  const [activeGroup, setActiveGroup] = useState('all')

  const moduleCards = useMemo(
    () => sortCards(cards.filter((card) => card.moduleGroup === module.moduleGroup)),
    [cards, module.moduleGroup],
  )
  const openCards = moduleCards.filter((card) => !card.done)
  const nextCards = openCards
  const doneCards = moduleCards.filter((card) => card.done)
  const moduleBehind = useMemo(
    () =>
      moduleCards
        .filter((card) => isActionableOverdue(card, referenceDate))
        .map((card) => ({
          card,
          daysLate: Math.max(1, Math.round((Date.parse(referenceDate) - Date.parse(card.dueDate)) / 86400000)),
        })),
    [moduleCards, referenceDate],
  )
  const maxLate = moduleBehind.length ? Math.max(...moduleBehind.map((entry) => entry.daysLate)) : 0
  const groups = useMemo(() => ['all', ...new Set(module.resources.map((resource) => resource.group))], [module.resources])
  const visibleResources = useMemo(() => {
    const query = resourceQuery.trim().toLowerCase()
    return module.resources.filter((resource) => {
      if (activeGroup !== 'all' && resource.group !== activeGroup) return false
      if (!query) return true
      return [resource.title, resource.group, resource.description, resource.path, ...(resource.tags ?? [])]
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [activeGroup, module.resources, resourceQuery])
  const startHereResources = useMemo(
    () => module.resources.filter((resource) => resource.priority === 'high').slice(0, 10),
    [module.resources],
  )
  const recentResources = useMemo(
    () =>
      recentResourceIds
        .map((id) => module.resources.find((resource) => resource.id === id))
        .filter(Boolean)
        .slice(0, 8),
    [module.resources, recentResourceIds],
  )
  const groupedResources = useMemo(() => {
    const map = new Map()
    for (const resource of visibleResources) {
      if (!map.has(resource.group)) map.set(resource.group, [])
      map.get(resource.group).push(resource)
    }
    return Array.from(map, ([group, items]) => ({ group, items })).sort(
      (a, b) => groupRank(module.id, a.group) - groupRank(module.id, b.group) || a.group.localeCompare(b.group),
    )
  }, [module.id, visibleResources])
  const knowledgeCounts = useMemo(
    () =>
      knowledgeSummary(
        resolveModuleNotes({ seeds: KNOWLEDGE_SEEDS, knowledge, moduleId: module.id, referenceDate }),
      ),
    [knowledge, module.id, referenceDate],
  )
  const openResource = module.resources.find((resource) => resource.id === openResourceId) ?? null
  const mat700Inactive = module.id === 'mat700' && !mat700Active

  function selectResource(resourceId) {
    setOpenResourceId(resourceId)
    onResourceOpen?.(resourceId)
  }

  function studiedAverage(items) {
    return averageResourceProgress(items, resourceProgress)
  }

  return (
    <div className="module-workspace" style={{ '--module-accent': `var(${module.accent})` }}>
      <section className="module-hero">
        <div className="module-hero-copy">
          <p className="eyebrow">{module.code}</p>
          <h2>{module.title}</h2>
          <p>{module.examShape}</p>
          {moduleExamDate && <span className="module-exam-chip">Exam date: {formatDate(moduleExamDate)}</span>}
          <div className="hub-command-strip">
            <button type="button" className="primary-button" onClick={() => setActiveView('week')}>
              Week queue
            </button>
            <button type="button" className="secondary-button" onClick={() => setActiveView('dashboard')}>
              Planner
            </button>
            <button type="button" className="secondary-button" onClick={() => setActiveView('evidence')}>
              Evidence
            </button>
          </div>
        </div>
        <div className="module-hero-visual">
          <img src={(module.hero ?? module.visual).url} alt="" />
        </div>
      </section>

      {mat700Inactive && (
        <div className="insurance-status-banner">
          <strong>MAT700 study lane is currently paused.</strong>
          <span>Resources remain available, but planner metrics exclude MAT700 unless the MAT700 active toggle is on.</span>
        </div>
      )}

      {moduleBehind.length > 0 && (
        <section className="module-behind" aria-label="Overdue tasks in this module">
          <div className="module-behind-head">
            <span className="module-behind-flag">Behind</span>
            <strong>{moduleBehind.length} overdue {moduleBehind.length === 1 ? 'task' : 'tasks'} in this module</strong>
            <span className="module-behind-sub">Oldest {maxLate} {maxLate === 1 ? 'day' : 'days'} late · clear these before new work</span>
          </div>
          <div className="module-behind-list">
            {moduleBehind.map(({ card, daysLate }) => {
              const level = daysLate <= 1 ? 'soft' : daysLate <= 7 ? 'warn' : 'severe'
              return (
                <div className="catchup-card" key={card.id}>
                  <span className={`catchup-late ${level}`}>{daysLate <= 1 ? 'yesterday' : `${daysLate}d late`}</span>
                  <CardSummary card={card} compact {...actions} />
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div className="module-tabs" role="tablist" aria-label="Module sections">
        {MODULE_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`module-tab${tab === item.id ? ' active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.id === 'materials' && <span className="module-tab-count">{module.resources.length}</span>}
            {item.id === 'planning' && <span className="module-tab-count">{moduleCards.length}</span>}
            {item.id === 'knowledge' && knowledgeCounts.total > 0 && (
              <span className={`module-tab-count${knowledgeCounts.due > 0 ? ' is-due' : ''}`}>
                {knowledgeCounts.due > 0 ? knowledgeCounts.due : knowledgeCounts.total}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="module-panel">
          <ModuleStats moduleCards={moduleCards} referenceDate={referenceDate} onOpenPlanning={() => setTab('planning')} />
          <ModuleProgressBar moduleCards={moduleCards} referenceDate={referenceDate} />
          <ModuleGuidance module={module} />
          <section className="workspace-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Scratchpad</p>
                <h2>Module notes</h2>
              </div>
            </div>
            <textarea
              className="module-note"
              value={moduleNote}
              onChange={(event) => onModuleNoteChange(module.id, event.target.value)}
              placeholder="Fast lookup paths, formulas, traps, or the next repair target."
            />
          </section>
        </div>
      )}

      {tab === 'planning' && (
        <div className="module-panel module-layout">
          <div className="module-main-column">
            <section className="workspace-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Rescue cards</p>
                  <h2>Next module actions</h2>
                </div>
                <span className="status-pill">{openCards.length} open</span>
              </div>
              <div className="focus-list">
                {nextCards.length > 0 ? (
                  nextCards.map((card) => <CardSummary key={card.id} card={card} {...actions} />)
                ) : (
                  <p className="empty-state">No open cards for this module.</p>
                )}
              </div>
              {doneCards.length > 0 && (
                <details className="done-details">
                  <summary>{doneCards.length} done cards</summary>
                  <div className="focus-list">
                    {doneCards.map((card) => (
                      <CardSummary key={card.id} card={card} compact {...actions} />
                    ))}
                  </div>
                </details>
              )}
            </section>

            <DrillPanel module={module} />
          </div>

          <aside className="module-side-column">
            <section className="workspace-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Timeline</p>
                  <h2>Upcoming dated cards</h2>
                </div>
              </div>
              <div className="timeline-list">
                {openCards
                  .filter((card) => getCardDate(card))
                  .slice(0, 8)
                  .map((card) => (
                    <button key={card.id} type="button" className="timeline-item" onClick={() => actions.onOpen(card.id)}>
                      <span>{formatDate(getCardDate(card))}</span>
                      <strong>{card.title}</strong>
                      <small>{hours(card.estimatedHours)} / {card.priority}</small>
                    </button>
                  ))}
                {openCards.filter((card) => getCardDate(card)).length === 0 && (
                  <p className="empty-state">No dated open cards.</p>
                )}
              </div>
            </section>
          </aside>
        </div>
      )}

      {tab === 'materials' && (
        <div className="module-panel">
          <section className="resource-browser">
            <ResourceUploadPanel
              module={module}
              groups={groups.filter((group) => group !== 'all')}
              onUpload={onResourceUpload}
              onUploaded={selectResource}
            />
            <div className="resource-browser-bar">
              <label className="search-field">
                <span>Find resource</span>
                <input
                  type="search"
                  value={resourceQuery}
                  onChange={(event) => setResourceQuery(event.target.value)}
                  placeholder="Search notes, formulas, labs, papers"
                />
              </label>
              <label className="search-field">
                <span>Group</span>
                <select value={activeGroup} onChange={(event) => setActiveGroup(event.target.value)}>
                  {groups.map((group) => (
                    <option key={group} value={group}>
                      {group === 'all' ? 'All groups' : group}
                    </option>
                  ))}
                </select>
              </label>
              <span className="resource-count">{visibleResources.length} files</span>
            </div>
            <div className="materials-groups">
              {startHereResources.length > 0 && (
                <section className="material-start-here">
                  <div className="material-group-head">
                    <h3>Start here</h3>
                    <span className="material-group-count">{studiedAverage(startHereResources)}% studied</span>
                  </div>
                  <div className="study-resource-grid pinned">
                    {startHereResources.map((resource) => (
                      <ResourceCard
                        key={resource.id}
                        resource={resource}
                        selected={openResourceId === resource.id}
                        progress={resourceProgress[resource.id]}
                        onSelect={selectResource}
                        onToggleReviewed={onResourceReviewedToggle}
                        onProgressChange={onResourceProgressChange}
                      />
                    ))}
                  </div>
                </section>
              )}

              {recentResources.length > 0 && (
                <section className="material-start-here recent">
                  <div className="material-group-head">
                    <h3>Recently opened</h3>
                    <span className="material-group-count">{recentResources.length}</span>
                  </div>
                  <div className="study-resource-grid pinned">
                    {recentResources.map((resource) => (
                      <ResourceCard
                        key={resource.id}
                        resource={resource}
                        selected={openResourceId === resource.id}
                        progress={resourceProgress[resource.id]}
                        onSelect={selectResource}
                        onToggleReviewed={onResourceReviewedToggle}
                        onProgressChange={onResourceProgressChange}
                      />
                    ))}
                  </div>
                </section>
              )}

              {groupedResources.map(({ group, items }) => (
                <details key={group} className="material-group" open={!collapseGroupByDefault(group, items)}>
                  <summary className="material-group-head">
                    <h3>{group}</h3>
                    <span className="material-group-count">{studiedAverage(items)}% studied</span>
                  </summary>
                  <div className="study-resource-grid">
                    {items.map((resource) => (
                      <ResourceCard
                        key={resource.id}
                        resource={resource}
                        selected={openResourceId === resource.id}
                        progress={resourceProgress[resource.id]}
                        onSelect={selectResource}
                        onToggleReviewed={onResourceReviewedToggle}
                        onProgressChange={onResourceProgressChange}
                      />
                    ))}
                  </div>
                </details>
              ))}
              {visibleResources.length === 0 && <p className="empty-state">No matching resources.</p>}
            </div>
          </section>
        </div>
      )}

      {tab === 'knowledge' && (
        <div className="module-panel">
          <ModuleKnowledge
            module={module}
            moduleCards={moduleCards}
            knowledge={knowledge}
            referenceDate={referenceDate}
            focusNoteId={focusKnowledgeNoteId}
            onOpenCard={actions.onOpen}
            {...knowledgeActions}
          />
        </div>
      )}

      {openResource && <ResourceReader resource={openResource} onClose={() => setOpenResourceId(null)} />}
    </div>
  )
}
