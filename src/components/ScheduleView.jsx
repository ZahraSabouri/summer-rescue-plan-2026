import { useMemo, useState, useSyncExternalStore } from 'react'
import {
  expandScheduleRange,
  findScheduleConflicts,
  resolveScheduledCard,
  summariseDay,
} from '../utils/schedule'
import { dayLog } from '../utils/dayLog'
import { blockLogKey } from '../utils/dayReview'
import { StatusToggle } from './DayReview'
import './ScheduleView.css'

const EXAM_LABELS = {
  aml: 'Applied ML',
  'time-series': 'Time Series',
  mat700: 'Data Mining',
}

function parseDay(value) {
  const match = typeof value === 'string' ? value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/) : null
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

function localDay(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function todayDay() {
  return localDay(new Date())
}

function addDays(value, amount) {
  const date = parseDay(value)
  if (!date) return value
  date.setDate(date.getDate() + amount)
  return localDay(date)
}

function startOfIsoWeek(value) {
  const date = parseDay(value)
  if (!date) return value
  const weekday = date.getDay() === 0 ? 7 : date.getDay()
  date.setDate(date.getDate() - (weekday - 1))
  return localDay(date)
}

function validDay(value) {
  return parseDay(value) ? value.slice(0, 10) : ''
}

function clampDay(value, lower, upper) {
  let day = validDay(value) || todayDay()
  const minimum = validDay(lower)
  const maximum = validDay(upper)
  if (minimum && day < minimum) day = minimum
  if (maximum && day > maximum) day = maximum
  return day
}

function alignedWeekStart(referenceDate, campaignStart, campaignEnd) {
  const minimum = validDay(campaignStart)
  const anchor = clampDay(referenceDate, minimum, campaignEnd)
  const monday = startOfIsoWeek(anchor)
  return minimum && monday < minimum ? minimum : monday
}

function formatDay(value, includeYear = false) {
  const date = parseDay(value)
  if (!date) return value || 'Unscheduled'
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(includeYear ? { year: 'numeric' } : {}),
  }).format(date)
}

function examDate(value) {
  if (typeof value === 'string') return value.slice(0, 10)
  if (value && typeof value === 'object' && typeof value.date === 'string') return value.date.slice(0, 10)
  return ''
}

function hoursAndMinutes(minutes) {
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0))
  const hours = Math.floor(safeMinutes / 60)
  const remainder = safeMinutes % 60
  if (hours === 0) return `${remainder}m`
  if (remainder === 0) return `${hours}h`
  return `${hours}h ${remainder}m`
}

function clockSortValue(value) {
  const match = typeof value === 'string' ? value.match(/^(\d{1,2}):(\d{2})$/) : null
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.MAX_SAFE_INTEGER
}

function CategoryChip({ category }) {
  return <span className={`schedule-category schedule-category-${category || 'routine'}`}>{category || 'routine'}</span>
}

function DailyTotals({ summary }) {
  const totals = [
    ['Academic', summary.academicMinutes],
    ['Project', summary.projectMinutes],
    ['Job', summary.jobMinutes],
    ['Sleep', summary.sleepMinutes],
  ].filter(([, minutes]) => minutes > 0)

  if (totals.length === 0) return null
  return (
    <dl className="daily-agenda-totals" aria-label="Daily time totals">
      {totals.map(([label, minutes]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{hoursAndMinutes(minutes)}</dd>
        </div>
      ))}
    </dl>
  )
}

// logDate: when set, each block gets an inline Done/Skipped retro-log toggle
// writing to the shared day log (same store the Review view reads).
export function DailyAgenda({ blocks = [], cards = [], onOpenCard, onOpenBlock, compact = false, date: agendaDate = '', logDate = '' }) {
  const sortedBlocks = useMemo(
    () => [...blocks].sort(
      (a, b) => clockSortValue(a.start) - clockSortValue(b.start) || clockSortValue(a.end) - clockSortValue(b.end),
    ),
    [blocks],
  )
  const summary = useMemo(() => summariseDay(sortedBlocks), [sortedBlocks])
  const conflicts = useMemo(() => findScheduleConflicts(sortedBlocks), [sortedBlocks])
  const date = validDay(agendaDate) || sortedBlocks[0]?.date || ''
  const log = useSyncExternalStore(dayLog.subscribe, dayLog.getState)
  const loggedBlocks = logDate ? log.days?.[logDate]?.blocks ?? {} : null

  return (
    <section className={`daily-agenda${compact ? ' daily-agenda-compact' : ''}`} aria-label={`Schedule for ${formatDay(date)}`}>
      {!compact && (
        <header className="daily-agenda-header">
          <div>
            <p className="daily-agenda-eyebrow">Daily agenda</p>
            <h3>{formatDay(date)}</h3>
          </div>
          <DailyTotals summary={summary} />
        </header>
      )}

      {conflicts.length > 0 && (
        <div className="schedule-conflict" role="alert">
          <strong>{conflicts.length} timetable conflict{conflicts.length === 1 ? '' : 's'}</strong>
          <span>Review overlapping blocks before starting the day.</span>
        </div>
      )}

      {sortedBlocks.length === 0 ? (
        <p className="schedule-empty">No blocks planned.</p>
      ) : (
        <ol className="daily-agenda-list">
          {sortedBlocks.map((block) => {
            const card = resolveScheduledCard(block, cards)
            const canOpen = Boolean(card && onOpenCard)
            const startsAt = clockSortValue(block.start)
            const endsAt = clockSortValue(block.end)
            const endDate = block.date && endsAt < startsAt ? addDays(block.date, 1) : block.date
            const logKey = loggedBlocks ? blockLogKey(block) : null
            const logStatus = logKey
              ? loggedBlocks[logKey] === 'done' || loggedBlocks[logKey] === 'skipped'
                ? loggedBlocks[logKey]
                : 'unlogged'
              : null
            return (
              <li
                className={`daily-agenda-item category-${block.category || 'routine'}${logStatus ? ` is-${logStatus}` : ''}`}
                key={block.occurrenceId || `${block.id}-${block.date}-${block.start}`}
              >
                <div className="daily-agenda-time">
                  <time dateTime={block.date ? `${block.date}T${block.start}` : undefined}>{block.start}</time>
                  <span aria-hidden="true">–</span>
                  <time dateTime={endDate ? `${endDate}T${block.end}` : undefined}>{block.end}</time>
                </div>
                <div className="daily-agenda-content">
                  <div className="daily-agenda-title-row">
                    {canOpen ? (
                      <button type="button" className="schedule-card-link" onClick={() => onOpenCard(card.id)}>
                        {block.title}
                      </button>
                    ) : onOpenBlock ? (
                      <button type="button" className="schedule-card-link" onClick={() => onOpenBlock(block)}>{block.title}</button>
                    ) : <strong>{block.title}</strong>}
                    {block.protected && <span className="schedule-protected">Protected</span>}
                  </div>
                  <div className="daily-agenda-meta">
                    <CategoryChip category={block.category} />
                    {block.moduleGroup && <span>{block.moduleGroup}</span>}
                    {block.location && <span>{block.location}</span>}
                    {card && <span className="schedule-linked-card">Next: {card.title}</span>}
                  </div>
                </div>
                {logKey && <StatusToggle date={logDate} entry={{ key: logKey, status: logStatus }} />}
              </li>
            )
          })}
        </ol>
      )}

      {compact && <DailyTotals summary={summary} />}
    </section>
  )
}

export function ScheduleView({
  rules = [],
  exceptions = [],
  cards = [],
  referenceDate,
  onOpenCard,
  moduleExamDates = {},
  campaignStart = '',
  campaignEnd = '',
}) {
  const baseStart = useMemo(
    () => alignedWeekStart(referenceDate, campaignStart, campaignEnd),
    [referenceDate, campaignStart, campaignEnd],
  )
  const firstWeekStart = useMemo(
    () => validDay(campaignStart) ? alignedWeekStart(campaignStart, campaignStart, campaignEnd) : '',
    [campaignStart, campaignEnd],
  )
  const lastWeekStart = useMemo(() => {
    const lastDay = validDay(campaignEnd)
    if (!lastDay) return ''
    const monday = startOfIsoWeek(lastDay)
    return firstWeekStart && monday < firstWeekStart ? firstWeekStart : monday
  }, [campaignEnd, firstWeekStart])
  const [navigation, setNavigation] = useState(() => ({ anchor: baseStart, start: baseStart }))
  const selectedStart = navigation.anchor === baseStart ? navigation.start : baseStart
  const start = firstWeekStart && selectedStart < firstWeekStart
    ? firstWeekStart
    : lastWeekStart && selectedStart > lastWeekStart
      ? lastWeekStart
      : selectedStart
  const naturalEnd = addDays(start, 6)
  const lastCampaignDay = validDay(campaignEnd)
  const end = lastCampaignDay && naturalEnd > lastCampaignDay ? lastCampaignDay : naturalEnd
  const previousStart = addDays(start, -7)
  const nextStart = addDays(start, 7)
  const canGoPrevious = !firstWeekStart || previousStart >= firstWeekStart
  const canGoNext = !lastWeekStart || nextStart <= lastWeekStart
  const days = useMemo(
    () => expandScheduleRange(rules, exceptions, start, end),
    [rules, exceptions, start, end],
  )
  const weekSummary = useMemo(
    () => days.reduce(
      (total, day) => {
        const summary = summariseDay(day.blocks)
        total.academicMinutes += summary.academicMinutes
        total.projectMinutes += summary.projectMinutes
        total.jobMinutes += summary.jobMinutes
        return total
      },
      { academicMinutes: 0, projectMinutes: 0, jobMinutes: 0 },
    ),
    [days],
  )
  const exams = Object.entries(moduleExamDates)
    .map(([moduleId, value]) => ({
      moduleId,
      label: EXAM_LABELS[moduleId] || moduleId,
      date: examDate(value),
    }))
    .filter((exam) => exam.date)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <section className="schedule-view" aria-labelledby="schedule-view-title">
      <header className="schedule-view-header">
        <div className="schedule-view-heading-copy">
          <p className="daily-agenda-eyebrow">Seven-day plan</p>
          <h2 id="schedule-view-title">{formatDay(start, true)} – {formatDay(end, true)}</h2>
          <p>Protected routines and focused work blocks. Checkable outcomes stay on their linked cards.</p>
        </div>
        <dl className="schedule-week-totals" aria-label="Seven-day totals">
          <div>
            <dt>Academic</dt>
            <dd>{hoursAndMinutes(weekSummary.academicMinutes)}</dd>
          </div>
          <div>
            <dt>Project</dt>
            <dd>{hoursAndMinutes(weekSummary.projectMinutes)}</dd>
          </div>
          <div>
            <dt>Job hunt</dt>
            <dd>{hoursAndMinutes(weekSummary.jobMinutes)}</dd>
          </div>
        </dl>
      </header>

      <nav className="schedule-week-controls" aria-label="Schedule week navigation">
        <button
          type="button"
          className="schedule-week-button"
          disabled={!canGoPrevious}
          onClick={() => setNavigation({ anchor: baseStart, start: previousStart })}
        >
          <span aria-hidden="true">←</span> Previous week
        </button>
        <button
          type="button"
          className="schedule-week-button schedule-week-current"
          disabled={start === baseStart}
          onClick={() => setNavigation({ anchor: baseStart, start: baseStart })}
        >
          Current week
        </button>
        <button
          type="button"
          className="schedule-week-button"
          disabled={!canGoNext}
          onClick={() => setNavigation({ anchor: baseStart, start: nextStart })}
        >
          Next week <span aria-hidden="true">→</span>
        </button>
      </nav>

      {exams.length > 0 && (
        <aside className="schedule-exam-strip" aria-label="Confirmed exam dates">
          <strong>Exam dates</strong>
          <ul>
            {exams.map((exam) => (
              <li key={exam.moduleId}>
                <span>{exam.label}</span>
                <time dateTime={exam.date}>{formatDay(exam.date)}</time>
              </li>
            ))}
          </ul>
        </aside>
      )}

      <div className="schedule-week-grid">
        {days.map((day) => {
          const dayExams = exams.filter((exam) => exam.date === day.date)
          return (
            <article className="schedule-day-card" key={day.date}>
              <header className="schedule-day-heading">
                <h3>{formatDay(day.date)}</h3>
                {dayExams.map((exam) => (
                  <span className="schedule-exam-badge" key={exam.moduleId}>{exam.label} exam</span>
                ))}
              </header>
              <DailyAgenda
                date={day.date}
                blocks={day.blocks}
                cards={cards}
                onOpenCard={onOpenCard}
                logDate={day.date <= referenceDate ? day.date : ''}
                compact
              />
            </article>
          )
        })}
      </div>
    </section>
  )
}
