import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  LOCAL_STATE_FILE_LABEL,
  StateConflictError,
  appendLocalProgressEvent,
  deleteCardAttachmentFile,
  isCardAttachmentUrl,
  readLocalTrackerStateFile,
  writeLocalTrackerStateFile,
} from '../utils/localStateFile'
import { detailChanges } from '../utils/cardDiff'
import { dayLog } from '../utils/dayLog'
import { focusRewards } from '../utils/focusRewards'
import { normaliseGeneralKnowledge, normaliseGeneralKnowledgeEntry } from '../utils/generalKnowledge'
import { emptyKnowledge, normaliseKnowledge, normaliseNote, normaliseNoteMeta } from '../utils/knowledge'
import { cleanWeeklyLifeCardTitle, recurringLifeCardIdentity } from '../utils/lifeCards'
import { isTrackableCard, todayString } from '../utils/progress'
import { clampPercent, normaliseResourceProgressEntry } from '../utils/resourceProgress'
import {
  createInitialTrackerState,
  migrateTrackerState,
  normaliseUploadedResource,
} from './trackerStateMigration.js'

export const STORAGE_KEY = 'summer-rescue-tracker-state-v3'
const LEGACY_MODULE_NOTE_PREFIX = 'summer-rescue-module-note-'
const LEGACY_MODULE_NOTE_SUFFIX = '-v1'
const TRACKER_CHANNEL = 'summer-rescue-tracker-state'
const WRITER_ID_KEY = 'summer-rescue-writer-id'
const RESOURCE_PREFIXES_BY_MODULE = {
  'Applied ML': ['aml-', 'amlPlan-'],
  'Time Series': ['timeSeries-', 'timeSeriesPlan-'],
  MAT700: ['mat700-', 'mat700Plan-'],
  'Group Project': ['teamProject-'],
}
const MANAGED_RESOURCE_PREFIXES = Object.values(RESOURCE_PREFIXES_BY_MODULE).flat()

function makeId(prefix = 'item') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function nowIso() {
  return new Date().toISOString()
}

function stateFingerprint(value) {
  return JSON.stringify(value)
}

function browserWriterId() {
  if (typeof window === 'undefined') return 'server-render'
  try {
    const existing = window.sessionStorage.getItem(WRITER_ID_KEY)
    if (existing) return existing
    const created = makeId('writer')
    window.sessionStorage.setItem(WRITER_ID_KEY, created)
    return created
  } catch {
    return makeId('writer')
  }
}

function createInitialState() {
  return createInitialTrackerState(todayString())
}

function checklistId(cardId, index) {
  return `${cardId}-check-${index}`
}

function normaliseChecklistItems(cardId, items = []) {
  return items
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: checklistId(cardId, index),
          text: item,
        }
      }
      if (item && typeof item === 'object') {
        return {
          id: item.id || checklistId(cardId, index),
          text: String(item.text ?? '').trim(),
        }
      }
      return null
    })
    .filter((item) => item?.text)
}

function pruneNotifications(notifications) {
  const entries = Object.values(notifications ?? {})
  if (entries.length <= 200) return notifications

  const newestFirst = [...entries].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  const keep = new Set(newestFirst.slice(0, 200).map((item) => item.id))
  const oldRead = newestFirst
    .slice(200)
    .filter((item) => item.read)
    .map((item) => item.id)

  if (oldRead.length === 0) return notifications

  const next = {}
  for (const item of entries) {
    if (keep.has(item.id) || !item.read) next[item.id] = item
  }
  return next
}

function normaliseState(value) {
  return migrateTrackerState(value)
}

function readLegacyModuleNotes() {
  if (typeof window === 'undefined') return {}

  const notes = {}
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (!key?.startsWith(LEGACY_MODULE_NOTE_PREFIX) || !key.endsWith(LEGACY_MODULE_NOTE_SUFFIX)) continue
    const moduleId = key.slice(
      LEGACY_MODULE_NOTE_PREFIX.length,
      key.length - LEGACY_MODULE_NOTE_SUFFIX.length,
    )
    const note = window.localStorage.getItem(key)
    if (moduleId && note) notes[moduleId] = note
  }
  return notes
}

function clearLegacyModuleNotes() {
  if (typeof window === 'undefined') return
  const keys = []
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (key?.startsWith(LEGACY_MODULE_NOTE_PREFIX) && key.endsWith(LEGACY_MODULE_NOTE_SUFFIX)) {
      keys.push(key)
    }
  }
  keys.forEach((key) => window.localStorage.removeItem(key))
}

function readStoredStateSnapshot() {
  if (typeof window === 'undefined') {
    return { state: createInitialState(), browserStateExisted: false }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const state = raw ? normaliseState(JSON.parse(raw)) : createInitialState()
    return {
      state: {
        ...state,
        moduleNotes: {
          ...readLegacyModuleNotes(),
          ...(state.moduleNotes ?? {}),
        },
      },
      browserStateExisted: Boolean(raw),
    }
  } catch (error) {
    console.warn('Could not read tracker state:', error)
    return {
      state: {
        ...createInitialState(),
        moduleNotes: readLegacyModuleNotes(),
      },
      browserStateExisted: false,
    }
  }
}

function addActivity(cardState, action, details = '') {
  const entry = {
    id: makeId('log'),
    at: nowIso(),
    action,
    details,
  }
  return [entry, ...(cardState.activity ?? [])].slice(0, 80)
}

function createProgressEvent(eventType, entityId, payload = {}, entityType = 'card') {
  return {
    id: makeId('event'),
    occurredAt: nowIso(),
    entityType,
    entityId,
    eventType,
    payload,
  }
}

function cardEventPayload(card, payload = {}) {
  return {
    cardTitle: card?.title ?? '',
    moduleGroup: card?.moduleGroup ?? '',
    ...payload,
  }
}

function getCardState(state, cardId) {
  return state.cards[cardId] ?? {}
}

function filterResourceIdsForModule(moduleGroup, resourceIds) {
  const allowedPrefixes = RESOURCE_PREFIXES_BY_MODULE[moduleGroup]
  if (!allowedPrefixes) return resourceIds

  return resourceIds.filter((id) => {
    const managed = MANAGED_RESOURCE_PREFIXES.some((prefix) => id.startsWith(prefix))
    return !managed || allowedPrefixes.some((prefix) => id.startsWith(prefix))
  })
}

function normaliseEvidenceEntries(cardId, cardState = {}) {
  const source = Array.isArray(cardState.evidenceEntries)
    ? cardState.evidenceEntries
    : typeof cardState.evidence === 'string' && cardState.evidence.trim()
      ? [{ id: `${cardId}-evidence-legacy-0`, text: cardState.evidence.trim(), at: cardState.updatedAt ?? '' }]
      : []

  return source
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: `${cardId}-evidence-${index}`,
          text: item.trim(),
          at: '',
        }
      }
      if (item && typeof item === 'object') {
        const entry = {
          id: item.id || `${cardId}-evidence-${index}`,
          text: String(item.text ?? '').trim(),
          at: item.at ?? '',
        }
        // File-attachment evidence keeps its link metadata (url points at the
        // local server's stored copy under local-data/resources).
        if (item.url) {
          entry.url = String(item.url)
          entry.fileName = String(item.fileName ?? '')
          entry.fileType = String(item.fileType ?? 'FILE')
          entry.size = Number(item.size ?? 0)
        }
        return entry
      }
      return null
    })
    .filter((item) => item?.text)
}

function evidenceText(entries) {
  return entries.map((entry) => entry.text).join('\n\n')
}

function mergeCard(baseCard, cardState = {}) {
  const edits = cardState.edits ?? {}
  const checklistState = cardState.checklist ?? {}
  const sourceChecklist = normaliseChecklistItems(baseCard.id, edits.checklist ?? baseCard.checklist ?? [])
  const status = cardState.status ?? edits.status ?? baseCard.status
  const done = Boolean(cardState.done || status === 'Done')
  const moduleGroup = edits.moduleGroup ?? edits.module ?? baseCard.moduleGroup
  const recurrenceKey = recurringLifeCardIdentity({ ...baseCard, ...edits })
  const title = recurrenceKey
    ? cleanWeeklyLifeCardTitle(edits.title ?? baseCard.title)
    : edits.title ?? baseCard.title
  const evidenceEntries = normaliseEvidenceEntries(baseCard.id, cardState)
  const resourceIds = filterResourceIdsForModule(
    moduleGroup,
    [
      ...new Set([
        ...(baseCard.resourceIds ?? []),
        ...(edits.resourceIds ?? []),
        ...(cardState.resourceIds ?? []),
      ]),
    ].filter((id) => !(cardState.hiddenResourceIds ?? []).includes(id)),
  )

  return {
    ...baseCard,
    ...edits,
    title,
    recurrenceKey,
    status: done ? 'Done' : status,
    done,
    progressPercent: done ? 100 : clampPercent(cardState.progressPercent ?? 0),
    actualHours: Number(cardState.actualHours ?? 0),
    evidence: evidenceText(evidenceEntries),
    evidenceEntries,
    notes: cardState.notes ?? [],
    activity: cardState.activity ?? [],
    focusSessions: cardState.focusSessions ?? [],
    userTags: cardState.userTags ?? [],
    resourceIds,
    updatedAt: cardState.updatedAt ?? baseCard.updatedAt,
    tags: [...new Set([...(edits.tags ?? baseCard.tags ?? []), ...(cardState.userTags ?? [])])],
    checklist: sourceChecklist.map((item, index) => ({
      ...item,
      done: Boolean(checklistState[item.id] ?? checklistState[index]),
    })),
  }
}

function buildCustomCard(input, index) {
  const now = nowIso()
  const tags = (input.tags ?? '')
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)

  return {
    id: makeId('custom-card'),
    number: `A${index + 1}`,
    sortOrder: 1000 + index,
    title: input.title.trim(),
    module: input.module,
    moduleGroup: input.module,
    phase: input.phase,
    phaseId: input.phase.toLowerCase().replace(/\s+/g, '-'),
    sourceList: 'Added in app',
    status: input.status,
    priority: input.priority,
    slotType: input.slotType,
    slotLabel: input.slotLabel.trim(),
    startDate: input.startDate,
    dueDate: input.dueDate,
    dueDateTime: input.dueDate,
    estimatedHours: Number(input.estimatedHours || 0),
    description: input.description.trim(),
    checklist: input.checklist
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean),
    evidenceRequirement: input.evidenceRequirement.trim(),
    doneCondition: input.doneCondition.trim(),
    trackerNotes: 'Added in tracker app',
    tags,
    custom: true,
    recurrenceKey: input.recurrenceKey || '',
    planningWindowStart: input.planningWindowStart || input.startDate,
    planningWindowEnd: input.planningWindowEnd || input.dueDate,
    createdAt: now,
  }
}

function buildDailySnapshot(cards) {
  const planned = cards.filter(isTrackableCard)
  const byModule = {}
  let done = 0
  let loggedHours = 0
  for (const card of planned) {
    const mod = card.moduleGroup || 'Other'
    if (!byModule[mod]) byModule[mod] = { done: 0, total: 0, hours: 0 }
    byModule[mod].total += 1
    const h = Number(card.actualHours || 0)
    byModule[mod].hours += h
    loggedHours += h
    if (card.done) {
      done += 1
      byModule[mod].done += 1
    }
  }
  return {
    done,
    total: planned.length,
    loggedHours: Math.round(loggedHours * 10) / 10,
    byModule,
  }
}

export function useTrackerState(baseCards) {
  const [initialSnapshot] = useState(readStoredStateSnapshot)
  const [state, setState] = useState(initialSnapshot.state)
  const addedCardSequenceRef = useRef(initialSnapshot.state.addedCards.length)
  const stateRef = useRef(initialSnapshot.state)
  const browserStateExistedRef = useRef(initialSnapshot.browserStateExisted)
  const serverFingerprintRef = useRef(null)
  const revisionRef = useRef(0)
  const writerIdRef = useRef(browserWriterId())
  const channelRef = useRef(null)
  const localFileTimerRef = useRef(null)
  const progressLogReadyRef = useRef(false)
  const progressFlushTimerRef = useRef(null)
  const progressFlushInFlightRef = useRef(false)
  const pendingProgressEventsRef = useRef([])
  const [localFile, setLocalFile] = useState({
    status: 'checking',
    savedAt: null,
    revision: 0,
    writerId: '',
    conflict: null,
    path: LOCAL_STATE_FILE_LABEL,
    error: '',
  })

  const flushProgressEvents = useCallback(async () => {
    if (
      typeof window === 'undefined' ||
      !progressLogReadyRef.current ||
      progressFlushInFlightRef.current
    ) return
    progressFlushInFlightRef.current = true
    try {
      while (pendingProgressEventsRef.current.length > 0) {
        const event = pendingProgressEventsRef.current[0]
        try {
          await appendLocalProgressEvent(event)
          pendingProgressEventsRef.current.shift()
        } catch (error) {
          console.warn('Local progress log unavailable:', error)
          break
        }
      }
    } finally {
      progressFlushInFlightRef.current = false
    }
  }, [])

  const queueProgressEvent = useCallback(
    (eventType, entityId, payload = {}, entityType = 'card') => {
      if (!eventType || !entityId) return
      pendingProgressEventsRef.current.push(createProgressEvent(eventType, entityId, payload, entityType))
      if (typeof window === 'undefined' || !progressLogReadyRef.current) return
      if (progressFlushTimerRef.current) window.clearTimeout(progressFlushTimerRef.current)
      progressFlushTimerRef.current = window.setTimeout(flushProgressEvents, 0)
    },
    [flushProgressEvents],
  )

  useEffect(
    () => {
      const flushWithBeacon = () => {
        if (!navigator.sendBeacon) return
        for (const event of pendingProgressEventsRef.current) {
          navigator.sendBeacon('/api/events', new Blob([JSON.stringify(event)], { type: 'application/json' }))
        }
      }
      window.addEventListener('pagehide', flushWithBeacon)
      return () => {
        if (progressFlushTimerRef.current) window.clearTimeout(progressFlushTimerRef.current)
        window.removeEventListener('pagehide', flushWithBeacon)
      }
    },
    [],
  )

  useEffect(() => {
    stateRef.current = state
    addedCardSequenceRef.current = Math.max(addedCardSequenceRef.current, state.addedCards.length)
  }, [state])

  const withCurrentSnapshot = useCallback(
    (nextState) => {
      const snapshotCards = [...baseCards, ...nextState.addedCards].map((card) =>
        mergeCard(card, nextState.cards[card.id]),
      )
      const today = todayString()
      const snap = buildDailySnapshot(snapshotCards)
      const existing = nextState.snapshots?.[today]
      if (
        existing &&
        existing.done === snap.done &&
        existing.total === snap.total &&
        existing.loggedHours === snap.loggedHours
      ) {
        return nextState
      }
      return {
        ...nextState,
        snapshots: {
          ...(nextState.snapshots ?? {}),
          [today]: snap,
        },
      }
    },
    [baseCards],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  // Durability bridge for retro-logs: the dayLog store stays the only write
  // surface (DayReview keeps its API), but its days are mirrored into tracker
  // state so they ride along in backups and the local state file. Loading or
  // restoring tracker state hydrates the store back; store entries win.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    dayLog.hydrate(state.dayLogs)
    const syncFromStore = () => {
      const days = dayLog.getState().days
      setState((current) => {
        const currentDays = current.dayLogs ?? {}
        if (currentDays === days || JSON.stringify(currentDays) === JSON.stringify(days)) return current
        return { ...current, dayLogs: days, updatedAt: nowIso() }
      })
    }
    syncFromStore()
    return dayLog.subscribe(syncFromStore)
  }, [state.dayLogs])

  // Focus rewards are a real campaign subsystem, not a disposable UI effect.
  // Mirror planting, points, streaks, achievements, goals and guard mode into the
  // revisioned tracker state while retaining the dedicated reactive focus store.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    if (state.focusRewards) focusRewards.hydrate(state.focusRewards)

    const syncFromFocus = () => {
      const rewardState = focusRewards.getPersistedState()
      setState((current) => {
        if (JSON.stringify(current.focusRewards) === JSON.stringify(rewardState)) return current
        return { ...current, focusRewards: rewardState, updatedAt: nowIso() }
      })
    }

    syncFromFocus()
    return focusRewards.subscribe(syncFromFocus)
  }, [state.focusRewards])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    let cancelled = false

    readLocalTrackerStateFile()
      .then((result) => {
        if (cancelled) return
        const payload = result.payload
        const incoming = payload?.state ?? payload

        if (incoming) {
          const normalisedIncoming = normaliseState(incoming)
          const migrationChangedState = stateFingerprint(normalisedIncoming) !== stateFingerprint(incoming)
          const fileState = withCurrentSnapshot(normalisedIncoming)
          stateRef.current = fileState
          // A migrated file must be written back. Treating its normalised
          // fingerprint as already durable leaves the obsolete plan on disk.
          serverFingerprintRef.current = migrationChangedState ? null : stateFingerprint(fileState)
          revisionRef.current = result.revision
          setState(fileState)
          browserStateExistedRef.current = false
        } else if (browserStateExistedRef.current) {
          const browserState = withCurrentSnapshot(stateRef.current)
          stateRef.current = browserState
          serverFingerprintRef.current = null
          revisionRef.current = 0
          setState(browserState)
          browserStateExistedRef.current = false
        } else {
          const initialState = withCurrentSnapshot(stateRef.current)
          stateRef.current = initialState
          serverFingerprintRef.current = stateFingerprint(initialState)
          revisionRef.current = 0
          setState(initialState)
        }

        progressLogReadyRef.current = true
        flushProgressEvents()
        setLocalFile((current) => ({
          ...current,
          status: 'ready',
          savedAt: result.writtenAt || null,
          revision: result.revision,
          writerId: result.writerId ?? '',
          conflict: null,
          error: '',
        }))
      })
      .catch((error) => {
        if (cancelled) return
        console.warn('Local tracker file unavailable:', error)
        progressLogReadyRef.current = false
        setLocalFile((current) => ({
          ...current,
          status: 'unavailable',
          error: error.message,
        }))
      })

    return () => {
      cancelled = true
    }
  }, [flushProgressEvents, withCurrentSnapshot])

  const cards = useMemo(() => {
    const combinedBaseCards = [...baseCards, ...state.addedCards]
    return combinedBaseCards.map((card) => mergeCard(card, state.cards[card.id]))
  }, [baseCards, state])

  function queueCardEvent(eventType, cardId, payload = {}) {
    const card = cards.find((item) => item.id === cardId)
    queueProgressEvent(eventType, cardId, cardEventPayload(card, payload))
  }

  const snapshots = useMemo(() => {
    const today = todayString()
    const snap = buildDailySnapshot(cards)
    const existing = state.snapshots?.[today]
    if (
      existing &&
      existing.done === snap.done &&
      existing.total === snap.total &&
      existing.loggedHours === snap.loggedHours
    ) {
      return state.snapshots ?? {}
    }
    return {
      ...(state.snapshots ?? {}),
      [today]: snap,
    }
  }, [cards, state.snapshots])

  const saveLocalFileNow = useCallback(async () => {
    const exportedAt = nowIso()
    const persistedState = withCurrentSnapshot(stateRef.current)
    const fingerprint = stateFingerprint(persistedState)
    setLocalFile((current) => ({ ...current, status: 'saving', error: '' }))

    try {
      const result = await writeLocalTrackerStateFile({
        exportedAt,
        app: 'summer-rescue-plan-app',
        schemaVersion: persistedState.version,
        writerId: writerIdRef.current,
        state: persistedState,
      }, {
        revision: revisionRef.current,
        writerId: writerIdRef.current,
      })
      serverFingerprintRef.current = fingerprint
      revisionRef.current = result.revision
      // Fold the snapshot we just persisted back into React state ONLY when the
      // live state still matches it. If edits landed while the write was in
      // flight — three checklist boxes ticked, or resource progress logged,
      // during the round-trip — keep the newer state instead of rolling back to
      // the start-of-save snapshot. That rollback was the "boxes check then
      // uncheck themselves" bug, and because every mutation shares this save path
      // it hit checklist, resource progress, notes and done-toggles alike.
      // serverFingerprintRef points at the saved snapshot, so the debounce effect
      // sees the delta and schedules a follow-up save for the newer edits.
      // stateRef re-syncs to whichever state wins via the [state] effect.
      setState((current) => {
        if (current === persistedState) return current
        return stateFingerprint(withCurrentSnapshot(current)) === fingerprint ? persistedState : current
      })
      setLocalFile((current) => ({
        ...current,
        status: 'saved',
        savedAt: result.savedAt ?? exportedAt,
        revision: result.revision,
        writerId: writerIdRef.current,
        conflict: null,
        error: '',
      }))
      channelRef.current?.postMessage({ revision: result.revision, writerId: writerIdRef.current })
      return result
    } catch (error) {
      if (error instanceof StateConflictError) {
        setLocalFile((current) => ({
          ...current,
          status: 'conflict',
          revision: Number(error.current?.revision ?? current.revision),
          conflict: error.current,
          error: error.message,
        }))
        throw error
      }
      setLocalFile((current) => ({
        ...current,
        status: 'error',
        error: error.message,
      }))
      throw error
    }
  }, [withCurrentSnapshot])

  useEffect(() => {
    const canWrite = localFile.status === 'ready' || localFile.status === 'saved'
    const persistedState = withCurrentSnapshot(state)
    if (!canWrite || stateFingerprint(persistedState) === serverFingerprintRef.current) return undefined

    if (localFileTimerRef.current) window.clearTimeout(localFileTimerRef.current)
    localFileTimerRef.current = window.setTimeout(() => {
      saveLocalFileNow().catch(() => {
        /* status already records the failure */
      })
    }, 800)

    return () => {
      if (localFileTimerRef.current) window.clearTimeout(localFileTimerRef.current)
    }
  }, [localFile.status, saveLocalFileNow, state, withCurrentSnapshot])

  const reloadLocalFileNow = useCallback(async () => {
    const result = await readLocalTrackerStateFile()
    const incoming = result.payload?.state ?? result.payload
    if (!incoming) throw new Error('The local tracker file is empty.')
    const normalisedIncoming = normaliseState(incoming)
    const migrationChangedState = stateFingerprint(normalisedIncoming) !== stateFingerprint(incoming)
    const fileState = withCurrentSnapshot(normalisedIncoming)
    stateRef.current = fileState
    serverFingerprintRef.current = migrationChangedState ? null : stateFingerprint(fileState)
    revisionRef.current = result.revision
    setState(fileState)
    setLocalFile((current) => ({
      ...current,
      status: 'ready',
      savedAt: result.writtenAt || null,
      revision: result.revision,
      writerId: result.writerId ?? '',
      conflict: null,
      error: '',
    }))
    return result
  }, [withCurrentSnapshot])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined
    const channel = new BroadcastChannel(TRACKER_CHANNEL)
    channelRef.current = channel
    channel.onmessage = async (event) => {
      const remoteRevision = Number(event.data?.revision ?? 0)
      if (event.data?.writerId === writerIdRef.current || remoteRevision <= revisionRef.current) return
      const currentPersisted = withCurrentSnapshot(stateRef.current)
      if (stateFingerprint(currentPersisted) !== serverFingerprintRef.current) {
        setLocalFile((current) => ({
          ...current,
          status: 'conflict',
          conflict: { revision: remoteRevision, writerId: event.data?.writerId ?? 'another tab' },
          error: 'Another app tab saved while this tab has unsaved changes.',
        }))
        return
      }
      try {
        await reloadLocalFileNow()
      } catch (error) {
        setLocalFile((current) => ({ ...current, status: 'error', error: error.message }))
      }
    }
    return () => {
      channel.close()
      if (channelRef.current === channel) channelRef.current = null
    }
  }, [reloadLocalFileNow, withCurrentSnapshot])

  function updateSettings(patch) {
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        ...patch,
      },
      updatedAt: nowIso(),
    }))
  }

  function addNotifications(records) {
    if (!Array.isArray(records) || records.length === 0) return

    setState((current) => {
      let changed = false
      const notifications = { ...(current.notifications ?? {}) }

      for (const record of records) {
        if (!record?.id || notifications[record.id]) continue
        notifications[record.id] = {
          ...record,
          read: Boolean(record.read),
        }
        changed = true
      }

      if (!changed) return current

      return {
        ...current,
        notifications: pruneNotifications(notifications),
        updatedAt: nowIso(),
      }
    })
  }

  function setNotificationRead(notificationId, read = true) {
    setState((current) => {
      const notification = current.notifications?.[notificationId]
      if (!notification || notification.read === read) return current
      return {
        ...current,
        notifications: {
          ...(current.notifications ?? {}),
          [notificationId]: {
            ...notification,
            read,
          },
        },
        updatedAt: nowIso(),
      }
    })
  }

  function markAllNotificationsRead() {
    setState((current) => {
      const entries = Object.values(current.notifications ?? {})
      if (!entries.some((notification) => !notification.read)) return current
      return {
        ...current,
        notifications: Object.fromEntries(
          entries.map((notification) => [
            notification.id,
            {
              ...notification,
              read: true,
            },
          ]),
        ),
        updatedAt: nowIso(),
      }
    })
  }

  function markCardNotificationsRead(notifications, cardId) {
    let changed = false
    const next = {}
    for (const [id, notification] of Object.entries(notifications ?? {})) {
      if (notification.cardId === cardId && !notification.read) {
        next[id] = { ...notification, read: true }
        changed = true
      } else {
        next[id] = notification
      }
    }
    return changed ? next : notifications
  }

  function markExported(exportedAt = nowIso()) {
    setState((current) => ({
      ...current,
      settings: {
        ...current.settings,
        lastExportedAt: exportedAt,
      },
      updatedAt: exportedAt,
    }))
  }

  function setModuleNote(moduleId, note) {
    setState((current) => ({
      ...current,
      moduleNotes: {
        ...(current.moduleNotes ?? {}),
        [moduleId]: note,
      },
      updatedAt: nowIso(),
    }))
  }

  // --- Knowledge notes -----------------------------------------------------
  // Every mutation funnels through here so the stored shape stays normalised
  // no matter which surface (reader, editor, card drawer) triggered it.
  function updateKnowledge(mutate) {
    setState((current) => {
      const knowledge = normaliseKnowledge(current.knowledge ?? emptyKnowledge())
      const next = mutate(knowledge)
      if (!next) return current
      return { ...current, knowledge: next, updatedAt: nowIso() }
    })
  }

  function patchNoteMeta(knowledge, noteId, patch) {
    const previous = normaliseNoteMeta(knowledge.meta[noteId])
    return {
      ...knowledge,
      meta: { ...knowledge.meta, [noteId]: normaliseNoteMeta({ ...previous, ...patch }) },
    }
  }

  // Also used when editing a seeded note: the caller passes the resolved note
  // and it lands in state under the same id, taking over from the seed.
  function saveKnowledgeNote(note) {
    const clean = normaliseNote({ ...note, seeded: false, updatedAt: nowIso() })
    if (!clean) return
    updateKnowledge((knowledge) => ({
      ...knowledge,
      notes: { ...knowledge.notes, [clean.id]: clean },
    }))
  }

  function deleteKnowledgeNote(noteId) {
    updateKnowledge((knowledge) => {
      const notes = { ...knowledge.notes }
      delete notes[noteId]
      // A seeded note has no state entry to remove, so hide it instead.
      return patchNoteMeta({ ...knowledge, notes }, noteId, { hidden: true })
    })
  }

  function toggleKnowledgeStar(noteId) {
    updateKnowledge((knowledge) =>
      patchNoteMeta(knowledge, noteId, { starred: !normaliseNoteMeta(knowledge.meta[noteId]).starred }),
    )
  }

  function markKnowledgeReviewed(noteId, confidence = 'ok') {
    updateKnowledge((knowledge) => {
      const previous = normaliseNoteMeta(knowledge.meta[noteId])
      return patchNoteMeta(knowledge, noteId, {
        lastReviewedAt: nowIso(),
        reviewCount: previous.reviewCount + 1,
        confidence,
      })
    })
  }

  function rateKnowledgeQuestion(noteId, index, rating) {
    updateKnowledge((knowledge) => {
      const previous = normaliseNoteMeta(knowledge.meta[noteId])
      const quiz = { ...previous.quiz }
      if (quiz[index] === rating) delete quiz[index]
      else quiz[index] = rating
      return patchNoteMeta(knowledge, noteId, { quiz })
    })
  }

  function setKnowledgeCardLinks(noteId, cardIds) {
    updateKnowledge((knowledge) => {
      const existing = knowledge.notes[noteId]
      if (!existing) return knowledge
      const clean = normaliseNote({ ...existing, cardIds, updatedAt: nowIso() })
      return { ...knowledge, notes: { ...knowledge.notes, [clean.id]: clean } }
    })
  }

  // --- General Knowledge (dated one-liners) ---------------------------------
  function updateGeneralKnowledge(mutate) {
    setState((current) => {
      const knowledge = normaliseGeneralKnowledge(current.generalKnowledge)
      const next = mutate(knowledge)
      if (!next) return current
      return { ...current, generalKnowledge: next, updatedAt: nowIso() }
    })
  }

  // The caller is expected to have already set entry.id (createEntryId for a
  // new entry, the existing id when editing) — same contract as
  // saveKnowledgeNote above, so a fresh entry's id is known immediately for
  // routing/selection without a round trip through state.
  function saveGeneralKnowledgeEntry(entry) {
    updateGeneralKnowledge((knowledge) => {
      const previous = knowledge.entries[entry.id]
      const clean = normaliseGeneralKnowledgeEntry({
        ...entry,
        createdAt: previous?.createdAt ?? entry.createdAt,
        updatedAt: nowIso(),
      })
      if (!clean) return null
      return { ...knowledge, entries: { ...knowledge.entries, [clean.id]: clean } }
    })
  }

  function deleteGeneralKnowledgeEntry(id) {
    updateGeneralKnowledge((knowledge) => {
      const entries = { ...knowledge.entries }
      delete entries[id]
      return { ...knowledge, entries }
    })
  }

  function toggleGeneralKnowledgeStar(id) {
    updateGeneralKnowledge((knowledge) => {
      const existing = knowledge.entries[id]
      if (!existing) return null
      return {
        ...knowledge,
        entries: { ...knowledge.entries, [id]: { ...existing, starred: !existing.starred, updatedAt: nowIso() } },
      }
    })
  }

  function updateCard(cardId, patch, action = 'Updated card', details = '') {
    setState((current) => {
      const currentCard = getCardState(current, cardId)
      const nextCard = {
        ...currentCard,
        ...patch,
        activity: addActivity(currentCard, action, details),
        updatedAt: nowIso(),
      }

      const notifications =
        patch.done || patch.status === 'Done'
          ? markCardNotificationsRead(current.notifications, cardId)
          : current.notifications

      return withCurrentSnapshot({
        ...current,
        cards: {
          ...current.cards,
          [cardId]: nextCard,
        },
        notifications,
        updatedAt: nowIso(),
      })
    })
  }

  function updateCardDetails(cardId, patch) {
    const fields = patch && typeof patch === 'object' ? patch : {}
    const card = cards.find((item) => item.id === cardId)
    const changes = detailChanges(card, fields)
    if (Object.keys(changes).length > 0) {
      queueCardEvent('card.details_edited', cardId, {
        changes,
        fields: Object.keys(changes).sort(),
      })
    }
    setState((current) => {
      const currentCard = getCardState(current, cardId)
      const nextCard = {
        ...currentCard,
        edits: {
          ...(currentCard.edits ?? {}),
          ...patch,
        },
        activity: addActivity(currentCard, 'Edited card details'),
        updatedAt: nowIso(),
      }

      return withCurrentSnapshot({
        ...current,
        cards: {
          ...current.cards,
          [cardId]: nextCard,
        },
        updatedAt: nowIso(),
      })
    })
  }

  function setStatus(cardId, status) {
    const card = cards.find((item) => item.id === cardId)
    if (!card || card.status === status) return
    queueCardEvent('card.status_changed', cardId, {
      previousStatus: card.status,
      status,
      done: status === 'Done',
    })
    updateCard(
      cardId,
      {
        status,
        done: status === 'Done',
        previousStatus: status === 'Done' && card?.status !== 'Done' ? card?.status : undefined,
      },
      'Moved card',
      status,
    )
  }

  function toggleDone(cardId) {
    const card = cards.find((item) => item.id === cardId)
    if (!card) return
    const done = !card.done
    const fallbackStatus = card.status && card.status !== 'Done' ? card.status : 'Backlog'
    queueCardEvent('card.done_changed', cardId, {
      done,
      previousStatus: card.status,
      status: done ? 'Done' : fallbackStatus,
    })
    setState((current) => {
      const currentCard = getCardState(current, cardId)
      const nextStatus = done ? 'Done' : currentCard.previousStatus ?? fallbackStatus
      const nextCard = {
        ...currentCard,
        done,
        status: nextStatus,
        previousStatus: done ? fallbackStatus : currentCard.previousStatus,
        activity: addActivity(currentCard, done ? 'Marked done' : 'Marked not done'),
        updatedAt: nowIso(),
      }

      return withCurrentSnapshot({
        ...current,
        cards: {
          ...current.cards,
          [cardId]: nextCard,
        },
        notifications: done ? markCardNotificationsRead(current.notifications, cardId) : current.notifications,
        updatedAt: nowIso(),
      })
    })
  }

  function toggleChecklistItem(cardId, itemId) {
    const card = cards.find((item) => item.id === cardId)
    const item = card?.checklist?.find((entry) => entry.id === itemId)
    if (item) {
      queueCardEvent('checklist_item.toggled', cardId, {
        itemId,
        text: item.text,
        done: !item.done,
      })
    }
    setState((current) => {
      const currentCard = getCardState(current, cardId)
      const checklist = {
        ...(currentCard.checklist ?? {}),
        [itemId]: !currentCard.checklist?.[itemId],
      }

      const nextCard = {
        ...currentCard,
        checklist,
        activity: addActivity(currentCard, 'Updated checklist'),
        updatedAt: nowIso(),
      }

      return withCurrentSnapshot({
        ...current,
        cards: {
          ...current.cards,
          [cardId]: nextCard,
        },
        updatedAt: nowIso(),
      })
    })
  }

  function setChecklistItems(cardId, items, action = 'Edited checklist') {
    const cleanItems = normaliseChecklistItems(cardId, items)
    setState((current) => {
      const currentCard = getCardState(current, cardId)
      const validIds = new Set(cleanItems.map((item) => item.id))
      const checklist = Object.fromEntries(
        Object.entries(currentCard.checklist ?? {}).filter(([id]) => validIds.has(id)),
      )
      const nextCard = {
        ...currentCard,
        edits: {
          ...(currentCard.edits ?? {}),
          checklist: cleanItems,
        },
        checklist,
        activity: addActivity(currentCard, action),
        updatedAt: nowIso(),
      }

      return withCurrentSnapshot({
        ...current,
        cards: {
          ...current.cards,
          [cardId]: nextCard,
        },
        updatedAt: nowIso(),
      })
    })
  }

  function addChecklistItem(cardId, text) {
    const value = text.trim()
    if (!value) return
    const card = cards.find((item) => item.id === cardId)
    if (!card) return
    const itemId = makeId(`${cardId}-check`)
    queueCardEvent('checklist_item.added', cardId, {
      itemId,
      text: value,
    })
    setChecklistItems(
      cardId,
      [
        ...card.checklist.map((item) => ({ id: item.id, text: item.text })),
        { id: itemId, text: value },
      ],
      'Added checklist item',
    )
  }

  function updateChecklistItem(cardId, itemId, text) {
    const value = text.trim()
    if (!value) return
    const card = cards.find((item) => item.id === cardId)
    if (!card) return
    const item = card.checklist.find((entry) => entry.id === itemId)
    if (!item || item.text === value) return
    queueCardEvent('checklist_item.edited', cardId, {
      itemId,
      previousText: item.text,
      text: value,
    })
    setChecklistItems(
      cardId,
      card.checklist.map((item) => ({
        id: item.id,
        text: item.id === itemId ? value : item.text,
      })),
      'Edited checklist item',
    )
  }

  function deleteChecklistItem(cardId, itemId) {
    const card = cards.find((item) => item.id === cardId)
    if (!card) return
    const item = card.checklist.find((entry) => entry.id === itemId)
    if (!item) return
    queueCardEvent('checklist_item.deleted', cardId, {
      itemId,
      text: item.text,
      done: Boolean(item.done),
    })
    setChecklistItems(
      cardId,
      card.checklist
        .filter((item) => item.id !== itemId)
        .map((item) => ({ id: item.id, text: item.text })),
      'Deleted checklist item',
    )
  }

  function setActualHours(cardId, actualHours) {
    const hours = Math.max(0, Number(actualHours || 0))
    const card = cards.find((item) => item.id === cardId)
    const previousHours = Number(card?.actualHours ?? 0)
    if (!card || previousHours === hours) return
    queueCardEvent('hours.logged', cardId, {
      previousHours,
      hours,
      deltaHours: Math.round((hours - previousHours) * 100) / 100,
    })
    updateCard(cardId, { actualHours: hours }, 'Logged hours', `${hours}h`)
  }

  function setCardProgress(cardId, progressPercent) {
    const percent = clampPercent(progressPercent)
    const card = cards.find((item) => item.id === cardId)
    const previousPercent = clampPercent(card?.progressPercent ?? 0)
    if (!card || previousPercent === percent) return
    queueCardEvent('card.progress_logged', cardId, {
      previousPercent,
      progressPercent: percent,
    })
    updateCard(cardId, { progressPercent: percent }, 'Logged progress', `${percent}%`)
  }

  function addFocusSession(cardId, minutes) {
    const elapsedMinutes = Math.max(0, Math.round(Number(minutes || 0)))
    if (elapsedMinutes < 1) return
    const card = cards.find((item) => item.id === cardId)
    if (!card) return
    const roundedHours = Math.max(0.25, Math.round((elapsedMinutes / 60) * 4) / 4)
    queueCardEvent('focus_session.completed', cardId, {
      minutes: elapsedMinutes,
      hours: roundedHours,
      previousHours: Number(card.actualHours ?? 0),
      hoursAfter: Math.round((Number(card.actualHours ?? 0) + roundedHours) * 4) / 4,
    })
    setState((current) => {
      const currentCard = getCardState(current, cardId)
      const nextHours = Math.round((Number(card?.actualHours ?? currentCard.actualHours ?? 0) + roundedHours) * 4) / 4
      const session = {
        id: makeId('focus'),
        at: nowIso(),
        minutes: elapsedMinutes,
        hours: roundedHours,
      }
      const nextCard = {
        ...currentCard,
        actualHours: nextHours,
        focusSessions: [session, ...(currentCard.focusSessions ?? [])].slice(0, 80),
        activity: addActivity(currentCard, 'Focus session', `${elapsedMinutes} min`),
        updatedAt: nowIso(),
      }

      return withCurrentSnapshot({
        ...current,
        cards: {
          ...current.cards,
          [cardId]: nextCard,
        },
        updatedAt: nowIso(),
      })
    })
  }

  function rescheduleCard(cardId, dueDate) {
    const card = cards.find((item) => item.id === cardId)
    if (!card || !dueDate) return
    queueCardEvent('card.rescheduled', cardId, {
      previousDueDate: card.dueDate ?? '',
      dueDate,
      status: card.status === 'Done' ? 'Done' : 'This Week',
    })
    updateCardDetails(cardId, {
      dueDate,
      dueDateTime: dueDate,
      startDate: card.startDate && card.startDate > dueDate ? dueDate : card.startDate,
    })
    updateCard(cardId, { status: card.status === 'Done' ? 'Done' : 'This Week' }, 'Rescheduled card', dueDate)
  }

  function rescheduleCards(cardIds, dueDate) {
    if (!Array.isArray(cardIds) || !dueDate) return
    // Mirrors the skip filter in the updater below so the log never claims to
    // have moved a card the updater left alone.
    for (const cardId of cardIds) {
      const card = cards.find((item) => item.id === cardId)
      if (!card || card.done) continue
      queueCardEvent('card.rescheduled', cardId, {
        previousDueDate: card.dueDate ?? '',
        dueDate,
        status: card.status === 'Done' ? 'Done' : 'This Week',
        bulk: true,
      })
    }
    setState((current) => {
      let changed = false
      const nextCards = { ...current.cards }
      for (const cardId of cardIds) {
        const card = cards.find((item) => item.id === cardId)
        if (!card || card.done) continue
        const currentCard = getCardState(current, cardId)
        nextCards[cardId] = {
          ...currentCard,
          status: card.status === 'Done' ? 'Done' : 'This Week',
          edits: {
            ...(currentCard.edits ?? {}),
            dueDate,
            dueDateTime: dueDate,
            startDate: card.startDate && card.startDate > dueDate ? dueDate : card.startDate,
          },
          activity: addActivity(currentCard, 'Rescheduled card', dueDate),
          updatedAt: nowIso(),
        }
        changed = true
      }
      if (!changed) return current
      return withCurrentSnapshot({
        ...current,
        cards: nextCards,
        updatedAt: nowIso(),
      })
    })
  }

  // Apply a re-plan: reschedule many cards to their own new due dates in one pass
  // (each assignment is { cardId, dueDate, status?, startDate? }). Stretch cards
  // demote to Backlog via the per-assignment status; undo replays the previous
  // date+status through the same path — an empty-string dueDate restores a card
  // that had none, and an explicit startDate wins over the apply-time clamp.
  // Snapshotted, so it is undoable.
  function applyReplanSchedule(assignments) {
    if (!Array.isArray(assignments) || assignments.length === 0) return
    // Mirrors the skip filter in the updater below.
    for (const assignment of assignments) {
      const { cardId, dueDate, status } = assignment
      const card = cards.find((item) => item.id === cardId)
      if (!card || card.done || dueDate === undefined || dueDate === null) continue
      queueCardEvent('card.rescheduled', cardId, {
        previousDueDate: card.dueDate ?? '',
        dueDate,
        status: card.status === 'Done' ? 'Done' : status ?? 'This Week',
        replan: true,
      })
    }
    setState((current) => {
      const nextCards = { ...current.cards }
      let changed = false
      for (const assignment of assignments) {
        const { cardId, dueDate, status } = assignment
        const card = cards.find((item) => item.id === cardId)
        if (!card || card.done || dueDate === undefined || dueDate === null) continue
        const startDate =
          'startDate' in assignment
            ? assignment.startDate
            : card.startDate && dueDate && card.startDate > dueDate
              ? dueDate
              : card.startDate
        const currentCard = getCardState(current, cardId)
        nextCards[cardId] = {
          ...currentCard,
          status: card.status === 'Done' ? 'Done' : status ?? 'This Week',
          edits: {
            ...(currentCard.edits ?? {}),
            dueDate,
            dueDateTime: dueDate,
            startDate,
          },
          activity: addActivity(currentCard, 'Re-plan reschedule', dueDate || 'no due date'),
          updatedAt: nowIso(),
        }
        changed = true
      }
      if (!changed) return current
      return withCurrentSnapshot({ ...current, cards: nextCards, updatedAt: nowIso() })
    })
  }

  function setEvidence(cardId, evidence) {
    const card = cards.find((item) => item.id === cardId)
    if (!card || card.evidence === evidence) return
    queueCardEvent('evidence.edited', cardId, {
      text: evidence,
      mode: 'legacy_text',
    })
    updateCard(cardId, { evidence }, 'Updated evidence')
  }

  function addEvidence(cardId, text, attachment = null) {
    const value = text.trim()
    if (!value) return
    const evidenceId = makeId(`${cardId}-evidence`)
    queueCardEvent('evidence.added', cardId, {
      evidenceId,
      text: value,
      ...(attachment?.url ? { url: attachment.url, fileName: attachment.fileName } : {}),
    })

    setState((current) => {
      const currentCard = getCardState(current, cardId)
      const entries = normaliseEvidenceEntries(cardId, currentCard)
      const nextEntries = [
        ...entries,
        {
          id: evidenceId,
          at: nowIso(),
          text: value,
          ...(attachment?.url
            ? {
                url: String(attachment.url),
                fileName: String(attachment.fileName ?? ''),
                fileType: String(attachment.fileType ?? 'FILE'),
                size: Number(attachment.size ?? 0),
              }
            : {}),
        },
      ]
      const nextCard = {
        ...currentCard,
        evidenceEntries: nextEntries,
        evidence: evidenceText(nextEntries),
        activity: addActivity(currentCard, attachment?.url ? 'Attached file' : 'Added evidence'),
        updatedAt: nowIso(),
      }

      return withCurrentSnapshot({
        ...current,
        cards: {
          ...current.cards,
          [cardId]: nextCard,
        },
        updatedAt: nowIso(),
      })
    })
  }

  function updateEvidence(cardId, evidenceId, text) {
    const value = text.trim()
    if (!value) return
    const card = cards.find((item) => item.id === cardId)
    const entry = card?.evidenceEntries?.find((item) => item.id === evidenceId)
    if (!entry || entry.text === value) return
    queueCardEvent('evidence.edited', cardId, {
      evidenceId,
      previousText: entry.text,
      text: value,
    })

    setState((current) => {
      const currentCard = getCardState(current, cardId)
      const entries = normaliseEvidenceEntries(cardId, currentCard)
      const nextEntries = entries.map((entry) => (entry.id === evidenceId ? { ...entry, text: value } : entry))
      if (evidenceText(nextEntries) === evidenceText(entries)) return current

      const nextCard = {
        ...currentCard,
        evidenceEntries: nextEntries,
        evidence: evidenceText(nextEntries),
        activity: addActivity(currentCard, 'Edited evidence'),
        updatedAt: nowIso(),
      }

      return withCurrentSnapshot({
        ...current,
        cards: {
          ...current.cards,
          [cardId]: nextCard,
        },
        updatedAt: nowIso(),
      })
    })
  }

  function deleteEvidence(cardId, evidenceId) {
    const card = cards.find((item) => item.id === cardId)
    const entry = card?.evidenceEntries?.find((item) => item.id === evidenceId)
    if (!entry) return
    queueCardEvent('evidence.deleted', cardId, {
      evidenceId,
      text: entry.text,
    })
    if (isCardAttachmentUrl(entry.url)) {
      deleteCardAttachmentFile(entry.url).catch((error) => {
        console.warn('Attachment file cleanup skipped:', error.message)
      })
    }
    setState((current) => {
      const currentCard = getCardState(current, cardId)
      const entries = normaliseEvidenceEntries(cardId, currentCard)
      const nextEntries = entries.filter((entry) => entry.id !== evidenceId)
      if (nextEntries.length === entries.length) return current

      const nextCard = {
        ...currentCard,
        evidenceEntries: nextEntries,
        evidence: evidenceText(nextEntries),
        activity: addActivity(currentCard, 'Deleted evidence'),
        updatedAt: nowIso(),
      }

      return withCurrentSnapshot({
        ...current,
        cards: {
          ...current.cards,
          [cardId]: nextCard,
        },
        updatedAt: nowIso(),
      })
    })
  }

  function addNote(cardId, text) {
    const noteText = text.trim()
    if (!noteText) return
    const noteId = makeId('note')
    queueCardEvent('note.added', cardId, {
      noteId,
      text: noteText,
    })

    setState((current) => {
      const currentCard = getCardState(current, cardId)
      const note = {
        id: noteId,
        at: nowIso(),
        text: noteText,
      }
      const nextCard = {
        ...currentCard,
        notes: [note, ...(currentCard.notes ?? [])],
        activity: addActivity(currentCard, 'Added note'),
        updatedAt: nowIso(),
      }

      return withCurrentSnapshot({
        ...current,
        cards: {
          ...current.cards,
          [cardId]: nextCard,
        },
        updatedAt: nowIso(),
      })
    })
  }

  function updateNote(cardId, noteId, text) {
    const value = text.trim()
    if (!value) return
    const card = cards.find((item) => item.id === cardId)
    const note = card?.notes?.find((item) => item.id === noteId)
    if (!note || note.text === value) return
    queueCardEvent('note.edited', cardId, {
      noteId,
      previousText: note.text,
      text: value,
    })

    setState((current) => {
      const currentCard = getCardState(current, cardId)
      const notes = currentCard.notes ?? []
      const nextNotes = notes.map((note) => (note.id === noteId ? { ...note, text: value } : note))
      if (nextNotes === notes || nextNotes.every((note, index) => note.text === notes[index]?.text)) return current

      const nextCard = {
        ...currentCard,
        notes: nextNotes,
        activity: addActivity(currentCard, 'Edited note'),
        updatedAt: nowIso(),
      }

      return withCurrentSnapshot({
        ...current,
        cards: {
          ...current.cards,
          [cardId]: nextCard,
        },
        updatedAt: nowIso(),
      })
    })
  }

  function deleteNote(cardId, noteId) {
    const card = cards.find((item) => item.id === cardId)
    const note = card?.notes?.find((item) => item.id === noteId)
    if (!note) return
    queueCardEvent('note.deleted', cardId, {
      noteId,
      text: note.text,
    })
    setState((current) => {
      const currentCard = getCardState(current, cardId)
      const nextCard = {
        ...currentCard,
        notes: (currentCard.notes ?? []).filter((note) => note.id !== noteId),
        activity: addActivity(currentCard, 'Deleted note'),
        updatedAt: nowIso(),
      }

      return withCurrentSnapshot({
        ...current,
        cards: {
          ...current.cards,
          [cardId]: nextCard,
        },
        updatedAt: nowIso(),
      })
    })
  }

  function addCard(input) {
    const card = buildCustomCard(input, addedCardSequenceRef.current)
    addedCardSequenceRef.current += 1
    queueProgressEvent('card.added', card.id, cardEventPayload(card, {
      status: card.status,
      priority: card.priority,
      dueDate: card.dueDate,
    }))
    setState((current) =>
      withCurrentSnapshot({
        ...current,
        addedCards: [...current.addedCards, card],
        cards: {
          ...current.cards,
          [card.id]: {
            status: card.status,
            done: card.status === 'Done',
            activity: [
              {
                id: makeId('log'),
                at: nowIso(),
                action: 'Added card',
                details: card.title,
              },
            ],
          },
        },
        updatedAt: nowIso(),
      }),
    )
    return card.id
  }

  function deleteCard(cardId) {
    const card = cards.find((item) => item.id === cardId)
    if (!card?.custom) return false
    queueCardEvent('card.deleted', cardId, {
      status: card.status,
      dueDate: card.dueDate,
    })
    setState((current) => {
      const nextCards = { ...(current.cards ?? {}) }
      delete nextCards[cardId]
      return withCurrentSnapshot({
        ...current,
        addedCards: (current.addedCards ?? []).filter((item) => item.id !== cardId),
        cards: nextCards,
        notifications: Object.fromEntries(
          Object.entries(current.notifications ?? {}).map(([id, notification]) => [
            id,
            notification.cardId === cardId ? { ...notification, read: true } : notification,
          ]),
        ),
        updatedAt: nowIso(),
      })
    })
    return true
  }

  function resetCardState(cardId) {
    // Only a card that actually carries progress can be reset; the updater
    // no-ops otherwise, so emitting unconditionally would log a phantom reset.
    if (state.cards?.[cardId]) {
      queueCardEvent('card.progress_reset', cardId, {})
    }
    setState((current) => {
      if (!current.cards?.[cardId]) return current

      const nextCards = { ...(current.cards ?? {}) }
      delete nextCards[cardId]

      return withCurrentSnapshot({
        ...current,
        cards: nextCards,
        updatedAt: nowIso(),
      })
    })
  }

  function addCardResource(cardId, resourceId) {
    if (!resourceId) return
    const card = cards.find((item) => item.id === cardId)
    if (card) {
      queueCardEvent('resource.linked', cardId, {
        resourceId,
      })
    }
    setState((current) => {
      const currentCard = getCardState(current, cardId)
      const resourceIds = [...new Set([...(currentCard.resourceIds ?? []), resourceId])]
      const nextCard = {
        ...currentCard,
        resourceIds,
        hiddenResourceIds: (currentCard.hiddenResourceIds ?? []).filter((id) => id !== resourceId),
        activity: addActivity(currentCard, 'Linked resource', resourceId),
        updatedAt: nowIso(),
      }

      return {
        ...current,
        cards: {
          ...current.cards,
          [cardId]: nextCard,
        },
        updatedAt: nowIso(),
      }
    })
  }

  function removeCardResource(cardId, resourceId) {
    const card = cards.find((item) => item.id === cardId)
    if (card?.resourceIds?.includes(resourceId)) {
      queueCardEvent('resource.unlinked', cardId, {
        resourceId,
      })
    }
    setState((current) => {
      const currentCard = getCardState(current, cardId)
      const resourceIds = (currentCard.resourceIds ?? []).filter((id) => id !== resourceId)
      const nextCard = {
        ...currentCard,
        resourceIds,
        hiddenResourceIds: [...new Set([...(currentCard.hiddenResourceIds ?? []), resourceId])],
        activity: addActivity(currentCard, 'Unlinked resource', resourceId),
        updatedAt: nowIso(),
      }

      return {
        ...current,
        cards: {
          ...current.cards,
          [cardId]: nextCard,
        },
        updatedAt: nowIso(),
      }
    })
  }

  function addUploadedResource(resource) {
    const cleanResource = normaliseUploadedResource(resource)
    if (!cleanResource) return null
    setState((current) => ({
      ...current,
      uploadedResources: [
        cleanResource,
        ...(current.uploadedResources ?? []).filter((item) => item.id !== cleanResource.id),
      ],
      updatedAt: nowIso(),
    }))
    return cleanResource.id
  }

  function markResourceOpened(resourceId) {
    if (!resourceId) return
    setState((current) => ({
      ...current,
      recentResourceIds: [resourceId, ...(current.recentResourceIds ?? []).filter((id) => id !== resourceId)].slice(0, 8),
      updatedAt: nowIso(),
    }))
  }

  function toggleResourceProgress(resourceId) {
    if (!resourceId) return
    setState((current) => {
      const previous = normaliseResourceProgressEntry(current.resourceProgress?.[resourceId])
      const updatedAt = nowIso()
      return {
        ...current,
        resourceProgress: {
          ...(current.resourceProgress ?? {}),
          [resourceId]: {
            ...previous,
            progressPercent: previous.progressPercent >= 100 ? 0 : 100,
            updatedAt,
          },
        },
        updatedAt,
      }
    })
  }

  function updateResourceProgress(resourceId, patch) {
    if (!resourceId || !patch || typeof patch !== 'object') return
    setState((current) => {
      const previous = normaliseResourceProgressEntry(current.resourceProgress?.[resourceId])
      const updatedAt = nowIso()
      const next = normaliseResourceProgressEntry({ ...previous, ...patch, updatedAt })
      return {
        ...current,
        resourceProgress: {
          ...(current.resourceProgress ?? {}),
          [resourceId]: next,
        },
        updatedAt,
      }
    })
  }

  function importTrackerState(payload) {
    const incoming = payload?.state ?? payload
    setState(withCurrentSnapshot(normaliseState(incoming)))
  }

  function resetTrackerState() {
    clearLegacyModuleNotes()
    setState((current) => {
      const initial = createInitialState()
      const completedCards = Object.fromEntries(
        Object.entries(current.cards ?? {}).filter(([, card]) => card?.done || card?.status === 'Done'),
      )
      const completedCustomCards = (current.addedCards ?? []).filter((card) => completedCards[card.id])
      return {
        ...initial,
        cards: completedCards,
        addedCards: completedCustomCards,
        snapshots: current.snapshots ?? {},
        dayLogs: current.dayLogs ?? {},
        focusRewards: current.focusRewards ?? null,
        moduleNotes: current.moduleNotes ?? {},
        knowledge: normaliseKnowledge(current.knowledge),
        generalKnowledge: normaliseGeneralKnowledge(current.generalKnowledge),
        updatedAt: nowIso(),
      }
    })
  }

  return {
    state,
    cards,
    snapshots,
    updateSettings,
    addNotifications,
    setNotificationRead,
    markAllNotificationsRead,
    markExported,
    setModuleNote,
    saveKnowledgeNote,
    deleteKnowledgeNote,
    toggleKnowledgeStar,
    markKnowledgeReviewed,
    rateKnowledgeQuestion,
    setKnowledgeCardLinks,
    saveGeneralKnowledgeEntry,
    deleteGeneralKnowledgeEntry,
    toggleGeneralKnowledgeStar,
    updateCard,
    updateCardDetails,
    setStatus,
    toggleDone,
    toggleChecklistItem,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    setActualHours,
    setCardProgress,
    addFocusSession,
    rescheduleCard,
    rescheduleCards,
    applyReplanSchedule,
    setEvidence,
    addEvidence,
    updateEvidence,
    deleteEvidence,
    addNote,
    updateNote,
    deleteNote,
    addCard,
    deleteCard,
    resetCardState,
    addCardResource,
    removeCardResource,
    addUploadedResource,
    markResourceOpened,
    toggleResourceProgress,
    updateResourceProgress,
    importTrackerState,
    resetTrackerState,
    localFile,
    saveLocalFileNow,
    reloadLocalFileNow,
    storageKey: STORAGE_KEY,
  }
}
