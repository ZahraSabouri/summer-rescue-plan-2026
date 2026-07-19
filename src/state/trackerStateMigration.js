import { emptyKnowledge, normaliseKnowledge } from '../utils/knowledge.js'
import { normaliseResourceProgressMap } from '../utils/resourceProgress.js'

export const TRACKER_STATE_VERSION = 5
export const PLAN_REVISION = '2026-07-16-zero-based-32-day-plan-v9'
export const DEFAULT_CAMPAIGN_START = '2026-07-16'
export const DEFAULT_CAMPAIGN_END = '2026-08-16'
export const DEFAULT_EXAM_WINDOW_START = '2026-08-17'
const ZERO_BASED_REVISION_PREFIX = '2026-07-16-zero-based-32-day-plan-v'
const RESET_MIDNIGHT = '2026-07-16T00:00:00.000Z'

function moveCompletionToResetMidnight(cardState) {
  return {
    ...cardState,
    updatedAt: RESET_MIDNIGHT,
    activity: (cardState.activity ?? []).map((entry) =>
      entry.action === 'Marked done' ||
      entry.action === 'Added card' ||
      (entry.action === 'Moved card' && entry.details === 'Done')
        ? { ...entry, at: RESET_MIDNIGHT }
        : entry,
    ),
  }
}

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
    knowledge: emptyKnowledge(),
    notifications: {},
    resourceProgress: {},
    uploadedResources: [],
    recentResourceIds: [],
    snapshots: {},
    dayLogs: {},
    focusRewards: null,
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
  const previousCards = plainObject(value.cards)
  const zeroResetRequired = !String(previousSettings.planRevision ?? '').startsWith(ZERO_BASED_REVISION_PREFIX)
  const sourceAddedCards = Array.isArray(value.addedCards) ? value.addedCards : []
  const historicalAddedIds = new Set(
    sourceAddedCards
      .filter((card) =>
        (previousCards[card.id]?.done || previousCards[card.id]?.status === 'Done') &&
        (card.startDate < DEFAULT_CAMPAIGN_START ||
          (card.tags ?? []).includes('pre-reset-completion') ||
          /^HISTORY\s/.test(card.title ?? '')),
      )
      .map((card) => card.id),
  )
  const cards = zeroResetRequired
    ? Object.fromEntries(
        Object.entries(previousCards).filter(([, card]) => card?.done || card?.status === 'Done'),
      )
    : { ...previousCards }
  if (cards['admin-summer-assessment-confirmation']?.done || cards['admin-summer-assessment-confirmation']?.status === 'Done') {
    const completed = moveCompletionToResetMidnight(cards['admin-summer-assessment-confirmation'])
    cards['admin-summer-assessment-confirmation'] = {
      ...completed,
      edits: {
        ...(completed.edits ?? {}),
        title: 'HISTORY — summer assessment entry confirmed (completed before reset)',
        phase: 'Phase 0',
        phaseId: 'phase-0',
        startDate: DEFAULT_CAMPAIGN_START,
        dueDate: DEFAULT_CAMPAIGN_START,
        dueDateTime: `${DEFAULT_CAMPAIGN_START} 00:00`,
      },
    }
  }
  for (const cardId of historicalAddedIds) {
    if (cards[cardId]) cards[cardId] = moveCompletionToResetMidnight(cards[cardId])
  }
  const addedCards = sourceAddedCards
    .filter((card) => !zeroResetRequired || card.startDate >= DEFAULT_CAMPAIGN_START || cards[card.id])
    .map((card) =>
      historicalAddedIds.has(card.id)
        ? {
            ...card,
            title: 'HISTORY — life admin completed before reset',
            phase: 'Phase 0',
            phaseId: 'phase-0',
            startDate: DEFAULT_CAMPAIGN_START,
            dueDate: DEFAULT_CAMPAIGN_START,
            dueDateTime: `${DEFAULT_CAMPAIGN_START} 00:00`,
            tags: [...new Set([...(card.tags ?? []), 'history', 'pre-reset-completion'])],
          }
        : card,
    )
    .map((card) => {
      if (card.startDate !== DEFAULT_CAMPAIGN_START) return card
      if (/Groceries \+ supermarket run/.test(card.title)) return { ...card, dueDate: '2026-07-18', dueDateTime: '2026-07-18' }
      if (/Laundry \+ room reset|Three movement breaks/.test(card.title)) return { ...card, dueDate: '2026-07-19', dueDateTime: '2026-07-19' }
      return card
    })
    .map((card, index) => ({ ...card, number: `A${index + 1}`, sortOrder: 1000 + index }))
  const campaignStart =
    !previousSettings.campaignStart ||
    previousSettings.campaignStart === '2026-07-04' ||
    previousSettings.campaignStart === '2026-07-13'
      ? DEFAULT_CAMPAIGN_START
      : previousSettings.campaignStart
  const campaignEnd =
    planChanged || !previousSettings.campaignEnd || previousSettings.campaignEnd === '2026-08-18'
      ? DEFAULT_CAMPAIGN_END
      : previousSettings.campaignEnd
  const referenceDate = planChanged
    ? localToday()
    : campaignReferenceDate(previousSettings.referenceDate || localToday())

  return {
    ...fallback,
    ...value,
    version: TRACKER_STATE_VERSION,
    cards,
    addedCards,
    moduleNotes: plainObject(value.moduleNotes),
    // Reference notes survive a plan reset: they describe the syllabus, not
    // the schedule that was thrown away.
    knowledge: normaliseKnowledge(value.knowledge),
    // Generated alerts from the abandoned pre-reset plan are noise,
    // not user work. Rebuild them from the live cards after a plan revision.
    notifications: zeroResetRequired ? {} : plainObject(value.notifications),
    resourceProgress: normaliseResourceProgressMap(value.resourceProgress),
    uploadedResources: normaliseUploadedResources(value.uploadedResources),
    recentResourceIds: Array.isArray(value.recentResourceIds) ? value.recentResourceIds.slice(0, 8) : [],
    snapshots: plainObject(value.snapshots),
    dayLogs: plainObject(value.dayLogs),
    focusRewards:
      value.focusRewards && typeof value.focusRewards === 'object' && !Array.isArray(value.focusRewards)
        ? plainObject(value.focusRewards)
        : null,
    settings: {
      ...fallback.settings,
      ...previousSettings,
      referenceDate,
      campaignStart,
      campaignEnd,
      examWindowStart: previousSettings.examWindowStart || DEFAULT_EXAM_WINDOW_START,
      mat700Active: previousSettings.mat700Active !== false,
      moduleExamDates: plainObject(previousSettings.moduleExamDates),
      customModules: Array.isArray(previousSettings.customModules) ? previousSettings.customModules : [],
      customPhases: Array.isArray(previousSettings.customPhases) ? previousSettings.customPhases : [],
      planRevision: PLAN_REVISION,
    },
    updatedAt: value.updatedAt ?? nowIso(),
  }
}
