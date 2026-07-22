// Cross-tab ownership for the floating study-video player.
//
// This app already opens the Focus Room in its own browser tab, and the
// user often keeps a third tab open too (a slide file, a duplicated app
// tab). All of them share one video: only one should actually be playing
// (audible) at a time, and any tab can claim it back. That's a small
// broadcast/claim protocol over BroadcastChannel — the same shape as
// utils/focusSession.js's focus-timer handoff, deliberately kept as its own
// channel (video ownership and focus-timer handoff are different concerns),
// reusing that module's per-tab TAB_ID rather than minting a second identity.

import { TAB_ID } from './focusSession.js'

const CHANNEL = 'summer-rescue-video-player'

let channel = null
const listeners = new Set()

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

export function postVideoMessage(type, payload = {}) {
  const bus = ensureChannel()
  if (!bus) return false
  bus.postMessage({ type, from: TAB_ID, at: Date.now(), ...payload })
  return true
}

export function onVideoMessage(listener) {
  ensureChannel()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export { TAB_ID }
