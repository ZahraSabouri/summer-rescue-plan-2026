import { useMemo, useState } from 'react'
import {
  createEntryId,
  generalKnowledgeSummary,
  groupEntriesByDate,
  knownTags,
  listGeneralKnowledgeEntries,
  moduleForTag,
  searchEntries,
} from '../utils/generalKnowledge'
import './GeneralKnowledge.css'

const TAG_OPTIONS_ID = 'gk-tag-options'

function formatTime(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(date)
}

function EntryComposer({ entry, referenceDate, onSubmit, onCancel }) {
  const [text, setText] = useState(entry?.text ?? '')
  const [date, setDate] = useState(entry?.date ?? referenceDate)
  const [tags, setTags] = useState(entry?.tags?.join(', ') ?? '')
  const isEditing = Boolean(entry)

  function submit() {
    const body = text.trim()
    if (!body) return
    onSubmit({
      id: entry?.id || createEntryId(body),
      text: body,
      date: date || referenceDate,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      starred: entry?.starred ?? false,
      createdAt: entry?.createdAt,
    })
    if (!isEditing) {
      setText('')
      setTags('')
      setDate(referenceDate)
    }
  }

  return (
    <div className={`gk-composer${isEditing ? ' is-editing' : ''}`}>
      <textarea
        className="gk-composer-text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="What did you figure out?"
        rows={isEditing ? 3 : 2}
      />
      <div className="gk-composer-row">
        <input
          type="date"
          className="gk-composer-date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          aria-label="Date learned"
        />
        <input
          type="text"
          className="gk-composer-tags"
          list={TAG_OPTIONS_ID}
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="Tags — a module, a lecture, anything"
          aria-label="Tags"
        />
        <button type="button" className="primary-button" disabled={!text.trim()} onClick={submit}>
          {isEditing ? 'Save' : 'Log it'}
        </button>
        {isEditing && (
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

function EntryCard({ entry, studyModules, onEdit, onDelete, onToggleStar, onOpenModule }) {
  return (
    <article className="gk-entry">
      <div className="gk-entry-top">
        <span className="gk-entry-time">{formatTime(entry.createdAt)}</span>
        <div className="gk-entry-actions">
          <button
            type="button"
            className={`gk-star${entry.starred ? ' is-starred' : ''}`}
            onClick={onToggleStar}
            aria-label={entry.starred ? 'Unstar this entry' : 'Star this entry'}
          >
            {entry.starred ? '★' : '☆'}
          </button>
          <button type="button" className="text-button" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="text-button danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
      <p className="gk-entry-text">{entry.text}</p>
      {entry.tags.length > 0 && (
        <div className="gk-tag-row">
          {entry.tags.map((tag) => {
            const module = moduleForTag(tag, studyModules)
            return module ? (
              <button
                key={tag}
                type="button"
                className="gk-tag gk-tag-module"
                onClick={() => onOpenModule?.(module.viewId)}
                title={`Open ${module.title}`}
              >
                {module.code || module.title}
              </button>
            ) : (
              <span key={tag} className="gk-tag">
                {tag}
              </span>
            )
          })}
        </div>
      )}
    </article>
  )
}

export function GeneralKnowledge({
  knowledge,
  studyModules = [],
  referenceDate,
  onSave,
  onDelete,
  onToggleStar,
  onOpenModule,
}) {
  const entries = useMemo(() => listGeneralKnowledgeEntries(knowledge), [knowledge])
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [starredOnly, setStarredOnly] = useState(false)
  const [editingId, setEditingId] = useState('')

  const tagSuggestions = useMemo(() => knownTags(entries, studyModules), [entries, studyModules])
  const summary = useMemo(() => generalKnowledgeSummary(entries), [entries])

  const filtered = useMemo(() => {
    let list = searchEntries(entries, query)
    if (starredOnly) list = list.filter((entry) => entry.starred)
    if (tagFilter) list = list.filter((entry) => entry.tags.some((tag) => tag.toLowerCase() === tagFilter.toLowerCase()))
    return list
  }, [entries, query, starredOnly, tagFilter])

  const grouped = useMemo(() => groupEntriesByDate(filtered, referenceDate), [filtered, referenceDate])

  function saveEntry(entry) {
    onSave(entry)
    setEditingId('')
  }

  function removeEntry(entry) {
    if (!window.confirm('Delete this entry?')) return
    onDelete(entry.id)
    if (editingId === entry.id) setEditingId('')
  }

  return (
    <div className="gk-shell">
      <datalist id={TAG_OPTIONS_ID}>
        {tagSuggestions.map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>

      <header className="gk-head">
        <p className="eyebrow">General Knowledge</p>
        <h2>Things you've figured out</h2>
        <p className="gk-head-sub">
          Short, dated, and tagged to wherever it came from — a module, a lecture, an admin process, anything.
        </p>
        <div className="gk-summary">
          <span>
            <strong>{summary.total}</strong> logged
          </span>
          {summary.starred > 0 && (
            <button
              type="button"
              className={`gk-summary-flag${starredOnly ? ' active' : ''}`}
              onClick={() => setStarredOnly((value) => !value)}
            >
              ★ {summary.starred} starred
            </button>
          )}
        </div>
      </header>

      <EntryComposer referenceDate={referenceDate} onSubmit={saveEntry} />

      <div className="gk-filter-bar">
        <input
          type="search"
          className="gk-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your log"
          aria-label="Search general knowledge"
        />
        {tagSuggestions.length > 0 && (
          <div className="gk-tag-filter-row" role="group" aria-label="Filter by tag">
            <button
              type="button"
              className={`gk-tag-filter${!tagFilter ? ' active' : ''}`}
              onClick={() => setTagFilter('')}
            >
              All
            </button>
            {tagSuggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`gk-tag-filter${tagFilter === tag ? ' active' : ''}`}
                onClick={() => setTagFilter(tag === tagFilter ? '' : tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="gk-feed">
        {grouped.length > 0 ? (
          grouped.map((group) => (
            <section key={group.date} className="gk-day-group">
              <p className="gk-day-label">{group.label}</p>
              <div className="gk-day-items">
                {group.items.map((entry) =>
                  editingId === entry.id ? (
                    <EntryComposer
                      key={entry.id}
                      entry={entry}
                      referenceDate={referenceDate}
                      onSubmit={saveEntry}
                      onCancel={() => setEditingId('')}
                    />
                  ) : (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      studyModules={studyModules}
                      onEdit={() => setEditingId(entry.id)}
                      onDelete={() => removeEntry(entry)}
                      onToggleStar={() => onToggleStar(entry.id)}
                      onOpenModule={onOpenModule}
                    />
                  ),
                )}
              </div>
            </section>
          ))
        ) : (
          <div className="gk-empty">
            <h3>{entries.length === 0 ? 'Nothing logged yet' : 'Nothing matches that filter'}</h3>
            {entries.length === 0 && (
              <p>Type the first thing you've figured out above — the date and tags are optional, the sentence is the point.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
