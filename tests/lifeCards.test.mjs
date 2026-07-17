import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildWeeklyLifeCardInputs,
  cleanWeeklyLifeCardTitle,
  recurringLifeCardIdentity,
  weekLabel,
} from '../src/utils/lifeCards.js'
import { MODULE_OPTIONS, PHASE_OPTIONS, PRIORITY_OPTIONS, SLOT_OPTIONS, STATUS_OPTIONS } from '../src/data/constants.js'

const WEEK_START = '2026-07-13' // a Monday

test('weekLabel is deterministic for a given week start', () => {
  assert.equal(weekLabel(WEEK_START), weekLabel(WEEK_START))
  assert.notEqual(weekLabel(WEEK_START), weekLabel('2026-07-20'))
})

test('builds four weekly life cards with clean titles and separate recurrence identities', () => {
  const inputs = buildWeeklyLifeCardInputs(WEEK_START)
  assert.equal(inputs.length, 4)
  for (const input of inputs) {
    assert.doesNotMatch(input.title, /\((?:w\/c|from) /i)
    assert.equal(recurringLifeCardIdentity(input), input.recurrenceKey)
  }
  // Human titles stay stable; recurrence keys make each weekly occurrence unique.
  assert.equal(new Set(inputs.map((input) => input.title)).size, 4)
  const nextWeek = buildWeeklyLifeCardInputs('2026-07-20')
  for (let i = 0; i < inputs.length; i += 1) {
    assert.equal(inputs[i].title, nextWeek[i].title)
    assert.notEqual(inputs[i].recurrenceKey, nextWeek[i].recurrenceKey)
  }
})

test('legacy weekly titles are cleaned without losing their inferred identity', () => {
  const legacy = {
    title: 'LIFE — Groceries + supermarket run (from Thu 16 Jul)',
    startDate: '2026-07-16',
  }
  assert.equal(cleanWeeklyLifeCardTitle(legacy.title), 'LIFE — Groceries + supermarket run')
  assert.equal(recurringLifeCardIdentity(legacy), 'weekly-life:groceries:2026-07-16')
})

test('every card input uses valid option values and dates inside the week', () => {
  const weekEnd = '2026-07-19'
  for (const input of buildWeeklyLifeCardInputs(WEEK_START)) {
    assert.ok(MODULE_OPTIONS.includes(input.module), `module ${input.module}`)
    assert.ok(PHASE_OPTIONS.includes(input.phase))
    assert.ok(STATUS_OPTIONS.includes(input.status))
    assert.ok(PRIORITY_OPTIONS.includes(input.priority))
    assert.ok(SLOT_OPTIONS.includes(input.slotType))
    assert.ok(input.dueDate >= WEEK_START && input.dueDate <= weekEnd, `due ${input.dueDate} in week`)
    assert.equal(input.startDate, WEEK_START)
    assert.ok(Number(input.estimatedHours) > 0)
    assert.ok(input.title.trim() && input.description.trim() && input.doneCondition.trim())
    // Fields consumed by buildCustomCard via .trim()/.split() must be strings.
    for (const key of ['slotLabel', 'checklist', 'evidenceRequirement', 'tags']) {
      assert.equal(typeof input[key], 'string', `${key} is a string`)
    }
  }
})

test('the health card carries a three-item movement checklist', () => {
  const health = buildWeeklyLifeCardInputs(WEEK_START).find((input) => input.module === 'Health')
  assert.ok(health)
  assert.equal(health.checklist.split('\n').filter(Boolean).length, 3)
})

test('a midweek campaign reset keeps routine cards inside the partial week', () => {
  const inputs = buildWeeklyLifeCardInputs('2026-07-16')
  assert.ok(inputs.every((input) => input.startDate === '2026-07-16'))
  assert.ok(inputs.every((input) => input.dueDate >= '2026-07-16' && input.dueDate <= '2026-07-19'))
  assert.ok(inputs.every((input) => input.phase === 'Phase 0'))
})
