import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CAMPAIGN_END,
  CAMPAIGN_START,
  READINESS_DEADLINE,
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
  assert.equal(days.length, 44)

  for (const day of days) {
    const summary = summariseDay(day.blocks)
    assert.equal(findScheduleConflicts(day.blocks).length, 0, `conflict on ${day.date}`)
    assert.equal(summary.sleepMinutes, 480, `sleep on ${day.date}`)
    assert.ok(summary.academicMinutes <= 480, `academic ceiling on ${day.date}`)
  }
})

test('confirmed CMT501 classes use the TimeEdit blocks', () => {
  const days = expandScheduleRange(scheduleRules, scheduleExceptions, CAMPAIGN_START, READINESS_DEADLINE)
  const classBlocks = days.flatMap((day) => day.blocks.filter((block) => block.category === 'class'))
  assert.deepEqual(
    classBlocks.map((block) => [block.date, block.start, block.end]),
    [
      ['2026-07-16', '10:00', '13:00'],
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

  for (const date of ['2026-07-19', '2026-07-26', '2026-08-09', '2026-08-16']) {
    const day = days.find((item) => item.date === date)
    const summary = summariseDay(day?.blocks ?? [])
    assert.equal(summary.academicMinutes, 360, `job-action Sunday academic load on ${date}`)
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

  const mat700Cards = rescueCards.filter((card) => card.moduleGroup === 'MAT700')
  assert.ok(mat700Cards.length >= 20)
  assert.ok(mat700Cards.every((card) => !/insurance/i.test(`${card.title} ${card.description} ${(card.tags ?? []).join(' ')}`)))
  assert.ok(mat700Cards.some((card) => /foundation reset/i.test(card.title)))
  assert.ok(mat700Cards.every((card) => !/39|resit|reassess/i.test(`${card.title} ${card.description} ${card.trackerNotes} ${(card.tags ?? []).join(' ')}`)))

  const hoursByModule = Object.fromEntries(
    ['Applied ML', 'Time Series', 'MAT700'].map((moduleGroup) => [
      moduleGroup,
      rescueCards
        .filter((card) => card.moduleGroup === moduleGroup)
        .reduce((sum, card) => sum + Number(card.estimatedHours || 0), 0),
    ]),
  )
  assert.deepEqual(hoursByModule, { 'Applied ML': 80, 'Time Series': 95, MAT700: 52 })

  const projectCards = rescueCards.filter((card) => card.moduleGroup === 'Group Project')
  assert.equal(projectCards.length, 5)
  assert.ok(projectCards.every((card) => !/e-voting|D'Hondt/i.test(`${card.title} ${card.description}`)))
  assert.ok(projectCards.some((card) => card.dueDate === '2026-08-02'))
  assert.ok(projectCards.some((card) => card.dueDate === '2026-08-06' && /20[- ]minute/.test(`${card.title} ${card.description}`)))

  const jobHours = rescueCards
    .filter((card) => card.moduleGroup === 'Job Hunt')
    .reduce((sum, card) => sum + card.estimatedHours, 0)
  assert.equal(rescueCards.filter((card) => card.moduleGroup === 'Job Hunt').length, 7)
  assert.equal(jobHours, 14)
})

test('v3 tracker state migrates without discarding user work', () => {
  const old = {
    version: 3,
    cards: {
      'card-001': {
        done: true,
        actualHours: 2.5,
        notes: [{ id: 'n1', text: 'Keep this', at: '2026-07-07T10:00:00.000Z' }],
      },
    },
    addedCards: [{ id: 'custom-1', title: 'Keep custom card' }],
    moduleNotes: { aml: 'Keep module note' },
    notifications: { x: { id: 'x', read: false } },
    resourceProgress: { r1: { reviewed: true } },
    uploadedResources: [],
    recentResourceIds: ['r1'],
    snapshots: { '2026-07-07': { done: 1, total: 1, loggedHours: 2.5 } },
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
  assert.equal(migrated.version, 4)
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  assert.equal(migrated.settings.referenceDate, today)
  assert.equal(migrated.settings.campaignStart, '2026-07-16')
  assert.equal(migrated.settings.campaignEnd, '2026-08-28')
  assert.equal(migrated.settings.mat700Active, true)
  assert.equal(migrated.settings.theme, 'dark')
  assert.deepEqual(migrated.settings.moduleExamDates, { aml: '2026-08-20' })
  assert.equal(migrated.cards['card-001'].actualHours, 2.5)
  assert.equal(migrated.cards['card-001'].notes[0].text, 'Keep this')
  assert.equal(migrated.addedCards[0].title, 'Keep custom card')
  assert.equal(migrated.moduleNotes.aml, 'Keep module note')
  assert.deepEqual(migrated.notifications, {})
  assert.deepEqual(migrateTrackerState(migrated), migrated)
})
