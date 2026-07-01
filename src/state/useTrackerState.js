import { useEffect, useMemo, useState } from 'react'
import { isTrackableCard, todayString } from '../utils/progress'

const STORAGE_KEY = 'summer-rescue-tracker-state-v2'
const STATE_VERSION = 2
const LEGACY_MODULE_NOTE_PREFIX = 'summer-rescue-module-note-'
const LEGACY_MODULE_NOTE_SUFFIX = '-v1'
const DEFAULT_CAMPAIGN_START = '2026-07-01'
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
    snapshots: {},
    settings: {
      referenceDate: todayString(),
      mat700Active: true,
      theme: 'light',
      campaignStart: DEFAULT_CAMPAIGN_START,
      campaignEnd: DEFAULT_CAMPAIGN_END,
      examWindowStart: DEFAULT_EXAM_WINDOW_START,
      lastExportedAt: null,
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
}

function normaliseState(value) {
  const fallback = createInitialState()
  if (!value || typeof value !== 'object') return fallback

  return {
    ...fallback,
    ...value,
    version: STATE_VERSION,
    cards: value.cards && typeof value.cards === 'object' ? value.cards : {},
    addedCards: Array.isArray(value.addedCards) ? value.addedCards : [],
    moduleNotes: value.moduleNotes && typeof value.moduleNotes === 'object' ? value.moduleNotes : {},
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
  const sourceChecklist = edits.checklist ?? baseCard.checklist ?? []
  const status = cardState.status ?? edits.status ?? baseCard.status
  const done = Boolean(cardState.done || status === 'Done')

  return {
    ...baseCard,
    ...edits,
    status: done ? 'Done' : status,
    done,
    actualHours: Number(cardState.actualHours ?? 0),
    evidence: cardState.evidence ?? '',
    notes: cardState.notes ?? [],
    activity: cardState.activity ?? [],
    userTags: cardState.userTags ?? [],
    tags: [...new Set([...(edits.tags ?? baseCard.tags ?? []), ...(cardState.userTags ?? [])])],
    checklist: sourceChecklist.map((item, index) => ({
      id: `${baseCard.id}-check-${index}`,
      text: item,
      done: Boolean(checklistState[index]),
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
        updatedAt: nowIso(),
      })
    })
  }

  function toggleChecklistItem(cardId, index) {
    setState((current) => {
      const currentCard = getCardState(current, cardId)
      const checklist = {
        ...(currentCard.checklist ?? {}),
        [index]: !currentCard.checklist?.[index],
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

  function setActualHours(cardId, actualHours) {
    const hours = Math.max(0, Number(actualHours || 0))
    updateCard(cardId, { actualHours: hours }, 'Logged hours', `${hours}h`)
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
    markExported,
    setModuleNote,
    updateCard,
    updateCardDetails,
    setStatus,
    toggleDone,
    toggleChecklistItem,
    setActualHours,
    setEvidence,
    addNote,
    deleteNote,
    addCard,
    importTrackerState,
    resetTrackerState,
    storageKey: STORAGE_KEY,
  }
}
