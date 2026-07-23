import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { applyCardStudySequences } from '../src/data/cardStudySequences.js'
import { rescueCards } from '../src/data/summerRescuePlan.js'
import { STUDY_MODULE_MAP } from '../src/data/studyModules.js'
import { parseNoteBundle } from '../src/utils/knowledge.js'

const bundlePaths = [
  'src/data/knowledge/ts-foundations.md',
  'src/data/knowledge/ts-spectral.md',
  'src/data/knowledge/ts-arma.md',
  'src/data/knowledge/ts-drills.md',
]

async function loadTimeSeriesNotes() {
  const sources = await Promise.all(bundlePaths.map((path) => readFile(path, 'utf8')))
  return sources.flatMap((source) => parseNoteBundle(source, { moduleId: 'time-series' }))
}

const timeSeriesCards = applyCardStudySequences(rescueCards)
  .filter((card) => card.moduleGroup === 'Time Series')

test('Time Series knowledge bundles form a complete, unique exam-oriented set', async () => {
  const notes = await loadTimeSeriesNotes()
  const ids = notes.map((note) => note.id)

  assert.ok(notes.length >= 55, `expected at least 55 Time Series notes, found ${notes.length}`)
  assert.equal(new Set(ids).size, ids.length, 'Time Series note ids must be unique')

  for (const requiredId of [
    'ts-l1-overview',
    'ts-arima-sarima',
    'ts-acf-pacf',
    'ts-aic-model-choice',
    'ts-ssa',
  ]) {
    assert.ok(ids.includes(requiredId), `missing required Time Series note ${requiredId}`)
  }
})

test('every live Time Series card has a bounded study sequence and a matching checklist', () => {
  assert.equal(timeSeriesCards.length, 35)

  for (const card of timeSeriesCards) {
    const steps = card.studySequence?.steps ?? []
    assert.ok(steps.length > 0, `${card.id} is missing its study sequence`)
    assert.equal(card.checklist.length, steps.length, `${card.id} checklist/step count differs`)
    assert.deepEqual(
      card.checklist,
      steps.map((step) => step.checklistText ?? step.label),
      `${card.id} checklist does not mirror the ordered study sequence`,
    )
    assert.ok(
      card.studySequence.totalMinutes <= card.estimatedHours * 60,
      `${card.id} sequence takes ${card.studySequence.totalMinutes}m but card allows ${card.estimatedHours * 60}m`,
    )
  }
})

test('every Time Series card note and resource reference resolves', async () => {
  const notes = await loadTimeSeriesNotes()
  const noteIds = new Set(notes.map((note) => note.id))
  const resourceIds = new Set(STUDY_MODULE_MAP['time-series'].resources.map((resource) => resource.id))

  for (const card of timeSeriesCards) {
    for (const step of card.studySequence.steps) {
      for (const noteId of step.noteIds ?? []) {
        assert.ok(noteIds.has(noteId), `${card.id} references missing note ${noteId}`)
      }
      for (const resourceId of step.resourceIds ?? []) {
        assert.ok(resourceIds.has(resourceId), `${card.id} references missing resource ${resourceId}`)
      }
    }
  }
})

test('the seven-paper Time Series run is chronological and format-accurate', () => {
  const expectedRun = [
    ['card-058', '#1', '2015'],
    ['card-068', '#2', '2016'],
    ['card-081', '#3', '2017'],
    ['card-089', '#4', '2018'],
    ['card-095', '#5', '2019'],
    ['card-113', '#6', '2020'],
    ['card-118', '#7', 'mock'],
  ]

  for (const [cardId, paperNumber, paperName] of expectedRun) {
    const card = timeSeriesCards.find((candidate) => candidate.id === cardId)
    assert.ok(card, `missing paper card ${cardId}`)
    assert.match(card.title.toLowerCase(), new RegExp(paperNumber.replace('#', '#') + `.*${paperName}|${paperName}.*${paperNumber.replace('#', '#')}`, 'i'))
  }

  const allText = timeSeriesCards
    .flatMap((card) => [
      card.title,
      card.description,
      ...card.checklist,
      ...card.studySequence.steps.flatMap((step) => [step.label, step.instruction, step.checklistText]),
    ])
    .join('\n')

  assert.doesNotMatch(
    allText,
    /paper #8|running-count slip|reuse a paper|last full past-paper|last data point before|mock #4|mock #5/i,
  )

  for (const oldPaperId of expectedRun.slice(0, 6).map(([cardId]) => cardId)) {
    const card = timeSeriesCards.find((candidate) => candidate.id === oldPaperId)
    assert.match(
      card.studySequence.steps[0].instruction,
      /four 25-mark questions.*choose any three/i,
      `${oldPaperId} must preserve the older four-question/choose-three format`,
    )
  }

  const mock = timeSeriesCards.find((card) => card.id === 'card-118')
  assert.match(mock.studySequence.steps[0].instruction, /answer all three 25-mark questions/i)
})

test('Pack D and memory notes preserve the lecture-supported boundaries', async () => {
  const packD = timeSeriesCards.find((card) => card.id === 'card-031')
  const packDText = JSON.stringify(packD.studySequence)
  assert.doesNotMatch(packDText, /PACF/i, 'PACF belongs to the later diagnostic lecture, not Pack D')

  const notes = await loadTimeSeriesNotes()
  const memoryNote = notes.find((note) => note.id === 'ts-short-long-range')
  assert.match(memoryNote.body, /stationary process/i)
  assert.match(memoryNote.body, /do not (?:apply|classify).*random walk/i)
})
