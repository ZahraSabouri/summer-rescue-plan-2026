// Rolling daily safety copies of the tracker state, kept in localStorage.
// This protects against accidental resets / bad imports (the file-corruption
// class of problem), not against the browser profile being wiped — the file
// autosave and JSON exports cover that.

const KEY = 'srp-rolling-backups-v1'
const MAX_DAYS = 5

function todayString() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function readStore() {
  try {
    const raw = window.localStorage.getItem(KEY)
    const value = raw ? JSON.parse(raw) : {}
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}

function writeStore(store) {
  window.localStorage.setItem(KEY, JSON.stringify(store))
}

function trim(store, maxDays) {
  const days = Object.keys(store).sort()
  while (days.length > maxDays) {
    delete store[days.shift()]
  }
  return store
}

// Record (or overwrite) today's safety copy. Quota-safe: on failure it retries
// with fewer retained days, and gives up silently rather than crashing.
export function recordRollingBackup(payload) {
  if (typeof window === 'undefined') return false
  const day = todayString()
  const entry = {
    savedAt: new Date().toISOString(),
    payload,
  }

  for (const maxDays of [MAX_DAYS, 2, 1]) {
    try {
      const store = trim(readStore(), maxDays - 1)
      store[day] = entry
      writeStore(store)
      return true
    } catch {
      // quota exceeded — retry keeping fewer days
    }
  }
  return false
}

export function listRollingBackups() {
  if (typeof window === 'undefined') return []
  const store = readStore()
  return Object.entries(store)
    .map(([day, entry]) => ({ day, savedAt: entry?.savedAt ?? null }))
    .sort((a, b) => b.day.localeCompare(a.day))
}

export function readRollingBackup(day) {
  if (typeof window === 'undefined') return null
  const store = readStore()
  return store[day]?.payload ?? null
}
