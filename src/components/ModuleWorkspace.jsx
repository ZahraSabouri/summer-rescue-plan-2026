import { useEffect, useMemo, useState } from 'react'
import {
  checklistDoneCount,
  formatDate,
  getCardDate,
  isOverdue,
  sortCards,
  sumHours,
} from '../utils/progress'
import { CardSummary } from './CardSummary'

function percent(done, total) {
  if (!total) return 0
  return Math.round((done / total) * 100)
}

function hours(value) {
  const number = Number(value || 0)
  return Number.isInteger(number) ? `${number}h` : `${number.toFixed(1)}h`
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
        if (!cancelled) setState({ url, status: 'ready', text, error: '' })
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


function ResourceCard({ resource, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`study-resource-card ${selected ? 'selected' : ''} ${resource.priority === 'high' ? 'high' : ''}`}
      onClick={() => onSelect(resource.id)}
    >
      <span className="type-badge">{resource.type}</span>
      <strong>{resource.title}</strong>
      <small>{resource.group}</small>
      <p>{resource.description || resource.path}</p>
    </button>
  )
}

function ResourceViewer({ resource }) {
  if (!resource) {
    return (
      <section className="resource-viewer empty">
        <p className="empty-state">Choose a resource to preview it here.</p>
      </section>
    )
  }

  return (
    <section className="resource-viewer">
      <header className="resource-viewer-toolbar">
        <div>
          <span className="type-badge">{resource.type}</span>
          <h2>{resource.title}</h2>
          <p>{resource.description || resource.path}</p>
        </div>
        <a className="secondary-button" href={resource.url} target="_blank" rel="noreferrer">
          Open
        </a>
      </header>

      {resource.viewer === 'image' && (
        <div className="image-preview">
          <img src={resource.url} alt={resource.title} />
        </div>
      )}

      {resource.viewer === 'frame' && (
        <iframe className="document-preview" title={resource.title} src={resource.url} />
      )}

      {resource.viewer === 'markdown' && <MarkdownPreview resource={resource} />}

      {resource.viewer === 'text' && <TextPreview resource={resource} />}

      {resource.viewer === 'notebook' && <NotebookPreview resource={resource} />}

      {resource.viewer === 'video' && (
        <div className="video-preview">
          <video src={resource.url} controls preload="metadata" />
        </div>
      )}

      {(resource.viewer === 'file' || resource.viewer === 'external') && (
        <div className="file-preview">
          <span className="type-badge">{resource.type}</span>
          <h3>{resource.title}</h3>
          <p>{resource.description || 'This file is best opened in its native application.'}</p>
          <a className="primary-button" href={resource.url} target="_blank" rel="noreferrer">
            Open resource
          </a>
        </div>
      )}
    </section>
  )
}

function ModuleStats({ moduleCards, referenceDate }) {
  const done = moduleCards.filter((card) => card.done).length
  const open = moduleCards.length - done
  const overdue = moduleCards.filter((card) => isOverdue(card, referenceDate)).length
  const checklistItems = moduleCards.reduce((sum, card) => sum + (card.checklist?.length ?? 0), 0)
  const checklistDone = moduleCards.reduce((sum, card) => sum + checklistDoneCount(card), 0)

  return (
    <div className="module-workspace-stats">
      <article>
        <span>Cards</span>
        <strong>{moduleCards.length}</strong>
        <p>{open} open</p>
      </article>
      <article>
        <span>Complete</span>
        <strong>{percent(done, moduleCards.length)}%</strong>
        <p>{done}/{moduleCards.length} cards</p>
      </article>
      <article>
        <span>Hours</span>
        <strong>{hours(sumHours(moduleCards, 'actualHours'))}</strong>
        <p>{hours(sumHours(moduleCards, 'estimatedHours'))} planned</p>
      </article>
      <article>
        <span>Checklist</span>
        <strong>{percent(checklistDone, checklistItems)}%</strong>
        <p>{checklistDone}/{checklistItems} items</p>
      </article>
      <article>
        <span>Overdue</span>
        <strong>{overdue}</strong>
        <p>{formatDate(referenceDate)}</p>
      </article>
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

export function ModuleWorkspace({
  module,
  cards,
  actions,
  referenceDate,
  mat700Active,
  setActiveView,
  moduleNote,
  onModuleNoteChange,
}) {
  const [selectedResourceId, setSelectedResourceId] = useState(module.resources[0]?.id ?? '')
  const [resourceQuery, setResourceQuery] = useState('')
  const [activeGroup, setActiveGroup] = useState('all')

  const moduleCards = useMemo(
    () => sortCards(cards.filter((card) => card.moduleGroup === module.moduleGroup)),
    [cards, module.moduleGroup],
  )
  const openCards = moduleCards.filter((card) => !card.done)
  const nextCards = openCards.slice(0, 8)
  const doneCards = moduleCards.filter((card) => card.done)
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
  const selectedResource =
    module.resources.find((resource) => resource.id === selectedResourceId) ?? visibleResources[0] ?? module.resources[0]
  const mat700Inactive = module.id === 'mat700' && !mat700Active

  return (
    <div className="module-workspace" style={{ '--module-accent': `var(${module.accent})` }}>
      <section className="module-hero">
        <div className="module-hero-copy">
          <p className="eyebrow">{module.code}</p>
          <h1>{module.title}</h1>
          <p>{module.examShape}</p>
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
          <img src={module.visual.url} alt="" />
        </div>
      </section>

      {mat700Inactive && (
        <div className="insurance-status-banner">
          <strong>MAT700 insurance lane is currently off.</strong>
          <span>Resources remain available, but planner metrics exclude MAT700 unless the MAT700 active toggle is on.</span>
        </div>
      )}

      <ModuleStats moduleCards={moduleCards} referenceDate={referenceDate} />
      <ModuleGuidance module={module} />

      <section className="module-layout">
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
                  {doneCards.slice(0, 12).map((card) => (
                    <CardSummary key={card.id} card={card} compact {...actions} />
                  ))}
                </div>
              </details>
            )}
          </section>

          <section className="resource-browser">
            <div className="resource-browser-sidebar">
              <div className="resource-search">
                <label className="search-field">
                  <span>Find resource</span>
                  <input
                    type="search"
                    value={resourceQuery}
                    onChange={(event) => setResourceQuery(event.target.value)}
                    placeholder="Search notes, formulas, labs, papers"
                  />
                </label>
                <select value={activeGroup} onChange={(event) => setActiveGroup(event.target.value)}>
                  {groups.map((group) => (
                    <option key={group} value={group}>
                      {group === 'all' ? 'All groups' : group}
                    </option>
                  ))}
                </select>
              </div>
              <div className="study-resource-list">
                {visibleResources.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    selected={selectedResource?.id === resource.id}
                    onSelect={setSelectedResourceId}
                  />
                ))}
                {visibleResources.length === 0 && <p className="empty-state">No matching resources.</p>}
              </div>
            </div>
            <ResourceViewer resource={selectedResource} />
          </section>
        </div>

        <aside className="module-side-column">
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
      </section>

      <DrillPanel module={module} />
    </div>
  )
}
