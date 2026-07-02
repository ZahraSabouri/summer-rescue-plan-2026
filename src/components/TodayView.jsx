import { useMemo } from 'react'
import { formatDate } from '../utils/progress'
import {
  buildDaySummary,
  buildSplitGuardrail,
  buildStreak,
  buildTodayPicks,
  pickReason,
} from '../utils/insights'
import { AnimatedNumber } from './Celebration'
import { CardSummary } from './CardSummary'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 5) return 'Late-night session'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function StreakFlame({ streak }) {
  const lit = streak.current > 0
  return (
    <div className={`streak-chip${lit ? ' lit' : ''}`} title={`Longest streak: ${streak.longest} days`}>
      <span className="streak-flame" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M12 2c1 3.2-.6 4.8-2 6.3C8.4 10 7 11.6 7 14a5 5 0 0 0 10 0c0-1.5-.6-2.6-1.3-3.7-.4.9-1 1.5-1.9 2C14.4 10 15.4 6 12 2Z" />
        </svg>
      </span>
      <strong>
        <AnimatedNumber value={streak.current} />
      </strong>
      <span className="streak-label">day streak{streak.activeToday ? '' : ' · quiet today'}</span>
    </div>
  )
}

function SplitGuardrail({ guardrail }) {
  return (
    <section className="panel split-panel" aria-label="Priority split guardrail">
      <header className="panel-head">
        <div>
          <p className="eyebrow">Guardrail</p>
          <h3>Priority split</h3>
        </div>
        <span className="muted small">
          {guardrail.meaningful
            ? `${guardrail.totalHours}h logged across modules`
            : 'Warms up after ~4 logged hours'}
        </span>
      </header>

      <div className="split-rows">
        {guardrail.rows.map((row) => (
          <div className={`split-row ${row.status}`} key={row.group}>
            <div className="split-row-head">
              <span className="split-name">{row.label}</span>
              <span className="split-figures">
                <strong>{row.actualPct}%</strong>
                <span className="muted"> / {row.targetPct}% target</span>
                <span className="muted"> · {row.hours}h</span>
              </span>
            </div>
            <div className="split-track">
              <span className="split-fill" style={{ width: `${Math.min(100, row.actualPct)}%` }} />
              <span className="split-target" style={{ left: `${Math.min(100, row.targetPct)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {guardrail.alert && <p className="split-alert">{guardrail.alert}</p>}
    </section>
  )
}

export function TodayView({
  cards,
  snapshots,
  referenceDate,
  mat700Active,
  actions,
  examCountdown,
  examLabel,
  onOpenCard,
}) {
  const streak = useMemo(() => buildStreak(cards, referenceDate), [cards, referenceDate])
  const daySummary = useMemo(
    () => buildDaySummary(cards, snapshots, referenceDate),
    [cards, snapshots, referenceDate],
  )
  const guardrail = useMemo(
    () => buildSplitGuardrail(cards, mat700Active),
    [cards, mat700Active],
  )
  const { picks, queue, deficits } = useMemo(
    () => buildTodayPicks(cards, referenceDate, mat700Active),
    [cards, referenceDate, mat700Active],
  )

  return (
    <div className="today-view">
      <section className="today-hero panel" aria-label="Today at a glance">
        <div className="today-hero-main">
          <p className="eyebrow">{formatDate(referenceDate)}</p>
          <h2 className="today-greeting">{greeting()}, Xar.</h2>
          <p className="today-line">
            {picks.length === 0
              ? 'Nothing urgent in the queue — pick something from the board or take the win.'
              : `Your best next ${picks.length === 1 ? 'move is' : `${picks.length} moves are`} lined up below. Start the top one.`}
          </p>
        </div>
        <div className="today-hero-side">
          <StreakFlame streak={streak} />
          {examCountdown != null && examCountdown >= 0 && (
            <div className="today-exam">
              <strong>
                <AnimatedNumber value={examCountdown} />
              </strong>
              <span>days to {examLabel}</span>
            </div>
          )}
        </div>
        <div className="today-metrics">
          <div className="today-metric">
            <strong>
              <AnimatedNumber value={daySummary.doneToday.length} />
            </strong>
            <span>cards done today</span>
          </div>
          <div className="today-metric">
            <strong>
              <AnimatedNumber value={daySummary.hoursToday} decimals={1} />
            </strong>
            <span>hours logged today</span>
          </div>
          <div className="today-metric">
            <strong>
              <AnimatedNumber value={daySummary.focusSessionsToday} />
            </strong>
            <span>focus sessions</span>
          </div>
          <div className="today-metric">
            <strong>
              <AnimatedNumber value={streak.totalActiveDays} />
            </strong>
            <span>active days total</span>
          </div>
        </div>
      </section>

      <section className="today-picks" aria-label="Top focus picks">
        <header className="section-head">
          <h3>Mission for today</h3>
          <span className="muted small">Auto-picked from due dates, priority, and your split targets.</span>
        </header>
        {picks.length === 0 && (
          <p className="empty-note">All caught up. Anything you do now is a bonus lap.</p>
        )}
        <div className="pick-list">
          {picks.map((item, index) => (
            <div className="pick-item" key={item.card.id}>
              <div className="pick-rank" aria-hidden="true">
                {index + 1}
              </div>
              <div className="pick-body">
                <p className="pick-reason">{pickReason(item.card, referenceDate, deficits)}</p>
                <CardSummary card={item.card} compact {...actions} />
              </div>
            </div>
          ))}
        </div>

        {queue.length > 0 && (
          <div className="pick-queue">
            <p className="queue-label">Up next</p>
            {queue.map((item) => (
              <button
                type="button"
                key={item.card.id}
                className="queue-row"
                onClick={() => onOpenCard(item.card.id)}
              >
                <span className="queue-title">{item.card.title}</span>
                <span className="queue-meta">
                  {item.card.moduleGroup} · {formatDate(item.card.dueDate || item.card.startDate)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="today-lower">
        <SplitGuardrail guardrail={guardrail} />

        <section className="panel wrapup-panel" aria-label="Day wrap-up">
          <header className="panel-head">
            <div>
              <p className="eyebrow">Wrap-up</p>
              <h3>Shipped today</h3>
            </div>
          </header>
          {daySummary.doneToday.length === 0 ? (
            <p className="empty-note">
              Nothing marked done yet today. One finished card keeps the streak alive.
            </p>
          ) : (
            <ul className="wrapup-list">
              {daySummary.doneToday.map((card) => (
                <li key={card.id}>
                  <button type="button" className="text-button" onClick={() => onOpenCard(card.id)}>
                    {card.title}
                  </button>
                  <span className="muted small">{card.moduleGroup}</span>
                </li>
              ))}
            </ul>
          )}
          {daySummary.focusMinutesToday > 0 && (
            <p className="muted small">
              {daySummary.focusMinutesToday} focused minutes across {daySummary.focusSessionsToday}{' '}
              session{daySummary.focusSessionsToday === 1 ? '' : 's'}.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
