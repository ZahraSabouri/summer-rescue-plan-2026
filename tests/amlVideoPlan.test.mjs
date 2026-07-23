import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { AML_VIDEOS, AML_VIDEO_BY_ID } from '../src/data/amlVideoLibrary.js'
import { applyAmlVideoStudyPlan } from '../src/data/amlVideoPlan.js'
import { applyCardStudySequences } from '../src/data/cardStudySequences.js'
import { STUDY_MODULE_MAP } from '../src/data/studyModules.js'
import { rescueCards } from '../src/data/summerRescuePlan.js'

const plannedCards = applyAmlVideoStudyPlan(applyCardStudySequences(rescueCards))
const amlCards = plannedCards.filter((card) => card.moduleGroup === 'Applied ML')
const amlResources = STUDY_MODULE_MAP.aml.resources
const resourceById = new Map(amlResources.map((resource) => [resource.id, resource]))

function stepResourceIds(card) {
  return [...new Set((card.studySequence?.steps ?? []).flatMap((step) => step.resourceIds ?? []))]
}

function videoIds(card) {
  return stepResourceIds(card).filter((id) => AML_VIDEO_BY_ID.has(id))
}

test('AML catalogue preserves the 339-minute exam-relevant long-course path', () => {
  const course = AML_VIDEOS.filter((video) => video.id.startsWith('aml-video-course-'))
  const ubc = AML_VIDEOS.filter((video) => video.id.startsWith('aml-video-ubc-'))

  assert.equal(AML_VIDEOS.length, 20)
  assert.equal(AML_VIDEOS.reduce((sum, video) => sum + video.minutes, 0), 458)
  assert.equal(course.length, 11)
  assert.equal(course.reduce((sum, video) => sum + video.minutes, 0), 339)
  assert.equal(ubc.reduce((sum, video) => sum + video.minutes, 0), 119)
  assert.equal(new Set(AML_VIDEOS.map((video) => video.id)).size, AML_VIDEOS.length)
  assert.ok(AML_VIDEOS.every((video) => video.minutes > 0 && video.minutes <= 80))
  assert.ok(AML_VIDEOS.every((video) => !/cs229|cs156|beyond/i.test(video.id)))
  assert.ok(course.every((video) => video.videoId === 'dh1lvdp0oCo' && video.end <= 20700))
  assert.ok(AML_VIDEOS.every((video) => !/neural|deep learning|clustering|PCA|part 2/i.test(video.title)))

  const excerpt = AML_VIDEO_BY_ID.get('aml-video-course-s1-workflow')
  assert.deepEqual(
    { start: excerpt.start, end: excerpt.end, minutes: excerpt.minutes },
    { start: 150, end: 3060, minutes: 49 },
  )
})

test('every long-course section is an active code-along, not passive viewing', () => {
  const courseSteps = amlCards.flatMap((card) =>
    (card.studySequence?.steps ?? [])
      .filter((step) => (step.resourceIds ?? []).some((id) => id.startsWith('aml-video-course-')))
      .map((step) => ({ cardId: card.id, step })),
  )

  assert.equal(courseSteps.length, 10)
  for (const { cardId, step } of courseSteps) {
    assert.equal(step.kind, 'codeAlong', `${cardId}: long-course section became passive watching`)
    assert.ok(step.minutes > step.playbackMinutes, `${cardId}: no time reserved to execute the code`)
    assert.match(step.instruction, /code|fit|run|reproduce|print/i)
  }
})

test('every selected video belongs to exactly one timed watch or code-along step', () => {
  const occurrences = new Map(AML_VIDEOS.map((video) => [video.id, 0]))

  for (const card of amlCards) {
    for (const step of card.studySequence?.steps ?? []) {
      const ids = (step.resourceIds ?? []).filter((id) => AML_VIDEO_BY_ID.has(id))
      if (ids.length) {
        const expectedMinutes = [...new Set(ids)]
          .reduce((sum, id) => sum + AML_VIDEO_BY_ID.get(id).minutes, 0)
        assert.ok(['watch', 'codeAlong'].includes(step.kind), `${card.id}: invalid video step kind`)
        assert.ok(step.minutes >= expectedMinutes, `${card.id}: study time is shorter than playback`)
        if (step.kind === 'codeAlong') {
          assert.equal(step.playbackMinutes, expectedMinutes, `${card.id}: playback time is inaccurate`)
          assert.match(step.instruction, /code|fit|run|reproduce|type|build|print/i)
        } else {
          assert.equal(step.minutes, expectedMinutes, `${card.id}: watch time must equal playback`)
        }
      }
      ids.forEach((id) => occurrences.set(id, occurrences.get(id) + 1))
    }
  }

  assert.deepEqual(
    [...occurrences.entries()].filter(([, count]) => count !== 1),
    [],
  )
})

test('long-course sections remain distributed across their intended AML cards', () => {
  const expected = {
    'card-001': ['aml-video-course-s1-workflow'],
    'card-011': [
      'aml-video-course-s3-overfitting',
      'aml-video-course-s3-linear-regression',
      'aml-video-course-s3-ridge-lasso',
      'aml-video-course-s3-cross-validation',
    ],
    'card-017': [
      'aml-video-course-s4-knn',
      'aml-video-course-s4-logistic',
      'aml-video-course-s4-svm-kernels',
      'aml-video-course-s4-decision-trees',
    ],
    'card-024': ['aml-video-course-s5-ensembles'],
    'card-062': ['aml-video-course-s4-evaluation'],
  }

  for (const [cardId, ids] of Object.entries(expected)) {
    const card = amlCards.find((candidate) => candidate.id === cardId)
    assert.deepEqual(
      videoIds(card).filter((id) => id.startsWith('aml-video-course-')),
      ids,
      `${cardId}: long-course allocation drifted`,
    )
  }
})

test('selected UBC preprocessing lessons keep playlist order across cards', () => {
  assert.deepEqual(videoIds(amlCards.find((card) => card.id === 'card-003')), [
    'aml-video-ubc-5-1-preprocessing-intro',
    'aml-video-ubc-5-2-imputation-scaling',
    'aml-video-ubc-5-3-sklearn-pipelines',
    'aml-video-ubc-5-4-one-hot-encoding',
  ])
  assert.deepEqual(videoIds(amlCards.find((card) => card.id === 'card-008')), [
    'aml-video-ubc-6-1-column-transformer',
  ])
})

test('video plan does not inject hidden optional resources or alter ordered checklist', () => {
  const sequenced = applyCardStudySequences(rescueCards)
  const planned = applyAmlVideoStudyPlan(sequenced)

  for (const before of sequenced.filter((card) => card.moduleGroup === 'Applied ML')) {
    const after = planned.find((card) => card.id === before.id)
    assert.deepEqual(after.resourceIds, before.resourceIds, `${before.id}: video plan injected resources`)
    assert.deepEqual(after.checklist, before.checklist, `${before.id}: video plan changed checklist order`)
    assert.deepEqual(videoIds(after), videoIds(before))
  }
})

test('AML Material tab contains only resources used by live ordered study steps', () => {
  const referenced = new Set(amlCards.flatMap(stepResourceIds))

  assert.equal(amlResources.length, 33)
  assert.equal(amlResources.filter((resource) => resource.type === 'YOUTUBE').length, 20)
  assert.deepEqual(
    amlResources.filter((resource) => !referenced.has(resource.id)).map((resource) => resource.id),
    [],
  )

  for (const id of referenced) {
    assert.ok(resourceById.has(id), `live AML step references missing Material-tab resource ${id}`)
  }
})

test('every ordered AML sequence fits inside its live card time budget', () => {
  for (const card of amlCards.filter((candidate) => candidate.studySequence)) {
    assert.ok(
      card.studySequence.totalMinutes <= card.estimatedHours * 60,
      `${card.id}: ${card.studySequence.totalMinutes} min exceeds ${card.estimatedHours * 60} min`,
    )
    assert.deepEqual(
      card.checklist,
      card.studySequence.steps.map((step) => step.checklistText ?? step.label),
      `${card.id}: checklist and ordered steps diverged`,
    )
  }
})

test('preprocessing cards state split-first, train-fitted transformation order', () => {
  const cards = ['card-003', 'card-007', 'card-008']
    .map((id) => amlCards.find((card) => card.id === id))
  const text = cards
    .flatMap((card) => [
      card.description,
      card.doneCondition,
      ...(card.studySequence?.concepts ?? []),
      ...(card.studySequence?.steps ?? []).flatMap((step) => [step.instruction, step.checklistText]),
    ])
    .filter(Boolean)
    .join('\n')

  assert.doesNotMatch(text, /missing\s*(?:→|->)\s*encode\s*(?:→|->)\s*scale\s*(?:→|->)\s*split/i)
  assert.match(text, /split before fit|split before fitting|split first|split-before-fit/i)
  assert.match(text, /train(?:ing)?[- ]fitted|fit(?:ted)? on train(?:ing)?|training data only/i)
})

test('CMT307 source video list has no duplicate URLs', async () => {
  const source = new URL(
    '../../Module_Plans/CMT307/YouTube%20Videos.txt',
    import.meta.url,
  )
  const urls = (await readFile(source, 'utf8'))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  assert.equal(new Set(urls).size, urls.length)
})
