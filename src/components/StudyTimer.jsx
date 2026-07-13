import { useCallback, useEffect, useRef, useState } from 'react'
import {
  elapsedTimerMilliseconds,
  focusPresetDurations,
  focusMinutesToLog,
  nextTimerMode,
  remainingTimerSeconds,
} from '../utils/studyTimer'
import { FocusRoom } from './FocusRoom'

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
  currentBoundary,
  nextBoundary,
  onCompleteSession,
  onClearActive,
  onSaveRestartCue,
}) {
  const [open, setOpen] = useState(false)
  const [focusRoomOpen, setFocusRoomOpen] = useState(false)
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
  const onCompleteSessionRef = useRef(onCompleteSession)
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
  }, [activeCard, onCompleteSession])

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

  useEffect(() => {
    if (!activeCard) return
    const id = window.setTimeout(() => {
      setOpen(true)
      if (!runningRef.current) {
        modeRef.current = 'focus'
        setMode('focus')
        setRemaining(durationsRef.current.focus * 60)
      }
    }, 0)
    return () => window.clearTimeout(id)
  }, [activeCard])

  useEffect(() => {
    if (activeCard) return undefined
    const id = window.setTimeout(() => setFocusRoomOpen(false), 0)
    return () => window.clearTimeout(id)
  }, [activeCard])

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
    (session) => session.at?.slice(0, 10) === new Date().toISOString().slice(0, 10),
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

          {activeCard && (
            <div className="timer-card-link">
              <span>Linked card</span>
              <strong>{activeCard.number}. {activeCard.title}</strong>
              <em>{sessionsToday} linked today</em>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setFocusRoomOpen(false)
                  onClearActive?.()
                }}
              >
                Clear
              </button>
              <button
                type="button"
                className="secondary-button timer-focus-room-button"
                onClick={() => {
                  setOpen(false)
                  setFocusRoomOpen(true)
                }}
              >
                Open Focus Room
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
            <button type="button" className="secondary-button" onClick={handleReset}>
              {activeCard ? 'Log & reset' : 'Reset'}
            </button>
            <button type="button" className="primary-button timer-go" onClick={handleToggleRunning}>
              {running ? 'Pause' : 'Start'}
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

      {focusRoomOpen && activeCard && (
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
          onSaveRestartCue={onSaveRestartCue}
          onExit={() => setFocusRoomOpen(false)}
        />
      )}
    </>
  )
}
