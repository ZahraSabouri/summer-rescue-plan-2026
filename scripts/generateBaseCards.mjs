import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const campaignRoot = path.resolve(appRoot, '..')
const inputPath = path.join(campaignRoot, 'trello_import.csv')
const outputPath = path.join(appRoot, 'src', 'data', 'baseCards.js')

const STATUS = {
  backlog: 'Backlog',
  today: 'Today',
  thisWeek: 'This Week',
  deepWork: 'Deep Work',
  waiting: 'Waiting / Blocked',
  rescue: 'Rescue Lane',
  done: 'Done',
  admin: 'Admin Watch',
}

const moduleAliases = new Map([
  ['Applied Machine Learning', 'Applied ML'],
  ['Time Series', 'Time Series'],
  ['MAT700', 'MAT700'],
  ['Group Project', 'Group Project'],
  ['Admin', 'Admin'],
  ['Health/recovery', 'Health'],
])

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''))
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ''))
    rows.push(row)
  }

  return rows.filter((item) => item.some(Boolean))
}

function toRecords(rows) {
  const [headers, ...body] = rows
  return body.map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])),
  )
}

function stripListName(value) {
  return value.replace(/^[^\p{Letter}\p{Number}]+/u, '').trim()
}

function cleanDescription(rawDescription) {
  const slotMatch = rawDescription.match(/\[Slot:\s*(.*?);\s*Est\s*([\d.]+)h\]/)
  const evidenceMatch = rawDescription.match(/\bEvidence:\s*(.*?)\s+\bDone:/s)
  const doneMatch = rawDescription.match(/\bDone:\s*(.*)$/s)
  const description = rawDescription
    .replace(/\s*\[Slot:.*$/s, '')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    description,
    slotLabel: slotMatch?.[1]?.trim() ?? '',
    estimatedHours: Number(slotMatch?.[2] ?? 0),
    evidenceRequirement: evidenceMatch?.[1]?.trim() ?? '',
    doneCondition: doneMatch?.[1]?.trim() ?? '',
  }
}

function parseLabels(labelText) {
  const labels = labelText.split(';').map((label) => label.trim()).filter(Boolean)
  const phase = labels.find((label) => /^Phase \d+$/.test(label)) ?? 'Unphased'
  const priority =
    labels.find((label) => label.startsWith('Priority: '))?.replace('Priority: ', '') ?? 'Medium'
  const slotType =
    labels.find((label) => ['AM', 'PM', 'Light/Eve', 'Fixed', 'Flex'].includes(label)) ?? 'Flex'
  const modules = labels
    .filter((label) => moduleAliases.has(label))
    .map((label) => moduleAliases.get(label))

  return {
    labels,
    phase,
    phaseId: phase.toLowerCase().replace(/\s+/g, '-'),
    priority,
    slotType,
    module: modules.length > 1 ? modules.join(' / ') : modules[0] ?? 'General',
    moduleGroup: modules.length > 1 ? 'Cross-module' : modules[0] ?? 'General',
  }
}

function getInitialStatus(record, startDate) {
  const sourceList = stripListName(record.List)
  if (/waiting|blocked/i.test(sourceList)) return STATUS.waiting
  if (/rescue/i.test(sourceList)) return STATUS.rescue
  if (!startDate) return STATUS.waiting
  if (startDate <= '2026-07-10') return STATUS.thisWeek
  return STATUS.backlog
}

function deriveTags({ title, moduleGroup, slotType, status, description }) {
  const haystack = `${title} ${moduleGroup} ${slotType} ${status} ${description}`.toLowerCase()
  const tags = new Set()

  if (haystack.includes('rescue') || haystack.includes('buffer')) tags.add('rescue')
  if (moduleGroup === 'Admin' || haystack.includes('checkpoint') || haystack.includes('exam window')) {
    tags.add('admin')
  }
  if (moduleGroup === 'Group Project' || haystack.includes('project')) tags.add('project')
  if (moduleGroup === 'Health' || haystack.includes('sleep') || haystack.includes('rest')) tags.add('health')
  if (moduleGroup === 'MAT700' || haystack.includes('insurance')) tags.add('insurance')
  if (haystack.includes('date') || haystack.includes('sims') || haystack.includes('timetable')) {
    tags.add('date-watch')
  }
  if (slotType === 'Fixed') tags.add('fixed')
  if (haystack.includes('mock') || haystack.includes('past-paper') || haystack.includes('exam')) {
    tags.add('exam')
  }
  if (haystack.includes('evidence')) tags.add('evidence')

  return [...tags]
}

function parseCard(record) {
  const cardName = record['Card Name']
  const titleMatch = cardName.match(/^Card\s+(\d+)\s+—\s+(.+)$/)
  const number = titleMatch ? Number(titleMatch[1]) : 'W'
  const title = titleMatch?.[2]?.trim() ?? cardName.trim()
  const sortOrder = Number.isFinite(number) ? number : 999
  const startDate = record['Start Date'] || ''
  const dueDateTime = record['Due Date'] || ''
  const dueDate = dueDateTime.slice(0, 10)
  const labels = parseLabels(record.Labels)
  const details = cleanDescription(record.Description)
  const status = getInitialStatus(record, startDate)
  const checklist = record.Checklist
    ? record.Checklist.split(/\s+\|\s+/).map((item) => item.trim()).filter(Boolean)
    : []

  return {
    id: Number.isFinite(number) ? `card-${String(number).padStart(3, '0')}` : 'weekly-date-watch',
    number,
    sortOrder,
    title,
    module: labels.module,
    moduleGroup: labels.moduleGroup,
    phase: labels.phase,
    phaseId: labels.phaseId,
    sourceList: stripListName(record.List),
    status,
    priority: labels.priority,
    slotType: labels.slotType,
    slotLabel: details.slotLabel,
    startDate,
    dueDate,
    dueDateTime,
    estimatedHours: details.estimatedHours,
    description: details.description,
    checklist,
    evidenceRequirement: details.evidenceRequirement,
    doneCondition: details.doneCondition,
    trackerNotes: '',
    tags: deriveTags({
      title,
      moduleGroup: labels.moduleGroup,
      slotType: labels.slotType,
      status,
      description: details.description,
    }),
  }
}

function buildAdminWatchCard() {
  return {
    id: 'weekly-date-watch',
    number: 'W',
    sortOrder: 999,
    title: 'Weekly admin/date-watch',
    module: 'Admin',
    moduleGroup: 'Admin',
    phase: 'Admin Watch',
    phaseId: 'admin-watch',
    sourceList: 'Recurring Weekly Watch',
    status: STATUS.admin,
    priority: 'Critical',
    slotType: 'Fixed',
    slotLabel: 'Weekly Monday check, ~30 min',
    startDate: '',
    dueDate: '',
    dueDateTime: '',
    estimatedHours: 0.5,
    description:
      'Recurring weekly watch for confirmed assessment dates, SIMS MAT700 result, submission windows, and logistics changes. Keep this as a planning control card, not a private records store.',
    checklist: [
      'Check SIMS / official assessment pages for confirmed results and dates',
      'Update exam dates, project deadlines, and travel/logistics notes',
      'Move any date-dependent cards from Waiting / Blocked when confirmed',
      'Export a tracker backup after major date changes',
    ],
    evidenceRequirement: 'date-watch note or calendar update summary',
    doneCondition: 'dates/results checked and any plan changes reflected in the tracker',
    trackerNotes: 'Do not paste private records or raw documents here; store only sanitized planning notes.',
    tags: ['admin', 'date-watch', 'fixed'],
  }
}

const text = fs.readFileSync(inputPath, 'utf8')
const baseCards = toRecords(parseCsv(text)).map(parseCard)
if (!baseCards.some((card) => card.id === 'weekly-date-watch')) {
  baseCards.push(buildAdminWatchCard())
}
const numericCardCount = baseCards.filter((card) => Number.isFinite(card.number)).length

const output = `// Generated from ../trello_import.csv by scripts/generateBaseCards.mjs.
// This file contains sanitized planning data only. User progress lives in localStorage.

export const baseCards = ${JSON.stringify(baseCards, null, 2)}

export const campaignMeta = {
  title: 'Summer Rescue Campaign 2026',
  runway: '2026-07-04 to 2026-08-18',
  generatedFrom: 'trello_import.csv',
  cardCount: ${numericCardCount},
  includesWeeklyWatch: true,
}
`

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, output)
console.log(`Wrote ${baseCards.length} cards to ${path.relative(appRoot, outputPath)}`)
