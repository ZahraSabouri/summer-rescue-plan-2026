export const MODULE_TAB_IDS = new Set(['overview', 'planning', 'materials', 'knowledge'])

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const FILTER_PARAMS = {
  search: 'q',
  phase: 'phase',
  module: 'module',
  kind: 'kind',
  priority: 'priority',
  status: 'status',
  slotType: 'slot',
  tag: 'tag',
  dateMode: 'dates',
  exactDate: 'deadline',
  dateFrom: 'from',
  dateTo: 'to',
}

function parseFilters(params) {
  const filters = Object.fromEntries(
    Object.entries(FILTER_PARAMS)
      .map(([key, param]) => [key, params.get(param) ?? ''])
      .filter(([, value]) => value && value !== 'all'),
  )
  const modules = params.getAll('modules').filter(Boolean)
  if (modules.length > 0) filters.modules = [...new Set(modules)]
  return filters
}

export function parseHashRoute(hash, validViewIds) {
  const value = String(hash ?? '').replace(/^#\/?/, '').trim()
  const [viewPart = '', queryString = ''] = value.split('?')
  const params = new URLSearchParams(queryString)
  const validViews = validViewIds instanceof Set ? validViewIds : new Set(validViewIds ?? [])
  const tab = params.get('tab') ?? ''
  const resourceId = params.get('resource') ?? ''

  return {
    view: validViews.has(viewPart) ? viewPart : 'today',
    tab: MODULE_TAB_IDS.has(tab) ? tab : '',
    cardId: params.get('card') ?? '',
    resourceId,
    resourceMode: resourceId ? params.get('mode') ?? '' : '',
    date: ISO_DAY.test(params.get('date') ?? '') ? params.get('date') : '',
    noteId: params.get('note') ?? '',
    filters: parseFilters(params),
  }
}

export function buildHashRoute({
  view = 'today',
  tab = '',
  cardId = '',
  resourceId = '',
  resourceMode = '',
  date = '',
  noteId = '',
  filters = {},
}) {
  const params = new URLSearchParams()
  if (MODULE_TAB_IDS.has(tab)) params.set('tab', tab)
  if (cardId) params.set('card', cardId)
  if (resourceId) {
    params.set('resource', resourceId)
    if (resourceMode) params.set('mode', resourceMode)
  }
  if (ISO_DAY.test(date)) params.set('date', date)
  if (noteId) params.set('note', noteId)
  for (const [key, param] of Object.entries(FILTER_PARAMS)) {
    const value = filters?.[key]
    if (value && value !== 'all') params.set(param, value)
  }
  for (const moduleGroup of Array.isArray(filters?.modules) ? filters.modules : []) {
    if (moduleGroup) params.append('modules', moduleGroup)
  }
  const query = params.toString()
  return `#/${view}${query ? `?${query}` : ''}`
}
