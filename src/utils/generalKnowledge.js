// General Knowledge: a dated log of short, one-off things learned — distinct
// from the per-module Knowledge notes in utils/knowledge.js, which hold long
// structured reference documents with their own review schedule. An entry
// here is a single sentence, not a document, so there is no body/markdown,
// no self-test, and no spaced-review ladder.
//
// A module reference is not a separate field: it is just a tag that happens
// to match a study module's title/code/id (see moduleForTag). That keeps one
// simple mechanism — freeform tags — covering both "this is about a module"
// and "this is about some other thing" (a lecture, an admin process, ...).

import { addDays, formatDate, todayString } from './progress.js'

function text(value) {
  return String(value ?? '')
}

function stringList(value) {
  if (!Array.isArray(value)) return []
  return value.map((entry) => text(entry).trim()).filter(Boolean)
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function nowIso() {
  return new Date().toISOString()
}

function isDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(text(value))
}

export function createEntryId(seedText = '') {
  const slug = text(seedText)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 24)
  // Entries are created one at a time by hand, so a second-resolution stamp
  // is enough to keep ids unique without pulling in a uuid dependency.
  return `gk-${slug || 'entry'}-${Date.now().toString(36)}`
}

export function normaliseGeneralKnowledgeEntry(value) {
  if (!value || typeof value !== 'object') return null
  const id = text(value.id).trim()
  const body = text(value.text).trim()
  if (!id || !body) return null
  const rawDate = text(value.date).slice(0, 10)
  return {
    id,
    text: body,
    date: isDateString(rawDate) ? rawDate : text(value.createdAt).slice(0, 10) || todayString(),
    tags: stringList(value.tags),
    starred: Boolean(value.starred),
    createdAt: text(value.createdAt) || nowIso(),
    updatedAt: text(value.updatedAt) || nowIso(),
  }
}

export function normaliseGeneralKnowledge(value) {
  const source = plainObject(value)
  const entries = {}
  for (const [id, entry] of Object.entries(plainObject(source.entries))) {
    const clean = normaliseGeneralKnowledgeEntry({ ...entry, id: entry?.id ?? id })
    if (clean) entries[clean.id] = clean
  }
  return { entries }
}

export function emptyGeneralKnowledge() {
  return { entries: {} }
}

export function listGeneralKnowledgeEntries(knowledge) {
  return Object.values(normaliseGeneralKnowledge(knowledge).entries)
}

export function searchEntries(entries, query) {
  const needle = text(query).trim().toLowerCase()
  if (!needle) return entries
  return entries.filter((entry) => [entry.text, ...entry.tags].join(' ').toLowerCase().includes(needle))
}

function dateLabel(dateString, referenceDate) {
  if (dateString === referenceDate) return 'Today'
  if (dateString === addDays(referenceDate, -1)) return 'Yesterday'
  return formatDate(dateString)
}

// Newest date first, newest entry first within a date — this is a log, read
// backwards from "just now".
export function groupEntriesByDate(entries, referenceDate = todayString()) {
  const sorted = [...entries].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  )
  const map = new Map()
  for (const entry of sorted) {
    if (!map.has(entry.date)) map.set(entry.date, [])
    map.get(entry.date).push(entry)
  }
  return Array.from(map, ([date, items]) => ({ date, label: dateLabel(date, referenceDate), items }))
}

// A tag is a module reference when it matches one closely enough to be
// unambiguous — title, code, or id, case-insensitive. Anything else is just
// a plain label.
export function moduleForTag(tag, studyModules = []) {
  const needle = text(tag).trim().toLowerCase()
  if (!needle) return null
  return (
    studyModules.find((module) =>
      [module.title, module.code, module.id].some((candidate) => text(candidate).toLowerCase() === needle),
    ) ?? null
  )
}

// Autocomplete source: every module title plus every tag already in use,
// so typing "Applied" offers "Applied Machine Learning" and repeat tags
// ("Extenuating Circumstances") don't have to be retyped from memory.
export function knownTags(entries, studyModules = []) {
  const set = new Set()
  for (const module of studyModules) {
    if (module.title) set.add(module.title)
  }
  for (const entry of entries) {
    for (const tag of entry.tags) set.add(tag)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}

export function generalKnowledgeSummary(entries) {
  return {
    total: entries.length,
    starred: entries.filter((entry) => entry.starred).length,
  }
}
