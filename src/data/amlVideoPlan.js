import { amlVideo } from './amlVideoLibrary.js'

// Per-card video assignment for Applied ML.
//
// This is an EXPLICIT table, one entry per card, on purpose. The previous version
// derived video links from a regex on the card title and then attached the same
// two or three whole playlists to all 43 Applied ML cards. Because study progress
// is stored per resource, marking one playlist "studied" made every other card
// claim it was already 100% done.
//
// Two rules govern this table:
//
//  1. A video appears on the card that TEACHES it, and nowhere else. If a topic is
//     revisited later, the later card gets the lab/notes, not the video again.
//  2. Cards with no entry get NO videos at all. That is deliberate, not an
//     oversight. The mocks run under open-book, no-internet, no-AI exam rules, so
//     a YouTube link on a mock card contradicts the card. Pack-assembly and timed
//     reconstruction cards are output-producing, not input-consuming. Weak-topic
//     repair cards depend on which topic was actually weak, so pre-assigning
//     videos to them would be guessing — the module video library stays browsable
//     for those.
//
// `core` = watch as part of this card. `optional` = deeper treatment, only if the
// core clips left a gap. Core minutes are kept well under the card's study hours,
// because these cards are lab-first: video is Tier 2 support, the notebook is Tier 1.

const CARD_VIDEO_PLAN = {
  // ---------------- Session 1 ----------------
  'card-001': {
    core: ['aml-video-ubc-1-0-ml-introduction', 'aml-video-ubc-2-1-ml-terminology'],
    optional: ['aml-video-course-s1-workflow'],
    focus: 'the 5-stage workflow and supervised/unsupervised vs classification/regression vocabulary',
    checklist: 'Watch UBC 1.0 + 2.1 (~27 min) BEFORE opening Lab 1, then name each Lab 1 cell with its workflow stage.',
  },
  'card-003': {
    core: ['aml-video-ubc-2-4-more-terminology', 'aml-video-ubc-2-2-baselines'],
    optional: [],
    focus: 'terminology precision and why a baseline is the first model you build',
    checklist: 'Watch UBC 2.4 + 2.2 (~30 min), then do the closed-book workflow recital without replaying them.',
  },

  // ---------------- Session 2 ----------------
  'card-005': {
    core: ['aml-video-ubc-5-1-preprocessing-intro', 'aml-video-ubc-5-2-imputation-scaling'],
    optional: [],
    focus: 'what preprocessing is for, and the imputation/scaling decisions Lab 2 makes',
    checklist: 'Watch UBC 5.1 + 5.2 (~29 min) before the Lab 2 run, then tick each step off in your inventory as you meet it.',
  },
  'card-007': {
    core: ['aml-video-ubc-5-4-one-hot-encoding', 'aml-video-ubc-6-1-column-transformer'],
    optional: ['aml-video-ubc-6-2-encoding-text'],
    focus: 'one-hot encoding and applying different transforms to different column types',
    checklist: 'Watch UBC 5.4 + 6.1 (~29 min); write the encoding rule for a Titanic and a crx column in your own words.',
  },
  'card-008': {
    core: ['aml-video-ubc-5-3-sklearn-pipelines'],
    optional: ['aml-video-course-s3-ridge-lasso'],
    focus: 'pipelines as the mechanism that prevents leakage — fit on train only',
    checklist: 'Watch UBC 5.3 (~12 min) and write down exactly which step leaks if you scale before splitting.',
  },

  // ---------------- Session 3 ----------------
  'card-011': {
    core: ['aml-video-ubc-7-1-linear-regression', 'aml-video-course-s3-linear-regression'],
    optional: ['aml-video-cs156-l03', 'aml-video-cs229-l02'],
    focus: 'linear model form, the loss being minimised, and what training actually does',
    checklist: 'Watch UBC 7.1 + course 2:00–2:15 (~30 min); reproduce the fit/predict/score cells from Lab 3 unaided.',
  },
  'card-014': {
    core: ['aml-video-ubc-3-1-generalization', 'aml-video-ubc-3-4-fundamental-tradeoff'],
    optional: [
      'aml-video-cs156-l08',
      'aml-video-cs156-l11',
      'aml-video-cs156-l12',
      'aml-video-course-s3-overfitting',
    ],
    focus: 'generalisation, the bias-variance tradeoff, and how regularisation moves you along it',
    checklist: 'Watch UBC 3.1 + 3.4 (~33 min). If the tradeoff still feels hand-wavy, add CS156 L08 — but only then.',
  },
  'card-016': {
    core: ['aml-video-ubc-3-3-cross-validation'],
    optional: ['aml-video-ubc-3-2-data-splitting'],
    focus: 'cross-validation as the reason you trust a score at all',
    checklist: 'Watch UBC 3.3 (~11 min) only after the timed Lab 3 rebuild — do not use it as a warm-up.',
  },

  // ---------------- Session 4 ----------------
  'card-017': {
    core: [
      'aml-video-ubc-7-2-logistic-regression',
      'aml-video-ubc-4-2-knn',
      'aml-video-ubc-2-3-decision-trees',
    ],
    optional: ['aml-video-ubc-4-1-analogy-based', 'aml-video-cs229-l03'],
    focus: 'the three classifier families your comparison table needs before SVM is added',
    checklist: 'Watch UBC 7.2 + 4.2 + 2.3 (~43 min); fill one comparison-table row per classifier as you go.',
  },
  'card-020': {
    core: [
      'aml-video-ubc-4-4-svm-rbf',
      'aml-video-course-s4-svm-kernels',
      'aml-video-ubc-8-1-hyperparameter-opt',
    ],
    optional: ['aml-video-cs156-l14', 'aml-video-cs156-l15', 'aml-video-cs229-l06', 'aml-video-cs229-l07'],
    focus: 'kernel SVM, what C and gamma each do to the boundary, and what to tune first',
    checklist:
      'Watch UBC 4.4 + course 2:55–3:30 + UBC 8.1 (~59 min); write what happens to the boundary as C rises and as gamma rises.',
  },
  'card-022': {
    core: ['aml-video-ubc-9-2-confusion-matrix', 'aml-video-ubc-9-3-precision-recall-f1'],
    optional: ['aml-video-ubc-7-3-probability-scores'],
    focus: 'reading a confusion matrix and choosing between precision, recall and F1',
    checklist: 'Watch UBC 9.2 + 9.3 (~17 min) after the timed Lab 4 rebuild; recite the four cells from memory.',
  },

  // ---------------- Session 5 ----------------
  'card-024': {
    core: ['aml-video-ubc-11-1-ensembles-motivation', 'aml-video-ubc-11-2-gradient-boosted-trees'],
    optional: ['aml-video-course-s5-ensembles', 'aml-video-cs229-l09'],
    focus: 'why combining models helps, and how boosting differs from bagging',
    checklist: 'Watch UBC 11.1 + 11.2 (~18 min) before Lab 5; fill the bagging/boosting/stacking table straight after.',
  },
  'card-026': {
    core: ['aml-video-ubc-12-1-interpretation-motivation', 'aml-video-ubc-12-2-feature-importances'],
    optional: [],
    focus: 'feature importance for tree ensembles and how far you can trust it',
    checklist: 'Watch UBC 12.1 + 12.2 (~16 min); note one case where feature importance misleads you.',
  },

  // ---------------- Targeted drills (topic-specific, so videos earn their place) ----------------
  'card-062': {
    core: ['aml-video-ubc-9-1-metrics-motivation', 'aml-video-ubc-9-4-class-imbalance'],
    optional: [],
    focus: 'metric choice under class imbalance — the evaluation question that recurs most',
    checklist: 'Watch UBC 9.1 + 9.4 (~23 min) before the drill; justify a metric choice for an imbalanced set in one line.',
  },
  'card-076': {
    core: ['aml-video-ubc-8-2-validation-overfitting'],
    // Deliberately NOT re-listing UBC 5.3 (pipelines/leakage) here even though this
    // card drills leakage: it is card-008's video. Repeating it would make marking it
    // studied on one card show 100% on the other — the exact leak this table exists
    // to prevent. The leakage revision here comes from your own playbook page.
    optional: [],
    focus: 'overfitting the validation set itself — the trap behind repeated tuning',
    checklist: 'Watch UBC 8.2 (~13 min); revise leakage from your S2 playbook, not by rewatching UBC 5.3.',
  },
}

// Cards that intentionally carry no video, with the reason surfaced to the user
// instead of the card just looking empty.
const NO_VIDEO_REASON = {
  mock: 'No videos on this card: it runs under open-book, no-internet, no-AI exam rules. Use your pack only.',
  reconstruction: 'No videos on this card: it is a timed rebuild from blank. Watching first defeats the measurement.',
  pack: 'No videos on this card: it produces pages, it does not consume new input.',
  repair:
    'No preassigned videos: repair depends on which topic the mock exposed. Pull the one specific video you need from the module video library.',
  recall: 'No videos on this card: closed-book recall. Look nothing up until the sweep is scored.',
}

function noVideoReason(card) {
  const title = card.title.toLowerCase()
  if (/mock/.test(title)) return NO_VIDEO_REASON.mock
  if (/repair/.test(title)) return NO_VIDEO_REASON.repair
  if (/reconstruction|timed re-run/.test(title)) return NO_VIDEO_REASON.reconstruction
  if (/recall sweep|closed-book/.test(title)) return NO_VIDEO_REASON.recall
  if (/index|checklist|pack|summary sheets|dry-run|stress-test|final pass/.test(title)) return NO_VIDEO_REASON.pack
  return null
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function appendSentence(value, sentence) {
  if (!value) return sentence
  if (value.includes(sentence)) return value
  return `${value} ${sentence}`
}

function appendChecklist(checklist, item) {
  if (!item) return checklist
  const list = Array.isArray(checklist) ? checklist : []
  if (list.includes(item)) return list
  return [...list, item]
}

function coreMinutes(ids) {
  return ids.reduce((total, id) => total + amlVideo(id).minutes, 0)
}

function describeVideo(video) {
  const scope = video.segmentLabel ? ` (${video.segmentLabel})` : ''
  return `${video.title}${scope} — ${video.minutes} min`
}

export function applyAmlVideoStudyPlan(cards) {
  return cards.map((card) => {
    if (card.moduleGroup !== 'Applied ML') return card

    const plan = CARD_VIDEO_PLAN[card.id]

    if (!plan) {
      const reason = noVideoReason(card)
      if (!reason) return card
      return {
        ...card,
        description: appendSentence(card.description, reason),
      }
    }

    const core = plan.core ?? []
    const optional = plan.optional ?? []
    const minutes = coreMinutes(core)
    const coreList = core.map((id) => describeVideo(amlVideo(id))).join('; ')

    const videoNote =
      `Video plan (~${minutes} min core, Tier 2 — the lab stays Tier 1): ${coreList}. ` +
      `Focus: ${plan.focus}.` +
      (optional.length ? ` Optional deeper: ${optional.map((id) => amlVideo(id).shortTitle).join('; ')}.` : '')

    return {
      ...card,
      description: appendSentence(card.description, videoNote),
      checklist: appendChecklist(card.checklist, plan.checklist),
      resourceIds: unique([...core, ...optional, ...(card.resourceIds ?? [])]),
      tags: unique([...(card.tags ?? []), 'video-assisted']),
    }
  })
}

export { CARD_VIDEO_PLAN }
