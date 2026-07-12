import { baseCards as legacyCards } from './baseCards.js'

export const CAMPAIGN_START = '2026-07-13'
export const READINESS_DEADLINE = '2026-08-16'
export const EXAM_WINDOW_START = '2026-08-17'
export const CAMPAIGN_END = '2026-08-28'

const PHASE_WINDOWS = {
  'Phase 2': [CAMPAIGN_START, '2026-07-31'],
  'Phase 3': ['2026-08-01', '2026-08-09'],
  'Phase 4': ['2026-08-10', READINESS_DEADLINE],
}

const AML_KEEP = new Set([
  1, 3, 5, 7, 8, 11, 14, 16, 17, 20, 22, 24, 26, 27, 33, 36, 39, 41, 46,
  51, 56, 59, 62, 65, 73, 76, 80,
  88, 91, 94, 98, 101, 106, 109, 115, 117,
])

const TIME_SERIES_KEEP = new Set([
  2, 6, 9, 10, 12, 15, 18, 21, 25, 28, 31, 34, 37, 40, 44, 47, 48,
  52, 55, 58, 63, 66, 68, 71, 74, 77, 81,
  89, 92, 95, 99, 102, 113, 116, 118,
])

const MODULE_SLOTS = {
  'Applied ML': 'AM / protected AML blocks',
  'Time Series': 'PM / protected Time Series blocks',
  MAT700: 'Protected MAT700 blocks',
}

function dateRange(start, end) {
  const values = []
  const cursor = new Date(`${start}T12:00:00`)
  const finish = new Date(`${end}T12:00:00`)
  while (cursor <= finish) {
    values.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 1)
  }
  return values
}

function cleanMat700Text(value) {
  return String(value ?? '')
    .replace(/\s*\(insurance\)/gi, '')
    .replace(/insurance lane/gi, 'active study lane')
    .replace(/insurance/gi, 'revision')
}

function statusForDate(date) {
  if (date <= CAMPAIGN_START) return 'Today'
  if (date <= '2026-07-19') return 'This Week'
  return 'Backlog'
}

function spreadCardsAcrossWindow(cards, start, end) {
  const dates = dateRange(start, end)
  const totalHours = cards.reduce((sum, card) => sum + Number(card.estimatedHours || 0), 0) || 1
  let completedHours = 0

  return cards.map((card) => {
    const hours = Number(card.estimatedHours || 0)
    const startRatio = completedHours / totalHours
    const endRatio = (completedHours + hours) / totalHours
    const startIndex = Math.min(dates.length - 1, Math.floor(startRatio * dates.length))
    const endIndex = Math.min(
      dates.length - 1,
      Math.max(startIndex, Math.ceil(endRatio * dates.length) - 1),
    )
    const startDate = dates[startIndex]
    const dueDate = dates[endIndex]
    completedHours += hours

    return {
      ...card,
      sourceList: '13 July rescue plan',
      status: statusForDate(dueDate),
      startDate,
      dueDate,
      dueDateTime: `${dueDate} 18:15`,
      slotLabel: `${MODULE_SLOTS[card.moduleGroup] ?? 'Protected study blocks'} · ${startDate}${startDate === dueDate ? '' : ` to ${dueDate}`} (${hours}h)`,
      tags: [...new Set([...(card.tags ?? []), '13-july-rescue'])],
    }
  })
}

function selectedLegacyExamCards() {
  const selected = legacyCards
    .filter((card) => {
      if (card.moduleGroup === 'Applied ML') return AML_KEEP.has(card.number)
      if (card.moduleGroup === 'Time Series') return TIME_SERIES_KEEP.has(card.number)
      return false
    })
    .map((card) => ({
      ...card,
      trackerNotes: [card.trackerNotes, 'Rebased from the 4 July plan after zero completed work was confirmed.']
        .filter(Boolean)
        .join(' '),
    }))

  // Normalise the inherited AML estimates to the 80 protected AML hours in
  // the actual timetable. Quarter-hour rounding keeps every card usable while
  // making the giant list genuinely fit its lane.
  const aml = selected.filter((card) => card.moduleGroup === 'Applied ML')
  const total = aml.reduce((sum, card) => sum + Number(card.estimatedHours || 0), 0) || 1
  let allocated = 0
  const fittedAml = aml.map((card, index) => {
    const estimatedHours = index === aml.length - 1
      ? Math.round((80 - allocated) * 4) / 4
      : Math.max(0.25, Math.round((Number(card.estimatedHours || 0) * 80 / total) * 4) / 4)
    allocated += estimatedHours
    return { ...card, estimatedHours }
  })

  return [
    ...fittedAml,
    ...selected.filter((card) => card.moduleGroup === 'Time Series'),
  ]
}

function makeCard({
  id,
  number,
  title,
  moduleGroup,
  phase,
  hours,
  description,
  checklist,
  evidence,
  done,
  priority = 'High',
  tags = [],
}) {
  return {
    id,
    number,
    sortOrder: number,
    title,
    module: moduleGroup,
    moduleGroup,
    phase,
    phaseId: phase.toLowerCase().replace(/\s+/g, '-'),
    sourceList: '13 July rescue plan',
    status: 'Backlog',
    priority,
    slotType: moduleGroup === 'MAT700' ? 'PM' : 'Flex',
    slotLabel: '',
    startDate: '',
    dueDate: '',
    dueDateTime: '',
    estimatedHours: hours,
    description,
    checklist,
    evidenceRequirement: evidence,
    doneCondition: done,
    trackerNotes: 'Created for the 13 July MAT700 recovery plan.',
    tags: [...new Set(tags)],
  }
}

const MAT700_LECTURES = Array.from({ length: 7 }, (_, index) => {
  const lecture = index + 1
  return makeCard({
    id: `mat700-rebuild-l${lecture}`,
    number: 301 + index,
    title: `MAT700 L${lecture} — rebuild concepts, formula sheet, and question-bank recall`,
    moduleGroup: 'MAT700',
    phase: 'Phase 2',
    hours: 2.5,
    priority: 'Critical',
    description: `Relearn Lecture ${lecture} from near-zero familiarity. Use the local study notes and question bank; the output must be usable without rereading the whole lecture.`,
    checklist: [
      `Targeted skim of Lecture ${lecture} notes/slides`,
      'Write the formulas, definitions, and one worked pattern from memory',
      'Answer the linked question-bank prompts before checking solutions',
      'Record every failed step in the MAT700 error log',
    ],
    evidence: `L${lecture} one-page sheet + checked question-bank attempt`,
    done: `Lecture ${lecture} can be recalled and one representative problem can be solved without copying`,
    tags: ['exam', 'recovery', `lecture-${lecture}`, 'critical-path'],
  })
})

const MAT700_TUTORIALS = Array.from({ length: 7 }, (_, index) => {
  const tutorial = index + 1
  return makeCard({
    id: `mat700-tutorial-${tutorial}`,
    number: 311 + index,
    title: `MAT700 Tutorial ${tutorial} — attempt, solution check, correction, repeat`,
    moduleGroup: 'MAT700',
    phase: 'Phase 2',
    hours: 2,
    priority: 'Critical',
    description: 'Tutorial problems are the centre of MAT700 revision. Slides support the attempt; they do not replace it.',
    checklist: [
      'Attempt the core questions without the solution open',
      'Check every line against the worked solution',
      'Redo incorrect questions immediately from a blank page',
      'Add 2–3 recall prompts and one error-log entry',
    ],
    evidence: `Tutorial ${tutorial} attempt + corrected redo`,
    done: 'Core questions are attempted, checked, corrected, and one failed question is successfully repeated',
    tags: ['exam', 'recovery', 'tutorial', 'worked-problems'],
  })
})

const MAT700_PHASE_3 = [
  ['mat700-template-a', 321, 'MAT700 timed templates — expected counts, TF-IDF, vectors, and Jaccard'],
  ['mat700-template-b', 322, 'MAT700 timed templates — graphs, distances, proofs, and kNN'],
  ['mat700-template-c', 323, 'MAT700 timed templates — Naive Bayes, PageRank, clustering, and k-means'],
  ['mat700-template-d', 324, 'MAT700 timed templates — softmax, metrics, experts, and boosting'],
].map(([id, number, title]) =>
  makeCard({
    id,
    number,
    title,
    moduleGroup: 'MAT700',
    phase: 'Phase 3',
    hours: 2,
    priority: 'Critical',
    description: 'Convert the rebuilt material into a repeatable exam answer under time pressure.',
    checklist: [
      'Write the procedure/formula from memory',
      'Complete at least two representative questions under time',
      'Mark strictly against the solution',
      'Repair the weakest template immediately',
    ],
    evidence: 'timed attempt + marked corrections + updated error log',
    done: 'the template can be started from memory and completed within the assigned time',
    tags: ['exam', 'recovery', 'timed', 'template'],
  }),
)

const MAT700_PHASE_4 = [
  makeCard({
    id: 'mat700-paper-a', number: 331, title: 'MAT700 full past paper A — timed and closed-book', moduleGroup: 'MAT700', phase: 'Phase 4', hours: 3,
    priority: 'Critical', description: 'Sit the strongest available recent paper under exam conditions, then mark it strictly.',
    checklist: ['Two-hour timed attempt', 'Mark every question', 'Calculate topic-level score', 'Rank the top three repair needs'],
    evidence: 'timed paper + score + ranked repair list', done: 'paper is completed, marked, and the next repair is unambiguous', tags: ['exam', 'recovery', 'past-paper'],
  }),
  makeCard({
    id: 'mat700-repair-a', number: 332, title: 'MAT700 weak-topic repair after paper A', moduleGroup: 'MAT700', phase: 'Phase 4', hours: 2,
    description: 'Repair only the failures exposed by paper A; no broad rereading.', checklist: ['Redo failed questions', 'Return to one targeted tutorial/lecture source', 'Repeat from blank', 'Update formula sheet'],
    evidence: 'corrected questions + error-log closure', done: 'the highest-value errors can be solved from a blank page', tags: ['exam', 'recovery', 'repair'],
  }),
  makeCard({
    id: 'mat700-paper-b', number: 333, title: 'MAT700 full past paper B — timed and closed-book', moduleGroup: 'MAT700', phase: 'Phase 4', hours: 3,
    priority: 'Critical', description: 'Second full simulation to prove the pass margin is repeatable.', checklist: ['Two-hour timed attempt', 'Mark strictly', 'Compare with paper A', 'Identify any repeated error'],
    evidence: 'timed paper + score comparison', done: 'a second marked paper shows a credible pass path', tags: ['exam', 'recovery', 'past-paper'],
  }),
  makeCard({
    id: 'mat700-repair-b', number: 334, title: 'MAT700 final weak-topic repair', moduleGroup: 'MAT700', phase: 'Phase 4', hours: 2,
    description: 'Close repeated errors only. Protect recall and confidence.', checklist: ['Fix repeated errors', 'Redo one question per weak template', 'Check formula recall', 'Stop adding new material'],
    evidence: 'final corrected set', done: 'no repeated high-value error remains unaddressed', tags: ['exam', 'recovery', 'repair'],
  }),
  makeCard({
    id: 'mat700-final-recall', number: 335, title: 'MAT700 final formula, procedure, and error-log sweep', moduleGroup: 'MAT700', phase: 'Phase 4', hours: 1.5,
    priority: 'Critical', description: 'Final retrieval pass before the exam window. Recall first; check second.', checklist: ['Write core formulas from memory', 'Recite procedure triggers', 'Review only unresolved error-log lines', 'Prepare exam materials'],
    evidence: 'final closed-book recall sheet', done: 'the high-yield sheet can be reproduced without notes', tags: ['exam', 'recovery', 'final-recall'],
  }),
]

const MAT700_DIAGNOSTIC = makeCard({
  id: 'mat700-foundation-reset',
  number: 300,
  title: 'MAT700 foundation reset — build the pass specification',
  moduleGroup: 'MAT700',
  phase: 'Phase 2',
  hours: 1,
  priority: 'Critical',
  description: 'Acknowledge the confirmed result, inventory the seven lectures/tutorials, and define the evidence needed for a safe pass. This is planning, not rumination.',
  checklist: [
    'Record the assessment scope and working target',
    'Inventory Lectures 1–7, tutorials, question banks, and past papers',
    'Create one MAT700 error log',
    'Write the pass rule: tutorials first, timed retrieval, strict marking',
  ],
  evidence: 'MAT700 study dashboard + empty error-log template',
  done: 'all resources and the pass workflow are ready for Lecture 1',
  tags: ['exam', 'recovery', 'admin', 'critical-path'],
})

const mat700Cards = [
  MAT700_DIAGNOSTIC,
  ...MAT700_LECTURES,
  ...MAT700_TUTORIALS,
  ...MAT700_PHASE_3,
  ...MAT700_PHASE_4,
]

function phaseSpread(cards) {
  return Object.entries(PHASE_WINDOWS).flatMap(([phase, [start, end]]) => {
    const phaseCards = cards.filter((card) => card.phase === phase)
    return ['Applied ML', 'Time Series', 'MAT700'].flatMap((moduleGroup) =>
      spreadCardsAcrossWindow(
        phaseCards
          .filter((card) => card.moduleGroup === moduleGroup)
          .sort((a, b) => a.sortOrder - b.sortOrder),
        start,
        end,
      ),
    )
  })
}

const examCards = phaseSpread([...selectedLegacyExamCards(), ...mat700Cards]).map((card) => {
  if (card.moduleGroup !== 'MAT700') return card
  return {
    ...card,
    title: cleanMat700Text(card.title),
    description: cleanMat700Text(card.description),
    trackerNotes: cleanMat700Text(card.trackerNotes),
    tags: [...new Set((card.tags ?? []).filter((tag) => tag !== 'insurance').concat('active-exam'))],
    priority: card.priority === 'Low' || card.priority === 'Medium' ? 'High' : card.priority,
  }
})

function datedCard({
  id,
  number,
  title,
  moduleGroup,
  phase,
  startDate,
  dueDate,
  hours,
  priority,
  description,
  checklist,
  evidence,
  done,
  tags,
  slotLabel,
}) {
  return {
    ...makeCard({ id, number, title, moduleGroup, phase, hours, priority, description, checklist, evidence, done, tags }),
    status: statusForDate(dueDate),
    startDate,
    dueDate,
    dueDateTime: `${dueDate} 21:00`,
    slotType: moduleGroup === 'Group Project' ? 'Fixed' : 'Flex',
    slotLabel,
  }
}

const projectChecklist = [
  'Choose the highest-risk current team bottleneck; do not invent new scope',
  'Use each non-class block roughly as 75m backend/integration + 30m coordination/MR review + 15m evidence log',
  'Update GitLab issue/milestone/next action and save contribution evidence',
  'If a teammate fails: reduce scope, document the risk, and escalate instead of silently absorbing unlimited work',
]

const projectCards = [
  datedCard({
    id: 'project-capacity-w1', number: 201, title: 'CMT501 protected capacity — 13–19 July', moduleGroup: 'Group Project', phase: 'Phase 2', startDate: '2026-07-13', dueDate: '2026-07-19', hours: 7, priority: 'High',
    description: 'Generic capacity for the waste-management project. Work on the current bottleneck only; detailed project management stays in GitLab/the project app.', checklist: projectChecklist,
    evidence: 'GitLab activity + short contribution/risk note', done: 'the week’s protected blocks were used or deliberately released to exam study', tags: ['project', 'capacity', 'gitlab'], slotLabel: 'Mon 2h + Thu class 3h + Sat 2h',
  }),
  datedCard({
    id: 'project-capacity-w2', number: 202, title: 'CMT501 protected capacity — 20–26 July', moduleGroup: 'Group Project', phase: 'Phase 2', startDate: '2026-07-20', dueDate: '2026-07-26', hours: 7, priority: 'High',
    description: 'Continue backend/integration leadership and coordination without allowing CMT501 to consume the exam plan.', checklist: projectChecklist,
    evidence: 'GitLab activity + contribution/risk note', done: 'current integration risk has an owner and next action', tags: ['project', 'capacity', 'gitlab'], slotLabel: 'Mon 2h + Thu class 3h + Sat 2h',
  }),
  datedCard({
    id: 'project-internal-cutoff', number: 203, title: 'CMT501 integration surge — internal handoff by 2 August', moduleGroup: 'Group Project', phase: 'Phase 2', startDate: '2026-07-27', dueDate: '2026-08-02', hours: 12, priority: 'Critical',
    description: 'Protected surge toward the team’s 2 August internal deadline. Stabilise one integrated product on main; stop adding scope.', checklist: [...projectChecklist, 'Confirm backend, ML, database, frontend, and Docker integration path', 'Confirm a 20-minute demonstration plan and recording owner'],
    evidence: 'integrated-main evidence + demo readiness/risk note', done: 'the team has a runnable integration path and a bounded list for final submission', tags: ['project', 'deadline', 'integration'], slotLabel: 'Mon/Wed/Sat/Sun 2h blocks + Thu class 4h',
  }),
  datedCard({
    id: 'project-submit', number: 204, title: 'CMT501 finalisation and 20-minute team video — submit by 6 August', moduleGroup: 'Group Project', phase: 'Phase 3', startDate: '2026-08-03', dueDate: '2026-08-06', hours: 8, priority: 'Critical',
    description: 'Only integration, QA, recording, coversheet, and submission work. The team video is nominally 20 minutes and worth 60%.', checklist: ['Freeze scope', 'Run integrated demo from main', 'Verify claims against working functionality', 'Record/review 20-minute video', 'Submit required files and preserve confirmation'],
    evidence: 'final video + coversheet + submission confirmation + contribution record', done: 'team submission is confirmed before the real deadline', tags: ['project', 'deadline', 'submission', 'fixed'], slotLabel: 'Mon/Wed protected blocks + Thu 10:00–14:00 class/submission window',
  }),
  datedCard({
    id: 'project-evidence-reserve', number: 205, title: 'CMT501 post-submit evidence/report reserve', moduleGroup: 'Group Project', phase: 'Phase 4', startDate: '2026-08-08', dueDate: '2026-08-12', hours: 3, priority: 'High',
    description: 'Small protected reserve for contribution evidence and the individual 1,500-word report lane. Release unused time to the three exams.', checklist: ['Save issues/MRs/reviews/decisions/testing evidence', 'Update contribution log', 'Capture report points: 400/700/400 word structure', 'Record the official report deadline when confirmed'],
    evidence: 'organised evidence folder + report outline/deadline note', done: 'evidence is safe and any remaining report action is explicit', tags: ['project', 'evidence', 'report', 'flex'], slotLabel: 'Sat 8 Aug 1.5h + Wed 12 Aug 1.5h; release if closed',
  }),
]

const jobScanDates = ['2026-07-14', '2026-07-21', '2026-07-28', '2026-08-04', '2026-08-11']
const jobActionDates = ['2026-07-19', '2026-07-26', '2026-08-09', '2026-08-16']

const jobCards = [
  ...jobScanDates.map((date, index) => datedCard({
    id: `job-scan-${index + 1}`, number: 401 + index, title: `Job shortlist scan ${index + 1} — one decision-ready UK opportunity review`, moduleGroup: 'Job Hunt', phase: date < '2026-08-01' ? 'Phase 2' : date < '2026-08-10' ? 'Phase 3' : 'Phase 4', startDate: date, dueDate: date, hours: 1.5, priority: 'Medium',
    description: 'Public sources only. Review no more than eight serious paid/flexible or 2027 leads and choose at most one urgent live action. This is a bounded lane, not an internet-search spiral.',
    checklist: ['Scan Track A and Track B using public sources', 'Keep no more than 8 serious items', 'Verify hours/pay/start/deadline/employee status', 'Choose at most one application/contact/registration action', 'Record the next deadline and suppress duplicates'],
    evidence: 'updated max-8 shortlist + one chosen/declined action', done: 'the shortlist is decision-ready and the 90-minute timer has stopped', tags: ['job-hunt', 'bounded', 'public-sources'], slotLabel: 'Tuesday 19:00–20:30',
  })),
  ...jobActionDates.map((date, index) => datedCard({
    id: `job-action-${index + 1}`, number: 411 + index, title: `Job action ${index + 1} — tailor one priority application or release the block`, moduleGroup: 'Job Hunt', phase: date < '2026-08-01' ? 'Phase 2' : date < '2026-08-10' ? 'Phase 3' : 'Phase 4', startDate: date, dueDate: date, hours: 2, priority: 'Medium',
    description: 'Act only when a verified serious lead exists. Otherwise return the block to exam repair or recovery; do not manufacture low-value applications.',
    checklist: ['Verify the official vacancy and closing date', 'Verify study/visa safety and employee status', 'Tailor CV emphasis and three evidence bullets', 'Submit/contact/register only after explicit review', 'Record action date and follow-up'],
    evidence: 'one reviewed application/contact/registration record, or a note releasing the block', done: 'one high-quality action is recorded or the block is intentionally returned', tags: ['job-hunt', 'application', 'bounded'], slotLabel: 'Sunday 18:30–20:30',
  })),
]

const adminCards = [
  datedCard({
    id: 'admin-summer-assessment-confirmation', number: 501, title: 'ADMIN — confirm summer assessment entry and information channels', moduleGroup: 'Admin', phase: 'Phase 2', startDate: '2026-07-13', dueDate: '2026-07-13', hours: 0.5, priority: 'Critical',
    description: 'The current notice confirms the summer assessment window but does not state whether any registration action is required. Send one concise confirmation to the COMSC School Office.',
    checklist: ['Ask whether any MAT700 summer-assessment registration action is required', 'Ask where the CMT307, MAT508, and MAT700 date/time/location will be published', 'Ask how the MAT700 summer assessment mark will be recorded', 'Record the answer in the app; do not start a broad complaint thread'],
    evidence: 'sent confirmation message + reply/action logged', done: 'entry/action requirements and publication channels are confirmed or formally chased', tags: ['admin', 'exam', 'date-watch'], slotLabel: 'Mon 13 Jul 20:15–20:45',
  }),
  ...['2026-07-20', '2026-07-27', '2026-08-03', '2026-08-10'].map((date, index) => datedCard({
    id: `admin-date-watch-${index + 1}`, number: 502 + index, title: `ADMIN — summer timetable watch ${index + 1}`, moduleGroup: 'Admin', phase: date < '2026-08-01' ? 'Phase 2' : date < '2026-08-10' ? 'Phase 3' : 'Phase 4', startDate: date, dueDate: date, hours: index === 2 ? 0.5 : 0.25, priority: 'Critical',
    description: index === 2 ? 'The Registry timetable should be available by the start of August. Treat this as the hard publication checkpoint.' : 'Check only the official channels for CMT307, MAT508, and MAT700 date/time/location changes.',
    checklist: ['Check SIMS/student intranet timetable', 'Check Learning Central announcements', 'Check Cardiff email/School notice', 'Enter confirmed module dates in app Settings immediately'],
    evidence: 'dated check and any confirmed date/location', done: 'official channels checked and settings updated if anything changed', tags: ['admin', 'date-watch', 'exam'], slotLabel: 'Monday 20:00–20:15',
  })),
  datedCard({
    id: 'admin-exam-logistics', number: 506, title: 'ADMIN — final exam logistics and materials lock', moduleGroup: 'Admin', phase: 'Phase 4', startDate: '2026-08-15', dueDate: '2026-08-15', hours: 1, priority: 'Critical',
    description: 'Lock confirmed dates, routes, permitted materials, IDs, calculator rules, and the order of post-exam recovery.',
    checklist: ['Confirm every date/time/location', 'Confirm AML open-book/no-internet requirements', 'Pack ID, stationery, calculator, water, and permitted AML materials', 'Plan travel arrival buffer', 'Write the next-exam-only warm-up order'],
    evidence: 'exam logistics sheet + packed materials checklist', done: 'no unresolved logistics remain before the exam window', tags: ['admin', 'exam', 'fixed', 'logistics'], slotLabel: 'Sat 15 Aug 20:00–21:00',
  }),
]

export const rescueCards = [...examCards, ...projectCards, ...jobCards, ...adminCards]
  .sort((a, b) => {
    const dateA = a.dueDate || a.startDate || '9999-12-31'
    const dateB = b.dueDate || b.startDate || '9999-12-31'
    if (dateA !== dateB) return dateA.localeCompare(dateB)
    return Number(a.sortOrder) - Number(b.sortOrder)
  })

export const campaignMeta = {
  title: 'Summer Rescue Campaign 2026',
  runway: `${CAMPAIGN_START} to ${CAMPAIGN_END}`,
  readinessDeadline: READINESS_DEADLINE,
  examWindowStart: EXAM_WINDOW_START,
  examWindowEnd: CAMPAIGN_END,
  generatedFrom: '13 July recovery rebase over the legacy Trello card catalogue',
  cardCount: rescueCards.length,
  projectInternalDeadline: '2026-08-02',
  projectSubmissionDeadline: '2026-08-06',
}

function rule({
  id,
  title,
  category,
  from = CAMPAIGN_START,
  to = CAMPAIGN_END,
  weekdays = [1, 2, 3, 4, 5, 6, 7],
  start,
  end,
  location = 'Home',
  moduleGroup = '',
  countsToward = [],
  protected: isProtected = false,
  notes = '',
}) {
  return { id, title, category, from, to, weekdays, start, end, location, moduleGroup, countsToward, protected: isProtected, checkable: false, notes }
}

function oneOff(id, date, start, end, title, category, options = {}) {
  const weekday = ((new Date(`${date}T12:00:00`).getDay() + 6) % 7) + 1
  return rule({ id, title, category, from: date, to: date, weekdays: [weekday], start, end, ...options })
}

const academic = (moduleGroup) => ({ moduleGroup, countsToward: ['academic'], protected: true })
const project = { moduleGroup: 'Group Project', countsToward: ['academic', 'project'], protected: true }

const coreRoutineRules = [
  rule({ id: 'sleep', title: 'Sleep', category: 'sleep', start: '23:00', end: '07:00', countsToward: ['sleep'], protected: true }),
  rule({ id: 'morning-reset', title: 'Wash, dress, and room reset', category: 'routine', start: '07:00', end: '08:00', protected: true }),
  rule({ id: 'breakfast', title: 'Make and eat breakfast', category: 'meal', start: '08:00', end: '08:30', protected: true }),
  rule({ id: 'wind-down', title: 'Prepare tomorrow and wind down — no social media', category: 'recovery', start: '22:00', end: '23:00', protected: true }),
  rule({ id: 'shower-tue', title: 'Shower, dry hair, and get ready', category: 'routine', weekdays: [2], start: '21:00', end: '22:00', protected: true }),
  rule({ id: 'shower-fri', title: 'Shower, dry hair, and get ready', category: 'routine', weekdays: [5], start: '20:30', end: '21:30', protected: true }),
  rule({ id: 'shower-sun', title: 'Shower, dry hair, and get ready', category: 'routine', weekdays: [7], start: '21:00', end: '22:00', protected: true }),
  rule({ id: 'mom-call', title: 'Short call with Mum', category: 'recovery', weekdays: [2], start: '20:30', end: '20:45' }),
  rule({ id: 'sister-call', title: 'Short family catch-up', category: 'recovery', weekdays: [5], start: '21:30', end: '22:00' }),
  rule({ id: 'friend-call', title: 'Weekly friend catch-up', category: 'recovery', weekdays: [7], start: '20:30', end: '21:00' }),
  rule({ id: 'laundry', title: 'Laundry load / collect', category: 'chores', weekdays: [3], start: '20:15', end: '20:30' }),
]

const weekdayStudyRules = [
  // Monday — library + protected project block through 3 August.
  rule({ id: 'mon-commute-out', title: 'Travel to library', category: 'commute', to: READINESS_DEADLINE, weekdays: [1], start: '08:30', end: '09:00', location: 'Transit' }),
  rule({ id: 'mon-aml-1', title: 'Applied ML queue — lab/video/output', category: 'study', to: READINESS_DEADLINE, weekdays: [1], start: '09:00', end: '11:00', location: 'Library', ...academic('Applied ML') }),
  rule({ id: 'mon-break-1', title: 'Break', category: 'recovery', to: READINESS_DEADLINE, weekdays: [1], start: '11:00', end: '11:15', location: 'Library' }),
  rule({ id: 'mon-aml-2', title: 'Applied ML queue — continue current card', category: 'study', to: READINESS_DEADLINE, weekdays: [1], start: '11:15', end: '13:15', location: 'Library', ...academic('Applied ML') }),
  rule({ id: 'mon-lunch', title: 'Make/eat packed lunch', category: 'meal', to: READINESS_DEADLINE, weekdays: [1], start: '13:15', end: '13:45', location: 'Library', protected: true }),
  rule({ id: 'mon-ts', title: 'Time Series queue — worked problems', category: 'study', to: READINESS_DEADLINE, weekdays: [1], start: '13:45', end: '15:45', location: 'Library', ...academic('Time Series') }),
  rule({ id: 'mon-break-2', title: 'Walk / reset', category: 'recovery', to: READINESS_DEADLINE, weekdays: [1], start: '15:45', end: '16:15', location: 'Outside' }),
  rule({ id: 'mon-project', title: 'CMT501 protected block — current bottleneck only', category: 'project', to: '2026-08-03', weekdays: [1], start: '16:15', end: '18:15', location: 'Library', ...project }),
  rule({ id: 'mon-final-aml', title: 'Applied ML final-drill queue', category: 'study', from: '2026-08-10', to: READINESS_DEADLINE, weekdays: [1], start: '16:15', end: '18:15', location: 'Library', ...academic('Applied ML') }),
  rule({ id: 'mon-commute-home', title: 'Travel home', category: 'commute', to: READINESS_DEADLINE, weekdays: [1], start: '18:15', end: '18:45', location: 'Transit' }),
  rule({ id: 'mon-dinner', title: 'Make and eat dinner', category: 'meal', to: READINESS_DEADLINE, weekdays: [1], start: '18:45', end: '19:15', protected: true }),

  // Tuesday — home study, walk, job scan, shower.
  rule({ id: 'tue-ts-1', title: 'Time Series queue — concepts and examples', category: 'study', to: READINESS_DEADLINE, weekdays: [2], start: '08:30', end: '10:30', ...academic('Time Series') }),
  rule({ id: 'tue-break-1', title: 'Break', category: 'recovery', to: READINESS_DEADLINE, weekdays: [2], start: '10:30', end: '10:45' }),
  rule({ id: 'tue-ts-2', title: 'Time Series queue — continue current card', category: 'study', to: READINESS_DEADLINE, weekdays: [2], start: '10:45', end: '12:45', ...academic('Time Series') }),
  rule({ id: 'tue-lunch', title: 'Make and eat lunch', category: 'meal', to: READINESS_DEADLINE, weekdays: [2], start: '12:45', end: '13:15', protected: true }),
  rule({ id: 'tue-mat', title: 'MAT700 study queue — tutorial-first', category: 'study', to: READINESS_DEADLINE, weekdays: [2], start: '13:15', end: '15:15', ...academic('MAT700') }),
  rule({ id: 'tue-walk', title: 'Outside walk', category: 'recovery', to: READINESS_DEADLINE, weekdays: [2], start: '15:15', end: '15:45', location: 'Outside', protected: true }),
  rule({ id: 'tue-aml', title: 'Applied ML queue — active recall/output', category: 'study', to: READINESS_DEADLINE, weekdays: [2], start: '15:45', end: '17:45', ...academic('Applied ML') }),
  rule({ id: 'tue-dinner', title: 'Make and eat dinner', category: 'meal', to: READINESS_DEADLINE, weekdays: [2], start: '18:30', end: '19:00', protected: true }),
  rule({ id: 'tue-job', title: 'Job shortlist scan — stop at 90 minutes', category: 'job', to: '2026-08-11', weekdays: [2], start: '19:00', end: '20:30', moduleGroup: 'Job Hunt', countsToward: ['job'], protected: true }),

  // Wednesday — library; late block is date-specific below.
  rule({ id: 'wed-commute-out', title: 'Travel to library', category: 'commute', to: READINESS_DEADLINE, weekdays: [3], start: '08:30', end: '09:00', location: 'Transit' }),
  rule({ id: 'wed-aml', title: 'Applied ML queue', category: 'study', to: READINESS_DEADLINE, weekdays: [3], start: '09:00', end: '11:00', location: 'Library', ...academic('Applied ML') }),
  rule({ id: 'wed-break-1', title: 'Break', category: 'recovery', to: READINESS_DEADLINE, weekdays: [3], start: '11:00', end: '11:15', location: 'Library' }),
  rule({ id: 'wed-ts', title: 'Time Series queue', category: 'study', to: READINESS_DEADLINE, weekdays: [3], start: '11:15', end: '13:15', location: 'Library', ...academic('Time Series') }),
  rule({ id: 'wed-lunch', title: 'Make/eat packed lunch', category: 'meal', to: READINESS_DEADLINE, weekdays: [3], start: '13:15', end: '13:45', location: 'Library', protected: true }),
  rule({ id: 'wed-mat', title: 'MAT700 study queue', category: 'study', to: READINESS_DEADLINE, weekdays: [3], start: '13:45', end: '15:45', location: 'Library', ...academic('MAT700') }),
  rule({ id: 'wed-break-2', title: 'Walk / reset', category: 'recovery', to: READINESS_DEADLINE, weekdays: [3], start: '15:45', end: '16:15', location: 'Outside' }),
  rule({ id: 'wed-commute-home', title: 'Travel home', category: 'commute', to: READINESS_DEADLINE, weekdays: [3], start: '18:15', end: '18:45', location: 'Transit' }),
  rule({ id: 'wed-dinner', title: 'Make and eat dinner', category: 'meal', to: READINESS_DEADLINE, weekdays: [3], start: '18:45', end: '19:15', protected: true }),

  // Friday — home study, walk, shower.
  rule({ id: 'fri-ts-1', title: 'Time Series queue', category: 'study', to: READINESS_DEADLINE, weekdays: [5], start: '08:30', end: '10:30', ...academic('Time Series') }),
  rule({ id: 'fri-break-1', title: 'Break', category: 'recovery', to: READINESS_DEADLINE, weekdays: [5], start: '10:30', end: '10:45' }),
  rule({ id: 'fri-aml', title: 'Applied ML queue', category: 'study', to: READINESS_DEADLINE, weekdays: [5], start: '10:45', end: '12:45', ...academic('Applied ML') }),
  rule({ id: 'fri-lunch', title: 'Make and eat lunch', category: 'meal', to: READINESS_DEADLINE, weekdays: [5], start: '12:45', end: '13:15', protected: true }),
  rule({ id: 'fri-mat', title: 'MAT700 study queue', category: 'study', to: READINESS_DEADLINE, weekdays: [5], start: '13:15', end: '15:15', ...academic('MAT700') }),
  rule({ id: 'fri-walk', title: 'Outside walk', category: 'recovery', to: READINESS_DEADLINE, weekdays: [5], start: '15:15', end: '15:45', location: 'Outside', protected: true }),
  rule({ id: 'fri-ts-2', title: 'Time Series queue — timed output', category: 'study', to: READINESS_DEADLINE, weekdays: [5], start: '15:45', end: '17:45', ...academic('Time Series') }),
  rule({ id: 'fri-dinner', title: 'Make and eat dinner', category: 'meal', to: READINESS_DEADLINE, weekdays: [5], start: '18:30', end: '19:00', protected: true }),

  // Saturday — library + grocery; late academic block is date-specific.
  rule({ id: 'sat-commute-out', title: 'Travel to library', category: 'commute', to: READINESS_DEADLINE, weekdays: [6], start: '08:30', end: '09:00', location: 'Transit' }),
  rule({ id: 'sat-aml', title: 'Applied ML queue', category: 'study', to: READINESS_DEADLINE, weekdays: [6], start: '09:00', end: '11:00', location: 'Library', ...academic('Applied ML') }),
  rule({ id: 'sat-break-1', title: 'Break', category: 'recovery', to: READINESS_DEADLINE, weekdays: [6], start: '11:00', end: '11:15', location: 'Library' }),
  rule({ id: 'sat-ts', title: 'Time Series queue', category: 'study', to: READINESS_DEADLINE, weekdays: [6], start: '11:15', end: '13:15', location: 'Library', ...academic('Time Series') }),
  rule({ id: 'sat-lunch', title: 'Make/eat packed lunch', category: 'meal', to: READINESS_DEADLINE, weekdays: [6], start: '13:15', end: '13:45', location: 'Library', protected: true }),
  rule({ id: 'sat-mat', title: 'MAT700 study queue', category: 'study', to: READINESS_DEADLINE, weekdays: [6], start: '13:45', end: '15:45', location: 'Library', ...academic('MAT700') }),
  rule({ id: 'sat-break-2', title: 'Walk / reset', category: 'recovery', to: READINESS_DEADLINE, weekdays: [6], start: '15:45', end: '16:15', location: 'Outside' }),
  rule({ id: 'sat-commute-home', title: 'Travel home', category: 'commute', to: READINESS_DEADLINE, weekdays: [6], start: '18:15', end: '18:45', location: 'Transit' }),
  rule({ id: 'sat-dinner', title: 'Make and eat dinner', category: 'meal', to: READINESS_DEADLINE, weekdays: [6], start: '18:45', end: '19:15', protected: true }),
  rule({ id: 'sat-grocery', title: 'Weekly grocery shop', category: 'chores', to: READINESS_DEADLINE, weekdays: [6], start: '19:15', end: '20:45', location: 'Shops', protected: true }),

  // Sunday — home study, outside walk, optional high-quality job action.
  rule({ id: 'sun-ts', title: 'Time Series queue', category: 'study', to: READINESS_DEADLINE, weekdays: [7], start: '08:30', end: '10:30', ...academic('Time Series') }),
  rule({ id: 'sun-break-1', title: 'Break', category: 'recovery', to: READINESS_DEADLINE, weekdays: [7], start: '10:30', end: '10:45' }),
  rule({ id: 'sun-mat', title: 'MAT700 study queue', category: 'study', to: READINESS_DEADLINE, weekdays: [7], start: '10:45', end: '12:45', ...academic('MAT700') }),
  rule({ id: 'sun-lunch', title: 'Make and eat lunch', category: 'meal', to: READINESS_DEADLINE, weekdays: [7], start: '12:45', end: '13:15', protected: true }),
  rule({ id: 'sun-aml', title: 'Applied ML queue', category: 'study', to: READINESS_DEADLINE, weekdays: [7], start: '13:15', end: '15:15', ...academic('Applied ML') }),
  rule({ id: 'sun-walk', title: 'Outside walk', category: 'recovery', to: READINESS_DEADLINE, weekdays: [7], start: '15:15', end: '15:45', location: 'Outside', protected: true }),
  rule({ id: 'sun-dinner', title: 'Make and eat dinner', category: 'meal', to: READINESS_DEADLINE, weekdays: [7], start: '18:00', end: '18:30', protected: true }),
]

const oneOffStudyRules = [
  // Wednesdays: either exam queue or explicit project capacity.
  oneOff('wed-late-0715', '2026-07-15', '16:15', '18:15', 'Applied ML queue — continue current card', 'study', { location: 'Library', ...academic('Applied ML') }),
  oneOff('wed-late-0722', '2026-07-22', '16:15', '18:15', 'Time Series queue — continue current card', 'study', { location: 'Library', ...academic('Time Series') }),
  oneOff('wed-project-0729', '2026-07-29', '16:15', '18:15', 'CMT501 protected integration block', 'project', { location: 'Library', ...project }),
  oneOff('wed-project-0805', '2026-08-05', '16:15', '18:15', 'CMT501 finalisation block — no new scope', 'project', { location: 'Library', ...project }),
  oneOff('wed-project-0812', '2026-08-12', '16:15', '17:45', 'CMT501 evidence/report reserve — release if closed', 'project', { location: 'Library', ...project }),
  oneOff('wed-buffer-0812', '2026-08-12', '17:45', '18:15', 'Protected buffer', 'recovery', { location: 'Library' }),

  // Confirmed TimeEdit classes and the remaining study blocks around them.
  ...['2026-07-16', '2026-07-23'].flatMap((date, index) => [
    oneOff(`thu-aml-${index}`, date, '08:30', '09:30', 'Applied ML queue', 'study', academic('Applied ML')),
    oneOff(`thu-out-${index}`, date, '09:30', '10:00', 'Travel to Abacws', 'commute', { location: 'Transit' }),
    oneOff(`thu-class-${index}`, date, '10:00', '13:00', 'CMT501 class — TimeEdit confirmed', 'class', { location: 'Abacws 3.38', ...project }),
    oneOff(`thu-lunch-${index}`, date, '13:00', '13:30', 'Make/eat packed lunch', 'meal', { location: 'Campus', protected: true }),
    oneOff(`thu-ts-${index}`, date, '13:30', '15:30', 'Time Series queue', 'study', { location: 'Library', ...academic('Time Series') }),
    oneOff(`thu-break-${index}`, date, '15:30', '15:45', 'Break', 'recovery', { location: 'Campus' }),
    oneOff(`thu-mat-${index}`, date, '15:45', '17:45', 'MAT700 study queue', 'study', { location: 'Library', ...academic('MAT700') }),
    oneOff(`thu-home-${index}`, date, '17:45', '18:15', 'Travel home', 'commute', { location: 'Transit' }),
    oneOff(`thu-dinner-${index}`, date, '18:15', '18:45', 'Make and eat dinner', 'meal', { protected: true }),
  ]),
  oneOff('thu-0730-aml', '2026-07-30', '08:30', '09:30', 'Applied ML queue', 'study', academic('Applied ML')),
  oneOff('thu-0730-out', '2026-07-30', '09:30', '10:00', 'Travel to Abacws', 'commute', { location: 'Transit' }),
  oneOff('thu-0730-class-a', '2026-07-30', '10:00', '13:00', 'CMT501 class — TimeEdit confirmed', 'class', { location: 'Abacws 3.38', ...project }),
  oneOff('thu-0730-lunch', '2026-07-30', '13:00', '14:00', 'Lunch and campus gap', 'meal', { location: 'Campus', protected: true }),
  oneOff('thu-0730-class-b', '2026-07-30', '14:00', '15:00', 'CMT501 class — TimeEdit confirmed', 'class', { location: 'Campus', ...project }),
  oneOff('thu-0730-ts', '2026-07-30', '15:15', '17:15', 'Time Series queue', 'study', { location: 'Library', ...academic('Time Series') }),
  oneOff('thu-0730-mat', '2026-07-30', '17:15', '18:15', 'MAT700 study queue', 'study', { location: 'Library', ...academic('MAT700') }),
  oneOff('thu-0730-home', '2026-07-30', '18:15', '18:45', 'Travel home', 'commute', { location: 'Transit' }),
  oneOff('thu-0730-dinner', '2026-07-30', '18:45', '19:15', 'Make and eat dinner', 'meal', { protected: true }),
  oneOff('thu-0806-aml', '2026-08-06', '08:30', '09:30', 'Applied ML queue', 'study', academic('Applied ML')),
  oneOff('thu-0806-out', '2026-08-06', '09:30', '10:00', 'Travel to Abacws', 'commute', { location: 'Transit' }),
  oneOff('thu-0806-class', '2026-08-06', '10:00', '14:00', 'CMT501 final class / submission window', 'class', { location: 'Abacws 3.38', ...project }),
  oneOff('thu-0806-lunch', '2026-08-06', '14:00', '14:30', 'Make/eat packed lunch', 'meal', { location: 'Campus', protected: true }),
  oneOff('thu-0806-ts', '2026-08-06', '14:30', '16:30', 'Time Series queue', 'study', { location: 'Library', ...academic('Time Series') }),
  oneOff('thu-0806-break', '2026-08-06', '16:30', '16:45', 'Break', 'recovery', { location: 'Campus' }),
  oneOff('thu-0806-mat', '2026-08-06', '16:45', '17:45', 'MAT700 study queue', 'study', { location: 'Library', ...academic('MAT700') }),
  oneOff('thu-0806-home', '2026-08-06', '17:45', '18:15', 'Travel home', 'commute', { location: 'Transit' }),
  oneOff('thu-0806-dinner', '2026-08-06', '18:15', '18:45', 'Make and eat dinner', 'meal', { protected: true }),
  // 13 August is a library final-drill day; no CMT501 teaching appears in TimeEdit.
  oneOff('thu-0813-out', '2026-08-13', '08:30', '09:00', 'Travel to library', 'commute', { location: 'Transit' }),
  oneOff('thu-0813-aml', '2026-08-13', '09:00', '11:00', 'Applied ML final-drill queue', 'study', { location: 'Library', ...academic('Applied ML') }),
  oneOff('thu-0813-break-a', '2026-08-13', '11:00', '11:15', 'Break', 'recovery', { location: 'Library' }),
  oneOff('thu-0813-ts-a', '2026-08-13', '11:15', '13:15', 'Time Series final-drill queue', 'study', { location: 'Library', ...academic('Time Series') }),
  oneOff('thu-0813-lunch', '2026-08-13', '13:15', '13:45', 'Make/eat packed lunch', 'meal', { location: 'Library', protected: true }),
  oneOff('thu-0813-mat', '2026-08-13', '13:45', '15:45', 'MAT700 final-drill queue', 'study', { location: 'Library', ...academic('MAT700') }),
  oneOff('thu-0813-break-b', '2026-08-13', '15:45', '16:15', 'Walk / reset', 'recovery', { location: 'Outside' }),
  oneOff('thu-0813-ts-b', '2026-08-13', '16:15', '18:15', 'Time Series final-drill queue', 'study', { location: 'Library', ...academic('Time Series') }),
  oneOff('thu-0813-home', '2026-08-13', '18:15', '18:45', 'Travel home', 'commute', { location: 'Transit' }),
  oneOff('thu-0813-dinner', '2026-08-13', '18:45', '19:15', 'Make and eat dinner', 'meal', { protected: true }),

  // Saturday and Sunday fourth blocks.
  ...['2026-07-18', '2026-07-25', '2026-08-01'].map((date, index) => oneOff(`sat-project-${index}`, date, '16:15', '18:15', 'CMT501 protected block — current bottleneck only', 'project', { location: 'Library', ...project })),
  oneOff('sat-project-0808', '2026-08-08', '16:15', '17:45', 'CMT501 evidence/report reserve — release if closed', 'project', { location: 'Library', ...project }),
  oneOff('sat-buffer-0808', '2026-08-08', '17:45', '18:15', 'Protected buffer', 'recovery', { location: 'Library' }),
  oneOff('sat-ts-0815', '2026-08-15', '16:15', '18:15', 'Time Series final-drill queue', 'study', { location: 'Library', ...academic('Time Series') }),
  oneOff('sun-project-0802', '2026-08-02', '15:45', '17:45', 'CMT501 internal-handoff block — freeze scope', 'project', project),

  // Sunday job actions replace the fourth academic block, leaving a real recovery buffer.
  // They are deliberately skipped on the 2 August project cutoff.
  ...jobActionDates.map((date, index) => oneOff(`sun-job-${index}`, date, '18:30', '20:30', 'Tailor one priority job application — or release the block', 'job', { moduleGroup: 'Job Hunt', countsToward: ['job'], protected: true })),
  oneOff('mat700-reset-block', '2026-07-13', '19:15', '20:15', 'MAT700 planning reset — build the pass specification', 'admin', { moduleGroup: 'MAT700', protected: true }),
  oneOff('admin-summer-assessment-confirmation-block', '2026-07-13', '20:15', '20:45', 'Confirm summer assessment entry and publication channels', 'admin', { moduleGroup: 'Admin', protected: true }),
  ...['2026-07-20', '2026-07-27', '2026-08-03', '2026-08-10'].map((date, index) =>
    oneOff(`admin-date-watch-block-${index}`, date, '20:00', index === 2 ? '20:30' : '20:15', 'Official summer assessment timetable watch', 'admin', { moduleGroup: 'Admin', protected: true }),
  ),
  oneOff('admin-logistics-block', '2026-08-15', '21:00', '22:00', 'Final exam logistics and materials lock', 'admin', { moduleGroup: 'Admin', protected: true }),
]

const examWindowRules = [
  rule({ id: 'exam-window-study-1', title: 'Next confirmed exam — targeted maintenance / warm-up', category: 'study', from: EXAM_WINDOW_START, to: CAMPAIGN_END, start: '08:30', end: '10:30', moduleGroup: 'Cross-module', countsToward: ['academic'], protected: true, notes: 'Generic placeholder until the exact exam time, location, travel, and recovery plan are confirmed.' }),
  rule({ id: 'exam-window-break-1', title: 'Break', category: 'recovery', from: EXAM_WINDOW_START, to: CAMPAIGN_END, start: '10:30', end: '10:45' }),
  rule({ id: 'exam-window-study-2', title: 'Next confirmed exam — past-paper/error-log work', category: 'study', from: EXAM_WINDOW_START, to: CAMPAIGN_END, start: '10:45', end: '12:45', moduleGroup: 'Cross-module', countsToward: ['academic'], protected: true }),
  rule({ id: 'exam-window-lunch', title: 'Make and eat lunch', category: 'meal', from: EXAM_WINDOW_START, to: CAMPAIGN_END, start: '12:45', end: '13:15', protected: true }),
  rule({ id: 'exam-window-study-3', title: 'Targeted maintenance or post-exam reset', category: 'study', from: EXAM_WINDOW_START, to: CAMPAIGN_END, start: '13:15', end: '15:15', moduleGroup: 'Cross-module', countsToward: ['academic'], protected: true }),
  rule({ id: 'exam-window-walk', title: 'Outside walk / nervous-system reset', category: 'recovery', from: EXAM_WINDOW_START, to: CAMPAIGN_END, start: '15:15', end: '15:45', location: 'Outside', protected: true }),
  rule({ id: 'exam-window-study-4', title: 'Light recall for the next exam only', category: 'study', from: EXAM_WINDOW_START, to: CAMPAIGN_END, start: '15:45', end: '17:15', moduleGroup: 'Cross-module', countsToward: ['academic'], protected: true }),
  rule({ id: 'exam-window-dinner', title: 'Make and eat dinner', category: 'meal', from: EXAM_WINDOW_START, to: CAMPAIGN_END, start: '18:30', end: '19:00', protected: true }),
]

export const scheduleRules = [...coreRoutineRules, ...weekdayStudyRules, ...oneOffStudyRules, ...examWindowRules]
export const scheduleExceptions = []

export const scheduleAssumptions = {
  sleep: '23:00–07:00 every day',
  academicCeiling: '8 protected hours/day; short breaks are outside those blocks',
  locations: 'Library/uni at least every other day; home days include an outside walk',
  project: 'Generic capacity only; detailed waste-project management stays elsewhere',
  jobs: 'One 90-minute scan plus at most one two-hour action most weeks before 17 August',
  fallback: 'If overloaded: protect sleep, fixed class/exam, today’s top exam card, then reduce project scope/job activity',
}
