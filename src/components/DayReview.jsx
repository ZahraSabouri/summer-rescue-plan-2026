import { useMemo, useState, useSyncExternalStore } from 'react'
import { dayLog } from '../utils/dayLog'
import { buildDayReview } from '../utils/dayReview'
import { expandScheduleForDate, resolveScheduledCard } from '../utils/schedule'
import { scheduleRules, scheduleExceptions } from '../data/summerRescuePlan'
import { addDays, formatDate } from '../utils/progress'

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

// Last-7-days history: recomputed per day from the pure builders (schedule
// expansion + buildDayReview) — no extra storage involved.
function useWeekHistory(referenceDate, cards) {
  const log = useSyncExternalStore(dayLog.subscribe, dayLog.getState)
  return useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(referenceDate, index - 6)
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

// One bar per day: height = % of planned blocks logged done; focus minutes as
// a muted sub-label. Each column is a button that jumps the review to that day.
function HistoryStrip({ referenceDate, cards, selectedDate, onSelect }) {
  const days = useWeekHistory(referenceDate, cards)
  return (
    <div className="review-history" role="group" aria-label="Last 7 days: blocks done and focus minutes">
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
            <span className="review-history-wd">{weekdayInitial(day.date)}</span>
            <span className="review-history-mins">{day.focusMinutes > 0 ? `${day.focusMinutes}m` : '—'}</span>
          </button>
        )
      })}
    </div>
  )
}

export function StatusToggle({ date, entry }) {
  const { key, status } = entry
  return (
    <div className="review-toggle" role="group" aria-label="Log this block">
      <button
        type="button"
        className={`review-toggle-done${status === 'done' ? ' active' : ''}`}
        aria-pressed={status === 'done'}
        onClick={() => dayLog.setBlockStatus(date, key, status === 'done' ? null : 'done')}
      >
        Done
      </button>
      <button
        type="button"
        className={`review-toggle-skip${status === 'skipped' ? ' active' : ''}`}
        aria-pressed={status === 'skipped'}
        onClick={() => dayLog.setBlockStatus(date, key, status === 'skipped' ? null : 'skipped')}
      >
        Skipped
      </button>
    </div>
  )
}

// Walk back through any past day: the full planned timetable (wake, wash-up,
// meals, travel, classes, study blocks), retro-loggable block by block, joined
// with what verifiably happened (cards completed, focus minutes).
export function DayReview({ cards, referenceDate, onOpenCard }) {
  const [selectedDate, setSelectedDate] = useState(() => addDays(referenceDate, -1))
  const review = useDayReview(selectedDate, cards)
  const isToday = selectedDate === referenceDate
  const atFuture = selectedDate >= referenceDate

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
            <button type="button" className="text-button" onClick={() => setSelectedDate(addDays(referenceDate, -1))}>
              Yesterday
            </button>
            <button type="button" className="text-button" onClick={() => setSelectedDate(referenceDate)}>
              Today
            </button>
          </div>
        </div>

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
        </div>

        <div className="review-history-wrap">
          <p className="eyebrow">Last 7 days — blocks done · focus minutes</p>
          <HistoryStrip
            referenceDate={referenceDate}
            cards={cards}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
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
            {review.entries.map((entry) => {
              const linkedCard = resolveScheduledCard(entry.block, cards)
              return <li key={entry.key} className={`review-block is-${entry.status}`}>
                <span className="review-time">
                  {entry.block.start}–{entry.block.end}
                </span>
                <span className={`review-cat cat-${entry.block.category ?? 'routine'}`}>
                  {CATEGORY_LABELS[entry.block.category] ?? 'Routine'}
                </span>
                <button
                  type="button"
                  className="review-title review-title-button"
                  onClick={() => {
                    if (linkedCard) onOpenCard?.(linkedCard.id)
                  }}
                  disabled={!onOpenCard || !linkedCard}
                >
                  {entry.block.title}
                </button>
                <StatusToggle date={selectedDate} entry={entry} />
              </li>
            })}
          </ul>
        )}
        <p className="review-footnote">
          Logging records your day honestly — it never credits study hours or focus points. Those stay earned through
          cards and the timer.
        </p>
      </section>

      <section className="panel review-facts" aria-label="How the day actually ran">
        <div>
          <p className="eyebrow">Day facts</p>
          <h3>How the day actually ran</h3>
          <p className="muted small">
            Observations, not tasks — a 3am night is logged here, never marked "overdue".
          </p>
        </div>
        <div className="review-facts-grid">
          <label>
            <span>Actually woke</span>
            <input
              type="time"
              value={review.facts.wokeAt ?? ''}
              onChange={(event) => dayLog.setDayFact(selectedDate, 'wokeAt', event.target.value)}
            />
          </label>
          <label>
            <span>Actually slept</span>
            <input
              type="time"
              value={review.facts.sleptAt ?? ''}
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
