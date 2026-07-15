// Retro-log of past days: per-date check-offs for schedule blocks (wake, wash-up,
// meals, travel, classes, study blocks) plus a free-form day note. This records
// what actually happened — it never credits study hours or focus points; those
// stay earned only through cards and the timer. Persisted to localStorage and
// consumed via useSyncExternalStore, following the focusRewards store pattern.

const STORAGE_KEY = 'summer-rescue-day-log'
const VALID_STATUSES = new Set(['done', 'skipped'])
// Day facts record how the day actually ran (late sleep, late wake, energy) —
// they are observations, never tasks, so nothing here can ever be "overdue".
const VALID_FACT_KEYS = new Set(['wokeAt', 'sleptAt', 'energy'])
const VALID_ENERGY = new Set(['low', 'ok', 'high'])

function cleanFactValue(key, value) {
  if (value == null || value === '') return null
  const text = String(value)
  if (key === 'energy') return VALID_ENERGY.has(text) ? text : null
  return /^\d{2}:\d{2}$/.test(text) ? text : null
}

function load() {
  try {
    if (typeof localStorage === 'undefined') return { days: {} }
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return { days: parsed?.days && typeof parsed.days === 'object' ? parsed.days : {} }
  } catch {
    return { days: {} }
  }
}

let state = load()
const listeners = new Set()

function persist() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable — keep in-memory only */
  }
}

function commit(next) {
  state = next
  persist()
  listeners.forEach((listener) => listener())
}

function dayEntry(date) {
  return state.days[date] ?? { blocks: {}, note: '', facts: {} }
}

// Pure merge used to reconcile the store with dayLogs restored from a tracker
// backup: existing store entries win per block (the device's live log is the
// freshest source); incoming entries only fill gaps. Invalid incoming block
// statuses are dropped. Returns the SAME reference when nothing changes.
export function mergeDayLogDays(storeDays, incomingDays) {
  const base = storeDays && typeof storeDays === 'object' ? storeDays : {}
  const incoming = incomingDays && typeof incomingDays === 'object' ? incomingDays : {}
  let merged = base
  for (const [date, rawEntry] of Object.entries(incoming)) {
    if (!date || !rawEntry || typeof rawEntry !== 'object') continue
    const entry = merged[date] ?? { blocks: {}, note: '' }
    const blocks = { ...entry.blocks }
    let entryChanged = false
    const rawBlocks = rawEntry.blocks && typeof rawEntry.blocks === 'object' ? rawEntry.blocks : {}
    for (const [key, status] of Object.entries(rawBlocks)) {
      if (!VALID_STATUSES.has(status) || blocks[key] != null) continue
      blocks[key] = status
      entryChanged = true
    }
    let note = typeof entry.note === 'string' ? entry.note : ''
    const incomingNote = typeof rawEntry.note === 'string' ? rawEntry.note : ''
    if (!note && incomingNote) {
      note = incomingNote
      entryChanged = true
    }
    const facts = { ...(entry.facts ?? {}) }
    const rawFacts = rawEntry.facts && typeof rawEntry.facts === 'object' ? rawEntry.facts : {}
    for (const key of VALID_FACT_KEYS) {
      const incomingFact = cleanFactValue(key, rawFacts[key])
      if (incomingFact == null || facts[key] != null) continue
      facts[key] = incomingFact
      entryChanged = true
    }
    if (!entryChanged) continue
    const mergedEntry = { ...entry, blocks, note }
    if (Object.keys(facts).length > 0) mergedEntry.facts = facts
    merged = { ...merged, [date]: mergedEntry }
  }
  return merged
}

export const dayLog = {
  getState() {
    return state
  },
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  // status: 'done' | 'skipped' | null (null clears the entry back to unlogged).
  setBlockStatus(date, blockKey, status) {
    if (!date || !blockKey) return
    if (status != null && !VALID_STATUSES.has(status)) return
    const entry = dayEntry(date)
    const blocks = { ...entry.blocks }
    if (status == null) delete blocks[blockKey]
    else blocks[blockKey] = status
    commit({ days: { ...state.days, [date]: { ...entry, blocks } } })
  },
  // Bulk helper for fast retro-logging: mark every listed block that is still
  // unlogged as done, leaving explicit done/skipped entries untouched.
  logRemainingDone(date, blockKeys) {
    if (!date || !Array.isArray(blockKeys) || blockKeys.length === 0) return
    const entry = dayEntry(date)
    const blocks = { ...entry.blocks }
    let changed = false
    for (const key of blockKeys) {
      if (blocks[key] == null) {
        blocks[key] = 'done'
        changed = true
      }
    }
    if (!changed) return
    commit({ days: { ...state.days, [date]: { ...entry, blocks } } })
  },
  setDayNote(date, note) {
    if (!date) return
    const entry = dayEntry(date)
    commit({ days: { ...state.days, [date]: { ...entry, note: String(note ?? '') } } })
  },
  // value: 'HH:MM' for wokeAt/sleptAt, 'low' | 'ok' | 'high' for energy;
  // null/'' clears the fact.
  setDayFact(date, key, value) {
    if (!date || !VALID_FACT_KEYS.has(key)) return
    const entry = dayEntry(date)
    const facts = { ...(entry.facts ?? {}) }
    const clean = cleanFactValue(key, value)
    if (clean == null) delete facts[key]
    else facts[key] = clean
    commit({ days: { ...state.days, [date]: { ...entry, facts } } })
  },
  // Merge dayLogs carried in tracker state (backup restore / other device)
  // into the store. Store entries win; no-op when nothing new arrives.
  hydrate(days) {
    const merged = mergeDayLogDays(state.days, days)
    if (merged === state.days) return
    commit({ days: merged })
  },
}
