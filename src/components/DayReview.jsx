import { useMemo, useState, useSyncExternalStore } from 'react'
import { dayLog } from '../utils/dayLog'
import {
  blockLogKey,
  buildDayReview,
  cardReviewLogKey,
  isFixedScheduleBlock,
  previousReviewDates,
} from '../utils/dayReview'
import { buildDayTimeline, expandScheduleForDate } from '../utils/schedule'
import { scheduleRules, scheduleExceptions } from '../data/summerRescuePlan'
import { addDays, cardPlanLane, formatDate } from '../utils/progress'

const CATEGORY_LABELS = {
  study: 'Study',
  class: 'Class',
  project: 'Project',
  job: 'Job',
  sleep: 'Sleep',
  routine: 'Routine',
  admin: 'Admin',
  travel: 'Travel',
  meal: 'Meal',
}

function useDayReview(date, cards) {
  const log = useSyncExternalStore(dayLog.subscribe, dayLog.getState)
  const blocks = useMemo(() => expandScheduleForDate(scheduleRules, scheduleExceptions, date), [date])
  return useMemo(() => buildDayReview({ date, blocks, cards, log }), [date, blocks, cards, log])
}

// Previous-7-days history: recomputed per day from the pure builders (schedule
// expansion + buildDayReview) — no extra storage involved.
function useWeekHistory(referenceDate, cards) {
  const log = useSyncExternalStore(dayLog.subscribe, dayLog.getState)
  return useMemo(
    () =>
      previousReviewDates(referenceDate).map((date) => {
        const blocks = expandScheduleForDate(scheduleRules, scheduleExceptions, date)
        const review = buildDayReview({ date, blocks, cards, log })
        const { done, total } = review.summary
        return {
          date,
          done,
          total,
          pct: total > 0 ? Math.round((done / total) * 100) : 0,
          focusMinutes: review.focusMinutes,
          facts: log.days?.[date]?.facts ?? {},
        }
      }),
    [referenceDate, cards, log],
  )
}

function weekdayInitial(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2)
}

function dayNumber(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric' })
}

// One bar per day: height = % of planned blocks logged done; focus minutes as
// a muted sub-label. Each column is a button that jumps the review to that day.
function HistoryStrip({ referenceDate, cards, selectedDate, onSelect }) {
  const days = useWeekHistory(referenceDate, cards)
  return (
    <div className="review-history" role="group" aria-label="Previous 7 days: blocks done and focus minutes">
      {days.map((day) => {
        const factParts = [
          day.facts.wokeAt ? `woke ${day.facts.wokeAt}` : null,
          day.facts.sleptAt ? `slept ${day.facts.sleptAt}` : null,
          day.facts.energy ? `energy ${day.facts.energy}` : null,
        ].filter(Boolean)
        const title = `${formatDate(day.date)} — ${day.done}/${day.total} blocks done · ${day.focusMinutes}m focus${factParts.length ? ` · ${factParts.join(' · ')}` : ''}`
        return (
          <button
            key={day.date}
            type="button"
            className={`review-history-day${day.date === selectedDate ? ' active' : ''}`}
            title={title}
            aria-label={title}
            onClick={() => onSelect(day.date)}
          >
            <span className="review-history-bar" aria-hidden="true">
              <span
                className="review-history-fill"
                style={{ height: `${day.done > 0 ? Math.max(day.pct, 6) : 0}%` }}
              />
            </span>
            <span className="review-history-wd">{weekdayInitial(day.date)} {dayNumber(day.date)}</span>
            <span className="review-history-mins">{day.focusMinutes > 0 ? `${day.focusMinutes}m` : '—'}</span>
          </button>
        )
      })}
    </div>
  )
}

export function StatusToggle({ date, entry, onStatusChange }) {
  const { key, status } = entry

  function setStatus(nextStatus) {
    const value = status === nextStatus ? null : nextStatus
    dayLog.setBlockStatus(date, key, value)
    onStatusChange?.(value)
  }

  return (
    <div className="review-toggle" role="group" aria-label="Log this block">
      <button
        type="button"
        className={`review-toggle-done${status === 'done' ? ' active' : ''}`}
        aria-pressed={status === 'done'}
        onClick={() => setStatus('done')}
      >
        Done
      </button>
      <button
        type="button"
        className={`review-toggle-skip${status === 'skipped' ? ' active' : ''}`}
        aria-pressed={status === 'skipped'}
        onClick={() => setStatus('skipped')}
      >
        Skipped
      </button>
    </div>
  )
}

function blockDetailSummary(detail = {}, { allowScheduleEdit, allowProgressLog, fixedSchedule }) {
  const parts = []
  if (detail.scheduledStart || detail.scheduledEnd) {
    parts.push(`Moved to ${detail.scheduledStart || '?'}-${detail.scheduledEnd || '?'}`)
  }
  if (detail.progressPercent !== undefined) parts.push(`${detail.progressPercent}%`)
  if (detail.actualStart || detail.actualEnd) {
    parts.push(`${detail.actualStart || '?'}-${detail.actualEnd || '?'}`)
  }
  if (detail.note?.trim()) parts.push('note saved')
  if (parts.length > 0) return parts.join(' · ')
  if (allowScheduleEdit && allowProgressLog) return 'Move block or log progress'
  if (allowScheduleEdit) return 'Change this block\'s time'
  if (fixedSchedule && allowProgressLog) return 'Fixed time · log actual progress'
  return 'Log time, progress & note'
}

export function BlockProgressEditor({
  date,
  entry,
  plannedStart = '',
  plannedEnd = '',
  compact = false,
  allowScheduleEdit = false,
  allowProgressLog = true,
  fixedSchedule = false,
}) {
  const detail = entry.detail ?? {}

  function setDetail(key, value) {
    dayLog.setBlockDetail(date, entry.key, { [key]: value })
  }

  function resetScheduleTime() {
    dayLog.setBlockDetail(date, entry.key, { scheduledStart: null, scheduledEnd: null })
  }

  return (
    <details className={`block-progress-editor${compact ? ' compact' : ''}`}>
      <summary>{blockDetailSummary(detail, { allowScheduleEdit, allowProgressLog, fixedSchedule })}</summary>
      <div className="block-progress-fields">
        {allowScheduleEdit && (
          <div className="block-schedule-fields">
            <div className="block-schedule-heading">
              <span>Planned time</span>
              <span>Flexible</span>
            </div>
            <label>
              <span>Start</span>
              <input
                type="time"
                value={detail.scheduledStart ?? plannedStart}
                onChange={(event) => setDetail('scheduledStart', event.target.value === plannedStart ? null : event.target.value)}
              />
            </label>
            <label>
              <span>End</span>
              <input
                type="time"
                value={detail.scheduledEnd ?? plannedEnd}
                onChange={(event) => setDetail('scheduledEnd', event.target.value === plannedEnd ? null : event.target.value)}
              />
            </label>
            {(detail.scheduledStart || detail.scheduledEnd) && (
              <button type="button" className="block-time-reset" onClick={resetScheduleTime}>
                Reset to {plannedStart}-{plannedEnd}
              </button>
            )}
          </div>
        )}
        {allowProgressLog && (
          <>
            <label>
              <span>Actual start</span>
              <input
                type="time"
                value={detail.actualStart ?? ''}
                placeholder={detail.scheduledStart ?? plannedStart}
                onChange={(event) => setDetail('actualStart', event.target.value)}
              />
            </label>
            <label>
              <span>Actual end</span>
              <input
                type="time"
                value={detail.actualEnd ?? ''}
                placeholder={detail.scheduledEnd ?? plannedEnd}
                onChange={(event) => setDetail('actualEnd', event.target.value)}
              />
            </label>
            <label>
              <span>Progress %</span>
              <input
                type="number"
                min="0"
                max="100"
                step="5"
                value={detail.progressPercent ?? ''}
                placeholder="0-100"
                onChange={(event) => setDetail('progressPercent', event.target.value === '' ? null : event.target.value)}
              />
            </label>
            <label className="block-progress-note">
              <span>What I did / note</span>
              <textarea
                rows={compact ? 2 : 3}
                value={detail.note ?? ''}
                placeholder="What happened, what remains, or why it changed."
                onChange={(event) => setDetail('note', event.target.value)}
              />
            </label>
          </>
        )}
      </div>
    </details>
  )
}

// Walk back through any past day: the full planned timetable (wake, wash-up,
// meals, travel, classes, study blocks), retro-loggable block by block, joined
// with what verifiably happened (cards completed, focus minutes).
export function DayReview({ cards, referenceDate, onOpenCard, onCardStatusChange, onToggleCardDone }) {
  const [selectedDate, setSelectedDate] = useState(() => addDays(referenceDate, -1))
  const review = useDayReview(selectedDate, cards)
  const timeline = useMemo(
    () => buildDayTimeline(review.entries.map((entry) => entry.block), cards, selectedDate),
    [cards, review.entries, selectedDate],
  )
  const entriesByKey = useMemo(
    () => new Map(review.entries.map((entry) => [entry.key, entry])),
    [review.entries],
  )
  const timelineCards = useMemo(
    () => Array.from(new Map(
      [...timeline.entries.flatMap((entry) => entry.cards), ...timeline.unassignedCards]
        .map((card) => [card.id, card]),
    ).values()),
    [timeline],
  )
  const undoneTimelineCards = timelineCards.filter(
    (card) => !card.done && review.cardReviewStatuses[card.id] !== 'done',
  )
  const isToday = selectedDate === referenceDate
  const atFuture = selectedDate >= referenceDate
  const selectedDateLabel = formatDate(selectedDate)
  const previousDateLabel = formatDate(addDays(selectedDate, -1))
  const nextDateLabel = formatDate(addDays(selectedDate, 1))

  function openReviewDate(date) {
    if (!date || date > referenceDate) return
    setSelectedDate(date)
  }

  function handleTimelineCardStatus(entry, linkedCards, card, status) {
    if (status === 'done' && !card.done) onToggleCardDone?.(card.id)
    if (status === 'skipped' && !card.done) onCardStatusChange?.(card.id, 'Rescue Lane')

    if (!entry) return
    const nextStatuses = linkedCards.map((linkedCard) => (
      linkedCard.id === card.id
        ? status || (linkedCard.done ? 'done' : 'unlogged')
        : review.cardReviewStatuses[linkedCard.id] || 'unlogged'
    ))
    const allLogged = nextStatuses.every((value) => value === 'done' || value === 'skipped')
    const blockStatus = allLogged
      ? nextStatuses.includes('skipped') ? 'skipped' : 'done'
      : null
    dayLog.setBlockStatus(selectedDate, entry.key, blockStatus)
  }

  return (
    <div className="day-review">
      <section className="panel review-header">
        <div className="review-stepper" role="group" aria-label="Choose a day to review">
          <button type="button" className="secondary-button" onClick={() => setSelectedDate((d) => addDays(d, -1))} aria-label="Previous day">
            ‹
          </button>
          <div className="review-date">
            <strong>{formatDate(selectedDate)}</strong>
            <span>{isToday ? 'today — still in progress' : selectedDate === addDays(referenceDate, -1) ? 'yesterday' : 'past day'}</span>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
            disabled={atFuture}
            aria-label="Next day"
          >
            ›
          </button>
          <div className="review-jumps">
            <label className="review-date-picker">
              <span>Review date</span>
              <input
                type="date"
                value={selectedDate}
                max={referenceDate}
                onChange={(event) => openReviewDate(event.target.value)}
              />
            </label>
            <div className="review-quick-jumps">
              <button type="button" className="text-button" onClick={() => openReviewDate(addDays(referenceDate, -1))}>
                Yesterday
              </button>
              <button type="button" className="text-button" onClick={() => openReviewDate(referenceDate)}>
                Today
              </button>
            </div>
          </div>
        </div>

        <p className="review-date-help">
          Open any previous day with the arrows, a date below, or the date picker. Its saved blocks, times and note
          will reappear here.
        </p>

        <div className="review-summary" aria-label="Day summary">
          <div className="review-stat">
            <strong>{review.summary.done}/{review.summary.total}</strong>
            <span>blocks done</span>
          </div>
          <div className="review-stat">
            <strong>{review.summary.skipped}</strong>
            <span>skipped</span>
          </div>
          <div className="review-stat">
            <strong>{review.summary.loggedPct}%</strong>
            <span>day logged</span>
          </div>
          <div className="review-stat">
            <strong>{review.focusMinutes}m</strong>
            <span>focus logged</span>
          </div>
          <div className="review-stat">
            <strong>{review.cardsDone.length}</strong>
            <span>cards completed</span>
          </div>
          <div className="review-stat">
            <strong>{review.dueCardsOpen.length}</strong>
            <span>open deadlines</span>
          </div>
        </div>

        <div className="review-history-wrap">
          <p className="eyebrow">Previous 7 days — select a day to open its review</p>
          <HistoryStrip
            referenceDate={referenceDate}
            cards={cards}
            selectedDate={selectedDate}
            onSelect={openReviewDate}
          />
        </div>
      </section>

      <section className="panel review-timeline" aria-label="Planned blocks for this day">
        <header className="review-section-head">
          <div>
            <p className="eyebrow">Planned day</p>
            <h3>Every block, wake to sleep — log it as it actually went</h3>
          </div>
          {review.summary.unlogged > 0 && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => dayLog.logRemainingDone(selectedDate, review.entries.map((entry) => entry.key))}
            >
              Log remaining {review.summary.unlogged} as done
            </button>
          )}
        </header>

        {review.entries.length === 0 ? (
          <p className="empty-note">No schedule blocks are defined for this day.</p>
        ) : (
          <ul className="review-blocks">
            {timeline.entries.map(({ block, cards: linkedCards }) => {
              const entry = entriesByKey.get(blockLogKey(block))
              if (!entry) return null
              return <li key={entry.key} className={`review-block is-${entry.status}${linkedCards.length > 0 ? ' has-cards' : ''}`}>
                <span className="review-time">
                  {block.start}–{block.end}
                </span>
                <span className={`review-cat cat-${block.category ?? 'routine'}`}>
                  {CATEGORY_LABELS[block.category] ?? 'Routine'}
                </span>
                <div className="review-timeline-content">
                  <span className="review-title">{block.title}</span>
                  {linkedCards.length > 0 && (
                    <ul className="review-timeline-cards">
                      {linkedCards.map((card) => {
                        const reviewStatus = review.cardReviewStatuses[card.id] || 'unlogged'
                        return (
                          <li key={card.id} className={`review-timeline-card is-${reviewStatus}`}>
                            <button type="button" onClick={() => onOpenCard?.(card.id)}>
                              <strong>{typeof card.number === 'number' ? `#${card.number}` : card.number}</strong>{' '}
                              {card.title}
                            </button>
                            <span>{card.moduleGroup} · {cardPlanLane(card, referenceDate)}</span>
                            <StatusToggle
                              date={selectedDate}
                              entry={{ key: cardReviewLogKey(card), status: reviewStatus }}
                              onStatusChange={(status) => handleTimelineCardStatus(entry, linkedCards, card, status)}
                            />
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
                <div className="review-block-actions">
                  <BlockProgressEditor
                    date={selectedDate}
                    entry={entry}
                    plannedStart={block.originalStart ?? block.start}
                    plannedEnd={block.originalEnd ?? block.end}
                    allowScheduleEdit={!isFixedScheduleBlock(block)}
                    fixedSchedule={isFixedScheduleBlock(block)}
                  />
                  {linkedCards.length === 0 && <StatusToggle date={selectedDate} entry={entry} />}
                </div>
              </li>
            })}
            {timeline.unassignedCards.map((card) => {
              const reviewStatus = review.cardReviewStatuses[card.id] || 'unlogged'
              return (
                <li key={`unscheduled-${card.id}`} className="review-block review-block-unscheduled has-cards">
                  <span className="review-time">No slot</span>
                  <span className="review-cat">Card</span>
                  <div className="review-timeline-content">
                    <span className="review-title">Needs a time block</span>
                    <ul className="review-timeline-cards">
                      <li className={`review-timeline-card is-${reviewStatus}`}>
                        <button type="button" onClick={() => onOpenCard?.(card.id)}>
                          <strong>{typeof card.number === 'number' ? `#${card.number}` : card.number}</strong>{' '}
                          {card.title}
                        </button>
                        <span>{card.moduleGroup} · {cardPlanLane(card, referenceDate)}</span>
                        <StatusToggle
                          date={selectedDate}
                          entry={{ key: cardReviewLogKey(card), status: reviewStatus }}
                          onStatusChange={(status) => handleTimelineCardStatus(null, [card], card, status)}
                        />
                      </li>
                    </ul>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <section className="review-undone" aria-label={`Cards from ${selectedDateLabel} still undone`}>
          <header>
            <div>
              <p className="eyebrow">Still undone</p>
              <h4>{undoneTimelineCards.length} cards left from this timeline</h4>
            </div>
            <span>Only cards already shown above appear here.</span>
          </header>
          {undoneTimelineCards.length === 0 ? (
            <p className="empty-note">No cards from this day remain open.</p>
          ) : (
            <ul>
              {undoneTimelineCards.map((card) => (
                <li key={card.id}>
                  <button type="button" onClick={() => onOpenCard?.(card.id)}>
                    <strong>{typeof card.number === 'number' ? `#${card.number}` : card.number}</strong> {card.title}
                  </button>
                  <span>{card.moduleGroup} · {cardPlanLane(card, referenceDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className="review-footnote">
          Logging records your day honestly — it never credits study hours or focus points. Those stay earned through
          cards and the timer.
        </p>
      </section>

      <section className="panel review-facts" aria-label="How the day actually ran">
        <div>
          <p className="eyebrow">Day facts</p>
          <h3>How {selectedDateLabel} actually ran</h3>
          <p id="review-sleep-boundary-help" className="review-sleep-boundary-help">
            <strong>These two times bracket {selectedDateLabel}.</strong> Wake time is when you got up that morning,
            after the night of {previousDateLabel}. Bedtime is when you went to sleep at the end of the reviewed day:
            {' '}late on {selectedDateLabel} or after midnight early on {nextDateLabel}.
          </p>
        </div>
        <div className="review-facts-grid">
          <label>
            <span>Woke on {selectedDateLabel}</span>
            <small>Morning of {selectedDateLabel}</small>
            <input
              type="time"
              value={review.facts.wokeAt ?? ''}
              aria-describedby="review-sleep-boundary-help"
              onChange={(event) => dayLog.setDayFact(selectedDate, 'wokeAt', event.target.value)}
            />
          </label>
          <label>
            <span>Went to bed at the end of {selectedDateLabel}</span>
            <small>Night of {selectedDateLabel} / early {nextDateLabel}</small>
            <input
              type="time"
              value={review.facts.sleptAt ?? ''}
              aria-describedby="review-sleep-boundary-help"
              onChange={(event) => dayLog.setDayFact(selectedDate, 'sleptAt', event.target.value)}
            />
          </label>
          <div className="review-energy" role="group" aria-label="Energy on this day">
            <span>Energy</span>
            <div>
              {['low', 'ok', 'high'].map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`review-energy-btn${review.facts.energy === level ? ' active' : ''}`}
                  aria-pressed={review.facts.energy === level}
                  onClick={() =>
                    dayLog.setDayFact(selectedDate, 'energy', review.facts.energy === level ? null : level)
                  }
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="review-columns">
        <section className="panel review-happened" aria-label="What actually happened">
          <p className="eyebrow">What actually happened</p>
          <h3>Verifiable output</h3>
          <p className="review-happened-line">
            {review.focusSessions} focus {review.focusSessions === 1 ? 'session' : 'sessions'} · {review.focusMinutes} minutes
          </p>
          {review.cardsDone.length > 0 ? (
            <ul className="review-cards-done">
              {review.cardsDone.map((card) => (
                <li key={card.id}>
                  <button type="button" className="text-button" onClick={() => onOpenCard?.(card.id)}>
                    <strong>#{card.number}</strong> {card.title}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-note">No cards were completed on this day.</p>
          )}
        </section>

        <section className="panel review-note" aria-label="Day note">
          <p className="eyebrow">Day note</p>
          <h3>What shaped this day?</h3>
          <textarea
            value={review.note}
            placeholder="Context for your future self — energy, blockers, wins, why plans changed."
            onChange={(event) => dayLog.setDayNote(selectedDate, event.target.value)}
          />
        </section>
      </div>
    </div>
  )
}

// Compact strip for the Today view: yesterday at a glance, with a jump into the
// full review. Uses the app's own hash routing for navigation.
export function YesterdayStrip({ cards, referenceDate }) {
  const yesterday = addDays(referenceDate, -1)
  const review = useDayReview(yesterday, cards)
  if (review.entries.length === 0) return null

  return (
    <section className="yesterday-strip panel" aria-label="Yesterday at a glance">
      <div className="yesterday-strip-copy">
        <p className="eyebrow">Yesterday · {formatDate(yesterday)}</p>
        <strong>
          {review.summary.done}/{review.summary.total} blocks done · {review.focusMinutes}m focus ·{' '}
          {review.cardsDone.length} {review.cardsDone.length === 1 ? 'card' : 'cards'} completed
        </strong>
        {review.summary.unlogged > 0 && (
          <span>{review.summary.unlogged} blocks still unlogged — 30 seconds to close the record.</span>
        )}
      </div>
      <button
        type="button"
        className="secondary-button"
        onClick={() => {
          window.location.hash = '#/review'
        }}
      >
        Review yesterday
      </button>
    </section>
  )
}
