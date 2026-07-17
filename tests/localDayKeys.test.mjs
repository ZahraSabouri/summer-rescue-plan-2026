// Local day keys.
//
// Every "which day is this?" decision in the app is a LOCAL day: the campaign
// runs on Cardiff wall-clock time, not UTC. `toISOString().slice(0, 10)` yields
// the UTC day, which under BST (UTC+1) is still yesterday between midnight and
// 01:00 local. A focus session finished at 00:30 after a late push would be
// filed against the previous day, rolling the forest, the daily goal, and the
// focus streak an hour early.
//
// progress.js owns the convention (`localDateString` / `todayString`). This
// suite pins the convention and guards the source against regressing to UTC.

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { localDateString, todayString } from '../src/utils/progress.js'

const SRC = fileURLToPath(new URL('../src', import.meta.url))

test('localDateString reads the local calendar day, not the UTC day', () => {
  // Constructed from local parts, so this is 00:30 local on 17 July in ANY
  // timezone — the exact instant that UTC would file under the 16th.
  const lateNight = new Date(2026, 6, 17, 0, 30, 0)
  assert.equal(localDateString(lateNight), '2026-07-17')
})

test('localDateString and toISOString disagree east of UTC, and local wins', () => {
  const lateNight = new Date(2026, 6, 17, 0, 30, 0)
  if (lateNight.getTimezoneOffset() >= 0) return // west of/at UTC: no drift to prove
  assert.equal(lateNight.toISOString().slice(0, 10), '2026-07-16')
  assert.equal(localDateString(lateNight), '2026-07-17', 'the local day is the campaign day')
})

test('todayString agrees with the local calendar', () => {
  const now = new Date()
  assert.equal(todayString(), localDateString(now))
  assert.match(todayString(), /^\d{4}-\d{2}-\d{2}$/)
})

// ---------------------------------------------------------------------------
// Source guard. A new `toISOString().slice(0, 10)` day key is the bug class
// above, so it fails here rather than silently mis-dating a late-night session.
//
// The one allowed use is dateRange() in summerRescuePlan.js, which anchors its
// cursor at T12:00:00 precisely so the round-trip cannot cross a day boundary.
// ---------------------------------------------------------------------------

const ALLOWED = new Map([['data/summerRescuePlan.js', 1]])

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return /\.jsx?$/.test(entry.name) ? [full] : []
  })
}

test('no source file derives a day key from toISOString()', () => {
  const pattern = /toISOString\(\)\s*\.slice\(\s*0\s*,\s*10\s*\)/g
  const offenders = []

  for (const file of sourceFiles(SRC)) {
    const relative = path.relative(SRC, file).split(path.sep).join('/')
    const hits = (fs.readFileSync(file, 'utf8').match(pattern) ?? []).length
    const allowed = ALLOWED.get(relative) ?? 0
    if (hits > allowed) offenders.push(`${relative}: ${hits} use(s), ${allowed} allowed`)
  }

  assert.deepEqual(
    offenders,
    [],
    `Use localDateString()/todayString() from utils/progress.js for day keys.\n${offenders.join('\n')}`,
  )
})
