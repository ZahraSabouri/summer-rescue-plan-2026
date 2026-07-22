// A finder, not a second editor: every row here links out to the real note
// surface (module Overview tab, a card's drawer, a resource card, a module's
// Knowledge tab) rather than duplicating edit/delete UI. Four sections stay
// visually separate on purpose — module/card/resource notes and Knowledge
// "marked to revisit" are different things and should never read as one
// blended list. Visual language (kind dots, topic/tag chips) is borrowed
// straight from ModuleKnowledge.jsx so this reads as the same app, not a
// plainer second one.
import { useMemo, useState } from 'react'
import { KNOWLEDGE_SEEDS } from '../data/knowledgeSeeds'
import { kindMeta, resolveModuleNotes, revisitNotes } from '../utils/knowledge'
import { stripMarkdown } from '../utils/markdown'
import './NotesOverview.css'

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

function SectionIcon({ tone, children }) {
  return (
    <span className={`notes-section-icon tone-${tone}`} aria-hidden="true">
      {children}
    </span>
  )
}

function Chip({ children, tone }) {
  return <span className={`notes-chip${tone ? ` tone-${tone}` : ''}`}>{children}</span>
}

function NoteRow({ icon, title, chips, snippet, onOpen }) {
  return (
    <button type="button" className="notes-overview-row" onClick={onOpen}>
      {icon}
      <span className="notes-overview-row-body">
        <span className="notes-overview-row-head">
          <strong>{title}</strong>
          {chips?.length > 0 && <span className="notes-chip-row">{chips}</span>}
        </span>
        {snippet && <span className="notes-overview-preview">{snippet}</span>}
      </span>
    </button>
  )
}

function NotesSection({ tone, icon, title, rows, emptyHint, query, renderRow }) {
  return (
    <section className="notes-overview-section">
      <h3>
        <SectionIcon tone={tone}>{icon}</SectionIcon>
        {title}
        <span className="notes-section-count">{rows.length}</span>
      </h3>
      {rows.length === 0 ? (
        <p className="muted">{query ? 'Nothing here matches that search.' : emptyHint}</p>
      ) : (
        <div className="notes-overview-list">{rows.map(renderRow)}</div>
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

  const moduleRows = useMemo(
    () =>
      studyModules
        .map((module) => ({ module, text: moduleNotes[module.id] ?? '' }))
        .filter((row) => row.text.trim()),
    [moduleNotes, studyModules],
  )

  const cardRows = useMemo(
    () =>
      cards
        .flatMap((card) => (card.notes ?? []).map((note) => ({ card, note })))
        .sort((a, b) => String(b.note.at ?? '').localeCompare(String(a.note.at ?? ''))),
    [cards],
  )

  const resourceRows = useMemo(() => {
    const index = studyModules.flatMap((module) =>
      (module.resources ?? []).map((resource) => ({ ...resource, moduleTitle: module.title })),
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

  const filteredModuleRows = moduleRows.filter((row) => matches(query, row.text, row.module.title))
  const filteredCardRows = cardRows.filter((row) =>
    matches(query, row.note.text, row.card.title, ...(row.card.tags ?? [])),
  )
  const filteredResourceRows = resourceRows.filter((row) =>
    matches(query, row.note, row.resource.title, row.resource.group, ...(row.resource.tags ?? [])),
  )
  const filteredRevisitRows = revisitRows.filter((row) =>
    matches(query, row.note.title, row.note.body, row.note.topic, ...(row.note.tags ?? [])),
  )

  return (
    <div className="notes-overview">
      <header className="notes-overview-head">
        <p className="eyebrow">Notes</p>
        <h2>Everything you've written, in one place</h2>
        <p className="notes-overview-sub">
          Module scratchpads, card notes, resource notes, and Knowledge-tab concepts flagged to revisit — each stays
          its own section below. Click a row to open the real thing and edit it there.
        </p>
        <input
          type="search"
          className="notes-overview-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search across every note"
          aria-label="Search notes"
        />
      </header>

      <NotesSection
        tone="module"
        icon="◧"
        title="Module notes"
        rows={filteredModuleRows}
        emptyHint="Nothing yet — write in a module's scratchpad on its Overview tab."
        query={query}
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
            onOpen={() => onOpenModule?.(module.viewId)}
          />
        )}
      />

      <NotesSection
        tone="card"
        icon="▤"
        title="Card notes"
        rows={filteredCardRows}
        emptyHint="Nothing yet — notes you add on a card's drawer show up here."
        query={query}
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
            onOpen={() => onOpenCard?.(card.id)}
          />
        )}
      />

      <NotesSection
        tone="resource"
        icon="▥"
        title="Resource notes"
        rows={filteredResourceRows}
        emptyHint="Nothing yet — notes on a Materials-tab resource show up here."
        query={query}
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
            onOpen={() => onOpenResource?.(resource.id)}
          />
        )}
      />

      <NotesSection
        tone="knowledge"
        icon="◈"
        title="Knowledge — marked to revisit"
        rows={filteredRevisitRows}
        emptyHint='Nothing flagged — mark a concept note "Revisit" from any module’s Knowledge tab.'
        query={query}
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
              onOpen={() => onOpenKnowledgeNote?.(note)}
            />
          )
        }}
      />
    </div>
  )
}
