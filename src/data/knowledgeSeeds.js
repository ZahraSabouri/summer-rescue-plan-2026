// Seeded knowledge notes.
//
// Bodies live as real .md files in ./knowledge/ and are inlined at build time
// with Vite's ?raw import, so they stay editable as Markdown instead of as
// escaped template literals (which fenced code blocks make painful).
//
// Seeds are read-only defaults: they render for every user, but the moment a
// note is edited in the app a full copy is written to tracker state under the
// same id and takes over. Review history is keyed by id and survives either
// way. See src/utils/knowledge.js.

import amlKeyNotes from './knowledge/aml-key-notes.md?raw'
import amlMlTypes from './knowledge/aml-ml-types.md?raw'
import amlTraps from './knowledge/aml-traps.md?raw'
import mat700KeyNotes from './knowledge/mat700-key-notes.md?raw'
import mat700VsCmt307 from './knowledge/mat700-vs-cmt307.md?raw'

export const KNOWLEDGE_SEEDS = [
  {
    id: 'kn-aml-ml-types',
    moduleId: 'aml',
    title: 'Machine-learning types: complete CMT307 reference',
    kind: 'concept',
    topic: 'Foundations',
    tags: ['taxonomy', 'supervised', 'unsupervised', 'reinforcement', 'session 1'],
    body: amlMlTypes,
    createdAt: '2026-07-19T00:00:00.000Z',
    updatedAt: '2026-07-19T00:00:00.000Z',
  },
  {
    id: 'kn-aml-key-notes',
    moduleId: 'aml',
    title: 'ML types — key notes',
    kind: 'cheatsheet',
    topic: 'Foundations',
    tags: ['recall', 'one-page', 'exam'],
    body: amlKeyNotes,
    createdAt: '2026-07-19T00:00:00.000Z',
    updatedAt: '2026-07-19T00:00:00.000Z',
  },
  {
    id: 'kn-aml-traps',
    moduleId: 'aml',
    title: 'ML types — traps and mark-losers',
    kind: 'traps',
    topic: 'Foundations',
    tags: ['traps', 'exam technique'],
    body: amlTraps,
    createdAt: '2026-07-19T00:00:00.000Z',
    updatedAt: '2026-07-19T00:00:00.000Z',
  },
  {
    id: 'kn-mat700-key-notes',
    moduleId: 'mat700',
    title: 'Learning taxonomies — key notes',
    kind: 'cheatsheet',
    topic: 'Foundations',
    tags: ['recall', 'four axes', 'exam'],
    body: mat700KeyNotes,
    createdAt: '2026-07-19T00:00:00.000Z',
    updatedAt: '2026-07-19T00:00:00.000Z',
  },
  {
    id: 'kn-mat700-vs-cmt307',
    moduleId: 'mat700',
    title: 'MAT700 vs CMT307: where the taxonomies differ',
    kind: 'traps',
    topic: 'Foundations',
    tags: ['cross-module', 'traps', 'exam technique'],
    body: mat700VsCmt307,
    createdAt: '2026-07-19T00:00:00.000Z',
    updatedAt: '2026-07-19T00:00:00.000Z',
  },
]

export function seedsForModule(moduleId) {
  return KNOWLEDGE_SEEDS.filter((seed) => seed.moduleId === moduleId)
}
