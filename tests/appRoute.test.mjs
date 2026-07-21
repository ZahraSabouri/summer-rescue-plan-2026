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
    filters: {
      modules: ['Applied ML', 'Time Series'],
      status: 'This Week',
      dateFrom: '2026-07-20',
      dateTo: '2026-07-26',
    },
  })

  assert.equal(
    hash,
    '#/aml?tab=knowledge&date=2026-07-20&note=missing+values+%26+encoding&status=This+Week&from=2026-07-20&to=2026-07-26&modules=Applied+ML&modules=Time+Series',
  )
  assert.deepEqual(parseHashRoute(hash, views), {
    view: 'aml',
    tab: 'knowledge',
    cardId: '',
    resourceId: '',
    resourceMode: '',
    date: '2026-07-20',
    noteId: 'missing values & encoding',
    filters: {
      status: 'This Week',
      dateFrom: '2026-07-20',
      dateTo: '2026-07-26',
      modules: ['Applied ML', 'Time Series'],
    },
  })
})
