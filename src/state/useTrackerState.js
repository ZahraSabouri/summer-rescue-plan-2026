import { useEffect, useMemo, useState } from 'react'
import { isTrackableCard, todayString } from '../utils/progress'

export const STORAGE_KEY = 'summer-rescue-tracker-state-v3'
const STATE_VERSION = 3
const PLAN_RESET_ID = '2026-07-04-reset-local-date'
const LEGACY_MODULE_NOTE_PREFIX = 'summer-rescue-module-note-'
const LEGACY_MODULE_NOTE_SUFFIX = '-v1'
const DEFAULT_CAMPAIGN_START = '2026-07-04'
const DEFAULT_CAMPAIGN_END = '2026-08-18'
const DEFAULT_EXAM_WINDOW_START = '2026-08-17'

function makeId(prefix = 'item') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function nowIso() {
  return new Date().toISOString()
}

function createInitialState() {
  return {
    version: STATE_VERSION,
    cards: {},
    addedCards: [],
    moduleNotes: {},
    notifications: {},
    resourceProgress: {},
    recentResourceIds: [],
    snapshots: {},
    settings: {
      referenceDate: todayString(),
      mat700Active: true,
      theme: 'light',
      campaignStart: DEFAULT_CAMPAIGN_START,
      campaignEnd: DEFAULT_CAMPAIGN_END,
      examWindowStart: DEFAULT_EXAM_WINDOW_START,
      moduleExamDates: {},
      lastExportedAt: null,
      saveHintDismissed: false,
      planResetId: PLAN_RESET_ID,
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function resetStateForCurrentPlan(value) {
  const next = createInitialState()
  const previousSettings = plainObject(value?.settings)

  return {
    ...next,
    moduleNotes: plainObject(value?.moduleNotes),
    settings: {
      ...next.settings,
      theme: previousSettings.theme ?? next.settings.theme,
      moduleExamDates: plainObject(previousSettings.moduleExamDates),
      saveHintDismissed: Boolean(previousSettings.saveHintDismissed),
    },
  }
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
  const fallback = createInitialState()
  if (!value || typeof value !== 'object') return fallback

  if (value.version !== STATE_VERSION || value.settings?.planResetId !== PLAN_RESET_ID) {
    return resetStateForCurrentPlan(value)
  }

  return {
    ...fallback,
    ...value,
    version: STATE_VERSION,
    cards: value.cards && typeof value.cards === 'object' ? value.cards : {},
    addedCards: Array.isArray(value.addedCards) ? value.addedCards : [],
    moduleNotes: value.moduleNotes && typeof value.moduleNotes === 'object' ? value.moduleNotes : {},
    notifications: value.notifications && typeof value.notifications === 'object' ? value.notifications : {},
    resourceProgress: value.resourceProgress && typeof value.resourceProgress === 'object' ? value.resourceProgress : {},
    recentResourceIds: Array.isArray(value.recentResourceIds) ? value.recentResourceIds.slice(0, 8) : [],
    snapshots: value.snapshots && typeof value.snapshots === 'object' ? value.snapshots : {},
    settings: {
      ...fallback.settings,
      ...(value.settings && typeof value.settings === 'object' ? value.settings : {}),
    },
    updatedAt: value.updatedAt ?? nowIso(),
  }
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

function readStoredState() {
  if (typeof window === 'undefined') return createInitialState()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const state = raw ? normaliseState(JSON.parse(raw)) : createInitialState()
    return {
      ...state,
      moduleNotes: {
        ...readLegacyModuleNotes(),
        ...(state.moduleNotes ?? {}),
      },
    }
  } catch (error) {
    console.warn('Could not read tracker state:', error)
    return {
      ...createInitialState(),
      moduleNotes: readLegacyModuleNotes(),
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

function getCardState(state, cardId) {
  return state.cards[cardId] ?? {}
}

function mergeCard(baseCard, cardState = {}) {
  const edits = cardState.edits ?? {}
  const checklistState = cardState.checklist ?? {}
  const sourceChecklist = normaliseChecklistItems(baseCard.id, edits.checklist ?? baseCard.checklist ?? [])
  const status = cardState.status ?? edits.status ?? baseCard.status
  const done = Boolean(cardState.done || status === 'Done')
  const resourceIds = [
    ...new Set([
      ...(baseCard.resourceIds ?? []),
      ...(edits.resourceIds ?? []),
      ...(cardState.resourceIds ?? []),
    ]),
  ].filter((id) => !(cardState.hiddenResourceIds ?? []).includes(id))

  return {
    ...baseCard,
    ...edits,
    status: done ? 'Done' : status,
    done,
    actualHours: Number(cardState.actualHours ?? 0),
    evidence: cardState.evidence ?? '',
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
  const [state, setState] = useState(readStoredState)

  useEffect(() => {
    if (state.version === STATE_VERSION && state.settings?.planResetId === PLAN_RESET_ID) return undefined
    const frameId = window.requestAnimationFrame(() => {
      setState((current) =>
        current.version === STATE_VERSION && current.settings?.planResetId === PLAN_RESET_ID
          ? current
          : resetStateForCurrentPlan(current),
      )
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [state.settings?.planResetId, state.version])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const cards = useMemo(() => {
    const combinedBaseCards = [...baseCards, ...state.addedCards]
    return combinedBaseCards.map((card) => mergeCard(card, state.cards[card.id]))
  }, [baseCards, state])

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

  function withCurrentSnapshot(nextState) {
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
  }

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
    setState((current) => {
      const currentCard = getCardState(current, cardId)
      const card = cards.find((item) => item.id === cardId)
      const done = !card?.done
      const fallbackStatus = card?.status && card.status !== 'Done' ? card.status : 'Backlog'
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
    setChecklistItems(
      cardId,
      [
        ...card.checklist.map((item) => ({ id: item.id, text: item.text })),
        { id: makeId(`${cardId}-check`), text: value },
      ],
      'Added checklist item',
    )
  }

  function updateChecklistItem(cardId, itemId, text) {
    const value = text.trim()
    if (!value) return
    const card = cards.find((item) => item.id === cardId)
    if (!card) return
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
    updateCard(cardId, { actualHours: hours }, 'Logged hours', `${hours}h`)
  }

  function addFocusSession(cardId, minutes) {
    const elapsedMinutes = Math.max(0, Math.round(Number(minutes || 0)))
    if (elapsedMinutes < 1) return
    setState((current) => {
      const currentCard = getCardState(current, cardId)
      const card = cards.find((item) => item.id === cardId)
      const roundedHours = Math.max(0.25, Math.round((elapsedMinutes / 60) * 4) / 4)
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
    updateCardDetails(cardId, {
      dueDate,
      dueDateTime: dueDate,
      startDate: card.startDate && card.startDate > dueDate ? dueDate : card.startDate,
    })
    updateCard(cardId, { status: card.status === 'Done' ? 'Done' : 'This Week' }, 'Rescheduled card', dueDate)
  }

  function rescheduleCards(cardIds, dueDate) {
    if (!Array.isArray(cardIds) || !dueDate) return
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

  function setEvidence(cardId, evidence) {
    updateCard(cardId, { evidence }, 'Updated evidence')
  }

  function addNote(cardId, text) {
    const noteText = text.trim()
    if (!noteText) return

    setState((current) => {
      const currentCard = getCardState(current, cardId)
      const note = {
        id: makeId('note'),
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

  function deleteNote(cardId, noteId) {
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
    const card = buildCustomCard(input, state.addedCards.length)
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

  function addCardResource(cardId, resourceId) {
    if (!resourceId) return
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
    setState((current) => ({
      ...current,
      resourceProgress: {
        ...(current.resourceProgress ?? {}),
        [resourceId]: !current.resourceProgress?.[resourceId],
      },
      updatedAt: nowIso(),
    }))
  }

  function importTrackerState(payload) {
    const incoming = payload?.state ?? payload
    setState(withCurrentSnapshot(normaliseState(incoming)))
  }

  function resetTrackerState() {
    clearLegacyModuleNotes()
    setState(createInitialState())
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
    updateCard,
    updateCardDetails,
    setStatus,
    toggleDone,
    toggleChecklistItem,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    setActualHours,
    addFocusSession,
    rescheduleCard,
    rescheduleCards,
    setEvidence,
    addNote,
    deleteNote,
    addCard,
    deleteCard,
    addCardResource,
    removeCardResource,
    markResourceOpened,
    toggleResourceProgress,
    importTrackerState,
    resetTrackerState,
    storageKey: STORAGE_KEY,
  }
}
