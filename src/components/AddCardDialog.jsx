import { useState } from 'react'
import { MODULE_OPTIONS, PHASE_OPTIONS, PRIORITY_OPTIONS, SLOT_OPTIONS, STATUS_OPTIONS } from '../data/constants'
import { AccessibleDialog } from './AccessibleDialog'
import { LazyRichTextEditor } from './LazyRichTextEditor'

const emptyCard = {
  title: '',
  module: 'Admin',
  phase: 'Phase 0',
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

export function AddCardDialog({
  open,
  onClose,
  onAddCard,
  moduleOptions = MODULE_OPTIONS,
  phaseOptions = PHASE_OPTIONS,
}) {
  const [form, setForm] = useState(emptyCard)

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const submit = (event) => {
    event.preventDefault()
    if (!form.title.trim()) return
    const id = onAddCard(form)
    setForm(emptyCard)
    onClose(id)
  }

  return (
    <AccessibleDialog open={open} onClose={() => onClose()} className="add-dialog" labelledBy="add-card-title">
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
            <span>Academic module or life area</span>
            <select value={form.module} onChange={(event) => update('module', event.target.value)}>
              {moduleOptions.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Phase</span>
            <select value={form.phase} onChange={(event) => update('phase', event.target.value)}>
              {phaseOptions.map((phase) => (
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
            <LazyRichTextEditor rows={4} value={form.description} onChange={(next) => update('description', next)} />
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
            <LazyRichTextEditor
              rows={2}
              value={form.evidenceRequirement}
              onChange={(next) => update('evidenceRequirement', next)}
            />
          </label>
          <label className="span-2">
            <span>Done condition</span>
            <LazyRichTextEditor rows={2} value={form.doneCondition} onChange={(next) => update('doneCondition', next)} />
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
    </AccessibleDialog>
  )
}
