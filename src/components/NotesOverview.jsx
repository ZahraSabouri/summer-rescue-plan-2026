// A finder, not a second editor — but "finding" means previewing right here,
// not being yanked away from the page you were on. Clicking a row opens the
// note in a lightweight modal (the same reader-shell/reader-window pattern
// CardDetailDrawer's "concept notes" chips already use to preview a Knowledge
// note without leaving the card); "Open" inside that modal is the only thing
// that actually navigates.
//
// Grouping is module/category-first, not type-first: each module's section
// mixes its scratchpad, its cards' notes, its resources' notes, and its
// Knowledge concepts flagged to revisit — everything you've written *about
// that module* in one place — with a small coloured type badge on every row
// so the mix stays legible. Cards that aren't module work at all (tagged
// "history", or living in Admin/Health/General/Job Hunt) get their own
// trailing sections instead of being folded into a module they don't belong
// to. A tag cloud and a module/category filter are two independent facets
// over the same data, not a single flat search box pretending to be both.
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

const MODULE_SHORT = { aml: 'ML', 'time-series': 'TS', 'team-project': 'TP', mat700: 'DM' }
const TRAILING_GROUPS = [
  { key: 'history', label: 'History', icon: '⏱' },
  { key: 'life', label: 'Life', icon: '♡' },
  { key: 'admin', label: 'Admin', icon: '▦' },
  { key: 'jobs', label: 'Job Hunt', icon: '◆' },
]

const TYPE_META = {
  module: { label: 'Module', tone: 'module', icon: '◧' },
  card: { label: 'Card', tone: 'card', icon: '▤' },
  resource: { label: 'Resource', tone: 'resource', icon: '▥' },
  knowledge: { label: 'Concept', tone: 'knowledge', icon: '◈' },
}

function groupKeyForCard(card, moduleGroupToId) {
  if ((card.tags ?? []).includes('history')) return 'history'
  if (moduleGroupToId[card.moduleGroup]) return moduleGroupToId[card.moduleGroup]
  if (card.moduleGroup === 'Admin') return 'admin'
  if (card.moduleGroup === 'Health' || card.moduleGroup === 'General') return 'life'
  if (card.moduleGroup === 'Job Hunt') return 'jobs'
  return null
}

function snippet(text, length = 140) {
  const flat = stripMarkdown(text)
  if (!flat) return ''
  return flat.length <= length ? flat : `${flat.slice(0, length).trimEnd()}…`
}

function matchesQuery(query, item) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [item.title, item.snippet, ...item.tags].some((field) => String(field ?? '').toLowerCase().includes(needle))
}

function sortItems(items, sort) {
  const sorted = [...items]
  if (sort === 'az') sorted.sort((a, b) => a.title.localeCompare(b.title))
  else sorted.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
  return sorted
}

function TypeIcon({ item }) {
  if (item.type === 'knowledge') {
    return (
      <span className={`notes-kind-dot kind-${item.kindClass}`} aria-hidden="true">
        {item.kindIcon}
      </span>
    )
  }
  const meta = TYPE_META[item.type]
  return (
    <span className={`notes-section-icon tone-${meta.tone}`} aria-hidden="true">
      {meta.icon}
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

function NoteRow({ item, onOpen }) {
  const typeMeta = TYPE_META[item.type]
  return (
    <button type="button" className="notes-overview-row" onClick={onOpen}>
      <TypeIcon item={item} />
      <span className="notes-overview-row-body">
        <span className="notes-overview-row-head">
          <strong dir="auto">{item.title}</strong>
          <span className="notes-chip-row">
            <Chip tone={typeMeta.tone}>{typeMeta.label}</Chip>
            {item.extraChip && <Chip>{item.extraChip}</Chip>}
            {item.tags.slice(0, 2).map((tag) => (
              <Chip key={tag}>{tag}</Chip>
            ))}
          </span>
        </span>
        {item.snippet && (
          <span className="notes-overview-preview" dir="auto">
            {item.snippet}
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

function GroupSection({ group, page, onShowMore, onOpenItem }) {
  const visible = group.items.slice(0, page)
  return (
    <section className="notes-overview-section">
      <h3>
        <span className="notes-section-icon tone-group" aria-hidden="true">
          {group.icon}
        </span>
        {group.label}
        {group.code && <span className="notes-group-code">{group.code}</span>}
        <span className="notes-section-count">{group.items.length}</span>
      </h3>
      {group.items.length === 0 ? (
        <p className="muted">{group.emptyHint}</p>
      ) : (
        <>
          <div className="notes-overview-list">
            {visible.map((item) => (
              <NoteRow key={item.id} item={item} onOpen={() => onOpenItem(item)} />
            ))}
          </div>
          {group.items.length > visible.length && (
            <button type="button" className="text-button notes-show-more" onClick={onShowMore}>
              Show {Math.min(PAGE_SIZE, group.items.length - visible.length)} more (
              {group.items.length - visible.length} left)
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
  const [groupFilter, setGroupFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [sort, setSort] = useState('newest')
  const [pages, setPages] = useState({})
  const [previewNote, setPreviewNote] = useState(null)

  const rawGroups = useMemo(() => {
    const moduleGroups = studyModules.map((module) => ({
      key: module.id,
      label: module.title,
      code: MODULE_SHORT[module.id] ?? module.code,
      icon: '◆',
      emptyHint: `Nothing yet for ${module.title} — module, card, resource, and revisit-flagged concept notes will show up here.`,
      items: [],
    }))
    const trailing = TRAILING_GROUPS.map((entry) => ({
      ...entry,
      code: '',
      emptyHint: 'Nothing here yet.',
      items: [],
    }))
    const byKey = Object.fromEntries([...moduleGroups, ...trailing].map((group) => [group.key, group]))

    for (const module of studyModules) {
      const text = moduleNotes[module.id] ?? ''
      if (text.trim()) {
        byKey[module.id].items.push({
          id: `module-${module.id}`,
          type: 'module',
          title: module.title,
          tags: [],
          date: '',
          snippet: snippet(text),
          body: <MarkdownDoc source={text} />,
          onOpen: () => onOpenModule?.(module.viewId),
          openLabel: 'Open module',
          eyebrow: 'Module note',
        })
      }
      for (const resource of module.resources ?? []) {
        const note = resourceProgress[resource.id]?.note ?? ''
        if (!note.trim()) continue
        byKey[module.id].items.push({
          id: `resource-${resource.id}`,
          type: 'resource',
          title: resource.title,
          tags: resource.tags ?? [],
          extraChip: resource.type,
          date: resourceProgress[resource.id]?.updatedAt ?? '',
          snippet: snippet(note),
          body: <MarkdownDoc source={note} />,
          onOpen: () => onOpenResource?.(resource.id),
          openLabel: 'Open resource',
          eyebrow: 'Resource note',
        })
      }
      const revisit = revisitNotes(
        resolveModuleNotes({ seeds: KNOWLEDGE_SEEDS, knowledge, moduleId: module.id, referenceDate }),
      )
      for (const note of revisit) {
        const kind = kindMeta(note.kind)
        byKey[module.id].items.push({
          id: `knowledge-${note.id}`,
          type: 'knowledge',
          title: note.title,
          tags: note.tags ?? [],
          extraChip: note.topic,
          date: note.updatedAt ?? '',
          snippet: '',
          kindIcon: kind.icon,
          kindClass: note.kind,
          body: <MarkdownDoc source={note.body} />,
          onOpen: () => onOpenKnowledgeNote?.(note),
          openLabel: 'Open in Knowledge tab',
          eyebrow: `${kind.icon} ${kind.label}`,
        })
      }
    }

    const moduleGroupToId = Object.fromEntries(studyModules.map((module) => [module.moduleGroup, module.id]))
    for (const card of cards) {
      const groupKey = groupKeyForCard(card, moduleGroupToId)
      const target = groupKey ? byKey[groupKey] : null
      if (!target) continue
      for (const note of card.notes ?? []) {
        target.items.push({
          id: `card-${note.id}`,
          type: 'card',
          title: card.title,
          tags: card.tags ?? [],
          extraChip: card.moduleGroup,
          date: note.at ?? '',
          snippet: snippet(note.text),
          body: <MarkdownDoc source={note.text} />,
          onOpen: () => onOpenCard?.(card.id),
          openLabel: 'Open card',
          eyebrow: 'Card note',
        })
      }
    }

    return [...moduleGroups, ...trailing]
  }, [cards, knowledge, moduleNotes, onOpenCard, onOpenKnowledgeNote, onOpenModule, onOpenResource, referenceDate, resourceProgress, studyModules])

  const allTags = useMemo(() => {
    const set = new Set()
    for (const group of rawGroups) {
      for (const item of group.items) {
        for (const tag of item.tags) set.add(tag)
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [rawGroups])

  const totalCount = rawGroups.reduce((sum, group) => sum + group.items.length, 0)
  const typeCounts = useMemo(() => {
    const counts = { module: 0, card: 0, resource: 0, knowledge: 0 }
    for (const group of rawGroups) {
      for (const item of group.items) counts[item.type] += 1
    }
    return counts
  }, [rawGroups])

  const visibleGroups = rawGroups
    .filter((group) => !groupFilter || group.key === groupFilter)
    .map((group) => ({
      ...group,
      items: sortItems(
        group.items.filter((item) => (!tagFilter || item.tags.includes(tagFilter)) && matchesQuery(query, item)),
        sort,
      ),
    }))

  function showMore(key) {
    setPages((current) => ({ ...current, [key]: (current[key] ?? PAGE_SIZE) + PAGE_SIZE }))
  }

  function openItem(item) {
    setPreviewNote(item)
  }

  return (
    <div className="notes-overview">
      <header className="notes-overview-head">
        <p className="eyebrow">Notes</p>
        <h2>Everything you've written, in one place</h2>
        <p className="notes-overview-sub">
          Grouped by module and category first — each section mixes that module's scratchpad, card notes, resource
          notes, and Knowledge concepts flagged to revisit, so everything about one thing lives together. Click a
          row to preview it here; open the real thing only if you want to edit it.
        </p>
        <p className="notes-overview-stats">
          <strong>{totalCount}</strong> notes — {typeCounts.module} module · {typeCounts.card} card ·{' '}
          {typeCounts.resource} resource · {typeCounts.knowledge} concept
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
        <div className="notes-filter-facet">
          <span className="notes-filter-facet-label">Category</span>
          <div className="notes-module-filter-row" role="group" aria-label="Filter by module or category">
            <button
              type="button"
              className={`notes-tag-filter${!groupFilter ? ' active' : ''}`}
              onClick={() => setGroupFilter('')}
            >
              All
            </button>
            {rawGroups.map((group) => (
              <button
                key={group.key}
                type="button"
                className={`notes-tag-filter${groupFilter === group.key ? ' active' : ''}`}
                onClick={() => setGroupFilter(group.key === groupFilter ? '' : group.key)}
              >
                {group.label}
              </button>
            ))}
          </div>
        </div>
        {allTags.length > 0 && (
          <div className="notes-filter-facet">
            <span className="notes-filter-facet-label">Tags</span>
            <div className="notes-module-filter-row" role="group" aria-label="Filter by tag">
              <button
                type="button"
                className={`notes-tag-filter${!tagFilter ? ' active' : ''}`}
                onClick={() => setTagFilter('')}
              >
                All
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`notes-tag-filter${tagFilter === tag ? ' active' : ''}`}
                  onClick={() => setTagFilter(tag === tagFilter ? '' : tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
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
      </header>

      {visibleGroups.map((group) => (
        <GroupSection
          key={group.key}
          group={group}
          page={pages[group.key] ?? PAGE_SIZE}
          onShowMore={() => showMore(group.key)}
          onOpenItem={openItem}
        />
      ))}

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
