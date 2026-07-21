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
import { addDays, cardKind, cardPlanLane, checklistDoneCount, formatDate, isOverdue, kindFeatures, requiresEvidence } from '../utils/progress'
import { resourcesForCard, searchResourcesForCard } from '../utils/cardResourceSearch'
import { kindMeta, splitSequenceNotes } from '../utils/knowledge'
import { openFocusRoomTab } from '../utils/focusSession'
import { CardSessionTimer } from './CardSessionTimer'
import { MarkdownDoc } from './MarkdownDoc'
import { ResourceStudyEditor } from './ResourceStudyEditor'

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024

function formatBytes(size) {
  const bytes = Number(size ?? 0)
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`
}

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

function LinkedResourceStudyCard({
  cardId,
  resource,
  progress,
  onOpenResource,
  onRemoveResource,
  onResourceProgressChange,
  onResourceReviewedToggle,
}) {
  return (
    <article className="card-linked-resource">
      <div className="card-linked-resource-head">
        <button type="button" className="card-linked-resource-open" onClick={() => onOpenResource?.(resource.id)}>
          <span className="type-badge">{resource.type}</span>
          <span>
            <strong>{resource.title}</strong>
            <small>{resource.group}{resource.description ? ` · ${resource.description}` : ''}</small>
          </span>
        </button>
        <button type="button" className="resource-remove" onClick={() => onRemoveResource?.(cardId, resource.id)} aria-label={`Remove ${resource.title}`}>
          &times;
        </button>
      </div>
      <ResourceStudyEditor
        compact
        resourceId={resource.id}
        progress={progress}
        onProgressChange={onResourceProgressChange}
        onToggleReviewed={onResourceReviewedToggle}
      />
    </article>
  )
}

const STEP_KIND_LABEL = {
  watch: 'Watch',
  read: 'Read',
  write: 'Write',
  do: 'Do',
  test: 'Self-test',
}

function StudySequenceStep({ index, step, resourcesById, notesById, onOpenResource, onOpenNote }) {
  const stepResources = (step.resourceIds ?? []).map((id) => resourcesById.get(id)).filter(Boolean)
  const stepNotes = (step.noteIds ?? []).map((id) => notesById.get(id)).filter(Boolean)
  return (
    <li className={`study-sequence-step kind-${step.kind ?? 'do'}`}>
      <div className="study-sequence-step-head">
        <span className="study-sequence-step-number" aria-hidden="true">
          {index + 1}
        </span>
        <div>
          <strong>{step.label}</strong>
          <span className="study-sequence-step-meta">
            {STEP_KIND_LABEL[step.kind] ?? 'Do'}
            {step.minutes ? ` · ~${step.minutes} min` : ''}
          </span>
        </div>
      </div>
      {step.instruction && <p className="study-sequence-instruction">{step.instruction}</p>}
      {(stepResources.length > 0 || stepNotes.length > 0) && (
        <div className="study-sequence-refs">
          {stepResources.map((resource) => (
            <button
              key={resource.id}
              type="button"
              className="study-sequence-ref-chip is-resource"
              onClick={() => onOpenResource?.(resource.id)}
            >
              <span className="type-badge">{resource.type}</span>
              {resource.title}
            </button>
          ))}
          {stepNotes.map((note) => (
            <button
              key={note.id}
              type="button"
              className="study-sequence-ref-chip is-note"
              onClick={() => onOpenNote?.(note)}
            >
              <span aria-hidden="true">{kindMeta(note.kind).icon}</span>
              {note.title}
            </button>
          ))}
        </div>
      )}
    </li>
  )
}

// Opens a note in place, exactly like ResourceReader opens a video/PDF: its
// own document.body portal stacked on top of the card drawer's portal, so
// reading a note no longer means leaving the card (previously every note
// chip called onOpenKnowledgeNote, which closed the drawer and navigated to
// the module's Knowledge tab). "Open in Knowledge tab" is still offered
// inside, for review/editing/spaced-repetition — this is a lightweight
// preview, not a replacement for that surface.
function NoteReader({ note, onClose, onOpenInKnowledgeTab }) {
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
      aria-label={note.title}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="reader-window viewer-markdown is-note">
        <header className="reader-chrome">
          <span className="reader-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <div className="reader-addr">
            <span className="type-badge">{kindMeta(note.kind).icon} {note.kind}</span>
            <strong title={note.topic}>{note.title}</strong>
          </div>
          <div className="reader-actions">
            {onOpenInKnowledgeTab && (
              <button type="button" className="reader-btn" onClick={() => onOpenInKnowledgeTab(note)}>
                Open in Knowledge tab
              </button>
            )}
            <button type="button" className="reader-btn reader-close" onClick={onClose} aria-label="Close reader">
              ✕
            </button>
          </div>
        </header>
        <div className="reader-body">
          <div className="markdown-preview">
            <MarkdownDoc source={note.body} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function CardDetailDrawer({
  card,
  resources = [],
  resourceProgress = {},
  referenceDate,
  onClose,
  linkedNotes = [],
  onOpenKnowledgeNote,
  onStatusChange,
  onToggleDone,
  onChecklistToggle,
  onChecklistAdd,
  onChecklistUpdate,
  onChecklistDelete,
  onHoursChange,
  onProgressChange,
  onEvidenceAdd,
  onEvidenceUpdate,
  onEvidenceDelete,
  onEvidenceFileAdd,
  onOpenAttachment,
  onAddNote,
  onNoteUpdate,
  onDeleteNote,
  onSaveDetails,
  onDeleteCard,
  onResetCard,
  onStartSession,
  activeSessionCardId,
  onReschedule,
  onOpenResource,
  onAddResource,
  onRemoveResource,
  onResourceProgressChange,
  onResourceReviewedToggle,
  moduleOptions = MODULE_OPTIONS,
  phaseOptions = PHASE_OPTIONS,
  onNavigateMeta,
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
  const [attachmentStatus, setAttachmentStatus] = useState('idle')
  const [attachmentError, setAttachmentError] = useState('')
  const [form, setForm] = useState(() => createForm(card))
  const [resourceQuery, setResourceQuery] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [openNote, setOpenNote] = useState(null)
  // Shown right after Start session so the running session can either stay in this
  // card or move to the Focus Room tab, without forcing either. The render already
  // gates on this card owning the active session, so no reset effect is needed.
  const [sessionChoiceOpen, setSessionChoiceOpen] = useState(false)

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
    // Keyed on card.id, not card itself: `card` is a fresh object on every
    // tracker-state update (useTrackerState's `cards` memo recomputes all
    // cards whenever ANY state changes, e.g. typing in an unrelated resource
    // note), which used to re-run this whole effect — including the "steal
    // focus into the dialog" timer — on every keystroke anywhere in the
    // drawer, yanking focus out of whatever field the user was typing in.
    // id only changes when the drawer is genuinely opened for a different
    // card (or closed), which is the one time this setup should re-run.
  }, [card?.id, onClose])

  useEffect(() => {
    if (!card) return
    const id = window.setTimeout(() => {
      setEvidenceDraft('')
      setEvidenceText({})
      setEditingEvidenceId(null)
      setAttachmentStatus('idle')
      setAttachmentError('')
      setNoteDraft('')
      setNoteText({})
      setEditingNoteId(null)
      setForm(createForm(card))
      setChecklistText(Object.fromEntries((card.checklist ?? []).map((item) => [item.id, item.text])))
      setEditingChecklistId(null)
      setChecklistDraft('')
      setResourceQuery('')
      setEditOpen(false)
      setOpenNote(null)
    }, 0)
    return () => window.clearTimeout(id)
    // Same fix as the effect above: key on card.id so this draft-reset only
    // fires on a genuine card switch, not on every unrelated tracker-state
    // update (which previously wiped the evidence/note/checklist-add drafts
    // and the resource search box mid-keystroke).
  }, [card?.id])

  const resourcesById = useMemo(() => new Map(resources.map((resource) => [resource.id, resource])), [resources])
  const notesById = useMemo(() => new Map(linkedNotes.map((note) => [note.id, note])), [linkedNotes])
  const sequenceNotes = useMemo(() => splitSequenceNotes(card, linkedNotes), [card, linkedNotes])
  const linkedResources = (card?.resourceIds ?? []).map((id) => resourcesById.get(id)).filter(Boolean)
  const videoResources = linkedResources.filter((resource) => resource.viewer === 'youtube' || resource.type === 'YOUTUBE')
  const fileResources = linkedResources.filter((resource) => resource.viewer !== 'youtube' && resource.type !== 'YOUTUBE')
  const resourceLibrary = useMemo(() => resourcesForCard(card, resources), [card, resources])
  const hasResourceLibrary = resourceLibrary.length > 0
  const savedEvidenceItems = useMemo(
    () => (card?.evidenceEntries?.length ? card.evidenceEntries : card?.evidence ? [{ id: `${card.id}-legacy-evidence`, text: card.evidence }] : []),
    [card],
  )
  const availableResources = useMemo(() => {
    return searchResourcesForCard({
      card,
      resources: resourceLibrary,
      linkedIds: card?.resourceIds,
      query: resourceQuery,
    })
  }, [card, resourceLibrary, resourceQuery])

  if (!card || !form || typeof document === 'undefined') return null

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const doneItems = checklistDoneCount(card)
  const kind = cardKind(card)
  const evidenceExpected = requiresEvidence(card)
  const overdue = Boolean(referenceDate && isOverdue(card, referenceDate))

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

  async function uploadEvidenceFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !onEvidenceFileAdd) return
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachmentError('Files must be 25 MB or smaller.')
      return
    }
    setAttachmentStatus('saving')
    setAttachmentError('')
    try {
      await onEvidenceFileAdd(card.id, file)
      setAttachmentStatus('idle')
    } catch (error) {
      setAttachmentStatus('idle')
      setAttachmentError(error.message || 'Upload failed — is the local server running?')
    }
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
              <button type="button" className={`meta-chip-button kind-chip kind-${kind}`} onClick={() => onNavigateMeta?.('kind', kind)}>{kindFeatures(card).label}</button>
              <button type="button" className="meta-chip-button" onClick={() => onNavigateMeta?.('phase', card.phase)}>{card.phase}</button>
              <button type="button" className="meta-chip-button" onClick={() => onNavigateMeta?.('module', card.moduleGroup)}>{card.module}</button>
              <button type="button" className="meta-chip-button" onClick={() => onNavigateMeta?.('priority', card.priority)}>{card.priority}</button>
              <button type="button" className="meta-chip-button" onClick={() => onNavigateMeta?.('date', card.dueDate || card.startDate)}>{formatDate(card.dueDate || card.startDate)}</button>
            </div>
            {(card.tags ?? []).length > 0 && (
              <div className="meta-strip card-tag-links" aria-label="Card tags">
                {(card.tags ?? []).map((tag) => (
                  <button type="button" className="meta-chip-button" key={tag} onClick={() => onNavigateMeta?.('tag', tag)}>#{tag}</button>
                ))}
              </div>
            )}
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
              <span>Plan lane</span>
              <select value={cardPlanLane(card, referenceDate)} onChange={(event) => onStatusChange(card.id, event.target.value)}>
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
            <label>
              <span>Progress %</span>
              <input
                type="number"
                min="0"
                max="100"
                step="5"
                value={card.progressPercent}
                onChange={(event) => onProgressChange?.(card.id, event.target.value)}
              />
            </label>
            {activeSessionCardId !== card.id && (
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  onStartSession?.(card.id)
                  setSessionChoiceOpen(true)
                }}
              >
                Start session
              </button>
            )}
            {activeSessionCardId === card.id && <CardSessionTimer cardId={card.id} />}
            {activeSessionCardId === card.id && sessionChoiceOpen && (
              <div className="session-start-choice" role="group" aria-label="Where to run this session">
                <p>Session started — where do you want to work?</p>
                <div className="session-start-choice-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      openFocusRoomTab(card.id)
                      setSessionChoiceOpen(false)
                    }}
                  >
                    Open Focus Room ↗
                  </button>
                  <button type="button" className="secondary-button" onClick={() => setSessionChoiceOpen(false)}>
                    Stay on this card
                  </button>
                </div>
              </div>
            )}
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
              {evidenceExpected && (
                <div>
                  <dt>Evidence requirement</dt>
                  <dd>{card.evidenceRequirement || 'None recorded'}</dd>
                </div>
              )}
              <div>
                <dt>Done condition</dt>
                <dd>{card.doneCondition || 'None recorded'}</dd>
              </div>
            </dl>
          </section>

          {card.studySequence?.steps?.length > 0 && (
            <details className="drawer-section wide card-resource-panel study-sequence-panel" open>
              <summary>
                <span>
                  <strong>How to study this card</strong>
                  <small>In order — the specific pages, videos, and notes for this card only</small>
                </span>
                <span>
                  {card.studySequence.steps.length} step{card.studySequence.steps.length === 1 ? '' : 's'}
                  {card.studySequence.totalMinutes ? ` · ~${Math.round(card.studySequence.totalMinutes / 60 * 10) / 10}h` : ''}
                </span>
              </summary>
              <div className="card-resource-panel-body">
                {card.studySequence.concepts?.length > 0 && (
                  <div className="study-sequence-concepts">
                    <h4>Must cover</h4>
                    <ul>
                      {card.studySequence.concepts.map((concept) => (
                        <li key={concept}>{concept}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <ol className="study-sequence-steps">
                  {card.studySequence.steps.map((step, index) => (
                    <StudySequenceStep
                      key={`${card.id}-step-${index}`}
                      index={index}
                      step={step}
                      resourcesById={resourcesById}
                      notesById={notesById}
                      onOpenResource={onOpenResource}
                      onOpenNote={setOpenNote}
                    />
                  ))}
                </ol>
              </div>
            </details>
          )}

          {linkedNotes.length > 0 && (
            <details className="drawer-section wide card-knowledge-panel">
              <summary>
                <span>
                  <strong>Concept notes for this card</strong>
                  <small>
                    {sequenceNotes.extra.length > 0
                      ? 'What the sequence above actually asks you to read — click one to read it here'
                      : 'The knowledge behind this task — click one to read it here'}
                  </small>
                </span>
                <span>
                  {sequenceNotes.required.length} note{sequenceNotes.required.length === 1 ? '' : 's'}
                  {sequenceNotes.required.some((note) => note.review.state === 'due') && ' · some due'}
                </span>
              </summary>
              <div className="card-knowledge-row">
                {sequenceNotes.required.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    className={`card-knowledge-chip kind-${note.kind}`}
                    onClick={() => setOpenNote(note)}
                    title={note.review.label}
                  >
                    <span aria-hidden="true">{kindMeta(note.kind).icon}</span>
                    {note.title}
                    {note.review.state === 'due' && <em>due</em>}
                  </button>
                ))}
              </div>
              {sequenceNotes.extra.length > 0 && (
                <details className="card-knowledge-extra">
                  <summary>
                    {sequenceNotes.extra.length} more note{sequenceNotes.extra.length === 1 ? '' : 's'} from this
                    session/pack/lecture — shared with sibling cards, not required for this one specifically
                  </summary>
                  <div className="card-knowledge-row">
                    {sequenceNotes.extra.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        className={`card-knowledge-chip kind-${note.kind}`}
                        onClick={() => setOpenNote(note)}
                        title={note.review.label}
                      >
                        <span aria-hidden="true">{kindMeta(note.kind).icon}</span>
                        {note.title}
                        {note.review.state === 'due' && <em>due</em>}
                      </button>
                    ))}
                  </div>
                </details>
              )}
            </details>
          )}

          {(linkedResources.length > 0 || hasResourceLibrary) && (
            <details className="drawer-section wide card-resource-panel">
              <summary>
                <span>
                  <strong>Resources for this card</strong>
                  <small>{card.moduleGroup} only</small>
                </span>
                <span>{linkedResources.length} linked</span>
              </summary>
              <div className="card-resource-panel-body">
                {linkedResources.length === 0 && (
                  <p className="muted">No module resources linked to this card.</p>
                )}
                {videoResources.length > 0 && (
                  <div className="video-plan-section">
                    <h4>YouTube support <span>{videoResources.length}</span></h4>
                    <p className="muted">Open a video only when it supports the card’s current output.</p>
                    <div className="video-resource-list">
                      {videoResources.map((resource) => (
                        <LinkedResourceStudyCard
                          key={resource.id}
                          cardId={card.id}
                          resource={resource}
                          progress={resourceProgress[resource.id]}
                          onOpenResource={onOpenResource}
                          onRemoveResource={onRemoveResource}
                          onResourceProgressChange={onResourceProgressChange}
                          onResourceReviewedToggle={onResourceReviewedToggle}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {fileResources.length > 0 && (
                  <div className="file-resource-section">
                    <h4>Files and references <span>{fileResources.length}</span></h4>
                    <div className="card-linked-resource-grid">
                      {fileResources.map((resource) => (
                        <LinkedResourceStudyCard
                          key={resource.id}
                          cardId={card.id}
                          resource={resource}
                          progress={resourceProgress[resource.id]}
                          onOpenResource={onOpenResource}
                          onRemoveResource={onRemoveResource}
                          onResourceProgressChange={onResourceProgressChange}
                          onResourceReviewedToggle={onResourceReviewedToggle}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {hasResourceLibrary && <div className="resource-linker">
                  <h4>Link a specific resource</h4>
                  <div className="resource-picker">
                    <input
                    type="search"
                    value={resourceQuery}
                    onChange={(event) => setResourceQuery(event.target.value)}
                    aria-label={`Search ${card.moduleGroup} resources`}
                    placeholder="Search by file title or topic"
                  />
                  <div>
                    {!resourceQuery.trim() && (
                      <p className="resource-picker-message">
                        Search only when this card needs a specific file. Nothing is suggested automatically.
                      </p>
                    )}
                    {resourceQuery.trim() && availableResources.length === 0 && (
                      <p className="resource-picker-message">No matching resources in {card.moduleGroup}.</p>
                    )}
                    {availableResources.map((resource) => (
                      <button key={resource.id} type="button" onClick={() => onAddResource?.(card.id, resource.id)}>
                        <span className="type-badge">{resource.type}</span>
                        <span>{resource.title}</span>
                      </button>
                      ))}
                    </div>
                  </div>
                </div>}
              </div>
            </details>
          )}

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
            <h3>{evidenceExpected ? 'Evidence' : 'Proof & attachments'}</h3>
            {!evidenceExpected && (
              <p className="muted">
                Optional for this card — attach an email screenshot, PDF, or a short note if you want a record.
              </p>
            )}
            <div className="note-composer">
              <textarea
                value={evidenceDraft}
                onChange={(event) => setEvidenceDraft(event.target.value)}
                rows={evidenceExpected ? 5 : 3}
                placeholder={evidenceExpected ? 'Add another evidence link or short text' : 'Add a short note or link'}
              />
              <button
                type="button"
                className="primary-button"
                onClick={saveEvidence}
                disabled={!evidenceDraft.trim()}
              >
                {evidenceExpected ? 'Save evidence' : 'Save note'}
              </button>
            </div>
            {onEvidenceFileAdd && (
              <div className="evidence-attach">
                <label className={`secondary-button attach-button${attachmentStatus === 'saving' ? ' is-busy' : ''}`}>
                  <input type="file" onChange={uploadEvidenceFile} disabled={attachmentStatus === 'saving'} />
                  {attachmentStatus === 'saving' ? 'Uploading…' : 'Attach file (image, PDF, anything)'}
                </label>
                {attachmentError && <p className="attach-error">{attachmentError}</p>}
              </div>
            )}
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
                          {item.url ? (
                            <p className="evidence-attachment">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(event) => {
                                  // Plain click opens the in-app viewer; modified clicks
                                  // keep the browser's raw-tab behaviour.
                                  if (!onOpenAttachment || event.ctrlKey || event.metaKey || event.shiftKey) return
                                  event.preventDefault()
                                  onOpenAttachment(item)
                                }}
                              >
                                <span className="type-badge">{item.fileType || 'FILE'}</span>
                                <strong>{item.text}</strong>
                                {item.size ? <small>{formatBytes(item.size)}</small> : null}
                              </a>
                            </p>
                          ) : (
                            <p>{item.text}</p>
                          )}
                          <div className="checklist-row-actions">
                            {!item.url && (
                              <button type="button" className="text-button" onClick={() => beginEvidenceEdit(item)}>
                                Edit
                              </button>
                            )}
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
                    <span>Academic module or life area</span>
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
      {openNote && (
        <NoteReader
          note={openNote}
          onClose={() => setOpenNote(null)}
          onOpenInKnowledgeTab={
            onOpenKnowledgeNote
              ? (note) => {
                  setOpenNote(null)
                  onOpenKnowledgeNote(note)
                }
              : null
          }
        />
      )}
    </div>,
    document.body,
  )
}
