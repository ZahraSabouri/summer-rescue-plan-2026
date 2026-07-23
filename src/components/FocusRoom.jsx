import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import './FocusRoom.css'
import { checklistDoneCount, formatDate, requiresEvidence } from '../utils/progress'
import { focusRewards } from '../utils/focusRewards'
import { kindMeta, splitSequenceNotes } from '../utils/knowledge'
import { AmbientSoundPlayer } from './AmbientSoundPlayer'
import { MarkdownDoc, MarkdownPreview } from './MarkdownDoc'
import { MusicPopover } from './MusicPopover'
import { LazyRichTextEditor } from './LazyRichTextEditor'
import { ThemeToggle } from './ThemeToggle'

const MODE_LABELS = {
  focus: 'Focus',
  short: 'Short break',
  long: 'Long break',
}

const BREAK_PROMPTS = {
  short: [
    'Stand up and stretch your neck and shoulders.',
    'Look at something 20+ feet away for 20 seconds — rest your eyes.',
    'Refill your water and drink a full glass.',
    'Take 10 slow breaths: in for 4, hold for 4, out for 4.',
  ],
  long: [
    'Get up and walk for a few minutes, away from the screen.',
    'Do a full stretch: neck, shoulders, wrists, and back.',
    'Step outside or open a window for fresh air.',
    'Eat or drink something, and let your eyes rest fully.',
  ],
}

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024

function formatBytes(size) {
  const bytes = Number(size ?? 0)
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`
}

function formatMinutes(value) {
  const minutes = Math.max(0, Math.round(Number(value) || 0))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
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

const MODULE_LABELS = {
  'Applied ML': 'Applied Machine Learning',
  'Time Series': 'Time Series',
  MAT700: 'Data Mining',
  'Group Project': 'Team Project',
  'Job Hunt': 'Job Hunt',
  Admin: 'Admin & Dates',
}

function formatTimer(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function boundaryDetails(boundary) {
  if (!boundary) return null
  if (typeof boundary === 'string') return { title: boundary, time: '' }
  const title = boundary.title || boundary.label || boundary.name || 'Schedule boundary'
  const time = boundary.time || (
    boundary.start && boundary.end ? `${boundary.start}–${boundary.end}` : boundary.start || boundary.end || ''
  )
  const place = boundary.location ? ` · ${boundary.location}` : ''
  return { title, time: `${time}${place}` }
}

// One concept note in the Focus Room. Fully controlled (open/onToggle from
// the parent's openNoteIds set) rather than defaultOpen-and-forget, so a
// concept chip clicked further up the page (in "How to study this card") can
// force this specific note open and scroll to it — the Markdown body is
// parsed only once actually open, so a card with dozens of session notes
// still opens instantly instead of parsing every body up front.
function FocusRoomNote({ note, open, onToggle }) {
  return (
    <details
      id={`focus-room-note-${note.id}`}
      className={`focus-room-note kind-${note.kind}`}
      open={open}
      onToggle={(event) => onToggle(note.id, event.currentTarget.open)}
    >
      <summary>
        <span className="focus-room-note-icon" aria-hidden="true">{kindMeta(note.kind).icon}</span>
        <span className="focus-room-note-title">
          <strong>{note.title}</strong>
          {note.topic && <small>{note.topic}</small>}
        </span>
        {note.review?.state === 'due' && <em className="focus-room-note-due">due</em>}
      </summary>
      <div className="focus-room-note-body">
        {open ? <MarkdownDoc source={note.body} /> : null}
      </div>
    </details>
  )
}

const STEP_KIND_LABEL = {
  watch: 'Watch',
  read: 'Read',
  write: 'Write',
  do: 'Do',
  test: 'Self-test',
}

// Mirrors CardDetailDrawer's study-sequence step, reusing its App.css classes
// (study-sequence-step, study-sequence-refs, etc. — loaded here too since
// main.jsx imports App.jsx eagerly even on the Focus Room route) so the two
// surfaces read as the same feature rather than two different UIs.
function FocusRoomSequenceStep({ index, step, resourcesById, notesById, onOpenResource, onJumpToNote }) {
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
              onClick={() => onJumpToNote?.(note)}
              title="Jump to this note below"
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

function Boundary({ label, boundary }) {
  const details = boundaryDetails(boundary)
  if (!details) return null
  return (
    <div className="focus-room-boundary">
      <span>{label}</span>
      <strong>{details.title}</strong>
      {details.time && <p>{details.time}</p>}
    </div>
  )
}

export function FocusRoom({
  activeCard,
  mode,
  durations,
  remaining,
  running,
  sessions,
  preset,
  currentBoundary,
  nextBoundary,
  onSelectMode,
  onSelectPreset,
  onAdjust,
  onReset,
  onToggleRunning,
  onForfeit,
  onSaveRestartCue,
  onChecklistToggle,
  onAddNote,
  onNoteUpdate,
  onDeleteNote,
  onEvidenceAdd,
  onEvidenceUpdate,
  onEvidenceDelete,
  onEvidenceFileAdd,
  resources = [],
  onOpenResource,
  linkedNotes = [],
  onExit,
  queue = [],
  onSwitchCard,
  theme,
  onThemeChange,
}) {
  const roomRef = useRef(null)
  const closeRef = useRef(null)
  const exitRef = useRef(onExit)
  const [restartCue, setRestartCue] = useState('')
  const [cueStatus, setCueStatus] = useState('idle')

  // Full notes + evidence CRUD, at parity with the card drawer — this used
  // to be read-only notes plus a single one-shot restart-cue box, with no
  // evidence surface at all.
  const [noteDraft, setNoteDraft] = useState('')
  const [noteText, setNoteText] = useState({})
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [evidenceDraft, setEvidenceDraft] = useState('')
  const [evidenceText, setEvidenceText] = useState({})
  const [editingEvidenceId, setEditingEvidenceId] = useState(null)
  const [attachmentStatus, setAttachmentStatus] = useState('idle')
  const [attachmentError, setAttachmentError] = useState('')

  // A lightweight, room-local stopwatch per checklist item — not persisted
  // anywhere, just an on-screen aid for noticing which sub-tasks are eating
  // the time. Only one item runs at a time; starting another folds the
  // previous one's elapsed time into its running total first.
  const [activeItemTimer, setActiveItemTimer] = useState(null) // { itemId, startedAt }
  const [itemSeconds, setItemSeconds] = useState({})
  const [itemTick, setItemTick] = useState(0)

  useEffect(() => {
    setNoteDraft('')
    setNoteText({})
    setEditingNoteId(null)
    setEvidenceDraft('')
    setEvidenceText({})
    setEditingEvidenceId(null)
    setAttachmentStatus('idle')
    setAttachmentError('')
    setActiveItemTimer(null)
    setItemSeconds({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCard?.id])

  useEffect(() => {
    if (!activeItemTimer) return undefined
    const tick = window.setInterval(() => setItemTick((value) => value + 1), 1000)
    return () => window.clearInterval(tick)
  }, [activeItemTimer])

  function toggleItemTimer(itemId) {
    setActiveItemTimer((current) => {
      if (current) {
        const elapsed = Math.round((Date.now() - current.startedAt) / 1000)
        setItemSeconds((seconds) => ({ ...seconds, [current.itemId]: (seconds[current.itemId] ?? 0) + elapsed }))
      }
      if (current?.itemId === itemId) return null
      return { itemId, startedAt: Date.now() }
    })
  }

  function itemElapsedSeconds(itemId) {
    const banked = itemSeconds[itemId] ?? 0
    if (activeItemTimer?.itemId !== itemId) return banked
    void itemTick // read to force a re-render each second while this item is timing
    return banked + Math.round((Date.now() - activeItemTimer.startedAt) / 1000)
  }

  useEffect(() => {
    exitRef.current = onExit
  }, [onExit])

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusFrame = window.requestAnimationFrame(() => closeRef.current?.focus())
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        // A resource reader open above the room owns Escape — let it close itself
        // instead of exiting the whole Focus Room underneath the viewer.
        if (document.querySelector('.reader-shell')) return
        event.preventDefault()
        event.stopPropagation()
        exitRef.current?.()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...(roomRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ) ?? [])]
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', handleKeyDown, true)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [])

  const resourcesById = useMemo(() => new Map(resources.map((resource) => [resource.id, resource])), [resources])
  const notesById = useMemo(() => new Map(linkedNotes.map((note) => [note.id, note])), [linkedNotes])
  const sequenceNotes = useMemo(() => splitSequenceNotes(activeCard, linkedNotes), [activeCard, linkedNotes])

  const linkedResources = useMemo(() => {
    if (!activeCard) return []
    return (activeCard.resourceIds ?? []).map((id) => resourcesById.get(id)).filter(Boolean)
  }, [activeCard, resourcesById])

  // Which concept notes are expanded, keyed by note id — lifted here (rather
  // than local state inside each FocusRoomNote) so a concept chip clicked in
  // "How to study this card" can force a specific note open and scroll to it,
  // not just toggle its own accordion. Defaults to the first required note
  // open, reset whenever the active card changes.
  const [openNoteIds, setOpenNoteIds] = useState(() => new Set())
  useEffect(() => {
    setOpenNoteIds(new Set(sequenceNotes.required[0] ? [sequenceNotes.required[0].id] : []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCard?.id])

  function toggleNoteOpen(noteId, isOpen) {
    setOpenNoteIds((current) => {
      const next = new Set(current)
      if (isOpen) next.add(noteId)
      else next.delete(noteId)
      return next
    })
  }

  function jumpToNote(note) {
    setOpenNoteIds((current) => new Set(current).add(note.id))
    window.requestAnimationFrame(() => {
      document.getElementById(`focus-room-note-${note.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const rewards = useSyncExternalStore(focusRewards.subscribe, focusRewards.getState)

  // The selected guard policy is explicit. Gentle pauses and preserves the run;
  // Strict forfeits the current block and records a wilted tree.
  const [away, setAway] = useState(false)
  const [forfeited, setForfeited] = useState(false)
  const runningRef = useRef(running)
  const toggleRef = useRef(onToggleRunning)
  const forfeitRef = useRef(onForfeit)
  const strictRef = useRef(rewards.strict)
  useEffect(() => {
    runningRef.current = running
  }, [running])
  useEffect(() => {
    toggleRef.current = onToggleRunning
  }, [onToggleRunning])
  useEffect(() => {
    forfeitRef.current = onForfeit
  }, [onForfeit])
  useEffect(() => {
    strictRef.current = rewards.strict
  }, [rewards.strict])

  // "Stepping out" — a declared, logged exception to the guard, not a silent
  // one. The guard exists to catch you lying to yourself about a quick check
  // turning into real distraction; Gentle mode already lets you leave for
  // free, which defeats that purpose for someone who wants Strict's
  // accountability everywhere EXCEPT genuine "I need to look something up to
  // understand this" moments. Writing the reason is the actual mechanism —
  // it forces a conscious, on-the-record choice instead of just wandering
  // off — and it's saved as a card note so a pattern of vague reasons is
  // visible later, to the user themselves as much as anyone.
  const GRACE_MINUTES = 10
  const [steppingOutOpen, setSteppingOutOpen] = useState(false)
  const [stepOutReason, setStepOutReason] = useState('')
  const [graceUntil, setGraceUntil] = useState(null)
  const [graceTick, setGraceTick] = useState(0)
  const graceUntilRef = useRef(null)
  const graceTimeoutRef = useRef(null)
  const saveCueRef = useRef(onSaveRestartCue)
  useEffect(() => {
    saveCueRef.current = onSaveRestartCue
  }, [onSaveRestartCue])

  useEffect(() => {
    if (!graceUntil) return undefined
    const tick = window.setInterval(() => setGraceTick((value) => value + 1), 1000)
    return () => window.clearInterval(tick)
  }, [graceUntil])

  useEffect(
    () => () => {
      if (graceTimeoutRef.current) window.clearTimeout(graceTimeoutRef.current)
    },
    [],
  )

  function submitStepOut(event) {
    event.preventDefault()
    const reason = stepOutReason.trim()
    if (!reason) return
    const until = Date.now() + GRACE_MINUTES * 60 * 1000
    graceUntilRef.current = until
    setGraceUntil(until)
    if (graceTimeoutRef.current) window.clearTimeout(graceTimeoutRef.current)
    graceTimeoutRef.current = window.setTimeout(() => {
      graceUntilRef.current = null
      setGraceUntil(null)
    }, GRACE_MINUTES * 60 * 1000)
    saveCueRef.current?.(activeCard.id, `Stepped out (${GRACE_MINUTES}m, no guard): ${reason}`)
    setStepOutReason('')
    setSteppingOutOpen(false)
  }

  function cancelStepOut() {
    graceUntilRef.current = null
    setGraceUntil(null)
    if (graceTimeoutRef.current) {
      window.clearTimeout(graceTimeoutRef.current)
      graceTimeoutRef.current = null
    }
  }

  const graceRemainingSeconds = graceUntil ? Math.max(0, Math.ceil((graceUntil - Date.now()) / 1000)) : 0
  void graceTick // read to keep the countdown re-rendering each second; value itself is unused

  useEffect(() => {
    let blurTimer = null
    const leave = () => {
      if (!runningRef.current) return
      // A declared step-out is not the guard's concern — it exists to catch
      // undeclared wandering, not a logged, time-boxed exception.
      if (graceUntilRef.current && Date.now() < graceUntilRef.current) return
      if (strictRef.current) {
        forfeitRef.current?.()
        focusRewards.recordBlockForfeit()
        setForfeited(true)
      } else {
        toggleRef.current?.()
        setAway(true)
      }
    }
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') return
      if (blurTimer) {
        window.clearTimeout(blurTimer)
        blurTimer = null
      }
      leave()
    }
    // Blur fires on transient focus loss too (address bar, notifications), so wait a
    // beat and only treat it as leaving if focus is genuinely gone. Focus moving into
    // an in-app iframe (YouTube embed, PDF reader) keeps document.hasFocus() true and
    // sets activeElement to the IFRAME — watching a linked video is studying, never a
    // reason to fire the guard.
    const onBlur = () => {
      if (blurTimer) window.clearTimeout(blurTimer)
      blurTimer = window.setTimeout(() => {
        const inAppFrame = document.activeElement?.tagName === 'IFRAME'
        if (document.visibilityState === 'hidden' || (!document.hasFocus() && !inAppFrame)) leave()
      }, 400)
    }
    const onFocus = () => {
      if (blurTimer) {
        window.clearTimeout(blurTimer)
        blurTimer = null
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    return () => {
      if (blurTimer) window.clearTimeout(blurTimer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  function resumeFromAway() {
    setAway(false)
    if (!runningRef.current) toggleRef.current?.()
  }

  function startAgainAfterForfeit() {
    setForfeited(false)
    if (!runningRef.current) toggleRef.current?.()
  }

  if (!activeCard || typeof document === 'undefined') return null

  const checklist = activeCard.checklist ?? []
  const notes = activeCard.notes ?? []
  const evidenceItems = activeCard.evidenceEntries?.length
    ? activeCard.evidenceEntries
    : activeCard.evidence
      ? [{ id: `${activeCard.id}-legacy`, text: activeCard.evidence }]
      : []
  const cardMeta = [
    activeCard.phase,
    activeCard.priority,
    activeCard.slotType,
    (activeCard.dueDate || activeCard.startDate) && `Due ${formatDate(activeCard.dueDate || activeCard.startDate)}`,
    `${activeCard.actualHours || 0}h logged`,
  ].filter(Boolean)

  const cardSessions = activeCard.focusSessions ?? []
  const maxCardSessionMinutes = Math.max(1, ...cardSessions.slice(0, 8).map((session) => session.minutes || 0))

  const totalSeconds = Math.max(1, Number(durations?.[mode] ?? 1) * 60)
  const progress = Math.max(0, Math.min(1, 1 - remaining / totalSeconds))
  const moduleName = MODULE_LABELS[activeCard.moduleGroup] || activeCard.module || activeCard.moduleGroup || 'Study'
  const hasBoundaries = Boolean(currentBoundary || nextBoundary)

  async function saveRestartCue(event) {
    event.preventDefault()
    const cue = restartCue.trim()
    if (!cue || !onSaveRestartCue) return
    setCueStatus('saving')
    try {
      await onSaveRestartCue(activeCard.id, `Restart cue: ${cue}`)
      setRestartCue('')
      setCueStatus('saved')
    } catch {
      setCueStatus('error')
    }
  }

  function addNote() {
    const value = noteDraft.trim()
    if (!value) return
    onAddNote?.(activeCard.id, value)
    setNoteDraft('')
  }

  function beginNoteEdit(note) {
    setNoteText((current) => ({ ...current, [note.id]: note.text }))
    setEditingNoteId(note.id)
  }

  function saveNoteEdit(note) {
    const next = noteText[note.id]?.trim()
    if (next && next !== note.text) onNoteUpdate?.(activeCard.id, note.id, next)
    setEditingNoteId(null)
  }

  function discardNoteEdit(note) {
    setNoteText((current) => ({ ...current, [note.id]: note.text }))
    setEditingNoteId(null)
  }

  function saveEvidence() {
    const value = evidenceDraft.trim()
    if (!value) return
    onEvidenceAdd?.(activeCard.id, value)
    setEvidenceDraft('')
  }

  function beginEvidenceEdit(item) {
    setEvidenceText((current) => ({ ...current, [item.id]: item.text }))
    setEditingEvidenceId(item.id)
  }

  function saveEvidenceEdit(item) {
    const next = evidenceText[item.id]?.trim()
    if (next && next !== item.text) onEvidenceUpdate?.(activeCard.id, item.id, next)
    setEditingEvidenceId(null)
  }

  function discardEvidenceEdit(item) {
    setEvidenceText((current) => ({ ...current, [item.id]: item.text }))
    setEditingEvidenceId(null)
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
      await onEvidenceFileAdd(activeCard.id, file)
      setAttachmentStatus('idle')
    } catch (error) {
      setAttachmentStatus('idle')
      setAttachmentError(error.message || 'Upload failed — is the local server running?')
    }
  }

  return createPortal(
    <section ref={roomRef} className="focus-room" role="dialog" aria-modal="true" aria-labelledby="focus-room-title">
      {away && (
        <div className="focus-room-guard" role="alertdialog" aria-label="Focus paused because you left the screen">
          <div className="focus-room-guard-card">
            <span className="focus-room-guard-kicker">Focus paused</span>
            <strong>You stepped away.</strong>
            <p>Your block is on hold — nothing is lost. Come back and pick up where you left off.</p>
            <button type="button" className="focus-room-start" onClick={resumeFromAway}>
              Resume focus
            </button>
          </div>
        </div>
      )}
      {forfeited && (
        <div className="focus-room-guard forfeit" role="alertdialog" aria-label="Block forfeited because you left the screen">
          <div className="focus-room-guard-card">
            <span className="focus-room-guard-kicker">🥀 Block forfeited</span>
            <strong>You left the focus screen.</strong>
            <p>Strict mode ended that block without points or card credit and wilted one tree. The timer is reset for a fresh commitment.</p>
            <button type="button" className="focus-room-start" onClick={startAgainAfterForfeit}>
              Start a new block
            </button>
          </div>
        </div>
      )}
      <header className="focus-room-topbar">
        <div>
          <span className="focus-room-kicker">Summer Rescue · Focus Room</span>
          <strong>{moduleName}</strong>
        </div>
        <div className="focus-room-topbar-actions">
          <AmbientSoundPlayer />
          <MusicPopover theme={theme} />
          {onThemeChange && <ThemeToggle theme={theme} onChange={onThemeChange} />}
          <button ref={closeRef} type="button" className="focus-room-exit" onClick={onExit}>
            Exit <kbd>Esc</kbd>
          </button>
        </div>
      </header>

      <main className="focus-room-main">
        <header className="focus-room-task">
          <span>One active card</span>
          <h1 id="focus-room-title">#{activeCard.number} {activeCard.title}</h1>
          {activeCard.description && <p>{activeCard.description}</p>}
          {cardMeta.length > 0 && (
            <ul className="focus-room-meta" aria-label="Card details">
              {cardMeta.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </header>

        <div className="focus-room-grid">
          <section className="focus-room-timer-panel" aria-label="Focus timer controls">
            <div className="focus-room-presets" aria-label="Timer preference">
              <span>Timing preference</span>
              <div>
                <button type="button" className={preset === '25-5' ? 'active' : ''} aria-pressed={preset === '25-5'} onClick={() => onSelectPreset('25-5')}>
                  25 / 5
                </button>
                <button type="button" className={preset === '50-10' ? 'active' : ''} aria-pressed={preset === '50-10'} onClick={() => onSelectPreset('50-10')}>
                  50 / 10
                </button>
                <button type="button" className={preset === 'custom' ? 'active' : ''} aria-pressed={preset === 'custom'} onClick={() => onSelectPreset('custom')}>
                  Custom
                </button>
              </div>
              <small>Choose what fits this block; no preset is treated as universally better.</small>
            </div>

            <div className="focus-room-mode-tabs" aria-label="Timer mode">
              {Object.keys(MODE_LABELS).map((timerMode) => (
                <button
                  key={timerMode}
                  type="button"
                  className={mode === timerMode ? 'active' : ''}
                  aria-pressed={mode === timerMode}
                  onClick={() => onSelectMode(timerMode)}
                >
                  {MODE_LABELS[timerMode]}
                </button>
              ))}
            </div>

            <div
              className={`focus-room-dial${running ? ' running' : ''}`}
              style={{ '--focus-room-progress': `${progress * 360}deg` }}
              role="timer"
              aria-label={`${MODE_LABELS[mode]} timer, ${formatTimer(remaining)} remaining`}
            >
              <div>
                <time>{formatTimer(remaining)}</time>
                <span>{MODE_LABELS[mode]}</span>
              </div>
            </div>

            <div className="focus-room-duration">
              <span>{MODE_LABELS[mode]} length</span>
              <div>
                <button type="button" onClick={() => onAdjust(mode, -5)} aria-label={`Decrease ${MODE_LABELS[mode]} length by five minutes`}>−</button>
                <strong>{durations[mode]}m</strong>
                <button type="button" onClick={() => onAdjust(mode, 5)} aria-label={`Increase ${MODE_LABELS[mode]} length by five minutes`}>+</button>
              </div>
            </div>

            <div className="focus-room-controls">
              <button type="button" className="focus-room-reset" onClick={onReset}>Log & reset</button>
              <button type="button" className="focus-room-start" onClick={onToggleRunning}>
                {running ? 'Pause' : mode === 'focus' ? 'Start focus' : 'Start break'}
              </button>
            </div>

            {mode !== 'focus' && (
              <div className="focus-room-break-prompt" role="note">
                <span>While you rest</span>
                <p>{BREAK_PROMPTS[mode][sessions % BREAK_PROMPTS[mode].length]}</p>
              </div>
            )}

            <p className="focus-room-session-count">
              {sessions} focus {sessions === 1 ? 'block' : 'blocks'} completed this app session
            </p>

            <div className="focus-room-rewards" aria-label="Focus rewards and guard policy">
              <div className="focus-room-guard-mode" role="group" aria-label="Focus guard strictness">
                <span>Focus guard</span>
                <div className="focus-room-guard-toggle">
                  <button
                    type="button"
                    className={!rewards.strict ? 'active' : ''}
                    aria-pressed={!rewards.strict}
                    onClick={() => focusRewards.setStrict(false)}
                  >
                    Gentle
                  </button>
                  <button
                    type="button"
                    className={rewards.strict ? 'active' : ''}
                    aria-pressed={rewards.strict}
                    onClick={() => focusRewards.setStrict(true)}
                  >
                    Strict
                  </button>
                </div>
                <small>
                  {rewards.strict
                    ? 'Leaving forfeits the active block and wilts one tree.'
                    : 'Leaving pauses the timer and preserves the block for resuming.'}
                </small>
              </div>

              {mode === 'focus' && (
                <div className="focus-room-stepout" aria-label="Step out without breaking this block">
                  {graceUntil && graceRemainingSeconds > 0 ? (
                    <div className="focus-room-stepout-active">
                      <span>
                        Stepped out — <strong>{formatTimer(graceRemainingSeconds)}</strong> before the guard is back on
                      </span>
                      <button type="button" onClick={cancelStepOut}>
                        I'm back
                      </button>
                    </div>
                  ) : steppingOutOpen ? (
                    <form className="focus-room-stepout-form" onSubmit={submitStepOut}>
                      <label htmlFor="focus-room-stepout-reason">What are you stepping out to do?</label>
                      <input
                        id="focus-room-stepout-reason"
                        type="text"
                        value={stepOutReason}
                        onChange={(event) => setStepOutReason(event.target.value)}
                        placeholder="e.g. look up this error, re-read a note slower, ask something in my IDE"
                        maxLength={160}
                        autoFocus
                      />
                      <div className="focus-room-stepout-actions">
                        <button type="submit" className="focus-room-start" disabled={!stepOutReason.trim()}>
                          Start {GRACE_MINUTES}-min pass
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSteppingOutOpen(false)
                            setStepOutReason('')
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                      <small>Writing it down is the point — no guard penalty for {GRACE_MINUTES} minutes, then it's back on.</small>
                    </form>
                  ) : (
                    <button type="button" className="focus-room-stepout-open" onClick={() => setSteppingOutOpen(true)}>
                      Step out without breaking this block
                    </button>
                  )}
                </div>
              )}

              <div className="focus-room-reward-row">
                <div className="focus-room-reward-stat">
                  <strong>⚡ {rewards.points}</strong>
                  <span>focus points</span>
                </div>
                <div className="focus-room-reward-stat">
                  <strong>🔥 {rewards.streak}</strong>
                  <span>day streak</span>
                </div>
              </div>
              <div className="focus-room-forest">
                <span>Today’s forest</span>
                <div className="focus-room-trees" aria-hidden="true">
                  {rewards.today.trees === 0 && rewards.today.wilted === 0 ? (
                    <em>Finish a block to plant your first tree.</em>
                  ) : (
                    <>
                      {(rewards.today.treeList?.length
                        ? rewards.today.treeList.slice(0, 12)
                        : Array.from({ length: Math.min(rewards.today.trees, 12) }, () => '🌳')
                      ).map((tree, index) => <span key={`t${index}`}>{tree}</span>)}
                      {Array.from({ length: Math.min(rewards.today.wilted, 12) }).map((_, index) => (
                        <span key={`w${index}`}>🥀</span>
                      ))}
                    </>
                  )}
                </div>
                <small>
                  {rewards.today.trees} planted · {rewards.today.wilted} wilted today · {rewards.totalTrees} all time
                </small>
              </div>
            </div>

            <div className="focus-room-stats" aria-label="Session stats and history">
              <div className="focus-room-stats-today">
                <strong>{formatMinutes(rewards.today.minutes)}</strong>
                <span>focused today, across every card</span>
              </div>
              {cardSessions.length > 0 ? (
                <div className="focus-room-stats-history">
                  <span>This card’s sessions</span>
                  <div className="focus-room-stats-bars" aria-hidden="true">
                    {cardSessions.slice(0, 8).reverse().map((session, index) => (
                      <span
                        key={session.id ?? `${session.at}-${index}`}
                        style={{ height: `${Math.max(12, Math.min(100, (session.minutes / maxCardSessionMinutes) * 100))}%` }}
                        title={`${formatMinutes(session.minutes)} · ${formatStamp(session.at)}`}
                      />
                    ))}
                  </div>
                  <ul>
                    {cardSessions.slice(0, 5).map((session, index) => (
                      <li key={session.id ?? `${session.at}-${index}`}>
                        <span>{formatStamp(session.at)}</span>
                        <strong>{formatMinutes(session.minutes)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="muted">No sessions logged on this card yet — the first one will show up here.</p>
              )}
            </div>
          </section>

          <aside className="focus-room-brief" aria-label="Card finish and schedule boundaries">
            <section>
              <span>Finish line</span>
              <h2>{activeCard.doneCondition || 'No finish condition is recorded on this card.'}</h2>
            </section>
            <section>
              <span>Leave behind</span>
              <p>{activeCard.evidenceRequirement || 'No evidence requirement is recorded on this card.'}</p>
            </section>

            {checklist.length > 0 && (
              <section className="focus-room-checklist">
                <span>Checklist <em>{checklistDoneCount(activeCard)}/{checklist.length}</em></span>
                <ul>
                  {checklist.map((item) => {
                    const elapsed = itemElapsedSeconds(item.id)
                    const isTiming = activeItemTimer?.itemId === item.id
                    return (
                      <li key={item.id} className={item.done ? 'is-done' : ''}>
                        <label>
                          <input
                            type="checkbox"
                            checked={Boolean(item.done)}
                            onChange={() => onChecklistToggle?.(activeCard.id, item.id)}
                          />
                          <span>{item.text}</span>
                        </label>
                        <div className="focus-room-item-timer">
                          {elapsed > 0 && <span className={isTiming ? 'is-running' : ''}>{formatTimer(elapsed)}</span>}
                          <button
                            type="button"
                            className={isTiming ? 'is-running' : ''}
                            onClick={() => toggleItemTimer(item.id)}
                            aria-label={isTiming ? `Pause timing ${item.text}` : `Time this sub-task: ${item.text}`}
                            title={isTiming ? 'Pause' : 'Time this sub-task'}
                          >
                            {isTiming ? '⏸' : '▶'}
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {queue.length > 0 && (
              <section className="focus-room-queue" aria-label="What's next">
                <span>Next up</span>
                <ul>
                  {queue.map((next) => (
                    <li key={next.id}>
                      <button type="button" onClick={() => onSwitchCard?.(next.id)} title="Switch the room to this card">
                        <strong>{next.title}</strong>
                        <small>
                          {[next.moduleGroup, next.estimatedHours ? `${next.estimatedHours}h` : '', next.dueDate ? `Due ${formatDate(next.dueDate)}` : '']
                            .filter(Boolean)
                            .join(' · ')}
                        </small>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {linkedResources.length > 0 && (
              <section className="focus-room-resources">
                <span>Resources</span>
                <div className="focus-room-resource-list">
                  {linkedResources.map((resource) => (
                    <button key={resource.id} type="button" onClick={() => onOpenResource?.(resource.id)}>
                      <span className="type-badge">{resource.type}</span>
                      <strong>{resource.title}</strong>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {hasBoundaries && (
              <div className="focus-room-boundaries" aria-label="Schedule boundaries">
                <Boundary label="Current boundary" boundary={currentBoundary} />
                <Boundary label="Then stop and switch" boundary={nextBoundary} />
              </div>
            )}

          </aside>
        </div>

        <section className="focus-room-notes focus-room-notes-full">
          <span>Notes</span>
          <div className="note-composer">
            <LazyRichTextEditor
              value={noteDraft}
              onChange={setNoteDraft}
              rows={3}
              placeholder="Add reflection, issue, decision, or next action"
            />
            <button type="button" className="focus-room-start" onClick={addNote} disabled={!noteDraft.trim()}>
              Add note
            </button>
          </div>
          <div className="notes-list">
            {notes.length === 0 && <p className="muted">No notes yet.</p>}
            {notes.map((note) => {
              const editing = editingNoteId === note.id
              return (
                <article key={note.id} className={`note-item ${editing ? 'editing' : ''}`}>
                  <div>
                    <time>{formatStamp(note.at)}</time>
                    {editing ? (
                      <LazyRichTextEditor
                        value={noteText[note.id] ?? note.text}
                        onChange={(next) => setNoteText((current) => ({ ...current, [note.id]: next }))}
                        rows={3}
                      />
                    ) : (
                      <MarkdownPreview source={note.text} />
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
                    {onDeleteNote && (
                      <button type="button" className="text-button danger" onClick={() => onDeleteNote(activeCard.id, note.id)}>
                        Delete
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="focus-room-evidence focus-room-evidence-full">
          <span>{requiresEvidence(activeCard) ? 'Evidence' : 'Proof & attachments'}</span>
          {!requiresEvidence(activeCard) && (
            <p className="muted">Optional for this card — attach a screenshot, PDF, or a short note if you want a record.</p>
          )}
          <div className="note-composer">
            <LazyRichTextEditor
              value={evidenceDraft}
              onChange={setEvidenceDraft}
              rows={3}
              placeholder={requiresEvidence(activeCard) ? 'Add another evidence link or short text' : 'Add a short note or link'}
            />
            <button
              type="button"
              className="focus-room-start"
              onClick={saveEvidence}
              disabled={!evidenceDraft.trim()}
            >
              {requiresEvidence(activeCard) ? 'Save evidence' : 'Save note'}
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
            {evidenceItems.length === 0 ? (
              <p className="muted">No evidence saved yet.</p>
            ) : (
              evidenceItems.map((item, index) => {
                const editing = editingEvidenceId === item.id
                return (
                  <article key={item.id} className={`evidence-item ${editing ? 'editing' : ''}`}>
                    <span>{index + 1}</span>
                    {editing ? (
                      <>
                        <LazyRichTextEditor
                          value={evidenceText[item.id] ?? item.text}
                          onChange={(next) => setEvidenceText((current) => ({ ...current, [item.id]: next }))}
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
                          {onEvidenceDelete && (
                            <button type="button" className="text-button danger" onClick={() => onEvidenceDelete(activeCard.id, item.id)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {item.url ? (
                          <p className="evidence-attachment">
                            <a href={item.url} target="_blank" rel="noreferrer">
                              <span className="type-badge">{item.fileType || 'FILE'}</span>
                              <strong>{item.text}</strong>
                              {item.size ? <small>{formatBytes(item.size)}</small> : null}
                            </a>
                          </p>
                        ) : (
                          <MarkdownPreview source={item.text} />
                        )}
                        <div className="checklist-row-actions">
                          {!item.url && (
                            <button type="button" className="text-button" onClick={() => beginEvidenceEdit(item)}>
                              Edit
                            </button>
                          )}
                          {onEvidenceDelete && (
                            <button type="button" className="text-button danger" onClick={() => onEvidenceDelete(activeCard.id, item.id)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </article>
                )
              })
            )}
          </div>
        </section>

        {activeCard.studySequence?.steps?.length > 0 && (
          <section className="focus-room-sequence" aria-label="How to study this card">
            <header className="focus-room-knowledge-head">
              <div>
                <span>How to study this card</span>
                <h2>In order — the exact resources for this card</h2>
              </div>
              <p>
                {activeCard.studySequence.steps.length} step{activeCard.studySequence.steps.length === 1 ? '' : 's'}
                {activeCard.studySequence.totalMinutes
                  ? ` · ~${Math.round((activeCard.studySequence.totalMinutes / 60) * 10) / 10}h`
                  : ''}
              </p>
            </header>
            {activeCard.studySequence.concepts?.length > 0 && (
              <div className="study-sequence-concepts">
                <h4>Must cover</h4>
                <ul>
                  {activeCard.studySequence.concepts.map((concept) => (
                    <li key={concept}>{concept}</li>
                  ))}
                </ul>
              </div>
            )}
            <ol className="study-sequence-steps">
              {activeCard.studySequence.steps.map((step, index) => (
                <FocusRoomSequenceStep
                  key={`${activeCard.id}-step-${index}`}
                  index={index}
                  step={step}
                  resourcesById={resourcesById}
                  notesById={notesById}
                  onOpenResource={onOpenResource}
                  onJumpToNote={jumpToNote}
                />
              ))}
            </ol>
          </section>
        )}

        {sequenceNotes.required.length > 0 && (
          <section className="focus-room-knowledge" aria-label="Concept notes for this card">
            <header className="focus-room-knowledge-head">
              <div>
                <span>Knowledge for this card</span>
                <h2>The concepts behind what you’re doing</h2>
              </div>
              <p>
                {sequenceNotes.required.length} note{sequenceNotes.required.length === 1 ? '' : 's'} · click a concept
                above or open one below
              </p>
            </header>
            <div className="focus-room-knowledge-list">
              {sequenceNotes.required.map((note) => (
                <FocusRoomNote key={note.id} note={note} open={openNoteIds.has(note.id)} onToggle={toggleNoteOpen} />
              ))}
            </div>
            {sequenceNotes.extra.length > 0 && (
              <details className="focus-room-knowledge-extra">
                <summary>
                  {sequenceNotes.extra.length} more note{sequenceNotes.extra.length === 1 ? '' : 's'} from this
                  session/pack/lecture — shared with sibling cards, not required for this one specifically
                </summary>
                <div className="focus-room-knowledge-list">
                  {sequenceNotes.extra.map((note) => (
                    <FocusRoomNote key={note.id} note={note} open={openNoteIds.has(note.id)} onToggle={toggleNoteOpen} />
                  ))}
                </div>
              </details>
            )}
          </section>
        )}
      </main>

      <footer className="focus-room-footer">
        <span>The timer keeps its current state when you exit.</span>
        <span>No card is completed or replanned automatically.</span>
      </footer>
    </section>,
    document.body,
  )
}
