import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeDayLogDays } from '../src/utils/dayLog.js'
import { createInitialTrackerState, migrateTrackerState } from '../src/state/trackerStateMigration.js'

test('mergeDayLogDays fills gaps from incoming days', () => {
  const store = { '2026-07-10': { blocks: { wake: 'done' }, note: '' } }
  const incoming = {
    '2026-07-10': { blocks: { lunch: 'skipped' }, note: 'long day' },
    '2026-07-11': { blocks: { wake: 'done' }, note: '' },
  }
  const merged = mergeDayLogDays(store, incoming)
  assert.deepEqual(merged['2026-07-10'].blocks, { wake: 'done', lunch: 'skipped' })
  assert.equal(merged['2026-07-10'].note, 'long day')
  assert.deepEqual(merged['2026-07-11'].blocks, { wake: 'done' })
})

test('mergeDayLogDays lets existing store entries win', () => {
  const store = { '2026-07-10': { blocks: { wake: 'skipped' }, note: 'store note' } }
  const incoming = { '2026-07-10': { blocks: { wake: 'done' }, note: 'backup note' } }
  const merged = mergeDayLogDays(store, incoming)
  assert.equal(merged['2026-07-10'].blocks.wake, 'skipped')
  assert.equal(merged['2026-07-10'].note, 'store note')
  assert.equal(merged, store, 'nothing new → same reference (no commit)')
})

test('mergeDayLogDays drops invalid incoming statuses and malformed entries', () => {
  const merged = mergeDayLogDays(
    {},
    {
      '2026-07-10': { blocks: { wake: 'partied', lunch: 'done' }, note: 42 },
      '2026-07-11': 'nonsense',
      '2026-07-12': null,
    },
  )
  assert.deepEqual(merged, { '2026-07-10': { blocks: { lunch: 'done' }, note: '' } })
})

test('mergeDayLogDays tolerates non-object inputs', () => {
  assert.deepEqual(mergeDayLogDays(null, null), {})
  const store = { '2026-07-10': { blocks: {}, note: 'hi' } }
  assert.equal(mergeDayLogDays(store, undefined), store)
})

test('tracker state migration carries dayLogs and defaults them to empty', () => {
  assert.deepEqual(createInitialTrackerState('2026-07-14').dayLogs, {})

  const migrated = migrateTrackerState({
    dayLogs: { '2026-07-10': { blocks: { wake: 'done' }, note: '' } },
  })
  assert.deepEqual(migrated.dayLogs, { '2026-07-10': { blocks: { wake: 'done' }, note: '' } })

  const withoutLogs = migrateTrackerState({ cards: {} })
  assert.deepEqual(withoutLogs.dayLogs, {})
})
