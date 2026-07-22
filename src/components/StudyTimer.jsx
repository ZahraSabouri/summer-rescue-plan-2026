import { useCallback, useEffect, useRef, useState } from 'react'
import {
  elapsedTimerMilliseconds,
  focusPresetDurations,
  focusMinutesToLog,
  nextTimerMode,
  remainingTimerSeconds,
} from '../utils/studyTimer'
import { FocusRoom } from './FocusRoom'
import { studyTimerStore } from '../utils/studyTimerStore'
import { todayString } from '../utils/progress'
import { onFocusMessage, openFocusRoomTab, postFocusMessage } from '../utils/focusSession'

const MODE_META = {
  focus: { label: 'Focus', accent: 'var(--accent)' },
  short: { label: 'Short break', accent: 'var(--chart-ts)' },
  long: { label: 'Long break', accent: 'var(--accent-2)' },
}

function format(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function chime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const notes = [660, 880]
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g)
      g.connect(ctx.destination)
      o.type = 'sine'
      o.frequency.value = freq
      const t = ctx.currentTime + i * 0.18
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
      o.start(t)
      o.stop(t + 0.62)
    })
  } catch {
    /* audio not available */
  }
}

export function StudyTimer({
  activeCard,
  startSignal,
  currentBoundary,
  nextBoundary,
  onCompleteSession,
  onFocusBlockComplete,
  onClearActive,
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
  // 'bar' is the always-mounted top-bar timer. 'room' is the same engine running
  // inside a dedicated Focus Room tab, which renders the room and nothing else.
  variant = 'bar',
  linkedNotes = [],
  onExitRoom,
  queue = [],
  onSwitchCard,
  theme,
  onThemeChange,
}) {
  const isRoom = variant === 'room'
  const [open, setOpen] = useState(false)
  // Set on the bar timer while a Focus Room tab owns the clock. The bar stops
  // ticking and shows a pointer to that tab, so a block is never double-counted.
  const [remoteOwner, setRemoteOwner] = useState(null)
  const [mode, setMode] = useState('focus')
  const [durations, setDurations] = useState({ focus: 25, short: 5, long: 15 })
  const [focusPreset, setFocusPreset] = useState('25-5')
  const [remaining, setRemaining] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const [wakeLockEnabled, setWakeLockEnabled] = useState(false)
  const [wakeLockActive, setWakeLockActive] = useState(false)
  const [wakeLockStatus, setWakeLockStatus] = useState('idle')
  const wrapRef = useRef(null)
  const runIdRef = useRef(0)
  const completedRunIdRef = useRef(null)
  const deadlineRef = useRef(null)
  const segmentStartedAtRef = useRef(null)
  const segmentCardIdRef = useRef(null)
  const wakeLockRef = useRef(null)
  const modeRef = useRef(mode)
  const durationsRef = useRef(durations)
  const sessionsRef = useRef(sessions)
  const runningRef = useRef(running)
  const activeCardRef = useRef(activeCard)
  const startSignalRef = useRef(startSignal)
  const onCompleteSessionRef = useRef(onCompleteSession)
  const onFocusBlockCompleteRef = useRef(onFocusBlockComplete)
  const customDurationsRef = useRef({ focus: 25, short: 5, long: 15 })

  const wakeLockSupported =
    typeof navigator !== 'undefined' && 'wakeLock' in navigator

  const total = durations[mode] * 60
  const progress = total > 0 ? 1 - remaining / total : 0
  const R = 52
  const CIRC = 2 * Math.PI * R

  useEffect(() => {
    modeRef.current = mode
    durationsRef.current = durations
    sessionsRef.current = sessions
    runningRef.current = running
  }, [durations, mode, running, sessions])

  useEffect(() => {
    activeCardRef.current = activeCard
    onCompleteSessionRef.current = onCompleteSession
    onFocusBlockCompleteRef.current = onFocusBlockComplete
  }, [activeCard, onCompleteSession, onFocusBlockComplete])

  const logFocusSegment = useCallback((stoppedAt = Date.now()) => {
    const startedAt = segmentStartedAtRef.current
    const cardId = segmentCardIdRef.current
    segmentStartedAtRef.current = null
    segmentCardIdRef.current = null
    if (modeRef.current !== 'focus' || startedAt == null || !cardId) return

    const elapsedMs = elapsedTimerMilliseconds(startedAt, stoppedAt, deadlineRef.current)
    const minutes = focusMinutesToLog(elapsedMs)
    if (minutes > 0) onCompleteSessionRef.current?.(cardId, minutes)
  }, [])

  const completeRun = useCallback((runId, stoppedAt = Date.now()) => {
    if (runId !== runIdRef.current || completedRunIdRef.current === runId) return false
    completedRunIdRef.current = runId

    const completedMode = modeRef.current
    logFocusSegment(stoppedAt)
    deadlineRef.current = null
    runningRef.current = false
    setRunning(false)
    chime()

    const completedFocusSessions =
      completedMode === 'focus' ? sessionsRef.current + 1 : sessionsRef.current
    if (completedMode === 'focus') {
      sessionsRef.current = completedFocusSessions
      setSessions(completedFocusSessions)
      onFocusBlockCompleteRef.current?.(durationsRef.current.focus)
    }

    const nextMode = nextTimerMode(completedMode, completedFocusSessions)
    modeRef.current = nextMode
    setMode(nextMode)
    setRemaining(durationsRef.current[nextMode] * 60)
    return true
  }, [logFocusSegment])

  const syncRunToClock = useCallback((runId, now = Date.now()) => {
    if (runId !== runIdRef.current || !runningRef.current) return
    const nextRemaining = remainingTimerSeconds(deadlineRef.current, now)
    if (nextRemaining === 0) {
      completeRun(runId, now)
      return
    }
    setRemaining((current) => (current === nextRemaining ? current : nextRemaining))
  }, [completeRun])

  // Reset the clock to a fresh, paused focus block for whatever card just became
  // active. Deliberately does NOT start running: arriving at a card should never
  // begin counting down by itself — the user still presses Start on the timer
  // itself as a separate, explicit action.
  const armFocusRun = useCallback(() => {
    const seconds = durationsRef.current.focus * 60
    modeRef.current = 'focus'
    setMode('focus')
    setRemaining(seconds)
    runIdRef.current += 1
    completedRunIdRef.current = null
    deadlineRef.current = null
    segmentStartedAtRef.current = null
    segmentCardIdRef.current = null
    runningRef.current = false
    setRunning(false)
  }, [])

  // Abandon the current run WITHOUT logging any focus time (strict-mode forfeit).
  // The partial segment is discarded, so no points or card minutes are credited.
  const forfeitRun = useCallback(() => {
    runIdRef.current += 1
    completedRunIdRef.current = null
    deadlineRef.current = null
    segmentStartedAtRef.current = null
    segmentCardIdRef.current = null
    runningRef.current = false
    setRunning(false)
    modeRef.current = 'focus'
    setMode('focus')
    setRemaining(durationsRef.current.focus * 60)
  }, [])

  // Stop the local clock because another tab is taking the session over. Any
  // focus time already accrued is logged first (fragments under a minute are
  // dropped by policy), so handing off never silently loses work — but sessions
  // are NOT incremented here, since the block itself is continuing elsewhere.
  const pauseForHandoff = useCallback(() => {
    if (!runningRef.current) return
    logFocusSegment()
    runIdRef.current += 1
    completedRunIdRef.current = null
    deadlineRef.current = null
    runningRef.current = false
    setRunning(false)
    setRemaining(durationsRef.current[modeRef.current] * 60)
  }, [logFocusSegment])

  // The bar timer listens for a Focus Room tab claiming or releasing the session.
  // The room tab does not listen: it is the owner while it is open.
  useEffect(() => {
    if (isRoom) return undefined
    return onFocusMessage((message) => {
      if (message.type === 'claim') {
        setRemoteOwner({ tabId: message.from, cardId: message.cardId ?? null })
        pauseForHandoff()
        return
      }
      if (message.type === 'release') {
        setRemoteOwner((current) => (current && current.tabId !== message.from ? current : null))
      }
    })
  }, [isRoom, pauseForHandoff])

  // A room tab that closes without a clean release (crash, hard kill) would
  // otherwise strand the bar timer as "handed off" forever. Re-check on focus.
  useEffect(() => {
    if (isRoom || !remoteOwner) return undefined
    const onWindowFocus = () => {
      let answered = false
      const stop = onFocusMessage((message) => {
        if (message.type === 'room-alive' && message.from === remoteOwner.tabId) answered = true
      })
      postFocusMessage('ping')
      window.setTimeout(() => {
        stop()
        if (!answered) setRemoteOwner(null)
      }, 600)
    }
    window.addEventListener('focus', onWindowFocus)
    return () => window.removeEventListener('focus', onWindowFocus)
  }, [isRoom, remoteOwner])

  // Pressing "Start session" on a card sends a new startSignal. Arm a fresh,
  // paused focus block for it — the countdown itself only begins once the user
  // presses Start on the timer, a separate and deliberate click. We key off
  // startSignal (not the activeCard reference, which also changes when a session
  // is logged) so completing a segment never silently re-arms the clock.
  useEffect(() => {
    const userInitiated = startSignal !== startSignalRef.current
    startSignalRef.current = startSignal
    if (!activeCard || !userInitiated) return undefined
    const id = window.setTimeout(() => {
      const cardId = activeCardRef.current?.id
      const alreadyOnThisCard =
        runningRef.current && modeRef.current === 'focus' && segmentCardIdRef.current === cardId
      if (alreadyOnThisCard) return
      if (runningRef.current) logFocusSegment()
      armFocusRun()
    }, 0)
    return () => window.clearTimeout(id)
  }, [activeCard, startSignal, logFocusSegment, armFocusRun])

  // The Focus Room tab opens with a fresh, paused block ready for this card —
  // same as the main tab, the user still presses Start once the tab has
  // painted. Only arm once, and only if nothing is already running (jumping
  // tabs mid-session must not reset progress already under way).
  const roomArmedRef = useRef(false)
  useEffect(() => {
    if (!isRoom || !activeCard || roomArmedRef.current) return
    roomArmedRef.current = true
    if (!runningRef.current) armFocusRun()
  }, [isRoom, activeCard, armFocusRun])

  // Claim the session for this tab and hold it for as long as the room is open.
  // The claim is re-announced on ping so a bar timer can confirm we are alive.
  // Keyed on the stable card id, NOT the activeCard object: the main tab re-sends a
  // fresh card snapshot on every checklist tick, and re-running this on each one
  // would churn claim/release and spuriously log the running block.
  const roomCardId = isRoom ? activeCard?.id ?? '' : ''
  useEffect(() => {
    if (!roomCardId) return undefined
    postFocusMessage('claim', { cardId: roomCardId })
    const stop = onFocusMessage((message) => {
      if (message.type === 'ping') postFocusMessage('room-alive', { cardId: roomCardId })
    })
    // On close, flush any focus time accrued this block so a mid-session tab close
    // still credits the minutes (best-effort: the channel post usually lands before
    // the tab unloads), then hand ownership back to the main tab.
    const release = () => {
      if (runningRef.current) logFocusSegment()
      postFocusMessage('release', { cardId: roomCardId })
    }
    window.addEventListener('pagehide', release)
    return () => {
      window.removeEventListener('pagehide', release)
      stop()
      release()
    }
  }, [roomCardId, logFocusSegment])

  // Mirror the live timer into the shared store so the active card can display it.
  useEffect(() => {
    studyTimerStore.publishState({
      activeCardId: activeCard?.id ?? null,
      mode,
      remaining,
      running,
      durations,
      sessions,
      preset: focusPreset,
      remoteOwned: Boolean(remoteOwner),
    })
  }, [activeCard, mode, remaining, running, durations, sessions, focusPreset, remoteOwner])

  // Refresh the shared handlers every render so card controls act on live state.
  useEffect(() => {
    studyTimerStore.setActions({
      toggleRunning: handleToggleRunning,
      reset: handleReset,
      selectMode: handleSelectMode,
      selectPreset: handleSelectPreset,
      adjust: handleAdjust,
      // The Focus Room is always its own tab now. Opening it hands the clock
      // over; this tab keeps the card open but stops running the session.
      openFocusRoom: () => {
        const cardId = activeCardRef.current?.id
        if (!cardId) return
        setOpen(false)
        openFocusRoomTab(cardId)
      },
      clearActive: () => {
        onClearActive?.()
      },
    })
  })

  useEffect(() => {
    if (!running) return undefined
    const runId = runIdRef.current
    const sync = () => syncRunToClock(runId)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') sync()
    }

    sync()
    const intervalId = window.setInterval(sync, 1000)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [running, syncRunToClock])

  const releaseWakeLock = useCallback(async () => {
    const sentinel = wakeLockRef.current
    wakeLockRef.current = null
    if (!sentinel || sentinel.released) return
    try {
      await sentinel.release()
    } catch {
      /* The browser may already have released it. */
    }
    if (wakeLockRef.current == null) {
      setWakeLockActive(false)
      setWakeLockStatus('idle')
    }
  }, [])

  useEffect(() => {
    const eligible = wakeLockSupported && wakeLockEnabled && running && mode === 'focus'
    let cancelled = false

    async function acquireWakeLock() {
      if (!eligible || document.visibilityState !== 'visible') return
      if (wakeLockRef.current && !wakeLockRef.current.released) return
      setWakeLockStatus('requesting')
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled || !runningRef.current || modeRef.current !== 'focus') {
          await sentinel.release()
          return
        }
        wakeLockRef.current = sentinel
        setWakeLockActive(true)
        setWakeLockStatus('active')
        sentinel.addEventListener('release', () => {
          if (wakeLockRef.current !== sentinel) return
          wakeLockRef.current = null
          if (!cancelled) {
            setWakeLockActive(false)
            setWakeLockStatus('idle')
          }
        })
      } catch {
        if (!cancelled) {
          setWakeLockActive(false)
          setWakeLockStatus('unavailable')
        }
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') void acquireWakeLock()
      else void releaseWakeLock()
    }

    if (eligible) {
      void acquireWakeLock()
      document.addEventListener('visibilitychange', onVisibilityChange)
    }

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      void releaseWakeLock()
    }
  }, [mode, releaseWakeLock, running, wakeLockEnabled, wakeLockSupported])

  useEffect(() => {
    function onDocClick(event) {
      if (open && wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  function handleSelectMode(m) {
    if (runningRef.current) logFocusSegment()
    runIdRef.current += 1
    completedRunIdRef.current = null
    deadlineRef.current = null
    segmentStartedAtRef.current = null
    segmentCardIdRef.current = null
    runningRef.current = false
    setRunning(false)
    modeRef.current = m
    setMode(m)
    setRemaining(durationsRef.current[m] * 60)
  }
  function handleReset() {
    if (runningRef.current) logFocusSegment()
    runIdRef.current += 1
    completedRunIdRef.current = null
    deadlineRef.current = null
    segmentStartedAtRef.current = null
    segmentCardIdRef.current = null
    runningRef.current = false
    setRunning(false)
    setRemaining(durationsRef.current[modeRef.current] * 60)
  }
  function handleSelectPreset(preset) {
    const nextDurations = focusPresetDurations(preset, customDurationsRef.current)
    if (!nextDurations) return
    if (runningRef.current) logFocusSegment()
    runIdRef.current += 1
    completedRunIdRef.current = null
    deadlineRef.current = null
    segmentStartedAtRef.current = null
    segmentCardIdRef.current = null
    runningRef.current = false
    setRunning(false)
    durationsRef.current = nextDurations
    setDurations(nextDurations)
    modeRef.current = 'focus'
    setMode('focus')
    setRemaining(nextDurations.focus * 60)
    setFocusPreset(preset)
  }
  function handleAdjust(m, delta) {
    const current = durationsRef.current
    const value = Math.max(1, Math.min(120, current[m] + delta))
    const nextDurations = { ...current, [m]: value }
    durationsRef.current = nextDurations
    customDurationsRef.current = nextDurations
    setDurations(nextDurations)
    setFocusPreset('custom')
    if (m === modeRef.current && !runningRef.current) setRemaining(value * 60)
  }

  const accent = MODE_META[mode].accent
  const sessionsToday = (activeCard?.focusSessions ?? []).filter(
    (session) => session.at?.slice(0, 10) === todayString(),
  ).length

  function handleToggleRunning() {
    const now = Date.now()
    if (runningRef.current) {
      const runId = runIdRef.current
      const nextRemaining = remainingTimerSeconds(deadlineRef.current, now)
      if (nextRemaining === 0) {
        completeRun(runId, now)
        return
      }
      logFocusSegment(now)
      runIdRef.current += 1
      completedRunIdRef.current = null
      deadlineRef.current = null
      runningRef.current = false
      setRunning(false)
      setRemaining(nextRemaining)
      return
    }

    const seconds = Math.max(1, remaining)
    const runId = runIdRef.current + 1
    runIdRef.current = runId
    completedRunIdRef.current = null
    deadlineRef.current = now + seconds * 1000
    if (modeRef.current === 'focus' && activeCardRef.current) {
      segmentStartedAtRef.current = now
      segmentCardIdRef.current = activeCardRef.current.id
    } else {
      segmentStartedAtRef.current = null
      segmentCardIdRef.current = null
    }
    runningRef.current = true
    setRunning(true)
  }

  // Focus Room tab: the room IS the page. No bar, no popover, no exit-to-nothing.
  if (isRoom) {
    if (!activeCard) return null
    return (
      <FocusRoom
        key={activeCard.id}
        activeCard={activeCard}
        mode={mode}
        durations={durations}
        remaining={remaining}
        running={running}
        sessions={sessions}
        preset={focusPreset}
        currentBoundary={currentBoundary}
        nextBoundary={nextBoundary}
        onSelectMode={handleSelectMode}
        onSelectPreset={handleSelectPreset}
        onAdjust={handleAdjust}
        onReset={handleReset}
        onToggleRunning={handleToggleRunning}
        onForfeit={forfeitRun}
        onSaveRestartCue={onSaveRestartCue}
        onChecklistToggle={onChecklistToggle}
        onAddNote={onAddNote}
        onNoteUpdate={onNoteUpdate}
        onDeleteNote={onDeleteNote}
        onEvidenceAdd={onEvidenceAdd}
        onEvidenceUpdate={onEvidenceUpdate}
        onEvidenceDelete={onEvidenceDelete}
        onEvidenceFileAdd={onEvidenceFileAdd}
        resources={resources}
        onOpenResource={onOpenResource}
        linkedNotes={linkedNotes}
        queue={queue}
        onSwitchCard={onSwitchCard}
        theme={theme}
        onThemeChange={onThemeChange}
        onExit={() => {
          // Deliberate exit: log the current block before the tab closes.
          handleReset()
          onExitRoom?.()
        }}
      />
    )
  }

  return (
    <>
      <div className="timer-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`icon-button timer-trigger${running ? ' running' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Study timer"
        title="Study timer"
      >
        {running ? (
          <span className="timer-mini">{format(remaining)}</span>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="13" r="8" />
            <path d="M12 9v4l2.5 1.5M9 2h6M18 5l1.5 1.5" />
          </svg>
        )}
      </button>

      {open && (
        <div className="timer-pop" role="dialog" aria-label="Study timer">
          <div className="timer-modes">
            {Object.keys(MODE_META).map((m) => (
              <button
                key={m}
                type="button"
                className={`timer-mode${mode === m ? ' active' : ''}`}
                onClick={() => handleSelectMode(m)}
              >
                {MODE_META[m].label}
              </button>
            ))}
          </div>

          {remoteOwner && (
            <div className="timer-handoff-note" role="status">
              <strong>Session running in the Focus Room tab</strong>
              <small>This timer is paused while the Focus Room owns the clock.</small>
            </div>
          )}

          {activeCard && (
            <div className="timer-card-link">
              <span>Linked card</span>
              <strong>{activeCard.number}. {activeCard.title}</strong>
              <em>{sessionsToday} linked today</em>
              <button
                type="button"
                className="text-button"
                onClick={() => onClearActive?.()}
              >
                Clear
              </button>
              <button
                type="button"
                className="secondary-button timer-focus-room-button"
                onClick={() => {
                  setOpen(false)
                  openFocusRoomTab(activeCard.id)
                }}
              >
                {remoteOwner ? 'Go to Focus Room ↗' : 'Open Focus Room ↗'}
              </button>
            </div>
          )}

          <div className="timer-dial">
            <svg viewBox="0 0 120 120" width="150" height="150">
              <circle className="timer-track" cx="60" cy="60" r={R} fill="none" strokeWidth="8" />
              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                stroke={accent}
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - progress)}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dashoffset 0.5s linear' }}
              />
              <text x="60" y="58" textAnchor="middle" className="timer-time">{format(remaining)}</text>
              <text x="60" y="76" textAnchor="middle" className="timer-mode-label">{MODE_META[mode].label}</text>
            </svg>
          </div>

          <div className="timer-controls">
            <button type="button" className="secondary-button" onClick={handleReset} disabled={Boolean(remoteOwner)}>
              {activeCard ? 'Log & reset' : 'Reset'}
            </button>
            <button
              type="button"
              className="primary-button timer-go"
              onClick={remoteOwner ? () => openFocusRoomTab(remoteOwner.cardId) : handleToggleRunning}
            >
              {remoteOwner ? 'Go to room ↗' : running ? 'Pause' : 'Start'}
            </button>
          </div>

          <div className="timer-adjust">
            <span>{MODE_META[mode].label} length</span>
            <div className="timer-stepper">
              <button type="button" onClick={() => handleAdjust(mode, -5)} aria-label="Decrease">−</button>
              <strong>{durations[mode]}m</strong>
              <button type="button" onClick={() => handleAdjust(mode, 5)} aria-label="Increase">+</button>
            </div>
          </div>

          {wakeLockSupported && (
            <label className={`timer-wake-lock${wakeLockActive ? ' active' : ''}`}>
              <input
                type="checkbox"
                checked={wakeLockEnabled}
                onChange={(event) => setWakeLockEnabled(event.target.checked)}
              />
              <span>
                <strong>Keep screen awake</strong>
                <small>Only while a Focus timer is running</small>
              </span>
              <em>
                {wakeLockStatus === 'active'
                  ? 'On'
                  : wakeLockStatus === 'requesting'
                    ? 'Starting'
                    : wakeLockStatus === 'unavailable'
                      ? 'Unavailable'
                      : 'Ready'}
              </em>
            </label>
          )}

          <p className="timer-foot">
            {sessions} focus {sessions === 1 ? 'session' : 'sessions'} this app session · long break every 4th
          </p>
        </div>
        )}
      </div>

    </>
  )
}
