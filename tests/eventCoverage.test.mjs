import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import {
  COVERAGE_STATUSES,
  EVENT_COVERAGE,
  coverageSummary,
  declaredEventTypes,
  declaredMutations,
} from '../src/state/eventCoverage.js'
import { rebuildProgressFromEvents } from '../src/server/trackerDb.js'

const HOOK_PATH = fileURLToPath(new URL('../src/state/useTrackerState.js', import.meta.url))
const hookSource = await readFile(HOOK_PATH, 'utf8')

/** Every eventType string actually passed to queueCardEvent/queueProgressEvent. */
function emittedEventTypes(source) {
  const matches = source.matchAll(/queue(?:Card|Progress)Event\(\s*'([^']+)'/g)
  return [...new Set([...matches].map((match) => match[1]))].sort()
}

/** Every function name the hook returns to the app. */
function exportedMutations(source) {
  const block = source.slice(source.lastIndexOf('\n  return {'))
  return new Set(
    block
      .split('\n')
      .map((line) => line.trim().replace(/,$/, ''))
      .filter((line) => /^[a-zA-Z][a-zA-Z0-9]*$/.test(line)),
  )
}

test('the matrix is well formed', () => {
  for (const entry of EVENT_COVERAGE) {
    assert.ok(entry.family, 'every family is named')
    assert.ok(entry.entity, `${entry.family} names an entity`)
    assert.ok(COVERAGE_STATUSES.includes(entry.status), `${entry.family} has a known status`)
    assert.ok(entry.mutations.length > 0, `${entry.family} names at least one mutation`)
    assert.ok(entry.note, `${entry.family} explains itself`)
    assert.equal(typeof entry.replayed, 'boolean', `${entry.family} answers whether replay rebuilds it`)
    if (entry.status === 'missing') {
      assert.equal(entry.replayed, false, `${entry.family} emits nothing, so it cannot replay`)
    }
    if (entry.status === 'missing') {
      assert.equal(entry.events.length, 0, `${entry.family} is missing, so it emits nothing`)
    } else {
      assert.ok(entry.events.length > 0, `${entry.family} names the events it emits`)
    }
  }
  assert.equal(new Set(EVENT_COVERAGE.map((entry) => entry.family)).size, EVENT_COVERAGE.length)
})

// --- drift guards --------------------------------------------------------

test('every event the matrix claims is really emitted by useTrackerState', () => {
  const emitted = emittedEventTypes(hookSource)
  for (const eventType of declaredEventTypes()) {
    assert.ok(
      emitted.includes(eventType),
      `${eventType} is declared in the coverage matrix but never emitted`,
    )
  }
})

test('every emitted event is declared in the matrix', () => {
  const declared = declaredEventTypes()
  for (const eventType of emittedEventTypes(hookSource)) {
    assert.ok(
      declared.includes(eventType),
      `${eventType} is emitted but missing from the coverage matrix — add it before shipping`,
    )
  }
})

test('every mutation the matrix names is exported by the hook', () => {
  const exported = exportedMutations(hookSource)
  for (const mutation of declaredMutations()) {
    assert.ok(exported.has(mutation), `${mutation} is in the matrix but not exported by useTrackerState`)
  }
})

test('the source scanners actually find something (guards against a silent regex break)', () => {
  assert.ok(emittedEventTypes(hookSource).length >= 15, 'emission sites are discoverable')
  assert.ok(exportedMutations(hookSource).size >= 20, 'exported mutations are discoverable')
})

// --- the honest verdict --------------------------------------------------

test('replay is reported unsafe while any family fails to emit or fails to replay', () => {
  const summary = coverageSummary()
  assert.equal(summary.replaySafe, false)
  assert.ok(summary.missing > 0, 'emission gaps are counted, not hidden')
  assert.ok(summary.replayGapFamilies.length > 0, 'replay gaps are counted, not hidden')
})

test('emitting a family is never mistaken for being able to replay it', () => {
  const summary = coverageSummary()
  // The trap this guards: card details now emit, so emission looks healthy.
  // Replay still has no column for them, so recovery is not improved at all.
  assert.ok(summary.covered > summary.replayed, 'more families emit than replay')
  for (const family of ['Phase', 'Priority', 'Slot', 'Estimated hours', 'Module and area', 'Dates']) {
    const entry = EVENT_COVERAGE.find((item) => item.family === family)
    assert.equal(entry.status, 'covered', `${family} is written to the log`)
    assert.equal(entry.replayed, false, `${family} still cannot be rebuilt from the log`)
    assert.ok(summary.replayGapFamilies.includes(family))
    assert.ok(!summary.missingFamilies.includes(family))
  }
})

test('the known recovery gaps are named explicitly', () => {
  const summary = coverageSummary()
  // Families a replay cannot rebuild. If one is fixed, update the matrix and
  // this list together — do not just delete the assertion.
  for (const family of [
    'Day logs',
    'Campaign settings',
    'Module exam dates',
    'Focus rewards',
    'Uploaded resources',
    'Notifications',
    'Module notes',
    'Cards deleted',
    'Evidence attachments',
  ]) {
    assert.ok(summary.replayGapFamilies.includes(family), `${family} is still a known replay gap`)
  }
})

test('every date-moving path now reaches the log', () => {
  const dates = EVENT_COVERAGE.find((entry) => entry.family === 'Dates')
  assert.equal(dates.status, 'covered')
  // Bulk reschedule and re-plan used to move dates silently; both now emit.
  for (const mutation of ['rescheduleCard', 'rescheduleCards', 'applyReplanSchedule', 'updateCardDetails']) {
    assert.ok(dates.mutations.includes(mutation), `${mutation} is accounted for`)
  }
  assert.deepEqual(dates.events, ['card.rescheduled', 'card.details_edited'])
})

test('resetting a card is a replayable tombstone', () => {
  const reset = EVENT_COVERAGE.find((entry) => entry.family === 'Card progress reset')
  assert.equal(reset.status, 'covered')
  assert.equal(reset.replayed, true)
  assert.equal(reset.tombstoned, true)
})

// --- replay behaviour of the newly emitted events ------------------------

const event = (eventType, payload, occurredAt, entityId = 'card-1') => ({
  id: `${eventType}-${occurredAt}`,
  entityType: 'card',
  entityId,
  eventType,
  occurredAt,
  payload: { cardTitle: 'Revise CLT', moduleGroup: 'Time Series', ...payload },
})

test('a progress reset clears accumulated progress but keeps card identity', () => {
  const [card] = rebuildProgressFromEvents([
    event('card.status_changed', { status: 'Deep Work' }, '2026-07-16T09:00:00.000Z'),
    event('hours.logged', { hours: 3.5 }, '2026-07-16T10:00:00.000Z'),
    event('checklist_item.toggled', { itemId: 'i1', text: 'Read notes', done: true }, '2026-07-16T10:30:00.000Z'),
    event('card.done_changed', { done: true, status: 'Done' }, '2026-07-16T11:00:00.000Z'),
    event('card.progress_reset', {}, '2026-07-16T12:00:00.000Z'),
  ])
  assert.equal(card.cardId, 'card-1')
  assert.equal(card.title, 'Revise CLT', 'identity survives the reset')
  assert.equal(card.done, false)
  assert.equal(card.status, null)
  assert.equal(card.actualHours, 0)
  assert.deepEqual(card.checklist, [])
})

test('work logged after a reset is kept', () => {
  const [card] = rebuildProgressFromEvents([
    event('hours.logged', { hours: 3 }, '2026-07-16T10:00:00.000Z'),
    event('card.progress_reset', {}, '2026-07-16T12:00:00.000Z'),
    event('hours.logged', { hours: 1.25 }, '2026-07-16T13:00:00.000Z'),
    event('card.status_changed', { status: 'Today' }, '2026-07-16T13:30:00.000Z'),
  ])
  assert.equal(card.actualHours, 1.25)
  assert.equal(card.status, 'Today')
})

test('card completion percentage is replayed as an absolute value', () => {
  const [card] = rebuildProgressFromEvents([
    event('card.progress_logged', { progressPercent: 25 }, '2026-07-16T10:00:00.000Z'),
    event('card.progress_logged', { progressPercent: 65 }, '2026-07-16T11:00:00.000Z'),
  ])
  assert.equal(card.progressPercent, 65)
})

test('replaying the same events twice is idempotent', () => {
  const events = [
    event('card.status_changed', { status: 'Deep Work' }, '2026-07-16T09:00:00.000Z'),
    event('hours.logged', { hours: 2 }, '2026-07-16T10:00:00.000Z'),
    event('card.progress_reset', {}, '2026-07-16T11:00:00.000Z'),
    event('card.rescheduled', { dueDate: '2026-08-01', status: 'This Week' }, '2026-07-16T12:00:00.000Z'),
  ]
  assert.deepEqual(rebuildProgressFromEvents(events), rebuildProgressFromEvents([...events, ...events]))
})

test('a bulk reschedule event restores the status it implies', () => {
  const [card] = rebuildProgressFromEvents([
    event('card.rescheduled', { dueDate: '2026-08-02', status: 'This Week', bulk: true }, '2026-07-16T09:00:00.000Z'),
  ])
  assert.equal(card.status, 'This Week')
})

test('card.details_edited is history only — replay does not rebuild the fields', () => {
  const [card] = rebuildProgressFromEvents([
    event(
      'card.details_edited',
      { changes: { priority: { from: 'Medium', to: 'High' } }, fields: ['priority'] },
      '2026-07-16T09:00:00.000Z',
    ),
  ])
  // The event is preserved as audit history and must not corrupt the projection,
  // but it genuinely cannot restore the priority. The matrix says so, and this
  // asserts the code agrees rather than quietly half-applying it.
  assert.equal(card.cardId, 'card-1')
  assert.equal(card.status, null)
  assert.equal(card.priority, undefined)
})

test('summary counts add up to the declared families', () => {
  const summary = coverageSummary()
  assert.equal(summary.covered + summary.partial + summary.missing, summary.families)
  assert.equal(summary.missingFamilies.length, summary.partial + summary.missing)
  assert.equal(summary.replayed + summary.replayGapFamilies.length, summary.families)
})
