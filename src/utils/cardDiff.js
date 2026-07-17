// Field-level diffing for card detail edits.
//
// The card detail form submits every field on each save, so emitting the raw
// patch would log "changes" that changed nothing and bury real edits in noise.
// Diff against the live card and keep only genuine movement.
//
// `to` holds the absolute new value rather than a delta, so replaying the same
// event twice lands on the same state.

/**
 * @returns {Record<string, {from: unknown, to: unknown}>} only the fields that moved
 */
export function detailChanges(card, patch = {}) {
  const changes = {}
  if (!card || !patch || typeof patch !== 'object') return changes
  for (const [key, value] of Object.entries(patch)) {
    const before = card[key]
    if (!sameValue(before, value)) {
      changes[key] = { from: before ?? null, to: value ?? null }
    }
  }
  return changes
}

// Tags arrive as arrays, so identity comparison would report a change on every
// save. Compare them by contents; everything else is a scalar.
function sameValue(before, next) {
  if (Array.isArray(next) && Array.isArray(before)) {
    return next.length === before.length && next.every((item, index) => item === before[index])
  }
  return before === next
}
