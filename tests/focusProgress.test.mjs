import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ACHIEVEMENTS, evaluateUnlocks, levelForPoints, treeForMinutes } from '../src/utils/focusProgress.js'

test('levelForPoints resolves the correct tier and progress', () => {
  const start = levelForPoints(0)
  assert.equal(start.level, 1)
  assert.equal(start.title, 'Seedling')
  assert.equal(start.progress, 0)
  assert.equal(start.toNext, 30)

  const mid = levelForPoints(30)
  assert.equal(mid.level, 2)
  assert.equal(mid.title, 'Sprout')
  assert.equal(mid.pointsIntoLevel, 0)

  const between = levelForPoints(55) // between 30 (L2) and 80 (L3)
  assert.equal(between.level, 2)
  assert.equal(between.toNext, 25)
  assert.ok(between.progress > 0 && between.progress < 1)
})

test('levelForPoints caps at the max tier', () => {
  const max = levelForPoints(999999)
  assert.equal(max.level, 10)
  assert.equal(max.title, 'Wildwood')
  assert.equal(max.isMax, true)
  assert.equal(max.nextTitle, null)
  assert.equal(max.progress, 1)
})

test('levelForPoints tolerates junk input', () => {
  assert.equal(levelForPoints(-50).level, 1)
  assert.equal(levelForPoints(undefined).level, 1)
  assert.equal(levelForPoints(NaN).level, 1)
})

test('treeForMinutes scales the tree with block length', () => {
  assert.equal(treeForMinutes(10), '🌿')
  assert.equal(treeForMinutes(25), '🌴')
  assert.equal(treeForMinutes(40), '🌳')
  assert.equal(treeForMinutes(50), '🌲')
  assert.equal(treeForMinutes(90), '🌲')
})

test('evaluateUnlocks returns only achievements whose condition holds', () => {
  const fresh = {
    points: 0,
    streak: 0,
    totalTrees: 0,
    dailyGoalMinutes: 90,
    today: { trees: 0, minutes: 0 },
  }
  assert.deepEqual(evaluateUnlocks(fresh), [])

  const busy = {
    points: 120,
    streak: 3,
    totalTrees: 1,
    dailyGoalMinutes: 90,
    today: { trees: 1, minutes: 120 },
  }
  const ids = evaluateUnlocks(busy)
  assert.ok(ids.includes('first-tree'))
  assert.ok(ids.includes('streak-3'))
  assert.ok(ids.includes('points-100'))
  assert.ok(ids.includes('goal-day'))
  assert.ok(ids.includes('deep-120'))
  assert.ok(!ids.includes('streak-7'))
  assert.ok(!ids.includes('points-500'))
})

test('every achievement has a stable id, icon, and predicate', () => {
  const ids = new Set()
  for (const achievement of ACHIEVEMENTS) {
    assert.equal(typeof achievement.id, 'string')
    assert.ok(achievement.icon)
    assert.equal(typeof achievement.test, 'function')
    assert.ok(!ids.has(achievement.id), `duplicate id ${achievement.id}`)
    ids.add(achievement.id)
  }
})

test('rollDayState resets today counters at a date boundary without any record* action', async () => {
  const { rollDayState } = await import('../src/utils/focusRewards.js')
  const state = {
    points: 120,
    streak: 3,
    bestStreak: 5,
    lastDate: '2026-07-13',
    today: { date: '2026-07-13', trees: 2, minutes: 95, wilted: 1, treeList: ['oak', 'pine'] },
  }
  const rolled = rollDayState(state, '2026-07-14', '2026-07-13')
  assert.deepEqual(rolled.today, { date: '2026-07-14', trees: 0, minutes: 0, wilted: 0, treeList: [] })
  assert.equal(rolled.streak, 3, 'streak extendable from yesterday stays visible')
  assert.equal(rolled.points, 120, 'points are all-time, never reset')
})

test('rollDayState zeroes a broken streak and no-ops on the same day', async () => {
  const { rollDayState } = await import('../src/utils/focusRewards.js')
  const stale = {
    points: 10,
    streak: 4,
    bestStreak: 4,
    lastDate: '2026-07-11',
    today: { date: '2026-07-11', trees: 1, minutes: 30, wilted: 0, treeList: ['oak'] },
  }
  const rolled = rollDayState(stale, '2026-07-14', '2026-07-13')
  assert.equal(rolled.streak, 0, 'streak broken two+ days ago reads 0')
  assert.equal(rolled.bestStreak, 4)

  const fresh = {
    points: 10,
    streak: 2,
    bestStreak: 4,
    lastDate: '2026-07-14',
    today: { date: '2026-07-14', trees: 1, minutes: 30, wilted: 0, treeList: ['oak'] },
  }
  assert.equal(rollDayState(fresh, '2026-07-14', '2026-07-13'), fresh, 'same day → same reference, no commit')
})
