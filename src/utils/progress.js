export function todayString() {
  return new Date().toISOString().slice(0, 10)
}

export function toDate(dateString) {
  if (!dateString) return null
  const [year, month, day] = dateString.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export function formatDate(dateString) {
  const date = toDate(dateString)
  if (!date) return 'No date'
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date)
}

export function addDays(dateString, days) {
  const date = toDate(dateString)
  if (!date) return ''
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function startOfWeek(dateString) {
  const date = toDate(dateString) ?? new Date()
  const day = date.getDay()
  const offset = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

export function getWeekDays(dateString) {
  const start = startOfWeek(dateString)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

export function isBetween(dateString, start, end) {
  if (!dateString) return false
  return dateString >= start && dateString <= end
}

export function isCurrentWeek(dateString, referenceDate) {
  const start = startOfWeek(referenceDate)
  const end = addDays(start, 6)
  return isBetween(dateString, start, end)
}

export function isOverdue(card, referenceDate) {
  if (card.done || !card.dueDate) return false
  return card.dueDate < referenceDate
}

export function checklistPercent(card) {
  const items = card.checklist ?? []
  if (items.length === 0) return 0
  const done = items.filter((item) => item.done).length
  return Math.round((done / items.length) * 100)
}

export function checklistDoneCount(card) {
  return (card.checklist ?? []).filter((item) => item.done).length
}

export function hasEvidence(card) {
  return Boolean((card.evidence ?? '').trim())
}

export function sumHours(cards, field) {
  return cards.reduce((sum, card) => sum + Number(card[field] ?? 0), 0)
}

export function isTrackableCard(card) {
  return Number.isFinite(card?.number) || card?.custom === true
}

export function groupBy(items, keyGetter) {
  return items.reduce((groups, item) => {
    const key = keyGetter(item)
    groups[key] = groups[key] ?? []
    groups[key].push(item)
    return groups
  }, {})
}

export function sortCards(cards) {
  return [...cards].sort((a, b) => {
    const dateA = a.dueDateTime || a.dueDate || a.startDate || '9999-12-31'
    const dateB = b.dueDateTime || b.dueDate || b.startDate || '9999-12-31'
    if (dateA !== dateB) return dateA.localeCompare(dateB)
    return Number(a.sortOrder ?? 9999) - Number(b.sortOrder ?? 9999)
  })
}

export function getWeekLabel(dateString) {
  const start = startOfWeek(dateString)
  const end = addDays(start, 6)
  return `${formatDate(start)} - ${formatDate(end)}`
}

export function getCardDate(card) {
  return card.dueDate || card.startDate || ''
}

export function filterCards(cards, filters, referenceDate) {
  const search = filters.search.trim().toLowerCase()
  const next7 = addDays(referenceDate, 7)

  return cards.filter((card) => {
    const cardText = [
      card.number,
      card.title,
      card.module,
      card.phase,
      card.priority,
      card.status,
      card.description,
      card.evidenceRequirement,
      card.doneCondition,
      ...(card.tags ?? []),
    ]
      .join(' ')
      .toLowerCase()

    if (search && !cardText.includes(search)) return false
    if (filters.phase !== 'all' && card.phase !== filters.phase) return false
    if (filters.module !== 'all' && card.moduleGroup !== filters.module) return false
    if (filters.priority !== 'all' && card.priority !== filters.priority) return false
    if (filters.status !== 'all' && card.status !== filters.status) return false
    if (filters.slotType !== 'all' && card.slotType !== filters.slotType) return false
    if (filters.tag !== 'all' && !(card.tags ?? []).includes(filters.tag)) return false

    const cardDate = getCardDate(card)
    if (filters.dateMode === 'today' && cardDate !== referenceDate) return false
    if (filters.dateMode === 'week' && !isCurrentWeek(cardDate, referenceDate)) return false
    if (filters.dateMode === 'next7' && !isBetween(cardDate, referenceDate, next7)) return false
    if (filters.dateMode === 'overdue' && !isOverdue(card, referenceDate)) return false
    if (filters.dateMode === 'no-date' && cardDate) return false

    return true
  })
}

function buildGroupStats(cards, keyGetter) {
  return Object.entries(groupBy(cards, keyGetter))
    .map(([label, group]) => ({
      label,
      total: group.length,
      done: group.filter((card) => card.done).length,
      estimated: sumHours(group, 'estimatedHours'),
      logged: sumHours(group, 'actualHours'),
      critical: group.filter((card) => card.priority === 'Critical').length,
    }))
    .sort((a, b) => b.total - a.total)
}

export function deriveStats(cards, referenceDate, mat700Active = true) {
  const plannedCards = cards.filter(isTrackableCard)
  const visibleCards = mat700Active ? plannedCards : plannedCards.filter((card) => card.moduleGroup !== 'MAT700')
  const weekCards = visibleCards.filter((card) => isCurrentWeek(getCardDate(card), referenceDate))
  const next7 = addDays(referenceDate, 7)
  const dueToday = visibleCards.filter((card) => getCardDate(card) === referenceDate && !card.done)
  const nextSevenCards = visibleCards.filter(
    (card) => isBetween(getCardDate(card), referenceDate, next7) && !card.done,
  )
  const overdueCards = visibleCards.filter((card) => isOverdue(card, referenceDate))
  const rescueCards = visibleCards.filter(
    (card) => card.status === 'Rescue Lane' || (card.tags ?? []).includes('rescue'),
  )
  const waitingCards = visibleCards.filter((card) => card.status === 'Waiting / Blocked')
  const projectCards = visibleCards.filter((card) => card.moduleGroup === 'Group Project')
  const examCards = visibleCards.filter((card) => (card.tags ?? []).includes('exam'))

  return {
    total: visibleCards.length,
    baseTotal: plannedCards.length,
    done: visibleCards.filter((card) => card.done).length,
    notDone: visibleCards.filter((card) => !card.done).length,
    estimatedHours: sumHours(visibleCards, 'estimatedHours'),
    loggedHours: sumHours(visibleCards, 'actualHours'),
    weekCards,
    weekHours: sumHours(weekCards, 'estimatedHours'),
    dueToday,
    nextSevenCards,
    overdueCards,
    rescueCards,
    waitingCards,
    byPhase: buildGroupStats(visibleCards, (card) => card.phase),
    byModule: buildGroupStats(visibleCards, (card) => card.moduleGroup),
    byStatus: buildGroupStats(visibleCards, (card) => card.status),
    project: {
      total: projectCards.length,
      done: projectCards.filter((card) => card.done).length,
      presentationReady: projectCards.some((card) => card.number === 97 && card.done),
      reportReady: projectCards.some((card) => card.number === 103 && card.done),
    },
    examReadiness: {
      examCards: examCards.length,
      done: examCards.filter((card) => card.done).length,
      checkpointsDone: visibleCards.filter(
        (card) => (card.tags ?? []).includes('admin') && /checkpoint|readiness/i.test(card.title) && card.done,
      ).length,
    },
  }
}
