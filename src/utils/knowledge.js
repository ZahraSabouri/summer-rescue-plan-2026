// Knowledge notes: durable reference material attached to a study module.
//
// Deliberately separate from the three note surfaces that already exist
// (module scratchpad, card notes, resource notes). Those are short and
// disposable; these are long structured documents that get re-read during
// revision, so they carry their own review schedule.
//
// Storage is split in two on purpose:
//   * seeded notes live in src/data/knowledgeSeeds.js and can be rewritten
//     without touching user state,
//   * state.knowledge.notes holds notes the user wrote,
//   * state.knowledge.meta holds the review overlay (stars, ratings, hidden)
//     for BOTH kinds, keyed by note id.
// A seed can therefore be rewritten later without discarding review history.
// Editing a seeded note promotes a full copy into state.knowledge.notes under
// the same id: from that point the note belongs to the user and seed updates
// no longer reach it.

import { addDays } from './progress.js'

export const NOTE_KINDS = [
  { id: 'concept', label: 'Concept map', icon: '◈', hint: 'Taxonomies, structure, how ideas relate' },
  { id: 'cheatsheet', label: 'Cheatsheet', icon: '▤', hint: 'Dense lookup tables and summaries' },
  { id: 'formula', label: 'Formula sheet', icon: '∑', hint: 'Equations, notation, derivations' },
  { id: 'traps', label: 'Trap list', icon: '⚠', hint: 'Confusions, mistakes, things that lose marks' },
  { id: 'qa', label: 'Exam Q&A', icon: '?', hint: 'Past questions and model answers' },
]

const KIND_IDS = new Set(NOTE_KINDS.map((kind) => kind.id))
export const DEFAULT_TOPIC = 'Unfiled'

export function kindMeta(kindId) {
  return NOTE_KINDS.find((kind) => kind.id === kindId) ?? NOTE_KINDS[0]
}

function nowIso() {
  return new Date().toISOString()
}

function text(value) {
  return String(value ?? '')
}

function stringList(value) {
  if (!Array.isArray(value)) return []
  return value.map((entry) => text(entry).trim()).filter(Boolean)
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {}
}

export function createNoteId(moduleId, title) {
  const slug = text(title)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40)
  // Notes are created one at a time by hand, so a second-resolution stamp is
  // enough to keep ids unique without pulling in a uuid dependency.
  return `kn-${moduleId}-${slug || 'note'}-${Date.now().toString(36)}`
}

export function normaliseNote(value, fallbackModuleId = '') {
  if (!value || typeof value !== 'object') return null
  const id = text(value.id).trim()
  if (!id) return null
  return {
    id,
    moduleId: text(value.moduleId || fallbackModuleId).trim(),
    title: text(value.title).trim() || 'Untitled note',
    kind: KIND_IDS.has(value.kind) ? value.kind : 'concept',
    topic: text(value.topic).trim() || DEFAULT_TOPIC,
    body: text(value.body),
    // Editorial importance, set by the note's author. Kept separate from
    // meta.starred, which is the reader's own bookmark — otherwise a seeded
    // star and a user star fight over the same field.
    priority: value.priority === 'high' ? 'high' : 'normal',
    tags: stringList(value.tags),
    cardIds: stringList(value.cardIds),
    createdAt: text(value.createdAt) || nowIso(),
    updatedAt: text(value.updatedAt) || nowIso(),
    seeded: Boolean(value.seeded),
  }
}

export function normaliseNoteMeta(value) {
  const source = plainObject(value)
  const quiz = {}
  for (const [key, rating] of Object.entries(plainObject(source.quiz))) {
    if (rating === 'know' || rating === 'unsure') quiz[key] = rating
  }
  return {
    starred: Boolean(source.starred),
    hidden: Boolean(source.hidden),
    lastReviewedAt: text(source.lastReviewedAt) || null,
    reviewCount: Math.max(0, Number(source.reviewCount) || 0),
    confidence: ['shaky', 'ok', 'solid'].includes(source.confidence) ? source.confidence : null,
    quiz,
  }
}

export function normaliseKnowledge(value) {
  const source = plainObject(value)
  const notes = {}
  for (const [id, note] of Object.entries(plainObject(source.notes))) {
    const clean = normaliseNote({ ...note, id: note?.id ?? id })
    if (clean) notes[clean.id] = clean
  }
  const meta = {}
  for (const [id, entry] of Object.entries(plainObject(source.meta))) {
    if (!text(id).trim()) continue
    meta[id] = normaliseNoteMeta(entry)
  }
  return { notes, meta }
}

export function emptyKnowledge() {
  return { notes: {}, meta: {} }
}

// Spaced review, deliberately coarse. This is a five-week rescue campaign, not
// a multi-year Anki deck, so the ladder tops out at about a month.
const REVIEW_LADDER = [1, 3, 7, 16, 35]

function intervalFor(meta) {
  const base = Math.max(0, meta.reviewCount - 1)
  let index = base
  if (meta.confidence === 'shaky') index = 0
  else if (meta.confidence === 'solid') index = base + 1
  return REVIEW_LADDER[Math.min(index, REVIEW_LADDER.length - 1)]
}

export function reviewStatus(meta, referenceDate) {
  const safe = normaliseNoteMeta(meta)
  if (!safe.lastReviewedAt) return { state: 'new', dueDate: '', daysUntil: null, label: 'Not reviewed yet' }

  const reviewedOn = safe.lastReviewedAt.slice(0, 10)
  const dueDate = addDays(reviewedOn, intervalFor(safe))
  if (!dueDate) return { state: 'new', dueDate: '', daysUntil: null, label: 'Not reviewed yet' }

  const daysUntil = Math.round((Date.parse(dueDate) - Date.parse(referenceDate)) / 86400000)
  if (daysUntil <= 0) {
    return {
      state: 'due',
      dueDate,
      daysUntil,
      label: daysUntil === 0 ? 'Review due today' : `Review ${Math.abs(daysUntil)}d overdue`,
    }
  }
  return { state: 'scheduled', dueDate, daysUntil, label: `Review in ${daysUntil}d` }
}

// Merge seeds with user notes and apply the meta overlay, so the reader only
// ever deals with one flat, resolved list.
export function resolveModuleNotes({ seeds = [], knowledge, moduleId, referenceDate }) {
  const store = normaliseKnowledge(knowledge)
  const byId = new Map()

  for (const seed of seeds) {
    const clean = normaliseNote({ ...seed, seeded: true }, moduleId)
    if (clean && clean.moduleId === moduleId) byId.set(clean.id, clean)
  }
  for (const note of Object.values(store.notes)) {
    if (note.moduleId === moduleId) byId.set(note.id, note)
  }

  const resolved = []
  for (const note of byId.values()) {
    const meta = normaliseNoteMeta(store.meta[note.id])
    if (meta.hidden) continue
    resolved.push({ ...note, meta, review: reviewStatus(meta, referenceDate) })
  }

  return resolved.sort(
    (a, b) =>
      a.topic.localeCompare(b.topic) ||
      Number(b.meta.starred) - Number(a.meta.starred) ||
      a.title.localeCompare(b.title),
  )
}

export function groupNotesByTopic(notes) {
  const map = new Map()
  for (const note of notes) {
    if (!map.has(note.topic)) map.set(note.topic, [])
    map.get(note.topic).push(note)
  }
  return Array.from(map, ([topic, items]) => ({ topic, items }))
}

export function searchNotes(notes, query) {
  const needle = text(query).trim().toLowerCase()
  if (!needle) return notes
  return notes.filter((note) =>
    [note.title, note.topic, note.body, ...note.tags].join(' ').toLowerCase().includes(needle),
  )
}

export function notesForCard(notes, cardId) {
  if (!cardId) return []
  return notes.filter((note) => note.cardIds.includes(cardId))
}

// Many short notes are easier to author as one Markdown file per topic than as
// one file each. A line beginning with `@@` opens a note and carries its
// metadata as `key=value` pairs separated by `|`; everything up to the next
// `@@` is that note's body.
//
//   @@ id=s1-what-is-ml | title=What ML is | kind=concept | star | tags=a,b
//   body markdown...
//
export function parseNoteBundle(source, defaults = {}) {
  const lines = String(source ?? '').replace(/\r\n?/g, '\n').split('\n')
  const notes = []
  let current = null
  // Code samples are the point of these notes, so a `@@` that happens to sit
  // inside a fenced block must not be mistaken for a note header.
  let inFence = false

  const commit = () => {
    if (!current) return
    const note = normaliseNote({ ...current, body: current.bodyLines.join('\n').trim(), seeded: true })
    if (note) notes.push(note)
    current = null
  }

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
    if (!inFence && line.startsWith('@@')) {
      commit()
      const meta = {}
      for (const part of line.slice(2).split('|')) {
        const chunk = part.trim()
        if (!chunk) continue
        if (chunk === 'key') {
          meta.priority = 'high'
          continue
        }
        const split = chunk.indexOf('=')
        if (split < 0) continue
        meta[chunk.slice(0, split).trim()] = chunk.slice(split + 1).trim()
      }
      current = {
        ...defaults,
        ...meta,
        cardIds: meta.cards ? meta.cards.split(',').map((id) => id.trim()).filter(Boolean) : (defaults.cardIds ?? []),
        tags: meta.tags ? meta.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [],
        bodyLines: [],
      }
      continue
    }
    if (current) current.bodyLines.push(line)
  }
  commit()

  return notes
}

export function knowledgeSummary(notes) {
  return {
    total: notes.length,
    due: notes.filter((note) => note.review.state === 'due').length,
    unread: notes.filter((note) => note.review.state === 'new').length,
    starred: notes.filter((note) => note.meta.starred).length,
  }
}
