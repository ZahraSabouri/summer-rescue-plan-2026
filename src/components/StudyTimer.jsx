import { useCallback, useEffect, useRef, useState } from 'react'

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

export function StudyTimer({ activeCard, onCompleteSession, onClearActive }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('focus')
  const [durations, setDurations] = useState({ focus: 25, short: 5, long: 15 })
  const [remaining, setRemaining] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const intervalRef = useRef(null)
  const wrapRef = useRef(null)
  const sessionElapsedRef = useRef(0)

  const total = durations[mode] * 60
  const progress = total > 0 ? 1 - remaining / total : 0
  const R = 52
  const CIRC = 2 * Math.PI * R

  const logActiveSession = useCallback(() => {
    if (!activeCard || sessionElapsedRef.current < 60) {
      sessionElapsedRef.current = 0
      return
    }
    const minutes = Math.round(sessionElapsedRef.current / 60)
    sessionElapsedRef.current = 0
    onCompleteSession?.(activeCard.id, minutes)
  }, [activeCard, onCompleteSession])

  useEffect(() => {
    if (!activeCard) return
    const id = window.setTimeout(() => {
      setOpen(true)
      setMode('focus')
    }, 0)
    return () => window.clearTimeout(id)
  }, [activeCard])

  useEffect(() => {
    if (!running) return undefined
    intervalRef.current = window.setInterval(() => {
      if (mode === 'focus' && activeCard) sessionElapsedRef.current += 1
      setRemaining((r) => (r <= 1 ? 0 : r - 1))
    }, 1000)
    return () => window.clearInterval(intervalRef.current)
  }, [activeCard, mode, running])

  useEffect(() => {
    if (remaining !== 0 || !running) return
    const id = window.setTimeout(() => {
      setRunning(false)
      chime()
      const completedFocus = mode === 'focus'
      const nextCount = completedFocus ? sessions + 1 : sessions
      if (completedFocus) logActiveSession()
      if (completedFocus) setSessions(nextCount)
      const next = completedFocus ? (nextCount % 4 === 0 ? 'long' : 'short') : 'focus'
      setMode(next)
      setRemaining(durations[next] * 60)
    }, 0)
    return () => window.clearTimeout(id)
  }, [durations, logActiveSession, mode, remaining, running, sessions])

  useEffect(() => {
    function onDocClick(event) {
      if (open && wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  function selectMode(m) {
    if (mode === 'focus' && m !== 'focus') logActiveSession()
    setMode(m)
    setRemaining(durations[m] * 60)
    setRunning(false)
  }
  function reset() {
    logActiveSession()
    setRemaining(durations[mode] * 60)
    setRunning(false)
  }
  function adjust(m, delta) {
    setDurations((d) => {
      const v = Math.max(1, Math.min(120, d[m] + delta))
      const nextD = { ...d, [m]: v }
      if (m === mode && !running) setRemaining(v * 60)
      return nextD
    })
  }

  const accent = MODE_META[mode].accent
  const sessionsToday = (activeCard?.focusSessions ?? []).filter(
    (session) => session.at?.slice(0, 10) === new Date().toISOString().slice(0, 10),
  ).length

  function toggleRunning() {
    if (running) logActiveSession()
    setRunning((value) => !value)
  }

  return (
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
                onClick={() => selectMode(m)}
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
              <button type="button" className="text-button" onClick={onClearActive}>
                Clear
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
            <button type="button" className="secondary-button" onClick={reset}>
              {activeCard ? 'Log & reset' : 'Reset'}
            </button>
            <button type="button" className="primary-button timer-go" onClick={toggleRunning}>
              {running ? 'Pause' : 'Start'}
            </button>
          </div>

          <div className="timer-adjust">
            <span>{MODE_META[mode].label} length</span>
            <div className="timer-stepper">
              <button type="button" onClick={() => adjust(mode, -5)} aria-label="Decrease">−</button>
              <strong>{durations[mode]}m</strong>
              <button type="button" onClick={() => adjust(mode, 5)} aria-label="Increase">+</button>
            </div>
          </div>

          <p className="timer-foot">
            {sessions} focus {sessions === 1 ? 'session' : 'sessions'} today · long break every 4th
          </p>
        </div>
      )}
    </div>
  )
}
