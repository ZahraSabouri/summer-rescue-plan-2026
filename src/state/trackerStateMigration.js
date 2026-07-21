import { emptyKnowledge, normaliseKnowledge } from '../utils/knowledge.js'
import { normaliseResourceProgressMap } from '../utils/resourceProgress.js'

export const TRACKER_STATE_VERSION = 6
export const PLAN_REVISION = '2026-07-20-fresh-start-plan-v1'
export const DEFAULT_CAMPAIGN_START = '2026-07-20'
export const DEFAULT_CAMPAIGN_END = '2026-08-16'
export const DEFAULT_EXAM_WINDOW_START = '2026-08-17'
const PREVIOUS_ZERO_BASED_REVISION_PREFIX = '2026-07-16-zero-based-32-day-plan-v'
const HISTORY_DATE = '2026-07-19'
const AML_LAUNCH_CARD_ID = 'card-001'
const AML_LAUNCH_RESOURCE_IDS = new Set([
  'aml-study-notes-lab-1-ex1-study-notes',
  'aml-study-notes-lab-1-ex2-study-notes',
  'aml-session-1-s1-slides',
  'aml-session-1-lab-1-sheet',
  'aml-session-1-lab-1-ex1-notebook',
  'aml-session-1-lab-1-ex2-notebook',
  'aml-video-ubc-1-0-ml-introduction',
  'aml-video-ubc-2-1-ml-terminology',
  'aml-video-course-s1-workflow',
])

const BASE_HISTORY_RECORDS = {
  'admin-summer-assessment-confirmation': 'summer assessment entry confirmed',
  'project-capacity-w1': 'CMT501 protected capacity used, 16-19 July',
}

function historyEdits(cardState, title) {
  return {
    ...(cardState.edits ?? {}),
    title: `HISTORY - 19 Jul - ${title}`,
    phase: 'Phase 0',
    phaseId: 'phase-0',
    startDate: HISTORY_DATE,
    dueDate: HISTORY_DATE,
    dueDateTime: `${HISTORY_DATE} 23:59`,
    tags: [...new Set([...(cardState.edits?.tags ?? []), 'history', 'pre-reset-completion', '19-july-history'])],
  }
}

function asHistoryState(cardState, title) {
  return {
    ...cardState,
    done: true,
    status: 'Done',
    previousStatus: cardState.previousStatus ?? cardState.status ?? 'This Week',
    edits: historyEdits(cardState, title),
  }
}

function hasUserCardWork(cardState) {
  return Boolean(
    cardState?.done ||
    cardState?.status === 'Done' ||
    Number(cardState?.actualHours ?? 0) > 0 ||
    Number(cardState?.progressPercent ?? 0) > 0 ||
    Object.values(plainObject(cardState?.checklist)).some(Boolean) ||
    (cardState?.edits?.checklist ?? []).length ||
    (cardState?.notes ?? []).length ||
    (cardState?.evidenceEntries ?? []).length ||
    (cardState?.focusSessions ?? []).length,
  )
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
  const resetAmlLaunchCard = Number(value.version ?? 0) < TRACKER_STATE_VERSION
  const planChanged = previousSettings.planRevision !== PLAN_REVISION
  const previousCards = plainObject(value.cards)
  const previousRevision = String(previousSettings.planRevision ?? '')
  const july20ResetRequired = previousRevision.startsWith(PREVIOUS_ZERO_BASED_REVISION_PREFIX)
  const legacyResetRequired = planChanged && !july20ResetRequired
  const sourceAddedCards = Array.isArray(value.addedCards) ? value.addedCards : []
  let cards = legacyResetRequired
    ? Object.fromEntries(Object.entries(previousCards).filter(([, card]) => hasUserCardWork(card)))
    : { ...previousCards }

  if (july20ResetRequired) {
    cards = Object.fromEntries(
      Object.entries(cards).filter(([cardId, cardState]) => {
        if (BASE_HISTORY_RECORDS[cardId] && hasUserCardWork(cardState)) return true
        if (cardId === 'project-capacity-w2') return true
        if (hasUserCardWork(cardState)) return true
        return sourceAddedCards.some((card) => card.id === cardId && card.startDate >= DEFAULT_CAMPAIGN_START)
      }),
    )
  }

  for (const [cardId, title] of Object.entries(BASE_HISTORY_RECORDS)) {
    if (cards[cardId] && hasUserCardWork(cards[cardId])) {
      cards[cardId] = asHistoryState(cards[cardId], title)
    }
  }

  // One deliberate July 20 correction: the user asked for this launch card,
  // and only this card, to return to a completely untouched state.
  if (resetAmlLaunchCard) delete cards[AML_LAUNCH_CARD_ID]

  const resourceProgress = normaliseResourceProgressMap(value.resourceProgress)
  const recentResourceIds = Array.isArray(value.recentResourceIds) ? value.recentResourceIds.slice(0, 8) : []
  const notifications = { ...plainObject(value.notifications) }
  const dayLogs = Object.fromEntries(
    Object.entries(plainObject(value.dayLogs)).map(([date, log]) => [
      date,
      { ...plainObject(log), blocks: { ...plainObject(log?.blocks) } },
    ]),
  )
  if (resetAmlLaunchCard) {
    for (const resourceId of AML_LAUNCH_RESOURCE_IDS) delete resourceProgress[resourceId]
    for (const [notificationId, notification] of Object.entries(notifications)) {
      if (notification?.cardId === AML_LAUNCH_CARD_ID) delete notifications[notificationId]
    }
    for (const log of Object.values(dayLogs)) {
      if (log?.blocks && typeof log.blocks === 'object') delete log.blocks[`card:${AML_LAUNCH_CARD_ID}`]
    }
  }

  const addedCards = sourceAddedCards
    .filter((card) => {
      if (!planChanged) return true
      if (card.startDate >= DEFAULT_CAMPAIGN_START) return true
      return hasUserCardWork(cards[card.id])
    })
    .map((card) => {
      const cardState = cards[card.id]
      if (!planChanged || !hasUserCardWork(cardState)) return card
      const originalTitle = String(card.title ?? 'saved card')
        .replace(/^HISTORY\s*[—-]\s*/i, '')
        .replace(/\s*\(completed before reset\)\s*$/i, '')
        .replace(/\s*\(from .*?\)\s*$/i, '')
      cards[card.id] = asHistoryState(cardState, originalTitle)
      return {
        ...card,
        title: `HISTORY - 19 Jul - ${originalTitle}`,
        phase: 'Phase 0',
        phaseId: 'phase-0',
        startDate: HISTORY_DATE,
        dueDate: HISTORY_DATE,
        dueDateTime: `${HISTORY_DATE} 23:59`,
        estimatedHours: 0,
        tags: [...new Set([...(card.tags ?? []), 'history', 'pre-reset-completion', '19-july-history'])],
      }
    })
    .map((card, index) => ({ ...card, number: `A${index + 1}`, sortOrder: 1000 + index }))
  const campaignStart =
    !previousSettings.campaignStart ||
    previousSettings.campaignStart === '2026-07-04' ||
    previousSettings.campaignStart === '2026-07-13' ||
    previousSettings.campaignStart === '2026-07-16' ||
    planChanged
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
    notifications: planChanged ? {} : notifications,
    resourceProgress,
    uploadedResources: normaliseUploadedResources(value.uploadedResources),
    recentResourceIds: resetAmlLaunchCard
      ? recentResourceIds.filter((id) => !AML_LAUNCH_RESOURCE_IDS.has(id))
      : recentResourceIds,
    snapshots: plainObject(value.snapshots),
    dayLogs,
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
