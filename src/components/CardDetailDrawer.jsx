import { useEffect, useState } from 'react'
import {
  MODULE_OPTIONS,
  PHASE_OPTIONS,
  PRIORITY_OPTIONS,
  SLOT_OPTIONS,
  STATUS_OPTIONS,
  TAG_OPTIONS,
} from '../data/constants'
import { checklistDoneCount, formatDate } from '../utils/progress'

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
  onClose,
  onStatusChange,
  onToggleDone,
  onChecklistToggle,
  onHoursChange,
  onEvidenceChange,
  onAddNote,
  onDeleteNote,
  onSaveDetails,
}) {
  const [noteDraft, setNoteDraft] = useState('')
  const [evidenceDraft, setEvidenceDraft] = useState(card?.evidence ?? '')
  const [form, setForm] = useState(() => createForm(card))

  useEffect(() => {
    if (!card) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [card, onClose])

  if (!card || !form) return null

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const saveDetails = () => {
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
  }

  const addNote = () => {
    onAddNote(card.id, noteDraft)
    setNoteDraft('')
  }

  const doneItems = checklistDoneCount(card)

  return (
    <div className="drawer-shell" role="presentation">
      <aside className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="detail-title">
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

          <section className="drawer-section">
            <h3>
              Checklist <span>{doneItems}/{card.checklist.length}</span>
            </h3>
            <div className="checklist">
              {card.checklist.map((item, index) => (
                <label key={item.id}>
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => onChecklistToggle(card.id, index)}
                  />
                  <span>{item.text}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="drawer-section">
            <h3>Evidence</h3>
            <textarea
              value={evidenceDraft}
              onChange={(event) => setEvidenceDraft(event.target.value)}
              rows={5}
              placeholder="Evidence link or short text"
            />
            <button
              type="button"
              className="primary-button"
              onClick={() => onEvidenceChange(card.id, evidenceDraft)}
            >
              Save evidence
            </button>
          </section>

          <section className="drawer-section wide">
            <h3>Notes</h3>
            <div className="note-composer">
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                rows={3}
                placeholder="Add reflection, issue, decision, or next action"
              />
              <button type="button" className="primary-button" onClick={addNote}>
                Add note
              </button>
            </div>
            <div className="notes-list">
              {card.notes.length === 0 && <p className="muted">No notes yet.</p>}
              {card.notes.map((note) => (
                <article key={note.id} className="note-item">
                  <div>
                    <time>{formatStamp(note.at)}</time>
                    <p>{note.text}</p>
                  </div>
                  <button
                    type="button"
                    className="text-button danger"
                    onClick={() => onDeleteNote(card.id, note.id)}
                  >
                    Delete
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="drawer-section wide">
            <h3>Edit details</h3>
            <div className="edit-grid">
              <label>
                <span>Title</span>
                <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} />
              </label>
              <label>
                <span>Module</span>
                <select value={form.module} onChange={(event) => updateForm('module', event.target.value)}>
                  {MODULE_OPTIONS.map((module) => (
                    <option key={module} value={module}>
                      {module}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Phase</span>
                <select value={form.phase} onChange={(event) => updateForm('phase', event.target.value)}>
                  {PHASE_OPTIONS.map((phase) => (
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
            <button type="button" className="primary-button" onClick={saveDetails}>
              Save details
            </button>
          </section>

          <section className="drawer-section wide">
            <h3>Activity</h3>
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
      </aside>
    </div>
  )
}
