import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  MODULE_OPTIONS,
  PHASE_OPTIONS,
  PRIORITY_OPTIONS,
  SLOT_OPTIONS,
  STATUS_OPTIONS,
  TAG_OPTIONS,
} from '../data/constants'
import { addDays, checklistDoneCount, formatDate } from '../utils/progress'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function fieldValue(value) {
  return value ?? ''
}

function createForm(card) {
  if (!card) return null
  return {
    title: fieldValue(card.title),
    module: fieldValue(card.moduleGroup),
    phase: fieldValue(card.phase),
    priority: fieldValue(card.priority),
    slotType: fieldValue(card.slotType),
    slotLabel: fieldValue(card.slotLabel),
    startDate: fieldValue(card.startDate),
    dueDate: fieldValue(card.dueDate),
    estimatedHours: fieldValue(card.estimatedHours),
    description: fieldValue(card.description),
    evidenceRequirement: fieldValue(card.evidenceRequirement),
    doneCondition: fieldValue(card.doneCondition),
    tags: (card.tags ?? []).join(', '),
  }
}

function formatStamp(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function CardDetailDrawer({
  card,
  resources = [],
  referenceDate,
  onClose,
  onStatusChange,
  onToggleDone,
  onChecklistToggle,
  onChecklistAdd,
  onChecklistUpdate,
  onChecklistDelete,
  onHoursChange,
  onEvidenceAdd,
  onEvidenceUpdate,
  onEvidenceDelete,
  onAddNote,
  onNoteUpdate,
  onDeleteNote,
  onSaveDetails,
  onDeleteCard,
  onResetCard,
  onStartSession,
  onReschedule,
  onOpenResource,
  onAddResource,
  onRemoveResource,
  moduleOptions = MODULE_OPTIONS,
  phaseOptions = PHASE_OPTIONS,
}) {
  const dialogRef = useRef(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [noteText, setNoteText] = useState({})
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [checklistDraft, setChecklistDraft] = useState('')
  const [checklistText, setChecklistText] = useState({})
  const [editingChecklistId, setEditingChecklistId] = useState(null)
  const [evidenceDraft, setEvidenceDraft] = useState('')
  const [evidenceText, setEvidenceText] = useState({})
  const [editingEvidenceId, setEditingEvidenceId] = useState(null)
  const [form, setForm] = useState(() => createForm(card))
  const [resourceQuery, setResourceQuery] = useState('')
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    if (!card) return undefined
    if (typeof document === 'undefined') return undefined

    const appRoot = document.getElementById('root')
    const hadInert = appRoot?.hasAttribute('inert') ?? false
    const previousAriaHidden = appRoot?.getAttribute('aria-hidden')
    const previousActiveElement =
      typeof HTMLElement !== 'undefined' && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    appRoot?.setAttribute('inert', '')
    appRoot?.setAttribute('aria-hidden', 'true')
    document.body.classList.add('modal-open')

    const focusTimer = window.setTimeout(() => {
      const focusable = Array.from(dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) ?? []).filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      )
      ;(focusable[0] ?? dialogRef.current)?.focus()
    }, 0)

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return

      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      )

      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const activeElement = document.activeElement

      if (!dialog.contains(activeElement)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.classList.remove('modal-open')
      if (appRoot) {
        if (!hadInert) appRoot.removeAttribute('inert')
        if (previousAriaHidden === null) appRoot.removeAttribute('aria-hidden')
        else appRoot.setAttribute('aria-hidden', previousAriaHidden)
      }
      previousActiveElement?.focus()
    }
  }, [card, onClose])

  useEffect(() => {
    if (!card) return
    const id = window.setTimeout(() => {
      setEvidenceDraft('')
      setEvidenceText({})
      setEditingEvidenceId(null)
      setNoteDraft('')
      setNoteText({})
      setEditingNoteId(null)
      setForm(createForm(card))
      setChecklistText(Object.fromEntries((card.checklist ?? []).map((item) => [item.id, item.text])))
      setEditingChecklistId(null)
      setChecklistDraft('')
      setResourceQuery('')
      setEditOpen(false)
    }, 0)
    return () => window.clearTimeout(id)
  }, [card])

  const resourcesById = useMemo(() => new Map(resources.map((resource) => [resource.id, resource])), [resources])
  const resourceModuleGroups = useMemo(() => new Set(resources.map((resource) => resource.moduleGroup)), [resources])
  const linkedResources = (card?.resourceIds ?? []).map((id) => resourcesById.get(id)).filter(Boolean)
  const videoResources = linkedResources.filter((resource) => resource.viewer === 'youtube' || resource.type === 'YOUTUBE')
  const fileResources = linkedResources.filter((resource) => resource.viewer !== 'youtube' && resource.type !== 'YOUTUBE')
  const savedEvidenceItems = useMemo(
    () => (card?.evidenceEntries?.length ? card.evidenceEntries : card?.evidence ? [{ id: `${card.id}-legacy-evidence`, text: card.evidence }] : []),
    [card],
  )
  const availableResources = useMemo(() => {
    if (!card) return []
    const linked = new Set(card.resourceIds ?? [])
    const query = resourceQuery.trim().toLowerCase()
    const restrictToStudyModule = resourceModuleGroups.has(card.moduleGroup)
    return resources
      .filter((resource) => {
        if (linked.has(resource.id)) return false
        if (restrictToStudyModule && resource.moduleGroup !== card.moduleGroup) return false
        if (!query) return true
        return [resource.title, resource.group, resource.type, resource.description, ...(resource.tags ?? [])]
          .join(' ')
          .toLowerCase()
          .includes(query)
      })
      .slice(0, 8)
  }, [card, resourceModuleGroups, resourceQuery, resources])

  if (!card || !form || typeof document === 'undefined') return null

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const doneItems = checklistDoneCount(card)
  const overdue = referenceDate && card.dueDate && card.dueDate < referenceDate && !card.done

  function saveDetails() {
    const tags = form.tags
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
    onSaveDetails(card.id, {
      title: form.title,
      module: form.module,
      moduleGroup: form.module,
      phase: form.phase,
      phaseId: form.phase.toLowerCase().replace(/\s+/g, '-'),
      priority: form.priority,
      slotType: form.slotType,
      slotLabel: form.slotLabel,
      startDate: form.startDate,
      dueDate: form.dueDate,
      dueDateTime: form.dueDate,
      estimatedHours: Number(form.estimatedHours || 0),
      description: form.description,
      evidenceRequirement: form.evidenceRequirement,
      doneCondition: form.doneCondition,
      tags,
    })
    setEditOpen(false)
  }

  function addNote() {
    const value = noteDraft.trim()
    if (!value) return
    onAddNote(card.id, value)
    setNoteDraft('')
  }

  function beginNoteEdit(note) {
    setNoteText((current) => ({ ...current, [note.id]: note.text }))
    setEditingNoteId(note.id)
  }

  function saveNoteEdit(note) {
    const next = noteText[note.id]?.trim()
    if (next && next !== note.text) onNoteUpdate(card.id, note.id, next)
    setEditingNoteId(null)
  }

  function discardNoteEdit(note) {
    setNoteText((current) => ({ ...current, [note.id]: note.text }))
    setEditingNoteId(null)
  }

  function addChecklistItem() {
    onChecklistAdd(card.id, checklistDraft)
    setChecklistDraft('')
  }

  function beginChecklistEdit(item) {
    setChecklistText((current) => ({ ...current, [item.id]: item.text }))
    setEditingChecklistId(item.id)
  }

  function saveChecklistEdit(item) {
    const next = checklistText[item.id]?.trim()
    if (next && next !== item.text) onChecklistUpdate(card.id, item.id, next)
    setEditingChecklistId(null)
  }

  function discardChecklistEdit(item) {
    setChecklistText((current) => ({ ...current, [item.id]: item.text }))
    setEditingChecklistId(null)
  }

  function saveEvidence() {
    const value = evidenceDraft.trim()
    if (!value) return
    onEvidenceAdd(card.id, value)
    setEvidenceDraft('')
  }

  function beginEvidenceEdit(item) {
    setEvidenceText((current) => ({ ...current, [item.id]: item.text }))
    setEditingEvidenceId(item.id)
  }

  function saveEvidenceEdit(item) {
    const next = evidenceText[item.id]?.trim()
    if (next && next !== item.text) onEvidenceUpdate(card.id, item.id, next)
    setEditingEvidenceId(null)
  }

  function discardEvidenceEdit(item) {
    setEvidenceText((current) => ({ ...current, [item.id]: item.text }))
    setEditingEvidenceId(null)
  }

  function deleteCustomCard() {
    const confirmed = window.confirm('Delete this custom card? This cannot be undone.')
    if (!confirmed) return
    if (onDeleteCard?.(card.id)) onClose()
  }

  function resetCard() {
    const confirmed = window.confirm('Reset this card to its original plan? This clears checklist progress, evidence, notes, activity, resources, hours, status, and edited details for this card.')
    if (!confirmed) return
    onResetCard?.(card.id)
  }

  return createPortal(
    <div
      className="drawer-shell card-detail-shell"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <aside
        ref={dialogRef}
        className="detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        tabIndex={-1}
      >
        <header className="drawer-header">
          <div>
            <p className="eyebrow">Card {card.number}</p>
            <h2 id="detail-title">{card.title}</h2>
            <div className="meta-strip">
              <span>{card.phase}</span>
              <span>{card.module}</span>
              <span>{card.priority}</span>
              <span>{formatDate(card.dueDate || card.startDate)}</span>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close card details">
            <span aria-hidden="true">&times;</span>
          </button>
        </header>

        <div className="detail-drawer-content">
          <section className="drawer-controls" aria-label="Card controls">
            <label className="done-toggle">
              <input type="checkbox" checked={card.done} onChange={() => onToggleDone(card.id)} />
              <span>Done</span>
            </label>
            <label>
              <span>Status</span>
              <select value={card.status} onChange={(event) => onStatusChange(card.id, event.target.value)}>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Actual hours</span>
              <input
                type="number"
                min="0"
                step="0.25"
                value={card.actualHours}
                onChange={(event) => onHoursChange(card.id, event.target.value)}
              />
            </label>
            <button type="button" className="primary-button" onClick={() => onStartSession?.(card.id)}>
              Start session
            </button>
            {overdue && (
              <div className="reschedule-inline drawer-reschedule">
                <button type="button" onClick={() => onReschedule?.(card.id, referenceDate)}>
                  Today
                </button>
                <button type="button" onClick={() => onReschedule?.(card.id, addDays(referenceDate, 1))}>
                  Tomorrow
                </button>
              </div>
            )}
          </section>

          <div className="drawer-grid">
          <section className="drawer-section wide">
            <h3>Description</h3>
            <p>{card.description}</p>
            <dl className="definition-grid">
              <div>
                <dt>Slot</dt>
                <dd>{card.slotLabel || card.slotType}</dd>
              </div>
              <div>
                <dt>Estimate</dt>
                <dd>{card.estimatedHours}h</dd>
              </div>
              <div>
                <dt>Evidence requirement</dt>
                <dd>{card.evidenceRequirement || 'None recorded'}</dd>
              </div>
              <div>
                <dt>Done condition</dt>
                <dd>{card.doneCondition || 'None recorded'}</dd>
              </div>
            </dl>
          </section>

          {videoResources.length > 0 && (
            <section className="drawer-section wide video-plan-section">
              <h3>
                YouTube study plan <span>{videoResources.length}</span>
              </h3>
              <p className="muted">Use these as targeted support for this card, then write the timestamp note into the card evidence.</p>
              <div className="video-resource-list">
                {videoResources.map((resource) => (
                  <div key={resource.id} className="video-resource-card">
                    <button type="button" onClick={() => onOpenResource?.(resource.id)}>
                      <span className="type-badge">{resource.type}</span>
                      <strong>{resource.title}</strong>
                      {resource.description && <small>{resource.description}</small>}
                    </button>
                    <button type="button" className="resource-remove" onClick={() => onRemoveResource?.(card.id, resource.id)} aria-label={`Remove ${resource.title}`}>
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="drawer-section wide">
            <h3>
              Files and references <span>{fileResources.length}</span>
            </h3>
            <div className="resource-chip-list">
              {fileResources.length === 0 && <p className="muted">No linked files yet.</p>}
              {fileResources.map((resource) => (
                <div key={resource.id} className="resource-chip">
                  <button type="button" onClick={() => onOpenResource?.(resource.id)}>
                    <span className="type-badge">{resource.type}</span>
                    <strong>{resource.title}</strong>
                  </button>
                  <button type="button" className="resource-remove" onClick={() => onRemoveResource?.(card.id, resource.id)} aria-label={`Remove ${resource.title}`}>
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <div className="resource-picker">
              <input
                type="search"
                value={resourceQuery}
                onChange={(event) => setResourceQuery(event.target.value)}
                placeholder="Search this module's resources"
              />
              <div>
                {availableResources.map((resource) => (
                  <button key={resource.id} type="button" onClick={() => onAddResource?.(card.id, resource.id)}>
                    <span className="type-badge">{resource.type}</span>
                    <span>{resource.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="drawer-section wide">
            <h3>
              Checklist <span>{doneItems}/{card.checklist.length}</span>
            </h3>
            <div className="checklist editable">
              {card.checklist.map((item) => {
                const editing = editingChecklistId === item.id
                return (
                  <div key={item.id} className={`checklist-edit-row${editing ? ' editing' : ''}${item.done ? ' is-done' : ''}`}>
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => onChecklistToggle(card.id, item.id)}
                      aria-label={`Toggle ${item.text}`}
                    />
                    {editing ? (
                      <>
                        <input
                          value={checklistText[item.id] ?? item.text}
                          onChange={(event) =>
                            setChecklistText((current) => ({ ...current, [item.id]: event.target.value }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') saveChecklistEdit(item)
                            if (event.key === 'Escape') discardChecklistEdit(item)
                          }}
                        />
                        <div className="checklist-row-actions">
                          <button type="button" className="secondary-button compact-button" onClick={() => saveChecklistEdit(item)}>
                            Save
                          </button>
                          <button type="button" className="ghost-button compact-button" onClick={() => discardChecklistEdit(item)}>
                            Discard
                          </button>
                          <button type="button" className="text-button danger" onClick={() => onChecklistDelete(card.id, item.id)}>
                            Delete
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <button type="button" className="checklist-text-button" onClick={() => beginChecklistEdit(item)}>
                          {item.text}
                        </button>
                        <div className="checklist-row-actions">
                          <button type="button" className="secondary-button compact-button" onClick={() => beginChecklistEdit(item)}>
                            Edit
                          </button>
                          <button type="button" className="text-button danger" onClick={() => onChecklistDelete(card.id, item.id)}>
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="checklist-add">
              <input
                value={checklistDraft}
                onChange={(event) => setChecklistDraft(event.target.value)}
                placeholder="Add checklist item"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') addChecklistItem()
                }}
              />
              <button type="button" className="secondary-button" onClick={addChecklistItem}>
                Add item
              </button>
            </div>
          </section>

          <section className="drawer-section">
            <h3>Evidence</h3>
            <div className="note-composer">
              <textarea
                value={evidenceDraft}
                onChange={(event) => setEvidenceDraft(event.target.value)}
                rows={5}
                placeholder="Add another evidence link or short text"
              />
              <button
                type="button"
                className="primary-button"
                onClick={saveEvidence}
                disabled={!evidenceDraft.trim()}
              >
                Save evidence
              </button>
            </div>
            <div className="saved-evidence-list" aria-label="Saved evidence">
              {savedEvidenceItems.length === 0 ? (
                <p className="muted">No evidence saved yet.</p>
              ) : (
                savedEvidenceItems.map((item, index) => {
                  const editing = editingEvidenceId === item.id
                  return (
                    <article key={item.id} className={`evidence-item ${editing ? 'editing' : ''}`}>
                      <span>{index + 1}</span>
                      {editing ? (
                        <>
                          <textarea
                            value={evidenceText[item.id] ?? item.text}
                            onChange={(event) =>
                              setEvidenceText((current) => ({ ...current, [item.id]: event.target.value }))
                            }
                            rows={4}
                          />
                          <div className="checklist-row-actions">
                            <button
                              type="button"
                              className="primary-button compact-button"
                              onClick={() => saveEvidenceEdit(item)}
                              disabled={!evidenceText[item.id]?.trim()}
                            >
                              Save
                            </button>
                            <button type="button" className="secondary-button compact-button" onClick={() => discardEvidenceEdit(item)}>
                              Discard
                            </button>
                            <button type="button" className="text-button danger" onClick={() => onEvidenceDelete(card.id, item.id)}>
                              Delete
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p>{item.text}</p>
                          <div className="checklist-row-actions">
                            <button type="button" className="text-button" onClick={() => beginEvidenceEdit(item)}>
                              Edit
                            </button>
                            <button type="button" className="text-button danger" onClick={() => onEvidenceDelete(card.id, item.id)}>
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </article>
                  )
                })
              )}
            </div>
          </section>

          <section className="drawer-section">
            <h3>Notes</h3>
            <div className="note-composer">
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                rows={3}
                placeholder="Add reflection, issue, decision, or next action"
              />
              <button type="button" className="primary-button" onClick={addNote} disabled={!noteDraft.trim()}>
                Add note
              </button>
            </div>
            <div className="notes-list">
              {card.notes.length === 0 && <p className="muted">No notes yet.</p>}
              {card.notes.map((note) => {
                const editing = editingNoteId === note.id
                return (
                  <article key={note.id} className={`note-item ${editing ? 'editing' : ''}`}>
                    <div>
                      <time>{formatStamp(note.at)}</time>
                      {editing ? (
                        <textarea
                          value={noteText[note.id] ?? note.text}
                          onChange={(event) => setNoteText((current) => ({ ...current, [note.id]: event.target.value }))}
                          rows={3}
                        />
                      ) : (
                        <p>{note.text}</p>
                      )}
                    </div>
                    <div className="checklist-row-actions">
                      {editing ? (
                        <>
                          <button
                            type="button"
                            className="primary-button compact-button"
                            onClick={() => saveNoteEdit(note)}
                            disabled={!noteText[note.id]?.trim()}
                          >
                            Save
                          </button>
                          <button type="button" className="secondary-button compact-button" onClick={() => discardNoteEdit(note)}>
                            Discard
                          </button>
                        </>
                      ) : (
                        <button type="button" className="text-button" onClick={() => beginNoteEdit(note)}>
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-button danger"
                        onClick={() => onDeleteNote(card.id, note.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="drawer-section wide">
            <h3>
              Edit details
              <button type="button" className="secondary-button" onClick={() => setEditOpen((value) => !value)}>
                {editOpen ? 'Close editor' : 'Edit'}
              </button>
            </h3>
            {editOpen && (
              <>
                <div className="edit-grid">
                  <label>
                    <span>Title</span>
                    <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} />
                  </label>
                  <label>
                    <span>Module</span>
                    <select value={form.module} onChange={(event) => updateForm('module', event.target.value)}>
                      {moduleOptions.map((module) => (
                        <option key={module} value={module}>
                          {module}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Phase</span>
                    <select value={form.phase} onChange={(event) => updateForm('phase', event.target.value)}>
                      {phaseOptions.map((phase) => (
                        <option key={phase} value={phase}>
                          {phase}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Priority</span>
                    <select value={form.priority} onChange={(event) => updateForm('priority', event.target.value)}>
                      {PRIORITY_OPTIONS.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Slot</span>
                    <select value={form.slotType} onChange={(event) => updateForm('slotType', event.target.value)}>
                      {SLOT_OPTIONS.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Slot label</span>
                    <input value={form.slotLabel} onChange={(event) => updateForm('slotLabel', event.target.value)} />
                  </label>
                  <label>
                    <span>Start date</span>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(event) => updateForm('startDate', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Due date</span>
                    <input type="date" value={form.dueDate} onChange={(event) => updateForm('dueDate', event.target.value)} />
                  </label>
                  <label>
                    <span>Estimated hours</span>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={form.estimatedHours}
                      onChange={(event) => updateForm('estimatedHours', event.target.value)}
                    />
                  </label>
                  <label>
                    <span>Tags</span>
                    <input list="known-tags" value={form.tags} onChange={(event) => updateForm('tags', event.target.value)} />
                    <datalist id="known-tags">
                      {TAG_OPTIONS.map((tag) => (
                        <option key={tag} value={tag} />
                      ))}
                    </datalist>
                  </label>
                  <label className="span-2">
                    <span>Description</span>
                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={(event) => updateForm('description', event.target.value)}
                    />
                  </label>
                  <label className="span-2">
                    <span>Evidence requirement</span>
                    <textarea
                      rows={2}
                      value={form.evidenceRequirement}
                      onChange={(event) => updateForm('evidenceRequirement', event.target.value)}
                    />
                  </label>
                  <label className="span-2">
                    <span>Done condition</span>
                    <textarea
                      rows={2}
                      value={form.doneCondition}
                      onChange={(event) => updateForm('doneCondition', event.target.value)}
                    />
                  </label>
                </div>
                <div className="drawer-edit-actions">
                  <button type="button" className="primary-button" onClick={saveDetails}>
                    Save details
                  </button>
                  {card.custom && (
                    <button type="button" className="ghost-button danger-ghost" onClick={deleteCustomCard}>
                      Delete custom card
                    </button>
                  )}
                </div>
              </>
            )}
          </section>

          <section className="drawer-section wide">
            <h3>
              Activity
              <button type="button" className="ghost-button danger-ghost" onClick={resetCard}>
                Reset card
              </button>
            </h3>
            <div className="activity-log">
              {card.activity.length === 0 && <p className="muted">No activity yet.</p>}
              {card.activity.map((entry) => (
                <article key={entry.id}>
                  <time>{formatStamp(entry.at)}</time>
                  <strong>{entry.action}</strong>
                  {entry.details && <span>{entry.details}</span>}
                </article>
              ))}
            </div>
          </section>
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
