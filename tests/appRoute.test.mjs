import assert from 'node:assert/strict'
import test from 'node:test'

import { buildHashRoute, parseHashRoute } from '../src/utils/appRoute.js'

const views = new Set(['today', 'aml', 'time-series'])

test('parses a module tab and open card from the hash', () => {
  assert.deepEqual(parseHashRoute('#/aml?tab=knowledge&card=aml%2Fs2%3A8', views), {
    view: 'aml',
    tab: 'knowledge',
    cardId: 'aml/s2:8',
    resourceId: '',
    resourceMode: '',
    date: '',
    noteId: '',
    filters: {},
  })
})

test('builds a stable encoded deep link while preserving resource state', () => {
  assert.equal(
    buildHashRoute({
      view: 'time-series',
      tab: 'materials',
      cardId: 'card 12',
      resourceId: 'paper&solutions',
      resourceMode: 'reader',
    }),
    '#/time-series?tab=materials&card=card+12&resource=paper%26solutions&mode=reader',
  )
})

test('drops unknown views, tabs, and orphaned resource modes', () => {
  assert.deepEqual(parseHashRoute('#/unknown?tab=wrong&mode=reader', views), {
    view: 'today',
    tab: '',
    cardId: '',
    resourceId: '',
    resourceMode: '',
    date: '',
    noteId: '',
    filters: {},
  })
  assert.equal(buildHashRoute({ view: 'today', tab: 'wrong', resourceMode: 'reader' }), '#/today')
})

test('round-trips navigable dates, knowledge notes, and card filters', () => {
  const hash = buildHashRoute({
    view: 'aml',
    tab: 'knowledge',
    date: '2026-07-20',
    noteId: 'missing values & encoding',
    filters: { module: 'Applied ML', status: 'This Week', exactDate: '2026-07-22' },
  })

  assert.equal(
    hash,
    '#/aml?tab=knowledge&date=2026-07-20&note=missing+values+%26+encoding&module=Applied+ML&status=This+Week&deadline=2026-07-22',
  )
  assert.deepEqual(parseHashRoute(hash, views), {
    view: 'aml',
    tab: 'knowledge',
    cardId: '',
    resourceId: '',
    resourceMode: '',
    date: '2026-07-20',
    noteId: 'missing values & encoding',
    filters: { module: 'Applied ML', status: 'This Week', exactDate: '2026-07-22' },
  })
})
