import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './FocusRoom.css'

const MODE_LABELS = {
  focus: 'Focus',
  short: 'Short break',
  long: 'Long break',
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
  onSaveRestartCue,
  onExit,
}) {
  const roomRef = useRef(null)
  const closeRef = useRef(null)
  const exitRef = useRef(onExit)
  const [restartCue, setRestartCue] = useState('')
  const [cueStatus, setCueStatus] = useState('idle')

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

  if (!activeCard || typeof document === 'undefined') return null

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

  return createPortal(
    <section ref={roomRef} className="focus-room" role="dialog" aria-modal="true" aria-labelledby="focus-room-title">
      <header className="focus-room-topbar">
        <div>
          <span className="focus-room-kicker">Summer Rescue · Focus Room</span>
          <strong>{moduleName}</strong>
        </div>
        <button ref={closeRef} type="button" className="focus-room-exit" onClick={onExit}>
          Exit <kbd>Esc</kbd>
        </button>
      </header>

      <main className="focus-room-main">
        <header className="focus-room-task">
          <span>One active card</span>
          <h1 id="focus-room-title">#{activeCard.number} {activeCard.title}</h1>
          <p>{activeCard.description}</p>
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
            <p className="focus-room-session-count">
              {sessions} focus {sessions === 1 ? 'block' : 'blocks'} completed this app session
            </p>
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

            {hasBoundaries && (
              <div className="focus-room-boundaries" aria-label="Schedule boundaries">
                <Boundary label="Current boundary" boundary={currentBoundary} />
                <Boundary label="Then stop and switch" boundary={nextBoundary} />
              </div>
            )}

            {onSaveRestartCue && (
              <form className="focus-room-cue" onSubmit={saveRestartCue}>
                <label htmlFor="focus-room-restart-cue">Make restarting easy</label>
                <div>
                  <input
                    id="focus-room-restart-cue"
                    type="text"
                    value={restartCue}
                    maxLength={180}
                    placeholder="One exact next move for your future self"
                    onChange={(event) => {
                      setRestartCue(event.target.value.replace(/[\r\n]+/g, ' '))
                      setCueStatus('idle')
                    }}
                  />
                  <button type="submit" disabled={!restartCue.trim() || cueStatus === 'saving'}>
                    {cueStatus === 'saving' ? 'Saving…' : 'Save to notes'}
                  </button>
                </div>
                <small role="status">
                  {cueStatus === 'saved'
                    ? 'Restart cue saved on this card.'
                    : cueStatus === 'error'
                      ? 'The cue could not be saved. Try again.'
                      : 'This adds one note; it does not change the plan.'}
                </small>
              </form>
            )}
          </aside>
        </div>
      </main>

      <footer className="focus-room-footer">
        <span>The timer keeps its current state when you exit.</span>
        <span>No card is completed or replanned automatically.</span>
      </footer>
    </section>,
    document.body,
  )
}
