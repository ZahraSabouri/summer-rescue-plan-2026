import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAMPAIGN_END,
  CAMPAIGN_START,
  READINESS_DEADLINE,
  REALISM_FACTOR,
  rescueCards,
  scheduleExceptions,
  scheduleRules,
} from '../src/data/summerRescuePlan.js'
import { migrateTrackerState } from '../src/state/trackerStateMigration.js'
import {
  expandScheduleRange,
  findScheduleConflicts,
  minutesBetween,
  summariseDay,
} from '../src/utils/schedule.js'

function mondayOf(dateString) {
  const date = new Date(`${dateString}T12:00:00`)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return date.toISOString().slice(0, 10)
}

test('summer rescue schedule protects capacity and contains no collisions', () => {
  const days = expandScheduleRange(scheduleRules, scheduleExceptions, CAMPAIGN_START, CAMPAIGN_END)
  assert.equal(days.length, 28)

  for (const day of days) {
    const summary = summariseDay(day.blocks)
    assert.equal(findScheduleConflicts(day.blocks).length, 0, `conflict on ${day.date}`)
    assert.equal(summary.sleepMinutes, 480, `sleep on ${day.date}`)
    assert.ok(summary.academicMinutes <= 480, `academic ceiling on ${day.date}`)
  }
})

test('protected exam-module hours match the cards and the 40/35/25 priority', () => {
  const days = expandScheduleRange(scheduleRules, scheduleExceptions, CAMPAIGN_START, READINESS_DEADLINE)
  const scheduleHours = Object.fromEntries(['Applied ML', 'Time Series', 'MAT700'].map((moduleGroup) => [
    moduleGroup,
    days.flatMap((day) => day.blocks)
      .filter((block) => block.category === 'study' && block.moduleGroup === moduleGroup)
      .reduce((sum, block) => sum + minutesBetween(block.start, block.end) / 60, 0),
  ]))
  const cardHours = Object.fromEntries(Object.keys(scheduleHours).map((moduleGroup) => [
    moduleGroup,
    rescueCards.filter((card) => card.moduleGroup === moduleGroup)
      .reduce((sum, card) => sum + Number(card.estimatedHours || 0), 0),
  ]))

  assert.deepEqual(scheduleHours, { 'Applied ML': 75, 'Time Series': 66, MAT700: 46 })
  // Card estimates carry a realism buffer (slower real learning pace) over the raw
  // protected timetable, so they sit REALISM_FACTOR above the schedule hours while
  // preserving the 40/35/25 module split.
  assert.deepEqual(
    cardHours,
    Object.fromEntries(Object.entries(scheduleHours).map(([m, h]) => [m, h * REALISM_FACTOR])),
  )
  const total = Object.values(scheduleHours).reduce((sum, hours) => sum + hours, 0)
  assert.ok(Math.abs(scheduleHours['Applied ML'] / total - 0.4) < 0.01)
  assert.ok(Math.abs(scheduleHours['Time Series'] / total - 0.35) < 0.01)
  assert.ok(Math.abs(scheduleHours.MAT700 / total - 0.25) < 0.01)

  const launch = days.find((day) => day.date === '2026-07-20')
  assert.equal(launch.blocks.find((block) => block.start === '09:00')?.cardId, 'card-001')
  assert.equal(launch.blocks.find((block) => block.start === '11:15')?.cardId, 'mat700-foundation-reset')
})

test('every campaign day contains one brief admin check-in', () => {
  const days = expandScheduleRange(scheduleRules, scheduleExceptions, CAMPAIGN_START, CAMPAIGN_END)
  for (const day of days) {
    const admin = day.blocks.filter((block) => block.id.startsWith('daily-admin-'))
    assert.equal(admin.length, 1, `daily admin on ${day.date}`)
    assert.ok(minutesBetween(admin[0].start, admin[0].end) <= 15, `brief admin on ${day.date}`)
  }
})

test('confirmed CMT501 classes use the TimeEdit blocks', () => {
  const days = expandScheduleRange(scheduleRules, scheduleExceptions, CAMPAIGN_START, READINESS_DEADLINE)
  const classBlocks = days.flatMap((day) => day.blocks.filter((block) => block.category === 'class'))
  assert.deepEqual(
    classBlocks.map((block) => [block.date, block.start, block.end]),
    [
      ['2026-07-23', '10:00', '13:00'],
      ['2026-07-30', '10:00', '13:00'],
      ['2026-07-30', '14:00', '15:00'],
      ['2026-08-06', '10:00', '14:00'],
    ],
  )
})

test('job hunt, project, hygiene, groceries, and outside time stay bounded', () => {
  const days = expandScheduleRange(scheduleRules, scheduleExceptions, CAMPAIGN_START, READINESS_DEADLINE)
  const weekly = new Map()

  for (const day of days) {
    const key = mondayOf(day.date)
    const row = weekly.get(key) ?? { jobs: [], showers: 0, groceries: 0 }
    row.jobs.push(...day.blocks.filter((block) => block.category === 'job'))
    row.showers += day.blocks.filter((block) => /Shower/i.test(block.title)).length
    row.groceries += day.blocks.filter((block) => /grocery/i.test(block.title)).length
    weekly.set(key, row)

    for (const block of day.blocks.filter((item) => item.category === 'project' && item.category !== 'class')) {
      assert.ok(minutesBetween(block.start, block.end) <= 120, `project block on ${day.date}`)
    }
  }

  for (const [week, row] of weekly) {
    const jobMinutes = row.jobs.reduce((sum, block) => sum + minutesBetween(block.start, block.end), 0)
    assert.ok(jobMinutes <= 120, `job ceiling in ${week}`)
    assert.ok(row.jobs.every((block) => minutesBetween(block.start, block.end) <= 45), `job block duration in ${week}`)
    assert.ok(row.showers >= 2 && row.showers <= 3, `shower frequency in ${week}`)
    assert.ok(row.groceries >= 1, `grocery block in ${week}`)
  }

  for (const [date, expectedAcademicMinutes] of [
    ['2026-07-26', 360],
    ['2026-08-02', 480],
    ['2026-08-09', 360],
    ['2026-08-16', 360],
  ]) {
    const day = days.find((item) => item.date === date)
    const summary = summariseDay(day?.blocks ?? [])
    assert.equal(summary.academicMinutes, expectedAcademicMinutes, `job-action Sunday academic load on ${date}`)
    assert.equal(summary.jobMinutes, 65, `job-maintenance Sunday load on ${date}`)
  }

  const hasOutside = days.map((day) =>
    day.blocks.some((block) => block.location === 'Outside' || block.category === 'commute' || /grocery/i.test(block.title)),
  )
  for (let index = 1; index < hasOutside.length; index += 1) {
    assert.ok(hasOutside[index] || hasOutside[index - 1], `two consecutive stay-home days ending ${days[index].date}`)
  }

  const allCampaignDays = expandScheduleRange(scheduleRules, scheduleExceptions, CAMPAIGN_START, CAMPAIGN_END)
  const jobMinutesByWeek = new Map()
  for (const day of allCampaignDays) {
    const week = mondayOf(day.date)
    const minutes = day.blocks
      .filter((block) => block.category === 'job')
      .reduce((sum, block) => sum + minutesBetween(block.start, block.end), 0)
    jobMinutesByWeek.set(week, (jobMinutesByWeek.get(week) ?? 0) + minutes)
  }
  for (const [week, minutes] of jobMinutesByWeek) {
    assert.ok(minutes <= 120, `whole-campaign job ceiling in ${week}`)
  }
})

test('rebased cards are active, bounded, and stop new learning before the exam window', () => {
  assert.deepEqual(rescueCards.map((card) => card.number), rescueCards.map((_, index) => index + 1))
  assert.ok(rescueCards.every((card) => !/39|resit|reassess/i.test(
    `${card.title} ${card.description} ${card.trackerNotes} ${(card.tags ?? []).join(' ')}`,
  )))

  const examModules = new Set(['Applied ML', 'Time Series', 'MAT700'])
  const examCards = rescueCards.filter((card) => examModules.has(card.moduleGroup))
  assert.ok(examCards.length >= 90)
  assert.ok(examCards.every((card) => card.startDate >= CAMPAIGN_START && card.dueDate <= READINESS_DEADLINE))
  assert.ok(rescueCards.every((card) => ['Phase 0', 'Phase 1', 'Phase 2'].includes(card.phase)))
  assert.ok(rescueCards.every((card) => card.startDate >= CAMPAIGN_START && card.dueDate <= READINESS_DEADLINE))

  const mat700Cards = rescueCards.filter((card) => card.moduleGroup === 'MAT700')
  assert.ok(mat700Cards.length >= 20)
  assert.ok(mat700Cards.every((card) => !/insurance/i.test(`${card.title} ${card.description} ${(card.tags ?? []).join(' ')}`)))
  assert.ok(mat700Cards.some((card) => /foundation reset/i.test(card.title)))
  assert.ok(mat700Cards.every((card) => !/39|resit|reassess/i.test(`${card.title} ${card.description} ${card.trackerNotes} ${(card.tags ?? []).join(' ')}`)))
  assert.ok(mat700Cards.every((card) => !/Tutorial [4-7]|past paper/i.test(`${card.title} ${card.description}`)))
  assert.ok(mat700Cards.some((card) => /mixed question-bank set/i.test(card.title)))

  const hoursByModule = Object.fromEntries(
    ['Applied ML', 'Time Series', 'MAT700'].map((moduleGroup) => [
      moduleGroup,
      rescueCards
        .filter((card) => card.moduleGroup === moduleGroup)
        .reduce((sum, card) => sum + Number(card.estimatedHours || 0), 0),
    ]),
  )
  assert.deepEqual(hoursByModule, {
    'Applied ML': 75 * REALISM_FACTOR,
    'Time Series': 66 * REALISM_FACTOR,
    MAT700: 46 * REALISM_FACTOR,
  })

  const projectCards = rescueCards.filter((card) => card.moduleGroup === 'Group Project')
  assert.equal(projectCards.length, 6)
  assert.ok(projectCards.every((card) => !/e-voting|D'Hondt/i.test(`${card.title} ${card.description}`)))
  assert.ok(projectCards.some((card) => card.dueDate === '2026-08-02'))
  assert.ok(projectCards.some((card) => card.dueDate === '2026-08-06' && /20[- ]minute/.test(`${card.title} ${card.description}`)))

  const jobHours = rescueCards
    .filter((card) => card.moduleGroup === 'Job Hunt')
    .reduce((sum, card) => sum + card.estimatedHours, 0)
  assert.equal(rescueCards.filter((card) => card.moduleGroup === 'Job Hunt').length, 4)
  assert.equal(jobHours, 8)
})

test('plan reset preserves completed history and drops unfinished pre-reset cards', () => {
  const old = {
    version: 3,
    cards: {
      'card-001': {
        done: true,
        actualHours: 2.5,
        notes: [{ id: 'n1', text: 'Keep this', at: '2026-07-07T10:00:00.000Z' }],
      },
      'custom-1': { done: true, status: 'Done' },
      'custom-2': { done: false, status: 'This Week' },
    },
    addedCards: [
      { id: 'custom-1', title: 'Keep completed custom card', phase: 'Phase 2', startDate: '2026-07-13' },
      { id: 'custom-2', title: 'Drop unfinished pre-reset card', phase: 'Phase 2', startDate: '2026-07-13' },
    ],
    moduleNotes: { aml: 'Keep module note' },
    notifications: { x: { id: 'x', read: false } },
    resourceProgress: { r1: { reviewed: true } },
    uploadedResources: [],
    recentResourceIds: ['r1'],
    snapshots: { '2026-07-07': { done: 1, total: 1, loggedHours: 2.5 } },
    focusRewards: {
      points: 140,
      streak: 3,
      strict: false,
      totalTrees: 4,
      today: { date: '2026-07-07', trees: 2, minutes: 50, wilted: 0, treeList: ['🌱', '🌳'] },
    },
    settings: {
      referenceDate: '2026-07-07',
      campaignStart: '2026-07-04',
      campaignEnd: '2026-08-18',
      examWindowStart: '2026-08-17',
      mat700Active: false,
      theme: 'dark',
      moduleExamDates: { aml: '2026-08-20' },
      customModules: ['Personal'],
      customPhases: ['Extra'],
      planResetId: '2026-07-04-reset-local-date',
    },
    createdAt: '2026-07-04T00:00:00.000Z',
    updatedAt: '2026-07-07T00:00:00.000Z',
  }

  const migrated = migrateTrackerState(old)
  assert.equal(migrated.version, 6)
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  assert.equal(migrated.settings.referenceDate, today)
  assert.equal(migrated.settings.campaignStart, '2026-07-20')
  assert.equal(migrated.settings.campaignEnd, '2026-08-16')
  assert.equal(migrated.settings.mat700Active, false)
  assert.equal(migrated.settings.theme, 'dark')
  assert.deepEqual(migrated.settings.moduleExamDates, { aml: '2026-08-20' })
  assert.equal(migrated.cards['card-001'], undefined)
  assert.equal(migrated.addedCards.length, 1)
  assert.equal(migrated.addedCards[0].title, 'HISTORY - 19 Jul - Keep completed custom card')
  assert.equal(migrated.addedCards[0].phase, 'Phase 0')
  assert.equal(migrated.addedCards[0].dueDateTime, '2026-07-19 23:59')
  assert.equal(migrated.cards['custom-2'], undefined)
  assert.equal(migrated.moduleNotes.aml, 'Keep module note')
  assert.equal(migrated.focusRewards.points, 140)
  assert.equal(migrated.focusRewards.strict, false)
  assert.deepEqual(migrated.focusRewards.today.treeList, ['🌱', '🌳'])
  assert.deepEqual(migrated.notifications, {})
  assert.deepEqual(migrateTrackerState(migrated), migrated)
})

test('the 20 July reset preserves logged progress and drops empty old routine cards', () => {
  const live = {
    version: 4,
    cards: {
      'card-live': { status: 'Deep Work', actualHours: 1.5 },
      'custom-live': { status: 'This Week', done: false },
    },
    addedCards: [{ id: 'custom-live', title: 'Current routine', startDate: '2026-07-16', dueDate: '2026-07-19' }],
    settings: {
      planRevision: '2026-07-16-zero-based-32-day-plan-v7',
      referenceDate: '2026-07-16',
      campaignStart: '2026-07-16',
      campaignEnd: '2026-08-16',
      examWindowStart: '2026-08-17',
    },
  }
  const migrated = migrateTrackerState(live)
  assert.equal(migrated.cards['card-live'].actualHours, 1.5)
  assert.equal(migrated.cards['custom-live'], undefined)
  assert.equal(migrated.addedCards.length, 0)
})

test('the July 20 AML launch correction resets only card 001 and its resources', () => {
  const live = {
    version: 5,
    cards: {
      'card-001': {
        checklist: { 'card-001-check-0': true },
        activity: [{ id: 'a1', action: 'Updated checklist', at: '2026-07-16T16:24:19.362Z' }],
      },
      'card-002': {
        status: 'Done',
        done: true,
        activity: [{ id: 'a2', action: 'Moved card', details: 'Rescue Lane', at: '2026-07-18T20:07:37.303Z' }],
      },
    },
    addedCards: [],
    dayLogs: { '2026-07-16': { note: 'Keep the day exactly as logged' } },
    resourceProgress: {
      'aml-video-intro': { progressPercent: 100, updatedAt: '2026-07-19T17:28:41.742Z' },
      'aml-video-ubc-1-0-ml-introduction': { progressPercent: 100, updatedAt: '2026-07-19T17:28:41.742Z' },
    },
    settings: {
      planRevision: '2026-07-16-zero-based-32-day-plan-v9',
      campaignStart: '2026-07-16',
      campaignEnd: '2026-08-16',
    },
  }

  const migrated = migrateTrackerState(live)
  assert.equal(migrated.settings.campaignStart, '2026-07-20')
  assert.equal(migrated.cards['card-001'], undefined)
  assert.equal(migrated.cards['card-002'].status, 'Done')
  assert.equal(migrated.cards['card-002'].activity[0].at, '2026-07-18T20:07:37.303Z')
  assert.equal(migrated.dayLogs['2026-07-16'].note, 'Keep the day exactly as logged')
  assert.equal(migrated.resourceProgress['aml-video-intro'].updatedAt, '2026-07-19T17:28:41.742Z')
  assert.equal(migrated.resourceProgress['aml-video-ubc-1-0-ml-introduction'], undefined)
})
