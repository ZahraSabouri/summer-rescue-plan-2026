import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  averageResourceProgress,
  clampPercent,
  normaliseResourceProgressEntry,
  normaliseResourceProgressMap,
} from '../src/utils/resourceProgress.js'

test('resource progress upgrades the legacy reviewed boolean without losing meaning', () => {
  assert.deepEqual(normaliseResourceProgressEntry(true), {
    progressPercent: 100,
    understandingPercent: 0,
    note: '',
    updatedAt: '',
  })
  assert.equal(normaliseResourceProgressMap({ old: true }).old.progressPercent, 100)
})

test('resource progress clamps percentages and preserves notes and questions', () => {
  assert.equal(clampPercent(150), 100)
  assert.equal(clampPercent(-10), 0)
  assert.deepEqual(normaliseResourceProgressEntry({
    progressPercent: 45.4,
    understandingPercent: 72.8,
    note: 'Why is this assumption needed?',
    updatedAt: '2026-07-17T10:00:00.000Z',
  }), {
    progressPercent: 45,
    understandingPercent: 73,
    note: 'Why is this assumption needed?',
    updatedAt: '2026-07-17T10:00:00.000Z',
  })
})

test('resource group progress is the average percentage studied', () => {
  const resources = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  const progress = { a: { progressPercent: 100 }, b: { progressPercent: 50 } }
  assert.equal(averageResourceProgress(resources, progress), 50)
})
