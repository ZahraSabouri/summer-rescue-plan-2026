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
// core clips left a gap. Videos now live on each session's CONCEPTS card (the "Learn
// …" card), which comes before its lab: you watch to understand, then run the notebook
// on the following card. The lab/run cards carry no video on purpose.

const CARD_VIDEO_PLAN = {
  // ---------------- Session 1 (concepts card teaches; the lab card applies) ----------------
  'card-001': {
    core: ['aml-video-ubc-1-0-ml-introduction', 'aml-video-ubc-2-1-ml-terminology'],
    // The full 6h51m "Applied ML in Python" course (dh1lvdp0oCo) is split by concept
    // across the S1/S3/S4/S5 concepts cards, so the whole 5.4h in-scope run can be
    // watched piece-by-piece and finished by the end of the campaign. This card owns
    // its S1 slice (0:02–0:51). The UBC short clips stay the quick core path; the
    // course slice is the fuller treatment tracked by the checklist line below.
    optional: [
      'aml-video-course-s1-workflow',
      'aml-video-ubc-2-4-more-terminology',
      'aml-video-ubc-2-2-baselines',
    ],
    focus: 'the 5-stage workflow, core terminology, and why a baseline is the first model',
    checklist: 'Applied ML course video — S1 part: watch 0:02–0:51 (workflow, sklearn setup & first model).',
  },
  // card-005 is the S1 LAB (run Lab 1) — no video; its teaching lives on card-001.

  // ---------------- Session 2 ----------------
  'card-003': {
    core: ['aml-video-ubc-5-1-preprocessing-intro', 'aml-video-ubc-5-2-imputation-scaling'],
    optional: [
      'aml-video-ubc-5-4-one-hot-encoding',
      'aml-video-ubc-6-1-column-transformer',
      'aml-video-ubc-6-2-encoding-text',
    ],
    focus: 'what preprocessing is for and the missing → encode → scale → split order',
  },
  'card-008': {
    // The leakage-playbook consolidation card keeps the pipelines clip — the one video
    // that teaches "fit on train only". Kept only here so studied-progress can't leak.
    core: ['aml-video-ubc-5-3-sklearn-pipelines'],
    optional: [],
    focus: 'pipelines as the mechanism that prevents leakage — fit on train only',
  },
  // card-007 is the S2 LAB (run Lab 2) — no video.

  // ---------------- Session 3 (concepts card) ----------------
  'card-011': {
    core: [
      'aml-video-ubc-7-1-linear-regression',
      'aml-video-ubc-3-1-generalization',
      'aml-video-ubc-3-4-fundamental-tradeoff',
    ],
    // Includes this session's four slices of the full course video (see card-001):
    // 1:15–2:00 overfitting, 2:00–2:15 regression, 2:15–2:35 ridge/lasso, 3:29–3:40 CV.
    optional: [
      'aml-video-ubc-3-3-cross-validation',
      'aml-video-course-s3-overfitting',
      'aml-video-course-s3-linear-regression',
      'aml-video-course-s3-ridge-lasso',
      'aml-video-course-s3-cross-validation',
      'aml-video-cs156-l08',
    ],
    focus: 'linear models, the bias-variance tradeoff, regularisation, and cross-validation',
    checklist: 'Applied ML course video — S3 parts: 1:15–2:35 (overfitting → linear regression → ridge/lasso) and 3:29–3:40 (cross-validation).',
  },
  // card-014 is the S3 LAB (run Lab 3) — no video. card-016 is the timed re-run — no video.

  // ---------------- Session 4 (concepts card) ----------------
  'card-017': {
    core: [
      'aml-video-ubc-7-2-logistic-regression',
      'aml-video-ubc-4-2-knn',
      'aml-video-ubc-2-3-decision-trees',
      'aml-video-ubc-4-4-svm-rbf',
    ],
    // Includes this session's five slices of the full course video (see card-001) —
    // S4 is the biggest chunk of that video (~2h44m of it), so it is the heaviest
    // watch-through card: 0:51–1:05 kNN, 2:35–2:50 logistic, 2:55–3:30 SVM,
    // 3:40–4:00 trees, 4:00–5:20 evaluation.
    optional: [
      'aml-video-ubc-8-1-hyperparameter-opt',
      'aml-video-ubc-9-2-confusion-matrix',
      'aml-video-ubc-9-3-precision-recall-f1',
      'aml-video-course-s4-knn',
      'aml-video-course-s4-logistic',
      'aml-video-course-s4-svm-kernels',
      'aml-video-course-s4-decision-trees',
      'aml-video-course-s4-evaluation',
    ],
    focus: 'the classifier families (logistic, kNN, trees, SVM), what to tune, and the core metrics',
    checklist: 'Applied ML course video — S4 parts: 0:51–1:05 (kNN), 2:35–2:50 (logistic), 2:55–3:30 (SVM, C & gamma), 3:40–4:00 (decision trees), 4:00–5:20 (confusion matrix, precision/recall, ROC).',
  },
  // card-020 is the S4 LAB (run Lab 4) — no video. card-022 is the timed re-run — no video.

  // ---------------- Session 5 (concepts card) ----------------
  'card-024': {
    core: [
      'aml-video-ubc-11-1-ensembles-motivation',
      'aml-video-ubc-11-2-gradient-boosted-trees',
      'aml-video-ubc-12-1-interpretation-motivation',
      'aml-video-ubc-12-2-feature-importances',
    ],
    // The final in-scope slice of the full course video (see card-001): 5:25–5:45.
    // 'beyond-part2' is the 5:45–6:51 tail, attached here as flagged enrichment only.
    optional: ['aml-video-course-s5-ensembles', 'aml-video-cs229-l09', 'aml-video-course-beyond-part2'],
    focus: 'why ensembles help, bagging vs boosting, random forests, and feature importance',
    checklist: 'Applied ML course video — S5 part: 5:25–5:45 (random forests & gradient boosting) finishes the exam-relevant course. BONUS (attached, NOT on the exam): 5:45–6:51 (~1h — neural nets, clustering, PCA); one relaxed watch if curious, no exam prep needed.',
  },
  // card-026 is the S5 LAB (run Lab 5) — no video.

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
      `Video plan (~${minutes} min core — watch to build the concepts before the lab): ${coreList}. ` +
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
