import assert from 'node:assert/strict'
import test from 'node:test'

import { STUDY_MODULES } from '../src/data/studyModules.js'

test('module resource catalogues exclude campaign-planning files', () => {
  const resources = STUDY_MODULES.flatMap((module) => module.resources)
  const planningResources = resources.filter((resource) =>
    /\.md$/i.test(resource.path ?? '') && (
      ['Study plan', 'Planning'].includes(resource.group) ||
      resource.tags?.includes('plan') ||
      /Summer_Rescue_Campaign_2026[\\/]Module_Plans/i.test(resource.path ?? '') ||
      /exam plan|homework plan|planning guardrails|priority map|pack map/i.test(resource.title ?? '')
    ),
  )

  assert.deepEqual(
    planningResources.map((resource) => resource.title),
    [],
  )

  const retainedMarkdown = resources
    .filter((resource) => /\.md$/i.test(resource.path ?? ''))
    .map((resource) => resource.title)
    .sort()

  assert.deepEqual(retainedMarkdown, [
    'Lab 1 Ex1 study notes',
    'Lab 1 Ex2 study notes',
    'Project explanation',
  ])
})
