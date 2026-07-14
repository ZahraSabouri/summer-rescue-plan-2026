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
