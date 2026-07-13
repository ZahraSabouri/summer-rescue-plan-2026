const SECOND_MS = 1000
const MINUTE_MS = 60 * SECOND_MS

export const FOCUS_PRESET_DURATIONS = Object.freeze({
  '25-5': Object.freeze({ focus: 25, short: 5, long: 15 }),
  '50-10': Object.freeze({ focus: 50, short: 10, long: 20 }),
})

function safeDuration(value, fallback) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(1, Math.min(120, Math.round(numeric)))
}

/** Resolve a named focus preset or a caller-owned custom duration set. */
export function focusPresetDurations(preset, customDurations = FOCUS_PRESET_DURATIONS['25-5']) {
  const source = preset === 'custom' ? customDurations : FOCUS_PRESET_DURATIONS[preset]
  if (!source) return null
  return {
    focus: safeDuration(source.focus, 25),
    short: safeDuration(source.short, 5),
    long: safeDuration(source.long, 15),
  }
}

/** Remaining whole display seconds for a wall-clock deadline. */
export function remainingTimerSeconds(deadlineMs, nowMs = Date.now()) {
  if (!Number.isFinite(deadlineMs) || !Number.isFinite(nowMs)) return 0
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / SECOND_MS))
}

/**
 * Elapsed wall-clock time for one running segment, capped at its deadline.
 * The cap prevents a suspended browser or sleeping computer from logging time
 * after the timer itself should have finished.
 */
export function elapsedTimerMilliseconds(startedAtMs, nowMs = Date.now(), deadlineMs = null) {
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(nowMs)) return 0
  const stoppedAt = Number.isFinite(deadlineMs) ? Math.min(nowMs, deadlineMs) : nowMs
  return Math.max(0, stoppedAt - startedAtMs)
}

/** Keep the existing policy: ignore fragments below one minute and round the rest. */
export function focusMinutesToLog(elapsedMs) {
  if (!Number.isFinite(elapsedMs) || elapsedMs < MINUTE_MS) return 0
  return Math.max(1, Math.round(elapsedMs / MINUTE_MS))
}

export function nextTimerMode(completedMode, completedFocusSessions) {
  if (completedMode !== 'focus') return 'focus'
  return completedFocusSessions > 0 && completedFocusSessions % 4 === 0 ? 'long' : 'short'
}
