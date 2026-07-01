import { useEffect, useState } from 'react'
import { MODULE_OPTIONS, PHASE_OPTIONS, PRIORITY_OPTIONS, SLOT_OPTIONS, STATUS_OPTIONS } from '../data/constants'

const emptyCard = {
  title: '',
  module: 'Admin',
  phase: 'Phase 2',
  status: 'Today',
  priority: 'Medium',
  slotType: 'Flex',
  slotLabel: '',
  startDate: '',
  dueDate: '',
  estimatedHours: '1',
  description: '',
  checklist: '',
  evidenceRequirement: '',
  doneCondition: '',
  tags: '',
}

export function AddCardDialog({ open, onClose, onAddCard }) {
  const [form, setForm] = useState(emptyCard)

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const submit = (event) => {
    event.preventDefault()
    if (!form.title.trim()) return
    const id = onAddCard(form)
    setForm(emptyCard)
    onClose(id)
  }

  return (
    <div className="drawer-shell" role="presentation">
      <aside className="add-dialog" role="dialog" aria-modal="true" aria-labelledby="add-card-title">
        <header className="drawer-header">
          <div>
            <p className="eyebrow">Ad-hoc task</p>
            <h2 id="add-card-title">Add card</h2>
          </div>
          <button type="button" className="icon-button" onClick={() => onClose()} aria-label="Close add card">
            <span aria-hidden="true">&times;</span>
          </button>
        </header>

        <form className="edit-grid" onSubmit={submit}>
          <label className="span-2">
            <span>Title</span>
            <input required value={form.title} onChange={(event) => update('title', event.target.value)} />
          </label>
          <label>
            <span>Module</span>
            <select value={form.module} onChange={(event) => update('module', event.target.value)}>
              {MODULE_OPTIONS.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Phase</span>
            <select value={form.phase} onChange={(event) => update('phase', event.target.value)}>
              {PHASE_OPTIONS.map((phase) => (
                <option key={phase} value={phase}>
                  {phase}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select value={form.status} onChange={(event) => update('status', event.target.value)}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Priority</span>
            <select value={form.priority} onChange={(event) => update('priority', event.target.value)}>
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Slot</span>
            <select value={form.slotType} onChange={(event) => update('slotType', event.target.value)}>
              {SLOT_OPTIONS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Estimated hours</span>
            <input
              type="number"
              min="0"
              step="0.25"
              value={form.estimatedHours}
              onChange={(event) => update('estimatedHours', event.target.value)}
            />
          </label>
          <label>
            <span>Start date</span>
            <input type="date" value={form.startDate} onChange={(event) => update('startDate', event.target.value)} />
          </label>
          <label>
            <span>Due date</span>
            <input type="date" value={form.dueDate} onChange={(event) => update('dueDate', event.target.value)} />
          </label>
          <label className="span-2">
            <span>Slot label</span>
            <input value={form.slotLabel} onChange={(event) => update('slotLabel', event.target.value)} />
          </label>
          <label className="span-2">
            <span>Tags</span>
            <input value={form.tags} onChange={(event) => update('tags', event.target.value)} placeholder="admin, rescue" />
          </label>
          <label className="span-2">
            <span>Description</span>
            <textarea rows={4} value={form.description} onChange={(event) => update('description', event.target.value)} />
          </label>
          <label className="span-2">
            <span>Checklist</span>
            <textarea
              rows={4}
              value={form.checklist}
              onChange={(event) => update('checklist', event.target.value)}
              placeholder="One item per line"
            />
          </label>
          <label className="span-2">
            <span>Evidence requirement</span>
            <textarea
              rows={2}
              value={form.evidenceRequirement}
              onChange={(event) => update('evidenceRequirement', event.target.value)}
            />
          </label>
          <label className="span-2">
            <span>Done condition</span>
            <textarea rows={2} value={form.doneCondition} onChange={(event) => update('doneCondition', event.target.value)} />
          </label>
          <div className="dialog-actions span-2">
            <button type="button" className="secondary-button" onClick={() => onClose()}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              Add card
            </button>
          </div>
        </form>
      </aside>
    </div>
  )
}
