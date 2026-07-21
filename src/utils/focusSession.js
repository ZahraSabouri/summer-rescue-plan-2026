// Cross-tab handoff for the Focus Room.
//
// The Focus Room runs in its own tab. Opening it CLAIMS the session: the main
// app tab stops running the clock and becomes a display-only mirror, so one
// block is never counted twice by two clocks. The focus tab owns the timer but
// never persists tracker state itself — it posts actions back to the main tab,
// which stays the single writer. Two full app instances both auto-saving would
// race on the same localStorage key, so the focus tab is deliberately a
// follower for writes even though it leads on the clock.
//
// If no main tab answers (it was closed), the focus tab still runs the timer and
// queues its actions; `pendingWrites` lets the room warn that logging is parked.

const CHANNEL = 'summer-rescue-focus-session'

export const FOCUS_TAB_HASH = '#/focus-room'

let channel = null
const listeners = new Set()

// Distinguishes our own echoes from other tabs. Not persisted: a reload is a new
// participant, and stale ids simply stop answering pings.
export const TAB_ID = `tab-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`

function ensureChannel() {
  if (channel || typeof BroadcastChannel === 'undefined') return channel
  channel = new BroadcastChannel(CHANNEL)
  channel.onmessage = (event) => {
    const message = event?.data
    if (!message || message.from === TAB_ID) return
    listeners.forEach((listener) => listener(message))
  }
  return channel
}

export function postFocusMessage(type, payload = {}) {
  const bus = ensureChannel()
  if (!bus) return false
  bus.postMessage({ type, from: TAB_ID, at: Date.now(), ...payload })
  return true
}

export function onFocusMessage(listener) {
  ensureChannel()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function focusSessionSupported() {
  return typeof BroadcastChannel !== 'undefined'
}

/**
 * Build the URL a focus tab should be opened at. The card id rides in the hash
 * so the tab can rehydrate itself on a manual reload without asking anyone.
 */
export function focusRoomUrl(cardId) {
  const base = `${window.location.origin}${window.location.pathname}${window.location.search}`
  return `${base}${FOCUS_TAB_HASH}?card=${encodeURIComponent(cardId ?? '')}`
}

export function isFocusRoomRoute(hash = window.location.hash) {
  return String(hash ?? '').startsWith(FOCUS_TAB_HASH)
}

export function focusRoomCardId(hash = window.location.hash) {
  const query = String(hash ?? '').split('?')[1] ?? ''
  return new URLSearchParams(query).get('card') ?? ''
}

/**
 * Open (or re-focus) the Focus Room tab for a card. Browsers reuse a named
 * window, so clicking twice re-focuses the existing room instead of stacking
 * duplicate tabs that would fight over the same session.
 */
export function openFocusRoomTab(cardId) {
  const handle = window.open(focusRoomUrl(cardId), `summer-rescue-focus-room`, 'noopener=false')
  handle?.focus?.()
  return handle
}
