export const TRACKER_STATE_VERSION = 4
export const PLAN_REVISION = '2026-07-16-restart-recovery-plan-v3'
export const DEFAULT_CAMPAIGN_START = '2026-07-16'
export const DEFAULT_CAMPAIGN_END = '2026-08-28'
export const DEFAULT_EXAM_WINDOW_START = '2026-08-17'

function nowIso() {
  return new Date().toISOString()
}

function localToday() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function campaignReferenceDate(value) {
  const date = typeof value === 'string' ? value.slice(0, 10) : ''
  const today = localToday()
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date > today
    ? date
    : today
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

export function normaliseUploadedResource(resource) {
  if (!resource || typeof resource !== 'object' || !resource.id || !resource.url) return null
  return {
    id: String(resource.id),
    moduleId: String(resource.moduleId ?? ''),
    moduleKey: String(resource.moduleKey ?? ''),
    moduleGroup: String(resource.moduleGroup ?? ''),
    group: String(resource.group ?? 'Uploaded'),
    title: String(resource.title ?? resource.fileName ?? 'Uploaded resource').trim() || 'Uploaded resource',
    path: String(resource.path ?? resource.fileName ?? ''),
    type: String(resource.type ?? 'FILE'),
    viewer: String(resource.viewer ?? 'file'),
    url: String(resource.url),
    description: String(resource.description ?? ''),
    tags: Array.isArray(resource.tags) ? resource.tags.map((tag) => String(tag)).filter(Boolean) : [],
    priority: resource.priority === 'high' ? 'high' : 'normal',
    uploadedAt: String(resource.uploadedAt ?? ''),
    size: Number(resource.size ?? 0),
  }
}

function normaliseUploadedResources(resources) {
  if (!Array.isArray(resources)) return []
  return resources.map(normaliseUploadedResource).filter(Boolean)
}

export function createInitialTrackerState(referenceDate = localToday()) {
  return {
    version: TRACKER_STATE_VERSION,
    cards: {},
    addedCards: [],
    moduleNotes: {},
    notifications: {},
    resourceProgress: {},
    uploadedResources: [],
    recentResourceIds: [],
    snapshots: {},
    dayLogs: {},
    settings: {
      referenceDate: campaignReferenceDate(referenceDate),
      mat700Active: true,
      theme: 'light',
      campaignStart: DEFAULT_CAMPAIGN_START,
      campaignEnd: DEFAULT_CAMPAIGN_END,
      examWindowStart: DEFAULT_EXAM_WINDOW_START,
      moduleExamDates: {},
      customModules: [],
      customPhases: [],
      lastExportedAt: null,
      saveHintDismissed: false,
      planRevision: PLAN_REVISION,
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
}

export function migrateTrackerState(value) {
  const fallback = createInitialTrackerState()
  if (!value || typeof value !== 'object') return fallback

  const previousSettings = plainObject(value.settings)
  const planChanged = previousSettings.planRevision !== PLAN_REVISION
  const campaignStart =
    !previousSettings.campaignStart ||
    previousSettings.campaignStart === '2026-07-04' ||
    previousSettings.campaignStart === '2026-07-13'
      ? DEFAULT_CAMPAIGN_START
      : previousSettings.campaignStart
  const campaignEnd =
    !previousSettings.campaignEnd || previousSettings.campaignEnd === '2026-08-18'
      ? DEFAULT_CAMPAIGN_END
      : previousSettings.campaignEnd
  const referenceDate = planChanged
    ? localToday()
    : campaignReferenceDate(previousSettings.referenceDate || localToday())

  return {
    ...fallback,
    ...value,
    version: TRACKER_STATE_VERSION,
    cards: plainObject(value.cards),
    addedCards: Array.isArray(value.addedCards) ? value.addedCards : [],
    moduleNotes: plainObject(value.moduleNotes),
    // Generated due-date alerts from the abandoned pre-13-July plan are noise,
    // not user work. Rebuild them from the live cards after a plan revision.
    notifications: planChanged ? {} : plainObject(value.notifications),
    resourceProgress: plainObject(value.resourceProgress),
    uploadedResources: normaliseUploadedResources(value.uploadedResources),
    recentResourceIds: Array.isArray(value.recentResourceIds) ? value.recentResourceIds.slice(0, 8) : [],
    snapshots: plainObject(value.snapshots),
    dayLogs: plainObject(value.dayLogs),
    settings: {
      ...fallback.settings,
      ...previousSettings,
      referenceDate,
      campaignStart,
      campaignEnd,
      examWindowStart: previousSettings.examWindowStart || DEFAULT_EXAM_WINDOW_START,
      mat700Active: true,
      moduleExamDates: plainObject(previousSettings.moduleExamDates),
      customModules: Array.isArray(previousSettings.customModules) ? previousSettings.customModules : [],
      customPhases: Array.isArray(previousSettings.customPhases) ? previousSettings.customPhases : [],
      planRevision: PLAN_REVISION,
    },
    updatedAt: value.updatedAt ?? nowIso(),
  }
}
