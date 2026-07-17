export function clampPercent(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.min(100, Math.max(0, Math.round(number)))
}

export function normaliseResourceProgressEntry(value) {
  if (value === true) {
    return {
      progressPercent: 100,
      understandingPercent: 0,
      note: '',
      updatedAt: '',
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      progressPercent: 0,
      understandingPercent: 0,
      note: '',
      updatedAt: '',
    }
  }
  return {
    progressPercent: clampPercent(value.progressPercent ?? value.percent ?? (value.reviewed ? 100 : 0)),
    understandingPercent: clampPercent(value.understandingPercent ?? value.understoodPercent ?? 0),
    note: String(value.note ?? value.notes ?? ''),
    updatedAt: String(value.updatedAt ?? ''),
  }
}

export function normaliseResourceProgressMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).map(([resourceId, entry]) => [resourceId, normaliseResourceProgressEntry(entry)]),
  )
}

export function averageResourceProgress(resources = [], progress = {}) {
  if (!resources.length) return 0
  const total = resources.reduce(
    (sum, resource) => sum + normaliseResourceProgressEntry(progress[resource.id]).progressPercent,
    0,
  )
  return Math.round(total / resources.length)
}
