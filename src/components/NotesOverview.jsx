// A finder, not a second editor: every row here links out to the real note
// surface (module Overview tab, a card's drawer, a resource card, a module's
// Knowledge tab) rather than duplicating edit/delete UI. Four sections stay
// visually separate on purpose — module/card/resource notes and Knowledge
// "marked to revisit" are different things and should never read as one
// blended list.
import { useMemo, useState } from 'react'
import { KNOWLEDGE_SEEDS } from '../data/knowledgeSeeds'
import { resolveModuleNotes, revisitNotes } from '../utils/knowledge'
import './NotesOverview.css'

function preview(text, length = 140) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!flat) return ''
  return flat.length <= length ? flat : `${flat.slice(0, length).trimEnd()}…`
}

function matches(query, ...fields) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return fields.some((field) => String(field ?? '').toLowerCase().includes(needle))
}

function NotesSection({ title, rows, emptyHint, query, renderRow }) {
  return (
    <section className="notes-overview-section">
      <h3>
        {title}
        <span>{rows.length}</span>
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
  const filteredCardRows = cardRows.filter((row) => matches(query, row.note.text, row.card.title))
  const filteredResourceRows = resourceRows.filter((row) => matches(query, row.note, row.resource.title))
  const filteredRevisitRows = revisitRows.filter((row) => matches(query, row.note.title, row.note.body))

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
        title="Module notes"
        rows={filteredModuleRows}
        emptyHint="Nothing yet — write in a module's scratchpad on its Overview tab."
        query={query}
        renderRow={({ module, text }) => (
          <button key={module.id} type="button" className="notes-overview-row" onClick={() => onOpenModule?.(module.viewId)}>
            <strong>{module.title}</strong>
            <span>{preview(text)}</span>
          </button>
        )}
      />

      <NotesSection
        title="Card notes"
        rows={filteredCardRows}
        emptyHint="Nothing yet — notes you add on a card's drawer show up here."
        query={query}
        renderRow={({ card, note }) => (
          <button key={note.id} type="button" className="notes-overview-row" onClick={() => onOpenCard?.(card.id)}>
            <strong>{card.title}</strong>
            <span>{preview(note.text)}</span>
          </button>
        )}
      />

      <NotesSection
        title="Resource notes"
        rows={filteredResourceRows}
        emptyHint="Nothing yet — notes on a Materials-tab resource show up here."
        query={query}
        renderRow={({ resource, note }) => (
          <button key={resource.id} type="button" className="notes-overview-row" onClick={() => onOpenResource?.(resource.id)}>
            <strong>{resource.title}</strong>
            <small>{resource.moduleTitle}</small>
            <span>{preview(note)}</span>
          </button>
        )}
      />

      <NotesSection
        title="Knowledge — marked to revisit"
        rows={filteredRevisitRows}
        emptyHint='Nothing flagged — mark a concept note "Revisit" from any module’s Knowledge tab.'
        query={query}
        renderRow={({ module, note }) => (
          <button key={note.id} type="button" className="notes-overview-row" onClick={() => onOpenKnowledgeNote?.(note)}>
            <strong>{note.title}</strong>
            <small>{module.title}</small>
          </button>
        )}
      />
    </div>
  )
}
