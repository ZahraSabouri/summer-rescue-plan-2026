import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import './FocusRoom.css'
import { checklistDoneCount, formatDate } from '../utils/progress'
import { focusRewards } from '../utils/focusRewards'

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
  onForfeit,
  onSaveRestartCue,
  onChecklistToggle,
  resources = [],
  onOpenResource,
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

  const linkedResources = useMemo(() => {
    if (!activeCard) return []
    const byId = new Map(resources.map((resource) => [resource.id, resource]))
    return (activeCard.resourceIds ?? []).map((id) => byId.get(id)).filter(Boolean)
  }, [activeCard, resources])

  const rewards = useSyncExternalStore(focusRewards.subscribe, focusRewards.getState)

  // Focus guard: when a block is running and the user leaves this screen — switches
  // tab, minimises, or alt-tabs to another app — react based on the strictness mode.
  //   Gentle: pause the timer and hold a "come back" overlay; nothing is lost.
  //   Strict: forfeit the block (no points, no card credit), wilt a tree, and show
  //   a "block forfeited" overlay.
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

  useEffect(() => {
    let blurTimer = null
    const leave = () => {
      if (!runningRef.current) return
      if (strictRef.current) {
        forfeitRef.current?.() // discard the run — no points, no credit
        focusRewards.recordBlockForfeit() // wilt a tree
        setForfeited(true)
      } else {
        toggleRef.current?.() // pause; the partial focus segment is logged
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
    // beat and only treat it as leaving if focus is genuinely gone.
    const onBlur = () => {
      if (blurTimer) window.clearTimeout(blurTimer)
      blurTimer = window.setTimeout(() => {
        if (document.visibilityState === 'hidden' || !document.hasFocus()) leave()
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

  // Strict mode: the block was forfeited and the timer reset to a fresh focus block.
  // Start a new one right away.
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
            <p>Strict mode: that block is gone — no points, and a tree wilted. The timer is reset. Start again when you’re ready to commit.</p>
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
        <button ref={closeRef} type="button" className="focus-room-exit" onClick={onExit}>
          Exit <kbd>Esc</kbd>
        </button>
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
            <p className="focus-room-session-count">
              {sessions} focus {sessions === 1 ? 'block' : 'blocks'} completed this app session
            </p>

            <div className="focus-room-rewards" aria-label="Focus rewards">
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
                    ? 'Leaving forfeits the block and wilts a tree.'
                    : 'Leaving pauses the timer — nothing lost.'}
                </small>
              </div>

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
                    <em>Finish a block to grow your first tree.</em>
                  ) : (
                    <>
                      {Array.from({ length: Math.min(rewards.today.trees, 12) }).map((_, index) => (
                        <span key={`t${index}`}>🌳</span>
                      ))}
                      {Array.from({ length: Math.min(rewards.today.wilted, 12) }).map((_, index) => (
                        <span key={`w${index}`}>🥀</span>
                      ))}
                    </>
                  )}
                </div>
                <small>
                  {rewards.today.trees} grown · {rewards.today.wilted} wilted today · {rewards.totalTrees} all time
                </small>
              </div>
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
                  {checklist.map((item) => (
                    <li key={item.id} className={item.done ? 'is-done' : ''}>
                      <label>
                        <input
                          type="checkbox"
                          checked={Boolean(item.done)}
                          onChange={() => onChecklistToggle?.(activeCard.id, item.id)}
                        />
                        <span>{item.text}</span>
                      </label>
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

            {notes.length > 0 && (
              <section className="focus-room-notes">
                <span>Notes</span>
                <ul>
                  {notes.map((note, index) => (
                    <li key={note.id ?? index}>{note.text}</li>
                  ))}
                </ul>
              </section>
            )}

            {evidenceItems.length > 0 && (
              <section className="focus-room-evidence">
                <span>Evidence logged</span>
                <ul>
                  {evidenceItems.map((item, index) => (
                    <li key={item.id ?? index}>{item.text}</li>
                  ))}
                </ul>
              </section>
            )}

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
