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

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term))
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

function amlLinks(card, resources, text) {
  const ids = []

  pushMatches(ids, resources, (resource) => resource.group === 'Video lectures', 3)

  if (includesAny(text, ['s1', 'lab 1', 'workflow', 'supervised', 'unsupervised'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Session 1' || /lab 1/i.test(resource.title), 8)
    pushMatches(ids, resources, (resource) => resource.group === 'Study notes' && /lab 1/i.test(resource.title), 2)
  }
  if (includesAny(text, ['s2', 'lab 2', 'preprocess', 'titanic', 'crx', 'encoding', 'scaling', 'leakage'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Session 2', 5)
    pushMatches(ids, resources, (resource) => /preprocessing/i.test(resource.title), 2)
  }
  if (includesAny(text, ['s3', 'lab 3', 'regression', 'generalisation', 'evaluation', 'bias-variance', 'regularisation'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Session 3', 5)
    pushMatches(ids, resources, (resource) => /evaluation/i.test(resource.title), 2)
  }
  if (includesAny(text, ['s4', 'lab 4', 'classification', 'classifier', 'confusion', 'precision', 'recall', 'f1'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Session 4', 5)
    pushMatches(ids, resources, (resource) => /hyperparameter/i.test(resource.title), 1)
  }
  if (includesAny(text, ['s5', 'lab 5', 'ensemble', 'random forest', 'boosting', 'bagging'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Session 5', 5)
    pushMatches(ids, resources, (resource) => /ensemble|pitfalls/i.test(resource.title), 3)
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

function timeSeriesLinks(card, resources, text) {
  const ids = []
  const packMap = [
    ['pack a', ['pack a', 'lecture 1', 'lecture 2', 'l1', 'l2']],
    ['pack b', ['pack b', 'lecture 3', 'lecture 4', 'l3', 'l4', 'stationarity', 'wss', 'covariance']],
    ['pack c', ['pack c', 'lecture 5', 'lecture 6', 'lecture 7', 'l5', 'l6', 'l7', 'spectral', 'blup']],
    ['pack d', ['pack d', 'lecture 8', 'lecture 9', 'lecture 10', 'l8', 'l9', 'l10', 'arma', 'causality']],
    ['pack e', ['pack e', 'lecture 11', 'lecture 12', 'lecture 13', 'l11', 'l12', 'l13', 'forecast']],
    ['pack f', ['pack f', 'lecture 14', 'lecture 15', 'l14', 'l15', 'real data']],
  ]

  for (const [pack, terms] of packMap) {
    if (!includesAny(text, terms)) continue
    pushMatches(ids, resources, (resource) => resource.group === 'Study packs' && resource.title.toLowerCase().includes(pack), 1)
    const lectureNumbers = terms.filter((term) => /^l\d+/.test(term)).map((term) => term.replace('l', 'lecture '))
    pushMatches(
      ids,
      resources,
      (resource) =>
        ['Lecture notes', 'Lecture notes with gaps', 'Exam-like exercises', 'Exam-like solutions'].includes(resource.group) &&
        lectureNumbers.some((lecture) => resource.title.toLowerCase().includes(lecture)),
      6,
    )
  }

  if (includesAny(text, ['formula', 'definition', 'r code', 'question bank', 'template'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Quick reference', 5)
  }
  if (includesAny(text, ['past-paper', 'past paper', 'mock', 'timed paper'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Past papers', 8)
  }
  if (includesAny(text, ['arma', 'forecast', 'invertibility', 'causality'])) {
    pushMatches(ids, resources, (resource) => /Pack D|Pack E|ARMA|forecast/i.test(resource.title), 5)
  }

  return uniqueLimited(ids)
}

function mat700Links(card, resources, text) {
  const ids = []

  if (includesAny(text, ['formula', 'tf-idf', 'idf', 'pagerank', 'clustering', 'similarity', 'softmax', 'boost', 'adaboost'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Formula sheets' || resource.group === 'Question banks', 6)
  }
  if (includesAny(text, ['tutorial', 'worked problem', 'solved problem'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Tutorials', 8)
  }
  if (includesAny(text, ['past paper', 'mock', 'timed'])) {
    pushMatches(ids, resources, (resource) => resource.group === 'Past papers', 5)
  }
  for (let lecture = 1; lecture <= 7; lecture += 1) {
    if (!includesAny(text, [`l${lecture}`, `lecture ${lecture}`])) continue
    pushMatches(
      ids,
      resources,
      (resource) =>
        (resource.group === 'Lecture slides' || resource.group === 'Lecture notes' || resource.group === 'Question banks') &&
        resource.title.toLowerCase().includes(`lecture ${lecture}`),
      5,
    )
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

    resourceIds = uniqueLimited([...(card.resourceIds ?? []), ...resourceIds])

    if (resourceIds.length === 0) return card
    return {
      ...card,
      resourceIds,
    }
  })
}
