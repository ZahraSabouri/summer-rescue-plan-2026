import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resourcesForCard, searchResourcesForCard } from '../src/utils/cardResourceSearch.js'

const RESOURCES = [
  { id: 'aml-lab-1', moduleGroup: 'Applied ML', title: 'Lab 1 notebook', group: 'Session 1', type: 'IPYNB' },
  { id: 'aml-slides-1', moduleGroup: 'Applied ML', title: 'S1 slides', group: 'Session 1', type: 'PDF' },
  { id: 'ts-pack-a', moduleGroup: 'Time Series', title: 'Pack A', group: 'Study packs', type: 'PDF' },
]

test('non-module cards never inherit another module resource library', () => {
  assert.deepEqual(resourcesForCard({ moduleGroup: 'Admin' }, RESOURCES), [])
  assert.deepEqual(searchResourcesForCard({ card: { moduleGroup: 'Health' }, resources: RESOURCES, query: 'lab' }), [])
})

test('module cards search only their own library and show nothing before a query', () => {
  const card = { moduleGroup: 'Applied ML' }
  assert.deepEqual(searchResourcesForCard({ card, resources: RESOURCES, query: '' }), [])
  assert.deepEqual(
    searchResourcesForCard({ card, resources: RESOURCES, query: 'session 1' }).map((resource) => resource.id),
    ['aml-lab-1', 'aml-slides-1'],
  )
})

test('linked resources are excluded from manual search results', () => {
  const results = searchResourcesForCard({
    card: { moduleGroup: 'Applied ML' },
    resources: RESOURCES,
    linkedIds: ['aml-lab-1'],
    query: 'session 1',
  })
  assert.deepEqual(results.map((resource) => resource.id), ['aml-slides-1'])
})
