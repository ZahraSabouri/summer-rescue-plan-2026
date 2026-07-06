const AML_VIDEO_IDS = {
  appliedMlPlaylist: 'aml-video-applied-ml-playlist',
  pythonCourse: 'aml-video-python-complete-course',
  caltechCs156: 'aml-video-caltech-cs156',
}

const ALL_AML_VIDEO_IDS = [
  AML_VIDEO_IDS.appliedMlPlaylist,
  AML_VIDEO_IDS.pythonCourse,
  AML_VIDEO_IDS.caltechCs156,
]

const SESSION_VIDEO_PLAN = {
  s1: {
    ids: [AML_VIDEO_IDS.appliedMlPlaylist, AML_VIDEO_IDS.pythonCourse],
    focus: 'workflow, supervised/unsupervised, classification vs regression, and the lab-first ML process',
    checklist: 'Use the linked YouTube resources for workflow intuition; capture 2 useful timestamps before the closed-book workflow check.',
  },
  s2: {
    ids: [AML_VIDEO_IDS.appliedMlPlaylist, AML_VIDEO_IDS.pythonCourse],
    focus: 'missing values, encoding, scaling, train/test split discipline, and leakage',
    checklist: 'Use the linked YouTube resources for preprocessing/leakage; capture the timestamp that explains the rule you put in the playbook.',
  },
  s3: {
    ids: ALL_AML_VIDEO_IDS,
    focus: 'linear models, generalisation, overfit/underfit, bias-variance, regularisation, and evaluation',
    checklist: 'Use the linked YouTube resources for regression/evaluation intuition; capture timestamps for bias-variance, CV, or regularisation gaps.',
  },
  s4: {
    ids: ALL_AML_VIDEO_IDS,
    focus: 'classification, SVMs, decision trees, model comparison, metrics, and tuning',
    checklist: 'Use the linked YouTube resources for classification/tuning; capture one timestamp for a metric or hyperparameter rule.',
  },
  s5: {
    ids: ALL_AML_VIDEO_IDS,
    focus: 'bagging, boosting, random forests, feature importance, OOB, and ensemble comparison',
    checklist: 'Use the linked YouTube resources for ensemble intuition; capture one timestamp for RF, boosting, feature importance, or OOB.',
  },
}

function sessionKey(card) {
  const text = `${card.title} ${card.description}`.toLowerCase()
  const match = text.match(/\bs([1-5])\b/)
  return match ? `s${match[1]}` : ''
}

function phasePlan(card) {
  if (card.phase === 'Phase 3') {
    return {
      ids: ALL_AML_VIDEO_IDS,
      focus: 'weak topics from timed mocks and notebook reconstructions',
      checklist: 'After timing yourself, use the linked YouTube resources only for the weakest 1-2 topics; log timestamps in the error log.',
    }
  }

  if (card.phase === 'Phase 4') {
    return {
      ids: [AML_VIDEO_IDS.appliedMlPlaylist, AML_VIDEO_IDS.caltechCs156],
      focus: 'last-mile weak topics and open-book navigation speed',
      checklist: 'Use the linked YouTube resources only for final weak-topic repair; no broad playlist watching in Phase 4.',
    }
  }

  return {
    ids: ALL_AML_VIDEO_IDS,
    focus: 'session summary, open-book index, model-selection checklists, and common mistakes',
    checklist: 'Fold linked YouTube timestamps into the open-book pack or summary sheet; do not try to finish whole playlists.',
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function appendSentence(value, sentence) {
  if (!value || value.includes(sentence)) return value
  return `${value} Video plan: ${sentence}`
}

function appendRequirement(value, requirement) {
  if (!value || value.includes(requirement)) return value
  return `${value} + ${requirement}`
}

function appendChecklist(checklist, item) {
  if (!Array.isArray(checklist)) return [item]
  if (checklist.includes(item)) return checklist
  return [...checklist, item]
}

export function applyAmlVideoStudyPlan(cards) {
  return cards.map((card) => {
    if (card.moduleGroup !== 'Applied ML') return card

    const sessionPlan = SESSION_VIDEO_PLAN[sessionKey(card)]
    const plan = sessionPlan ?? phasePlan(card)
    const phaseCue =
      card.phase === 'Phase 2'
        ? `Use videos after the relevant lab/notebook pass, focused on ${plan.focus}.`
        : `Use videos as targeted reinforcement for ${plan.focus}.`

    return {
      ...card,
      description: appendSentence(card.description, `${phaseCue} Videos are Tier 2 support; lab outputs stay Tier 1.`),
      checklist: appendChecklist(card.checklist, plan.checklist),
      evidenceRequirement: appendRequirement(card.evidenceRequirement, 'timestamped video notes'),
      doneCondition: appendRequirement(card.doneCondition, 'video notes linked to the output or error log'),
      resourceIds: unique([...(plan.ids ?? []), ...(card.resourceIds ?? [])]),
      tags: unique([...(card.tags ?? []), 'video-assisted']),
    }
  })
}
