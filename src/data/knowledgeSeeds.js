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

const SEED_STAMP = '2026-07-20T00:00:00.000Z'

import { parseNoteBundle } from '../utils/knowledge'
import amlKeyNotes from './knowledge/aml-key-notes.md?raw'
import amlMlTypes from './knowledge/aml-ml-types.md?raw'
import amlTraps from './knowledge/aml-traps.md?raw'
import amlS1Data from './knowledge/aml-s1-data.md?raw'
import amlS1Debug from './knowledge/aml-s1-debug.md?raw'
import amlS1Foundations from './knowledge/aml-s1-foundations.md?raw'
import amlS1Pipeline from './knowledge/aml-s1-pipeline.md?raw'
import amlS2 from './knowledge/aml-s2.md?raw'
import amlS3 from './knowledge/aml-s3.md?raw'
import amlS4 from './knowledge/aml-s4.md?raw'
import amlS5 from './knowledge/aml-s5.md?raw'
import mat700Algorithms from './knowledge/mat700-algorithms.md?raw'
import mat700Foundations from './knowledge/mat700-foundations.md?raw'
import mat700KeyNotes from './knowledge/mat700-key-notes.md?raw'
import mat700Similarity from './knowledge/mat700-similarity.md?raw'
import mat700VsCmt307 from './knowledge/mat700-vs-cmt307.md?raw'
import tsArma from './knowledge/ts-arma.md?raw'
import tsDrills from './knowledge/ts-drills.md?raw'
import tsFoundations from './knowledge/ts-foundations.md?raw'
import tsSpectral from './knowledge/ts-spectral.md?raw'

// Session bundles: many short notes per file, split on `@@` metadata lines.
// Long-form standalone documents stay as one-file-per-note below.
const AML_BUNDLES = [
  amlS1Foundations,
  amlS1Data,
  amlS1Pipeline,
  amlS1Debug,
  amlS2,
  amlS3,
  amlS4,
  amlS5,
].flatMap((source) =>
  parseNoteBundle(source, { moduleId: 'aml', createdAt: SEED_STAMP, updatedAt: SEED_STAMP }),
)

const MAT700_BUNDLES = [mat700Foundations, mat700Similarity, mat700Algorithms].flatMap((source) =>
  parseNoteBundle(source, { moduleId: 'mat700', createdAt: SEED_STAMP, updatedAt: SEED_STAMP }),
)

const TIME_SERIES_BUNDLES = [tsFoundations, tsSpectral, tsArma, tsDrills].flatMap((source) =>
  parseNoteBundle(source, { moduleId: 'time-series', createdAt: SEED_STAMP, updatedAt: SEED_STAMP }),
)

const SESSION_BUNDLES = [...AML_BUNDLES, ...MAT700_BUNDLES, ...TIME_SERIES_BUNDLES]

export const KNOWLEDGE_SEEDS = [
  ...SESSION_BUNDLES,
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
