import test from 'node:test'
import assert from 'node:assert/strict'

import {
  elapsedTimerMilliseconds,
  focusMinutesToLog,
  nextTimerMode,
  remainingTimerSeconds,
} from '../src/utils/studyTimer.js'

test('wall-clock countdown stays correct after a throttled background jump', () => {
  const startedAt = 1_000_000
  const deadline = startedAt + 25 * 60 * 1000

  assert.equal(remainingTimerSeconds(deadline, startedAt), 25 * 60)
  assert.equal(remainingTimerSeconds(deadline, startedAt + 7 * 60 * 1000), 18 * 60)
  assert.equal(remainingTimerSeconds(deadline, startedAt + 40 * 60 * 1000), 0)
})

test('countdown uses ceiling seconds at sub-second boundaries', () => {
  assert.equal(remainingTimerSeconds(10_001, 10_000), 1)
  assert.equal(remainingTimerSeconds(11_000, 10_000), 1)
  assert.equal(remainingTimerSeconds(11_001, 10_000), 2)
})

test('elapsed focus time never extends beyond the timer deadline', () => {
  const startedAt = 5_000
  const deadline = startedAt + 25 * 60 * 1000

  assert.equal(elapsedTimerMilliseconds(startedAt, startedAt + 8 * 60 * 1000, deadline), 8 * 60 * 1000)
  assert.equal(elapsedTimerMilliseconds(startedAt, deadline + 2 * 60 * 60 * 1000, deadline), 25 * 60 * 1000)
  assert.equal(elapsedTimerMilliseconds(startedAt, startedAt - 1000, deadline), 0)
})

test('focus logging ignores sub-minute fragments and rounds completed minutes', () => {
  assert.equal(focusMinutesToLog(59_999), 0)
  assert.equal(focusMinutesToLog(60_000), 1)
  assert.equal(focusMinutesToLog(89_999), 1)
  assert.equal(focusMinutesToLog(90_000), 2)
})

test('every fourth completed focus session selects a long break', () => {
  assert.equal(nextTimerMode('focus', 1), 'short')
  assert.equal(nextTimerMode('focus', 4), 'long')
  assert.equal(nextTimerMode('short', 4), 'focus')
  assert.equal(nextTimerMode('long', 4), 'focus')
})

