import { useMemo, useRef, useState } from 'react'
import { KNOWLEDGE_SEEDS } from '../data/knowledgeSeeds'
import {
  DEFAULT_TOPIC,
  NOTE_KINDS,
  createNoteId,
  groupNotesByTopic,
  kindMeta,
  knowledgeSummary,
  resolveModuleNotes,
  searchNotes,
} from '../utils/knowledge'
import { buildToc, countWords, parseMarkdown, readMinutes, splitNoteSections } from '../utils/markdown'
import { formatDate } from '../utils/progress'
import { MarkdownDoc, MarkdownPreview } from './MarkdownDoc'
import './ModuleKnowledge.css'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'due', label: 'Due' },
  { id: 'starred', label: 'Starred' },
]

const EMPTY_DRAFT = { id: '', title: '', kind: 'concept', topic: '', tags: '', body: '' }

function NoteRailItem({ note, active, onSelect }) {
  const kind = kindMeta(note.kind)
  return (
    <button
      type="button"
      className={`kn-rail-item${active ? ' active' : ''}`}
      onClick={() => onSelect(note.id)}
      aria-current={active ? 'true' : undefined}
    >
      <span className={`kn-kind-dot kind-${note.kind}`} aria-hidden="true">
        {kind.icon}
      </span>
      <span className="kn-rail-text">
        <strong>{note.title}</strong>
        <small>
          {kind.label}
          {note.review.state === 'due' && <span className="kn-due-flag"> · due</span>}
          {note.review.state === 'new' && <span className="kn-new-flag"> · unread</span>}
        </small>
      </span>
      {note.meta.starred && (
        <span className="kn-star-mark" aria-label="Starred">
          ★
        </span>
      )}
    </button>
  )
}

function SelfTest({ note, questions, onRate }) {
  // Mounted with key={note.id}, so a different note starts with nothing
  // revealed without needing an effect to clear it.
  const [revealed, setRevealed] = useState(() => new Set())
  const known = questions.filter((_, index) => note.meta.quiz[index] === 'know').length

  function toggleReveal(index) {
    setRevealed((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <section className="kn-selftest">
      <div className="kn-selftest-head">
        <div>
          <p className="eyebrow">Recall check</p>
          <h3>Check yourself</h3>
        </div>
        <span className="status-pill">
          {known}/{questions.length} solid
        </span>
      </div>
      <div className="kn-selftest-bar" role="img" aria-label={`${known} of ${questions.length} marked solid`}>
        <span style={{ width: `${questions.length ? (known / questions.length) * 100 : 0}%` }} />
      </div>
      <ol className="kn-question-list">
        {questions.map((entry, index) => {
          const rating = note.meta.quiz[index]
          const open = revealed.has(index)
          return (
            <li key={index} className={`kn-question${rating ? ` rated-${rating}` : ''}`}>
              <p className="kn-question-text">{entry.question}</p>
              {entry.answer && (
                <div className="kn-answer-zone">
                  {open ? (
                    <p className="kn-answer">{entry.answer}</p>
                  ) : (
                    <button type="button" className="text-button" onClick={() => toggleReveal(index)}>
                      Show answer
                    </button>
                  )}
                  {open && (
                    <button type="button" className="text-button" onClick={() => toggleReveal(index)}>
                      Hide
                    </button>
                  )}
                </div>
              )}
              <div className="kn-question-actions">
                <button
                  type="button"
                  className={`kn-rate know${rating === 'know' ? ' active' : ''}`}
                  onClick={() => onRate(note.id, index, 'know')}
                >
                  I know this
                </button>
                <button
                  type="button"
                  className={`kn-rate unsure${rating === 'unsure' ? ' active' : ''}`}
                  onClick={() => onRate(note.id, index, 'unsure')}
                >
                  Shaky
                </button>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function NoteEditor({ draft, setDraft, onSave, onCancel, topics }) {
  const [showPreview, setShowPreview] = useState(false)
  const fileRef = useRef(null)

  async function importFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const body = await file.text()
    // A pasted export usually leads with its own title; reuse it rather than
    // making the user retype it.
    const firstHeading = /^#\s+(.+)$/m.exec(body)
    setDraft((current) => ({
      ...current,
      body,
      title: current.title || (firstHeading ? firstHeading[1].trim() : file.name.replace(/\.(md|markdown|txt)$/i, '')),
    }))
    event.target.value = ''
  }

  const canSave = draft.title.trim() && draft.body.trim()

  return (
    <div className="kn-editor">
      <div className="kn-editor-head">
        <h3>{draft.id ? 'Edit note' : 'New note'}</h3>
        <div className="kn-editor-head-actions">
          <button type="button" className="text-button" onClick={() => fileRef.current?.click()}>
            Import .md
          </button>
          <button type="button" className="text-button" onClick={() => setShowPreview((value) => !value)}>
            {showPreview ? 'Hide preview' : 'Live preview'}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          onChange={importFile}
          hidden
        />
      </div>

      <div className="kn-editor-fields">
        <label>
          <span>Title</span>
          <input
            type="text"
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Machine-learning types: complete reference"
          />
        </label>
        <label>
          <span>Kind</span>
          <select
            value={draft.kind}
            onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value }))}
          >
            {NOTE_KINDS.map((kind) => (
              <option key={kind.id} value={kind.id}>
                {kind.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Topic</span>
          <input
            type="text"
            list="kn-topic-options"
            value={draft.topic}
            onChange={(event) => setDraft((current) => ({ ...current, topic: event.target.value }))}
            placeholder={DEFAULT_TOPIC}
          />
          <datalist id="kn-topic-options">
            {topics.map((topic) => (
              <option key={topic} value={topic} />
            ))}
          </datalist>
        </label>
        <label>
          <span>Tags</span>
          <input
            type="text"
            value={draft.tags}
            onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
            placeholder="taxonomy, supervised, exam"
          />
        </label>
      </div>

      <p className="kn-editor-hint">
        Markdown: <code>#</code> headings, <code>|</code> tables, <code>```</code> blocks, <code>$math$</code>. A
        <code> ## Check yourself</code> section becomes self-test cards — write{' '}
        <code>question :: answer</code> to make the answer revealable. A <code>## Sources</code> list becomes footer
        chips.
      </p>

      <div className={`kn-editor-body${showPreview ? ' split' : ''}`}>
        <textarea
          className="kn-editor-textarea"
          value={draft.body}
          onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
          placeholder="Paste your markdown here."
          spellCheck={false}
        />
        {showPreview && (
          <div className="kn-editor-preview">
            <MarkdownPreview source={draft.body} />
          </div>
        )}
      </div>

      <div className="kn-editor-actions">
        <button type="button" className="primary-button" disabled={!canSave} onClick={onSave}>
          Save note
        </button>
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        {!canSave && <span className="kn-editor-note">A title and some body text are required.</span>}
      </div>
    </div>
  )
}

function NoteReader({
  note,
  moduleCards,
  wide,
  onToggleWide,
  onToggleStar,
  onMarkReviewed,
  onRate,
  onEdit,
  onDelete,
  onSetCardLinks,
  onOpenCard,
}) {
  const [linking, setLinking] = useState(false)
  const parsed = useMemo(() => parseMarkdown(note.body), [note.body])
  const { body, questions, sources } = useMemo(() => splitNoteSections(parsed), [parsed])
  const toc = useMemo(() => buildToc(body), [body])
  const kind = kindMeta(note.kind)
  const linkedCards = moduleCards.filter((card) => note.cardIds.includes(card.id))

  function jumpTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function toggleCardLink(cardId) {
    const next = note.cardIds.includes(cardId)
      ? note.cardIds.filter((id) => id !== cardId)
      : [...note.cardIds, cardId]
    onSetCardLinks(note.id, next)
  }

  return (
    <article className="kn-reader">
      <header className={`kn-reader-head kind-${note.kind}`}>
        <div className="kn-reader-head-top">
          <span className="kn-kind-badge">
            <span aria-hidden="true">{kind.icon}</span>
            {kind.label}
          </span>
          <span className="kn-topic-chip">{note.topic}</span>
          <span className={`kn-review-chip state-${note.review.state}`}>{note.review.label}</span>
        </div>
        <h2>{note.title}</h2>
        <p className="kn-reader-meta">
          {readMinutes(note.body)} min read · {countWords(note.body).toLocaleString('en-GB')} words
          {note.meta.lastReviewedAt && ` · last reviewed ${formatDate(note.meta.lastReviewedAt.slice(0, 10))}`}
          {note.meta.reviewCount > 0 && ` · ${note.meta.reviewCount}×`}
        </p>
        {note.tags.length > 0 && (
          <div className="kn-tag-row">
            {note.tags.map((tag) => (
              <span key={tag} className="kn-tag">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="kn-reader-actions">
          <button
            type="button"
            className={`secondary-button${note.meta.starred ? ' is-starred' : ''}`}
            onClick={() => onToggleStar(note.id)}
          >
            {note.meta.starred ? '★ Starred' : '☆ Star'}
          </button>
          <button type="button" className="secondary-button" onClick={() => onEdit(note)}>
            Edit
          </button>
          <button type="button" className="secondary-button" onClick={() => setLinking((value) => !value)}>
            Link cards{note.cardIds.length > 0 ? ` (${note.cardIds.length})` : ''}
          </button>
          <button type="button" className="secondary-button" onClick={onToggleWide}>
            {wide ? 'Show library' : 'Wide read'}
          </button>
          <button type="button" className="text-button danger" onClick={() => onDelete(note)}>
            Delete
          </button>
        </div>
      </header>

      {linking && (
        <section className="kn-link-panel">
          <p className="eyebrow">Attach this note to module cards</p>
          <div className="kn-link-grid">
            {moduleCards.length > 0 ? (
              moduleCards.map((card) => (
                <label key={card.id} className="kn-link-option">
                  <input
                    type="checkbox"
                    checked={note.cardIds.includes(card.id)}
                    onChange={() => toggleCardLink(card.id)}
                  />
                  <span>{card.title}</span>
                </label>
              ))
            ) : (
              <p className="empty-state">No cards in this module yet.</p>
            )}
          </div>
        </section>
      )}

      {linkedCards.length > 0 && !linking && (
        <section className="kn-linked-cards">
          <p className="eyebrow">Applies to</p>
          <div className="kn-linked-row">
            {linkedCards.map((card) => (
              <button key={card.id} type="button" className="kn-linked-chip" onClick={() => onOpenCard?.(card.id)}>
                {card.title}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="kn-reader-layout">
        {toc.length > 1 && (
          <nav className="kn-toc" aria-label="On this page">
            <p className="eyebrow">On this page</p>
            <ol>
              {toc.map((entry) => (
                <li key={entry.id} className={`level-${entry.level}`}>
                  <button type="button" onClick={() => jumpTo(entry.id)}>
                    {entry.text}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="kn-reader-body">
          <MarkdownDoc blocks={body} />

          {questions.length > 0 && (
            <SelfTest key={note.id} note={note} questions={questions} onRate={onRate} />
          )}

          {sources.length > 0 && (
            <section className="kn-sources">
              <p className="eyebrow">Sources</p>
              <div className="kn-source-row">
                {sources.map((source, index) => (
                  <span key={index} className="kn-source-chip">
                    {source}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="kn-review-footer">
            <div>
              <p className="eyebrow">Finished reading?</p>
              <h3>Log this review</h3>
              <p className="kn-review-hint">
                How well it went sets when this note comes back: shaky returns tomorrow, solid waits longer.
              </p>
            </div>
            <div className="kn-review-buttons">
              <button type="button" className="kn-review-btn shaky" onClick={() => onMarkReviewed(note.id, 'shaky')}>
                Shaky
              </button>
              <button type="button" className="kn-review-btn ok" onClick={() => onMarkReviewed(note.id, 'ok')}>
                OK
              </button>
              <button type="button" className="kn-review-btn solid" onClick={() => onMarkReviewed(note.id, 'solid')}>
                Solid
              </button>
            </div>
          </section>
        </div>
      </div>
    </article>
  )
}

export function ModuleKnowledge({
  module,
  moduleCards,
  knowledge,
  referenceDate,
  focusNoteId = '',
  onSaveNote,
  onDeleteNote,
  onToggleStar,
  onMarkReviewed,
  onRateQuestion,
  onSetCardLinks,
  onOpenCard,
}) {
  const [selectedId, setSelectedId] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [draft, setDraft] = useState(null)
  const [wide, setWide] = useState(false)

  const notes = useMemo(
    () =>
      resolveModuleNotes({
        seeds: KNOWLEDGE_SEEDS,
        knowledge,
        moduleId: module.id,
        referenceDate,
      }),
    [knowledge, module.id, referenceDate],
  )

  // Adjust state during render rather than in an effect: arriving from a card
  // chip should select that note on the first paint, not one render later.
  const [lastFocusNoteId, setLastFocusNoteId] = useState(focusNoteId)
  if (focusNoteId !== lastFocusNoteId) {
    setLastFocusNoteId(focusNoteId)
    if (focusNoteId) {
      setSelectedId(focusNoteId)
      setDraft(null)
    }
  }

  const summary = useMemo(() => knowledgeSummary(notes), [notes])
  const topics = useMemo(() => Array.from(new Set(notes.map((note) => note.topic))).sort(), [notes])

  const visible = useMemo(() => {
    const searched = searchNotes(notes, query)
    if (filter === 'due') return searched.filter((note) => note.review.state !== 'scheduled')
    if (filter === 'starred') return searched.filter((note) => note.meta.starred)
    return searched
  }, [filter, notes, query])

  const grouped = useMemo(() => groupNotesByTopic(visible), [visible])
  const activeNote = notes.find((note) => note.id === selectedId) ?? visible[0] ?? notes[0] ?? null

  function startNew() {
    setDraft({ ...EMPTY_DRAFT, topic: topics[0] ?? '' })
  }

  function startEdit(note) {
    setDraft({
      id: note.id,
      title: note.title,
      kind: note.kind,
      topic: note.topic,
      tags: note.tags.join(', '),
      body: note.body,
    })
  }

  function saveDraft() {
    const id = draft.id || createNoteId(module.id, draft.title)
    onSaveNote({
      id,
      moduleId: module.id,
      title: draft.title.trim(),
      kind: draft.kind,
      topic: draft.topic.trim() || DEFAULT_TOPIC,
      body: draft.body,
      tags: draft.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      // Editing a seeded note keeps its existing links; a new note starts bare.
      cardIds: notes.find((note) => note.id === id)?.cardIds ?? [],
      createdAt: notes.find((note) => note.id === id)?.createdAt,
    })
    setSelectedId(id)
    setDraft(null)
  }

  function removeNote(note) {
    if (!window.confirm(`Delete “${note.title}”? Its review history goes too.`)) return
    onDeleteNote(note.id)
    if (selectedId === note.id) setSelectedId('')
  }

  return (
    <div className={`kn-shell${wide && !draft ? ' is-wide' : ''}`}>
      <aside className="kn-rail">
        <div className="kn-rail-head">
          <div className="kn-rail-summary">
            <span>
              <strong>{summary.total}</strong> notes
            </span>
            {summary.due > 0 && (
              <button type="button" className="kn-summary-flag due" onClick={() => setFilter('due')}>
                {summary.due} due
              </button>
            )}
            {summary.unread > 0 && <span className="kn-summary-flag new">{summary.unread} unread</span>}
          </div>
          <input
            type="search"
            className="kn-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${module.code} notes`}
            aria-label={`Search ${module.code} notes`}
          />
          <div className="kn-filter-row" role="group" aria-label="Filter notes">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`kn-filter${filter === item.id ? ' active' : ''}`}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="kn-rail-list">
          {grouped.length > 0 ? (
            grouped.map(({ topic, items }) => (
              <div key={topic} className="kn-rail-group">
                <p className="kn-rail-topic">{topic}</p>
                {items.map((note) => (
                  <NoteRailItem
                    key={note.id}
                    note={note}
                    active={activeNote?.id === note.id}
                    onSelect={(id) => {
                      setSelectedId(id)
                      setDraft(null)
                    }}
                  />
                ))}
              </div>
            ))
          ) : (
            <p className="empty-state">
              {notes.length === 0 ? 'No notes for this module yet.' : 'Nothing matches that filter.'}
            </p>
          )}
        </div>

        <button type="button" className="primary-button kn-new-btn" onClick={startNew}>
          + New note
        </button>
      </aside>

      <div className="kn-main">
        {draft ? (
          <NoteEditor
            draft={draft}
            setDraft={setDraft}
            onSave={saveDraft}
            onCancel={() => setDraft(null)}
            topics={topics}
          />
        ) : activeNote ? (
          <NoteReader
            key={activeNote.id}
            note={activeNote}
            moduleCards={moduleCards}
            wide={wide}
            onToggleWide={() => setWide((value) => !value)}
            onToggleStar={onToggleStar}
            onMarkReviewed={onMarkReviewed}
            onRate={onRateQuestion}
            onEdit={startEdit}
            onDelete={removeNote}
            onSetCardLinks={onSetCardLinks}
            onOpenCard={onOpenCard}
          />
        ) : (
          <div className="kn-empty">
            <h3>No notes yet</h3>
            <p>
              Paste a reference document — a taxonomy, a cheatsheet, a list of traps — and it renders as a proper
              study page with tables, diagrams, a contents rail, and a recall check.
            </p>
            <button type="button" className="primary-button" onClick={startNew}>
              Write the first note
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
