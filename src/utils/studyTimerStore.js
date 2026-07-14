// Lightweight external store that mirrors the one running study timer so any card
// can display and control the same session without prop-drilling through the app.
//
// The StudyTimer engine (mounted once in the top bar) owns the real state and
// publishes a snapshot here on every change; card-level timers subscribe via
// useSyncExternalStore. Because the engine lives in the always-mounted top bar,
// the session keeps running even when the card that started it is closed.

let state = {
  activeCardId: null,
  mode: 'focus',
  remaining: 25 * 60,
  running: false,
  durations: { focus: 25, short: 5, long: 15 },
  sessions: 0,
  preset: '25-5',
}
let actions = {}
const listeners = new Set()

function unchanged(next) {
  for (const key in next) {
    if (state[key] !== next[key]) return false
  }
  return true
}

export const studyTimerStore = {
  getState() {
    return state
  },
  getActions() {
    return actions
  },
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  // Called by the timer engine. Only notifies subscribers when something actually
  // changed, so useSyncExternalStore keeps a stable snapshot between ticks.
  publishState(next) {
    if (unchanged(next)) return
    state = { ...state, ...next }
    listeners.forEach((listener) => listener())
  },
  // Handlers close over the engine's live state, so they are refreshed every render.
  setActions(next) {
    actions = next
  },
}
