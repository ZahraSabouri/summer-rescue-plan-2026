import { AML_VIDEO_BY_ID } from './amlVideoLibrary.js'

// Study sequences are the single source of truth for required videos, their
// order and their time. This table adds only the reason each selected set is
// useful; it must never attach hidden "optional" videos to a card.
export const CARD_VIDEO_FOCUS = {
  'card-001': 'core terminology and the shape of an end-to-end ML workflow',
  'card-003': 'preprocessing choices before applying them safely in Lab 2',
  'card-008': 'Pipeline and ColumnTransformer as the mechanisms that keep preprocessing inside validation',
  'card-011': 'linear regression, generalisation, data splitting and cross-validation',
  'card-017': 'the SVM, decision-tree and tuning sections used directly in Lab 4',
  'card-024': 'why ensembles help, how boosting differs, and how tree importance is interpreted',
  'card-062': 'metric choice under class imbalance',
  'card-076': 'how repeated tuning can overfit the validation set itself',
}

const NO_VIDEO_REASON = {
  mock: 'No videos on this card: it runs under open-book, no-internet, no-AI exam rules. Use your pack only.',
  reconstruction: 'No videos on this card: it is a timed rebuild from blank. Watching first defeats the measurement.',
  pack: 'No videos on this card: it produces pages, it does not consume new input.',
  repair:
    'No preassigned videos: repair depends on which topic the mock exposed. Reuse only the specific clip already assigned to that topic.',
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

function requiredVideos(card) {
  const ids = unique(
    (card.studySequence?.steps ?? [])
      .filter((step) => step.kind === 'watch')
      .flatMap((step) => step.resourceIds ?? [])
      .filter((id) => AML_VIDEO_BY_ID.has(id)),
  )
  return ids.map((id) => AML_VIDEO_BY_ID.get(id))
}

function describeVideo(video) {
  const scope = video.segmentLabel ? ` (${video.segmentLabel})` : ''
  return `${video.title}${scope} — ${video.minutes} min`
}

export function applyAmlVideoStudyPlan(cards) {
  return cards.map((card) => {
    if (card.moduleGroup !== 'Applied ML') return card

    const videos = requiredVideos(card)
    if (!videos.length) {
      const reason = noVideoReason(card)
      return reason ? { ...card, description: appendSentence(card.description, reason) } : card
    }

    const minutes = videos.reduce((total, video) => total + video.minutes, 0)
    const focus = CARD_VIDEO_FOCUS[card.id] ?? 'the concepts used in this card'
    const videoNote =
      `Required video time: ${minutes} min, already included in the ordered study steps. ` +
      `${videos.map(describeVideo).join('; ')}. Focus: ${focus}.`

    return {
      ...card,
      description: appendSentence(card.description, videoNote),
      tags: unique([...(card.tags ?? []), 'video-assisted']),
    }
  })
}
