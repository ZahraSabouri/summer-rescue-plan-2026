import { useSyncExternalStore } from 'react'
import { studyTimerStore } from '../utils/studyTimerStore'

const MODE_LABELS = {
  focus: 'Focus',
  short: 'Short break',
  long: 'Long break',
}

function format(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Lives inside a work card and reflects the shared study-timer session. Rendered
// only for the card that owns the active session, so only that card re-renders as
// the clock ticks. Controls call through to the same engine as the top-bar timer.
export function CardSessionTimer({ cardId }) {
  const state = useSyncExternalStore(studyTimerStore.subscribe, studyTimerStore.getState)
  if (state.activeCardId !== cardId) return null

  const total = Math.max(1, (state.durations[state.mode] ?? 1) * 60)
  const progress = Math.max(0, Math.min(1, 1 - state.remaining / total))
  const act = studyTimerStore.getActions

  return (
    <div className={`card-session${state.running ? ' running' : ''}`} aria-label="Focus session">
      <div className="card-session-dial" style={{ '--session-progress': `${progress * 360}deg` }}>
        <strong>{format(state.remaining)}</strong>
        <span>{MODE_LABELS[state.mode]}</span>
      </div>
      <div className="card-session-controls">
        <button type="button" className="primary-button" onClick={() => act().toggleRunning?.()}>
          {state.running ? 'Pause' : 'Start'}
        </button>
        <button type="button" className="secondary-button" onClick={() => act().reset?.()}>
          Log &amp; reset
        </button>
        <button type="button" className="secondary-button" onClick={() => act().openFocusRoom?.()}>
          Focus Room
        </button>
        <button type="button" className="text-button" onClick={() => act().clearActive?.()}>
          Clear
        </button>
      </div>
    </div>
  )
}
