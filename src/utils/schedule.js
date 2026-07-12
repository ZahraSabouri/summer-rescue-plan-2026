const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const CLOCK_TIME = /^(\d{1,2}):(\d{2})$/

const DEFAULT_COUNTS_BY_CATEGORY = {
  sleep: ['sleep'],
  study: ['academic'],
  class: ['academic'],
  project: ['academic', 'project'],
  job: ['job'],
}

const PRIORITY_ORDER = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
}

function parseIsoDay(value) {
  const text = typeof value === 'string' ? value.slice(0, 10) : ''
  if (!ISO_DAY.test(text)) return null

  const [year, month, day] = text.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

function localIsoDay(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function normaliseDay(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return localIsoDay(value)
  return parseIsoDay(value) ? value.slice(0, 10) : ''
}

function addIsoDays(value, amount) {
  const date = parseIsoDay(value)
  if (!date) return ''
  date.setDate(date.getDate() + amount)
  return localIsoDay(date)
}

function clockMinutes(value) {
  const match = typeof value === 'string' ? value.match(CLOCK_TIME) : null
  if (!match) return null

  const hour = Number(match[1])
  const minute = Number(match[2])
  if (minute > 59 || hour > 24 || (hour === 24 && minute !== 0)) return null
  return hour * 60 + minute
}

function countsToward(block) {
  if (Array.isArray(block?.countsToward)) return block.countsToward
  if (typeof block?.countsToward === 'string' && block.countsToward) return [block.countsToward]
  return DEFAULT_COUNTS_BY_CATEGORY[block?.category] ?? []
}

function normaliseBlock(block, date, sourceRuleId = '') {
  if (!block || typeof block !== 'object') return null
  const blockDate = normaliseDay(block.date ?? date)
  if (!blockDate || clockMinutes(block.start) == null || clockMinutes(block.end) == null) return null

  const ruleId = sourceRuleId || block.sourceRuleId || block.ruleId || block.id || 'schedule-block'
  const id = block.id || ruleId
  const normalised = {
    ...block,
    id,
    occurrenceId: block.occurrenceId || `${id}:${blockDate}`,
    sourceRuleId: ruleId,
    date: blockDate,
    title: String(block.title || 'Scheduled block'),
    category: String(block.category || 'routine'),
    start: String(block.start),
    end: String(block.end),
    location: String(block.location || ''),
    moduleGroup: String(block.moduleGroup || ''),
    countsToward: countsToward(block),
    protected: Boolean(block.protected),
    checkable: Boolean(block.checkable),
  }
  return {
    ...normalised,
    durationMinutes: minutesBetween(normalised.start, normalised.end),
  }
}

function additionsFromException(exception) {
  const additions = []
  if (exception?.add) additions.push(...(Array.isArray(exception.add) ? exception.add : [exception.add]))
  if (exception?.block) additions.push(...(Array.isArray(exception.block) ? exception.block : [exception.block]))
  if (exception?.replacement) {
    additions.push(...(Array.isArray(exception.replacement) ? exception.replacement : [exception.replacement]))
  }
  if (Array.isArray(exception?.blocks)) additions.push(...exception.blocks)
  return additions.filter(Boolean)
}

function removalIdsForDate(exceptions, date) {
  const ids = new Set()
  for (const exception of exceptions) {
    if (normaliseDay(exception?.date) !== date) continue
    if (Array.isArray(exception.removeRuleIds)) {
      exception.removeRuleIds.filter(Boolean).forEach((id) => ids.add(String(id)))
    }
    if (exception.removeRuleId) ids.add(String(exception.removeRuleId))
    const hasAdditions = additionsFromException(exception).length > 0
    if (
      exception.ruleId &&
      (exception.remove === true || exception.action === 'remove' || exception.replacement || !hasAdditions)
    ) {
      ids.add(String(exception.ruleId))
    }
  }
  return ids
}

function compareBlocks(a, b) {
  const startDifference = (clockMinutes(a.start) ?? 0) - (clockMinutes(b.start) ?? 0)
  if (startDifference !== 0) return startDifference
  const endDifference = (clockMinutes(a.end) ?? 0) - (clockMinutes(b.end) ?? 0)
  if (endDifference !== 0) return endDifference
  return String(a.title).localeCompare(String(b.title))
}

/** Return an ISO weekday number (Monday=1, Sunday=7), or null for an invalid date. */
export function isoWeekday(value) {
  const date = value instanceof Date ? value : parseIsoDay(normaliseDay(value))
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
  const day = date.getDay()
  return day === 0 ? 7 : day
}

/** Return a block duration in minutes. End times earlier than starts cross midnight. */
export function minutesBetween(start, end) {
  const startMinutes = clockMinutes(start)
  const endMinutes = clockMinutes(end)
  if (startMinutes == null || endMinutes == null) return 0
  if (endMinutes >= startMinutes) return endMinutes - startMinutes
  return 24 * 60 - startMinutes + endMinutes
}

/** Expand recurring rules and date-specific removals/replacements for one date. */
export function expandScheduleForDate(rules = [], exceptions = [], date) {
  const day = normaliseDay(date)
  if (!day) return []

  const weekday = isoWeekday(day)
  const safeRules = Array.isArray(rules) ? rules : []
  const safeExceptions = Array.isArray(exceptions) ? exceptions : []
  const removedRuleIds = removalIdsForDate(safeExceptions, day)
  const blocks = []

  for (const rule of safeRules) {
    if (!rule || typeof rule !== 'object' || !rule.id) continue
    const from = normaliseDay(rule.from) || '0000-01-01'
    const to = normaliseDay(rule.to) || '9999-12-31'
    const weekdays = Array.isArray(rule.weekdays) && rule.weekdays.length > 0
      ? rule.weekdays.map(Number)
      : [1, 2, 3, 4, 5, 6, 7]
    if (day < from || day > to || !weekdays.includes(weekday) || removedRuleIds.has(String(rule.id))) {
      continue
    }

    const block = normaliseBlock(rule, day, String(rule.id))
    if (block) blocks.push(block)
  }

  for (const exception of safeExceptions) {
    if (normaliseDay(exception?.date) !== day) continue
    for (const addition of additionsFromException(exception)) {
      const block = normaliseBlock(
        addition,
        day,
        String(addition.sourceRuleId || exception.ruleId || addition.id || 'exception'),
      )
      if (block) blocks.push(block)
    }
  }

  return blocks.sort(compareBlocks)
}

/** Expand an inclusive date range into [{ date, blocks }]. */
export function expandScheduleRange(rules = [], exceptions = [], start, end) {
  const first = normaliseDay(start)
  const last = normaliseDay(end)
  if (!first || !last || first > last) return []

  const days = []
  for (let date = first; date && date <= last; date = addIsoDays(date, 1)) {
    days.push({
      date,
      blocks: expandScheduleForDate(rules, exceptions, date),
    })
  }
  return days
}

/** Summarise scheduled minutes without treating routine blocks as task progress. */
export function summariseDay(blocks = []) {
  const summary = {
    totalMinutes: 0,
    academicMinutes: 0,
    projectMinutes: 0,
    jobMinutes: 0,
    sleepMinutes: 0,
    protectedMinutes: 0,
    byCategory: {},
  }

  for (const block of Array.isArray(blocks) ? blocks : []) {
    const duration = minutesBetween(block?.start, block?.end)
    if (duration <= 0) continue
    summary.totalMinutes += duration
    summary.byCategory[block.category || 'routine'] =
      (summary.byCategory[block.category || 'routine'] ?? 0) + duration
    if (block.protected) summary.protectedMinutes += duration

    const buckets = new Set(countsToward(block))
    if (buckets.has('academic')) summary.academicMinutes += duration
    if (buckets.has('project')) summary.projectMinutes += duration
    if (buckets.has('job')) summary.jobMinutes += duration
    if (buckets.has('sleep')) summary.sleepMinutes += duration
  }

  return summary
}

/** Find overlapping blocks on the same date. Boundary-touching blocks do not conflict. */
export function findScheduleConflicts(blocks = []) {
  const valid = (Array.isArray(blocks) ? blocks : [])
    .filter((block) => clockMinutes(block?.start) != null && clockMinutes(block?.end) != null)
    .map((block) => {
      const startMinute = clockMinutes(block.start)
      return {
        block,
        startMinute,
        endMinute: startMinute + minutesBetween(block.start, block.end),
      }
    })
  const conflicts = []

  for (let firstIndex = 0; firstIndex < valid.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < valid.length; secondIndex += 1) {
      const first = valid[firstIndex]
      const second = valid[secondIndex]
      const firstDate = normaliseDay(first.block.date)
      const secondDate = normaliseDay(second.block.date)
      if (firstDate && secondDate && firstDate !== secondDate) continue

      const overlapStart = Math.max(first.startMinute, second.startMinute)
      const overlapEnd = Math.min(first.endMinute, second.endMinute)
      if (overlapStart >= overlapEnd) continue
      conflicts.push({
        first: first.block,
        second: second.block,
        overlapMinutes: overlapEnd - overlapStart,
      })
    }
  }

  return conflicts
}

/** Resolve a schedule block to the best relevant open card, without mutating either input. */
export function resolveScheduledCard(block, cards = []) {
  if (!block || !Array.isArray(cards) || cards.length === 0) return null

  if (block.cardId) {
    return cards.find((card) => card.id === block.cardId) ?? null
  }

  if (Array.isArray(block.cardIds)) {
    const explicit = block.cardIds
      .map((id) => cards.find((card) => card.id === id))
      .filter(Boolean)
    return explicit.find((card) => !card.done && card.status !== 'Done') ?? explicit[0] ?? null
  }

  if (!block.moduleGroup) return null
  const candidates = cards.filter(
    (card) => card.moduleGroup === block.moduleGroup && !card.done && card.status !== 'Done',
  )
  if (candidates.length === 0) return null

  const blockDate = normaliseDay(block.date)
  return [...candidates].sort((a, b) => {
    const dateA = normaliseDay(a.dueDate || a.startDate) || '9999-12-31'
    const dateB = normaliseDay(b.dueDate || b.startDate) || '9999-12-31'
    const bandA = blockDate ? (dateA <= blockDate ? 0 : 1) : 0
    const bandB = blockDate ? (dateB <= blockDate ? 0 : 1) : 0
    if (bandA !== bandB) return bandA - bandB
    if (dateA !== dateB) return dateA.localeCompare(dateB)
    const priorityA = PRIORITY_ORDER[a.priority] ?? 9
    const priorityB = PRIORITY_ORDER[b.priority] ?? 9
    if (priorityA !== priorityB) return priorityA - priorityB
    return Number(a.sortOrder ?? 9999) - Number(b.sortOrder ?? 9999)
  })[0]
}

function blockContainsMinute(block, minute) {
  const start = clockMinutes(block?.start)
  const end = clockMinutes(block?.end)
  if (start == null || end == null || !Number.isFinite(minute)) return false
  if (end >= start) return minute >= start && minute < end
  return minute >= start || minute < end
}

/**
 * Build one stable execution answer from the existing timetable and cards.
 * This is intentionally read-only: it never creates, moves, or completes work.
 */
export function buildExecutionContext(blocks = [], cards = [], date, options = {}) {
  const plannedDay = normaliseDay(date)
  const now = options.now instanceof Date && !Number.isNaN(options.now.getTime()) ? options.now : new Date()
  const today = normaliseDay(options.today) || localIsoDay(now)
  const nowMinutes = Number.isFinite(options.nowMinutes)
    ? options.nowMinutes
    : now.getHours() * 60 + now.getMinutes()
  const orderedBlocks = (Array.isArray(blocks) ? blocks : [])
    .filter((block) => clockMinutes(block?.start) != null && clockMinutes(block?.end) != null)
    .sort(compareBlocks)

  let mode
  let anchorIndex

  if (plannedDay && plannedDay !== today) {
    anchorIndex = orderedBlocks.length > 0 ? 0 : -1
    mode = plannedDay > today ? 'future' : 'selected'
  } else {
    anchorIndex = orderedBlocks.findIndex((block) => blockContainsMinute(block, nowMinutes))
    if (anchorIndex >= 0) {
      mode = 'current'
    } else {
      anchorIndex = orderedBlocks.findIndex((block) => (clockMinutes(block.start) ?? -1) >= nowMinutes)
      mode = anchorIndex >= 0 ? 'upcoming' : 'complete'
    }
  }

  const block = anchorIndex >= 0 ? orderedBlocks[anchorIndex] : null
  const activeCard = options.activeCard && !options.activeCard.done && options.activeCard.status !== 'Done'
    ? options.activeCard
    : null

  let card = activeCard
  let cardBlock = null
  if (!card && anchorIndex >= 0) {
    for (let index = anchorIndex; index < orderedBlocks.length; index += 1) {
      const resolved = resolveScheduledCard(orderedBlocks[index], cards)
      if (!resolved) continue
      card = resolved
      cardBlock = orderedBlocks[index]
      break
    }
  }

  if (card && !cardBlock) {
    cardBlock = orderedBlocks.find((candidate) => resolveScheduledCard(candidate, cards)?.id === card.id) ?? null
  }

  return {
    mode,
    block,
    nextBlock: anchorIndex >= 0 ? orderedBlocks[anchorIndex + 1] ?? null : null,
    card,
    cardBlock,
    lockedToTimer: Boolean(activeCard),
  }
}
