// A finder, not a second editor — but "finding" means previewing right here,
// not being yanked away from the page you were on. Clicking a row opens the
// note in a lightweight modal (the same reader-shell/reader-window pattern
// CardDetailDrawer's "concept notes" chips already use to preview a Knowledge
// note without leaving the card); "Open" inside that modal is the only thing
// that actually navigates. Four sections stay visually separate on purpose —
// module/card/resource notes and Knowledge "marked to revisit" are different
// things and should never read as one blended list.
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { KNOWLEDGE_SEEDS } from '../data/knowledgeSeeds'
import { kindMeta, resolveModuleNotes, revisitNotes } from '../utils/knowledge'
import { stripMarkdown } from '../utils/markdown'
import { MarkdownDoc } from './MarkdownDoc'
import './NotesOverview.css'

const PAGE_SIZE = 6
const SORTS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'az', label: 'A–Z' },
]

function preview(text, length = 140) {
  const flat = stripMarkdown(text)
  if (!flat) return ''
  return flat.length <= length ? flat : `${flat.slice(0, length).trimEnd()}…`
}

function matches(query, ...fields) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return fields.some((field) => String(field ?? '').toLowerCase().includes(needle))
}

function sortRows(rows, sort, dateOf, titleOf) {
  const sorted = [...rows]
  if (sort === 'az') sorted.sort((a, b) => titleOf(a).localeCompare(titleOf(b)))
  else sorted.sort((a, b) => String(dateOf(b) ?? '').localeCompare(String(dateOf(a) ?? '')))
  return sorted
}

function SectionIcon({ tone, children }) {
  return (
    <span className={`notes-section-icon tone-${tone}`} aria-hidden="true">
      {children}
    </span>
  )
}

function Chip({ children, tone }) {
  return (
    <span className={`notes-chip${tone ? ` tone-${tone}` : ''}`} dir="auto">
      {children}
    </span>
  )
}

function NoteRow({ icon, title, chips, snippet, onOpen }) {
  return (
    <button type="button" className="notes-overview-row" onClick={onOpen}>
      {icon}
      <span className="notes-overview-row-body">
        <span className="notes-overview-row-head">
          <strong dir="auto">{title}</strong>
          {chips?.length > 0 && <span className="notes-chip-row">{chips}</span>}
        </span>
        {snippet && (
          <span className="notes-overview-preview" dir="auto">
            {snippet}
          </span>
        )}
      </span>
    </button>
  )
}

// Same composition as CardDetailDrawer.jsx's NoteReader (reader-shell /
// reader-window / reader-chrome / reader-dots / reader-addr / reader-body),
// so a note previewed from this page looks like the same feature, not a
// second one — the only new part is the "Open" action, since this modal has
// no owning surface of its own to fall back to.
function NotePreviewModal({ eyebrow, title, body, openLabel, onOpen, onClose }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="reader-shell"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="reader-window is-compact">
        <header className="reader-chrome">
          <span className="reader-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div className="reader-addr">
            {eyebrow && <span className="type-badge">{eyebrow}</span>}
            <strong dir="auto" title={title}>
              {title}
            </strong>
          </div>
          <div className="reader-actions">
            {onOpen && (
              <button type="button" className="reader-btn" onClick={onOpen}>
                {openLabel}
              </button>
            )}
            <button type="button" className="reader-btn reader-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </header>
        <div className="reader-body">
          <div className="markdown-preview">{body}</div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function NotesSection({ tone, icon, title, allCount, rows, emptyHint, query, page, onShowMore, renderRow }) {
  const visible = rows.slice(0, page)
  return (
    <section className="notes-overview-section">
      <h3>
        <SectionIcon tone={tone}>{icon}</SectionIcon>
        {title}
        <span className="notes-section-count">
          {rows.length}
          {rows.length !== allCount ? ` / ${allCount}` : ''}
        </span>
      </h3>
      {rows.length === 0 ? (
        <p className="muted">{query ? 'Nothing here matches that search.' : emptyHint}</p>
      ) : (
        <>
          <div className="notes-overview-list">{visible.map(renderRow)}</div>
          {rows.length > visible.length && (
            <button type="button" className="text-button notes-show-more" onClick={onShowMore}>
              Show {Math.min(PAGE_SIZE, rows.length - visible.length)} more ({rows.length - visible.length} left)
            </button>
          )}
        </>
      )}
    </section>
  )
}

export function NotesOverview({
  moduleNotes = {},
  cards = [],
  studyModules = [],
  resourceProgress = {},
  knowledge,
  referenceDate,
  onOpenModule,
  onOpenCard,
  onOpenResource,
  onOpenKnowledgeNote,
}) {
  const [query, setQuery] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [sort, setSort] = useState('newest')
  const [pages, setPages] = useState({ module: PAGE_SIZE, card: PAGE_SIZE, resource: PAGE_SIZE, revisit: PAGE_SIZE })
  const [previewNote, setPreviewNote] = useState(null)

  // Any change to the active filter should start every section back at page
  // one — otherwise "Show more" clicks from a previous, broader view leave
  // stale, oversized pages once the result set shrinks. Adjusted during
  // render (not an effect) — same pattern ModuleKnowledge.jsx uses for its
  // focus-note handoff.
  const filterSignature = `${query}|${moduleFilter}|${sort}`
  const [lastFilterSignature, setLastFilterSignature] = useState(filterSignature)
  if (filterSignature !== lastFilterSignature) {
    setLastFilterSignature(filterSignature)
    setPages({ module: PAGE_SIZE, card: PAGE_SIZE, resource: PAGE_SIZE, revisit: PAGE_SIZE })
  }

  const moduleGroupToId = useMemo(
    () => Object.fromEntries(studyModules.map((module) => [module.moduleGroup, module.id])),
    [studyModules],
  )

  const moduleRows = useMemo(
    () =>
      studyModules
        .map((module) => ({ module, text: moduleNotes[module.id] ?? '' }))
        .filter((row) => row.text.trim()),
    [moduleNotes, studyModules],
  )

  const cardRows = useMemo(
    () => cards.flatMap((card) => (card.notes ?? []).map((note) => ({ card, note }))),
    [cards],
  )

  const resourceRows = useMemo(() => {
    const index = studyModules.flatMap((module) =>
      (module.resources ?? []).map((resource) => ({ ...resource, moduleId: module.id, moduleTitle: module.title })),
    )
    return index
      .map((resource) => ({ resource, note: resourceProgress[resource.id]?.note ?? '' }))
      .filter((row) => row.note.trim())
  }, [resourceProgress, studyModules])

  const revisitRows = useMemo(
    () =>
      studyModules.flatMap((module) =>
        revisitNotes(resolveModuleNotes({ seeds: KNOWLEDGE_SEEDS, knowledge, moduleId: module.id, referenceDate })).map(
          (note) => ({ module, note }),
        ),
      ),
    [knowledge, referenceDate, studyModules],
  )

  const byModule = {
    module: (row) => row.module.id === moduleFilter,
    card: (row) => moduleGroupToId[row.card.moduleGroup] === moduleFilter,
    resource: (row) => row.resource.moduleId === moduleFilter,
    revisit: (row) => row.module.id === moduleFilter,
  }

  function scoped(rows, kind, searchFields, dateOf, titleOf) {
    let list = moduleFilter ? rows.filter(byModule[kind]) : rows
    list = list.filter((row) => matches(query, ...searchFields(row)))
    return sortRows(list, sort, dateOf, titleOf)
  }

  const filteredModuleRows = scoped(
    moduleRows,
    'module',
    (row) => [row.text, row.module.title],
    (row) => row.module.title,
    (row) => row.module.title,
  )
  const filteredCardRows = scoped(
    cardRows,
    'card',
    (row) => [row.note.text, row.card.title, ...(row.card.tags ?? [])],
    (row) => row.note.at,
    (row) => row.card.title,
  )
  const filteredResourceRows = scoped(
    resourceRows,
    'resource',
    (row) => [row.note, row.resource.title, row.resource.group, ...(row.resource.tags ?? [])],
    (row) => row.resource.uploadedAt,
    (row) => row.resource.title,
  )
  const filteredRevisitRows = scoped(
    revisitRows,
    'revisit',
    (row) => [row.note.title, row.note.body, row.note.topic, ...(row.note.tags ?? [])],
    (row) => row.note.updatedAt,
    (row) => row.note.title,
  )

  function showMore(section) {
    setPages((current) => ({ ...current, [section]: current[section] + PAGE_SIZE }))
  }

  return (
    <div className="notes-overview">
      <header className="notes-overview-head">
        <p className="eyebrow">Notes</p>
        <h2>Everything you've written, in one place</h2>
        <p className="notes-overview-sub">
          Module scratchpads, card notes, resource notes, and Knowledge-tab concepts flagged to revisit — each stays
          its own section below. Click a row to preview it here; open the real thing only if you want to edit it.
        </p>
        <input
          type="search"
          className="notes-overview-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search across every note"
          aria-label="Search notes"
          dir="auto"
        />
        <div className="notes-overview-controls">
          <div className="notes-module-filter-row" role="group" aria-label="Filter by module">
            <button
              type="button"
              className={`notes-tag-filter${!moduleFilter ? ' active' : ''}`}
              onClick={() => setModuleFilter('')}
            >
              All modules
            </button>
            {studyModules.map((module) => (
              <button
                key={module.id}
                type="button"
                className={`notes-tag-filter${moduleFilter === module.id ? ' active' : ''}`}
                onClick={() => setModuleFilter(module.id === moduleFilter ? '' : module.id)}
              >
                {module.title}
              </button>
            ))}
          </div>
          <label className="notes-sort-select">
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              {SORTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <NotesSection
        tone="module"
        icon="◧"
        title="Module notes"
        allCount={moduleRows.length}
        rows={filteredModuleRows}
        emptyHint="Nothing yet — write in a module's scratchpad on its Overview tab."
        query={query}
        page={pages.module}
        onShowMore={() => showMore('module')}
        renderRow={({ module, text }) => (
          <NoteRow
            key={module.id}
            icon={<SectionIcon tone="module">◧</SectionIcon>}
            title={module.title}
            chips={[
              <Chip key="code" tone="module">
                {module.code}
              </Chip>,
            ]}
            snippet={preview(text)}
            onOpen={() =>
              setPreviewNote({
                eyebrow: 'Module note',
                title: module.title,
                body: <MarkdownDoc source={text} />,
                openLabel: 'Open module',
                onOpen: () => onOpenModule?.(module.viewId),
              })
            }
          />
        )}
      />

      <NotesSection
        tone="card"
        icon="▤"
        title="Card notes"
        allCount={cardRows.length}
        rows={filteredCardRows}
        emptyHint="Nothing yet — notes you add on a card's drawer show up here."
        query={query}
        page={pages.card}
        onShowMore={() => showMore('card')}
        renderRow={({ card, note }) => (
          <NoteRow
            key={note.id}
            icon={<SectionIcon tone="card">▤</SectionIcon>}
            title={card.title}
            chips={[
              card.moduleGroup && (
                <Chip key="module" tone="card">
                  {card.moduleGroup}
                </Chip>
              ),
              ...(card.tags ?? []).slice(0, 3).map((tag) => <Chip key={tag}>{tag}</Chip>),
            ].filter(Boolean)}
            snippet={preview(note.text)}
            onOpen={() =>
              setPreviewNote({
                eyebrow: 'Card note',
                title: card.title,
                body: <MarkdownDoc source={note.text} />,
                openLabel: 'Open card',
                onOpen: () => onOpenCard?.(card.id),
              })
            }
          />
        )}
      />

      <NotesSection
        tone="resource"
        icon="▥"
        title="Resource notes"
        allCount={resourceRows.length}
        rows={filteredResourceRows}
        emptyHint="Nothing yet — notes on a Materials-tab resource show up here."
        query={query}
        page={pages.resource}
        onShowMore={() => showMore('resource')}
        renderRow={({ resource, note }) => (
          <NoteRow
            key={resource.id}
            icon={<SectionIcon tone="resource">▥</SectionIcon>}
            title={resource.title}
            chips={[
              <Chip key="type" tone="resource">
                {resource.type}
              </Chip>,
              <Chip key="module">{resource.moduleTitle}</Chip>,
            ]}
            snippet={preview(note)}
            onOpen={() =>
              setPreviewNote({
                eyebrow: 'Resource note',
                title: resource.title,
                body: <MarkdownDoc source={note} />,
                openLabel: 'Open resource',
                onOpen: () => onOpenResource?.(resource.id),
              })
            }
          />
        )}
      />

      <NotesSection
        tone="knowledge"
        icon="◈"
        title="Knowledge — marked to revisit"
        allCount={revisitRows.length}
        rows={filteredRevisitRows}
        emptyHint='Nothing flagged — mark a concept note "Revisit" from any module’s Knowledge tab.'
        query={query}
        page={pages.revisit}
        onShowMore={() => showMore('revisit')}
        renderRow={({ module, note }) => {
          const kind = kindMeta(note.kind)
          return (
            <NoteRow
              key={note.id}
              icon={
                <span className={`notes-kind-dot kind-${note.kind}`} aria-hidden="true">
                  {kind.icon}
                </span>
              }
              title={note.title}
              chips={[
                <Chip key="topic" tone="knowledge">
                  {note.topic}
                </Chip>,
                <Chip key="module">{module.title}</Chip>,
              ]}
              onOpen={() =>
                setPreviewNote({
                  eyebrow: `${kind.icon} ${kind.label}`,
                  title: note.title,
                  body: <MarkdownDoc source={note.body} />,
                  openLabel: 'Open in Knowledge tab',
                  onOpen: () => onOpenKnowledgeNote?.(note),
                })
              }
            />
          )
        }}
      />

      {previewNote && (
        <NotePreviewModal
          eyebrow={previewNote.eyebrow}
          title={previewNote.title}
          body={previewNote.body}
          openLabel={previewNote.openLabel}
          onOpen={() => {
            previewNote.onOpen()
            setPreviewNote(null)
          }}
          onClose={() => setPreviewNote(null)}
        />
      )}
    </div>
  )
}
