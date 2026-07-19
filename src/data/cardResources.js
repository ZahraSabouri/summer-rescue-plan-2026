function textFor(card) {
  return [
    card.title,
    card.description,
    card.evidenceRequirement,
    card.doneCondition,
    ...(card.checklist ?? []),
    ...(card.tags ?? []),
  ]
    .join(' ')
    .toLowerCase()
}

// The session/lecture tokens used below ('s1', 'l1', 'lecture 1', 'pack a') are
// short, so a plain substring test mis-fires badly: 's1' matches inside "cs156",
// 'l1' matches inside "l10" and "l11", and 'lecture 1' matches "lecture 15".
// That silently attached Session 1 slides to Session 3 cards and Lecture 1 notes
// to Lecture 10+ cards. Matching on token boundaries instead — a term must not be
// flanked by another letter or digit.
function includesAny(text, terms) {
  return terms.some((term) => tokenPattern(term).test(text))
}

const TOKEN_PATTERNS = new Map()

function tokenPattern(term) {
  let pattern = TOKEN_PATTERNS.get(term)
  if (!pattern) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    pattern = new RegExp(`(?:^|[^a-z0-9])${escaped}(?![a-z0-9])`, 'i')
    TOKEN_PATTERNS.set(term, pattern)
  }
  return pattern
}

function pushMatches(target, resources, predicate, limit = 6) {
  const matches = resources.filter((resource) => !/PASTE_/i.test(resource.url ?? '') && predicate(resource)).slice(0, limit)
  for (const resource of matches) target.push(resource.id)
}

function uniqueLimited(ids, limit = 12) {
  return [...new Set(ids)].slice(0, limit)
}

function moduleForCard(card, modules) {
  if (card.moduleGroup === 'Applied ML') return modules.find((module) => module.id === 'aml')
  if (card.moduleGroup === 'Time Series') return modules.find((module) => module.id === 'time-series')
  if (card.moduleGroup === 'Group Project') return modules.find((module) => module.id === 'team-project')
  if (card.moduleGroup === 'MAT700') return modules.find((module) => module.id === 'mat700')
  return null
}

function amlLinks(card, allResources, text) {
  const ids = []

  // Videos are assigned per card by amlVideoPlan.js and must not be matched here.
  // This function used to open by attaching every "Video lectures" resource to
  // every Applied ML card unconditionally, which is what put the same playlists on
  // all 43 cards. The keyword rules below would also catch video titles by accident
  // (e.g. /preprocessing/ matches "UBC 5.1 Data Preprocessing Introduction"), so
  // videos are dropped from the candidate pool entirely rather than skipped once.
  const resources = allResources.filter((resource) => resource.type !== 'YOUTUBE')

  // Session material is keyed off the session marker in the card TITLE ("AML S3 — …"),
  // which is authoritative, and only falls back to topic keywords for cards that
  // carry no marker. Running the keyword rules on every card was too loose: an S3
  // card whose checklist says "map each lab step to the workflow page" matched the
  // Session 1 rule on the word "workflow" and pulled in Lab 1 and the S1 slides.
  const SESSION_RULES = [
    {
      session: 's1',
      keywords: ['lab 1', 'workflow', 'supervised', 'unsupervised'],
      attach: (push) => {
        push((resource) => resource.group === 'Session 1' || /lab 1/i.test(resource.title), 8)
        push((resource) => resource.group === 'Study notes' && /lab 1/i.test(resource.title), 2)
      },
    },
    {
      session: 's2',
      keywords: ['lab 2', 'preprocess', 'titanic', 'crx', 'encoding', 'scaling', 'leakage'],
      attach: (push) => {
        push((resource) => resource.group === 'Session 2', 5)
        push((resource) => /preprocessing/i.test(resource.title), 2)
      },
    },
    {
      session: 's3',
      keywords: ['lab 3', 'regression', 'generalisation', 'bias-variance', 'regularisation'],
      attach: (push) => {
        push((resource) => resource.group === 'Session 3', 5)
        push((resource) => /evaluation/i.test(resource.title), 2)
      },
    },
    {
      session: 's4',
      keywords: ['lab 4', 'classification', 'classifier', 'confusion', 'precision', 'recall', 'f1'],
      attach: (push) => {
        push((resource) => resource.group === 'Session 4', 5)
        push((resource) => /hyperparameter/i.test(resource.title), 1)
      },
    },
    {
      session: 's5',
      keywords: ['lab 5', 'ensemble', 'random forest', 'boosting', 'bagging'],
      attach: (push) => {
        push((resource) => resource.group === 'Session 5', 5)
        push((resource) => /ensemble|pitfalls/i.test(resource.title), 3)
      },
    },
  ]

  const titleSession = card.title.toLowerCase().match(/\bs([1-5])\b/)?.[1]
  for (const rule of SESSION_RULES) {
    const applies = titleSession
      ? rule.session === `s${titleSession}`
      : includesAny(text, rule.keywords)
    if (!applies) continue
    rule.attach((predicate, limit) => pushMatches(ids, resources, predicate, limit))
  }
  if (includesAny(text, ['project', 'ashrae', 'pipeline', 'report', 'feature importance'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Project' || resource.group === 'Project figures', 6)
  }
  if (includesAny(text, ['python', 'pandas', 'numpy', 'notebook syntax'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Python support', 5)
  }
  if (includesAny(text, ['mock', 'open-book', 'navigation', 'lookup'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Weekly maps', 5)
  }

  return uniqueLimited(ids)
}

// The two R tutorials the Time Series lecturer set as Lecture 1 homework belong to
// exactly one card — the R-skeleton banking card. Listing the card explicitly (rather
// than matching on "r" or "code", which appear all over this module) keeps them off
// the other 37 cards and keeps their studied-progress meaningful.
const TIME_SERIES_VIDEO_CARDS = {
  'card-077': ['ts-video-r-intro-tutorial', 'ts-video-r-tutorial-intro'],
}

function timeSeriesLinks(card, resources, text) {
  const ids = []
  // Each pack owns its lectures. `topics` are only consulted for a card whose title
  // carries no "Pack X" marker — a card titled "TS Pack C" must not pull Pack B just
  // because its text mentions "covariance", and "TS Pack D — … AR covariance" was
  // doing exactly that.
  const packMap = [
    { pack: 'pack a', lectures: [1, 2], topics: ['smoothing', 'holt-winters', 'decomposition'] },
    { pack: 'pack b', lectures: [3, 4], topics: ['stationarity', 'wss', 'covariance'] },
    { pack: 'pack c', lectures: [5, 6, 7], topics: ['spectral', 'blup', 'periodogram'] },
    { pack: 'pack d', lectures: [8, 9, 10], topics: ['arma', 'causality', 'invertibility', 'backshift'] },
    { pack: 'pack e', lectures: [11, 12, 13], topics: ['yule-walker', 'arima', 'sarima', 'forecast'] },
    { pack: 'pack f', lectures: [14, 15], topics: ['real data', 'aic', 'ssa'] },
  ]

  const titlePack = card.title.toLowerCase().match(/pack ([a-f])\b/)?.[1]

  for (const { pack, lectures, topics } of packMap) {
    const applies = titlePack
      ? pack === `pack ${titlePack}`
      : includesAny(text, [pack, ...topics, ...lectures.flatMap((n) => [`l${n}`, `lecture ${n}`])])
    if (!applies) continue

    pushMatches(ids, resources, (resource) => resource.group === 'Study packs' && resource.title.toLowerCase().includes(pack), 1)
    pushMatches(
      ids,
      resources,
      (resource) =>
        ['Lecture notes', 'Lecture notes with gaps', 'Exam-like exercises', 'Exam-like solutions'].includes(resource.group) &&
        // Token-boundary match: a plain substring test made "lecture 1" match
        // "Lecture 14"/"Lecture 15", so Pack A cards were served Pack F's lectures.
        lectures.some((n) => includesAny(resource.title.toLowerCase(), [`lecture ${n}`, `l${n}`])),
      6,
    )
  }

  if (includesAny(text, ['formula', 'definition', 'r code', 'question bank', 'template'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Quick reference', 5)
  }
  if (includesAny(text, ['past-paper', 'past paper', 'mock', 'timed paper'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Past papers', 8)
  }
  // Topic catch-all, only for cards that are not already pinned to a pack by title.
  // Without this guard a Pack B card mentioning "ARMA" in passing was served the
  // whole of Pack D and Pack E ahead of its own L3-L4 material.
  if (!titlePack && includesAny(text, ['arma', 'forecast', 'invertibility', 'causality'])) {
    pushMatches(ids, resources, (resource) => /Pack D|Pack E|ARMA|forecast/i.test(resource.title), 5)
  }

  // Appended last: the R videos are optional support and must not head the list
  // ahead of the exam material this card is actually built on.
  ids.push(...(TIME_SERIES_VIDEO_CARDS[card.id] ?? []))

  return uniqueLimited(ids)
}

function mat700Links(card, resources, text) {
  const ids = []

  // Lectures this card actually covers, read from its title ("MAT700 — L5–L6 cluster").
  const titleLectures = [...card.title.toLowerCase().matchAll(/\bl(\d+)\b/g)]
    .map((match) => Number(match[1]))
    .filter((lecture) => lecture >= 1 && lecture <= 7)

  const isLectureResource = (resource) =>
    ['Lecture slides', 'Lecture notes', 'Question banks'].includes(resource.group)

  const matchesLecture = (resource, lecture) =>
    includesAny(resource.title.toLowerCase(), [`lecture ${lecture}`])

  // Lecture-specific material goes FIRST so the card leads with its own lectures.
  // Previously the generic "formula/question bank" rule ran first with a limit of 6,
  // so every lecture-cluster card opened with the Lecture 1-3 question banks and its
  // own lectures were pushed down or off the list entirely — the L5-L6 card showed
  // L1, L2 and L3 banks and no L5 or L6.
  const lectures = titleLectures.length
    ? titleLectures
    : Array.from({ length: 7 }, (_, index) => index + 1).filter((lecture) =>
        includesAny(text, [`l${lecture}`, `lecture ${lecture}`]),
      )

  for (const lecture of lectures) {
    pushMatches(ids, resources, (resource) => isLectureResource(resource) && matchesLecture(resource, lecture), 5)
  }

  if (includesAny(text, ['formula', 'tf-idf', 'idf', 'pagerank', 'clustering', 'similarity', 'softmax', 'boost', 'adaboost'])) {
    // Formula sheets are genuinely whole-module reference. Question banks are not —
    // when the card names its lectures they are already attached above, so an
    // unscoped sweep here would re-add other lectures' banks.
    pushMatches(ids, resources, (resource) => resource.group === 'Formula sheets', 4)
    if (!lectures.length) {
      pushMatches(ids, resources, (resource) => resource.group === 'Question banks', 4)
    }
  }
  if (includesAny(text, ['tutorial', 'worked problem', 'solved problem'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Tutorials', 8)
  }
  if (includesAny(text, ['past paper', 'mock', 'timed'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Past papers', 5)
  }
  if (includesAny(text, ['mnist', 'neural', 'image'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Images' || /mnist|neuron/i.test(resource.title), 4)
  }

  return uniqueLimited(ids)
}

function teamProjectLinks(card, resources, text) {
  const ids = []

  if (includesAny(text, ['2 jul', '2 july', 'missed', 'catch up', 'assessment expectations', 'project selections'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Transcripts' && /2 Jul/i.test(resource.title), 4)
    pushMatches(ids, resources, (resource) => resource.group === 'Module admin' || resource.group === 'Assessment', 4)
  }
  if (includesAny(text, ['gitlab', 'git lab', 'issue', 'milestone', 'merge request', 'branch', 'review', 'repo'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Session 2' || /GitLab/i.test(resource.title), 6)
    pushMatches(ids, resources, (resource) => resource.group === 'Transcripts' && /GitLab|Student Futures/i.test(resource.title), 2)
  }
  if (includesAny(text, ['e-voting', 'evoting', 'voting', 'd\'hondt', 'dhondt', 'constituency', 'parties'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Practice' || /e-voting|D'Hondt|GitLab/i.test(resource.description), 5)
    pushMatches(ids, resources, (resource) => resource.group === 'Transcripts' && /GitLab|Teamwork/i.test(resource.title), 2)
  }
  if (includesAny(text, ['spidr', 'small issue', 'small increment', 'slice', 'user story'])) {
    pushMatches(ids, resources, (resource) => /SPIDR|story/i.test(resource.title), 2)
  }

  return uniqueLimited(ids)
}

export function attachCardResourceLinks(cards, modules) {
  return cards.map((card) => {
    const module = moduleForCard(card, modules)
    if (!module) return card

    const text = textFor(card)
    let resourceIds = []
    if (module.id === 'aml') resourceIds = amlLinks(card, module.resources, text)
    if (module.id === 'time-series') resourceIds = timeSeriesLinks(card, module.resources, text)
    if (module.id === 'team-project') resourceIds = teamProjectLinks(card, module.resources, text)
    if (module.id === 'mat700') resourceIds = mat700Links(card, module.resources, text)

    // Keyword-matched course material (labs, slides, past papers) comes first: it is
    // Tier 1 and should head the list in the UI. Per-card videos, already on the card
    // from the study plan, follow. The cap is generous enough that a card carrying
    // several videos cannot push its own lab out of the list — the previous limit of
    // 12 applied to the combined list and could do exactly that.
    resourceIds = uniqueLimited([...resourceIds, ...(card.resourceIds ?? [])], 24)

    if (resourceIds.length === 0) return card
    return {
      ...card,
      resourceIds,
    }
  })
}
