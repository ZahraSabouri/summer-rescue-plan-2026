const SECOND_MS = 1000
const MINUTE_MS = 60 * SECOND_MS

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

