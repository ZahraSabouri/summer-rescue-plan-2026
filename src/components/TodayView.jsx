import { useEffect, useMemo, useState } from 'react'
import { formatDate } from '../utils/progress'
import {
  buildDaySummary,
  buildSplitGuardrail,
  buildTodayPicks,
  pickReason,
} from '../utils/insights'
import { AnimatedNumber } from './Celebration'
import { CardSummary } from './CardSummary'
import { DailyAgenda } from './ScheduleView'
import { buildExecutionContext, summariseDay } from '../utils/schedule.js'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 5) return 'Late-night session'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
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

function blockTime(block) {
  if (!block) return ''
  return `${block.start}–${block.end}`
}

function executionLabel(mode, preCampaign) {
  if (preCampaign) return "Tomorrow's first boundary"
  if (mode === 'current') return 'Current boundary'
  if (mode === 'upcoming') return 'Next boundary'
  if (mode === 'future') return "Selected day's first boundary"
  if (mode === 'selected') return 'Selected-day boundary'
  return 'Day complete'
}

function ExecutionStrip({ context, preCampaign, capacity, onOpenCard, onStartSession }) {
  const { block, nextBlock, card, cardBlock, lockedToTimer } = context

  return (
    <section className="execution-strip" aria-label="Now and next execution guide">
      <div className="execution-boundary">
        <span>{executionLabel(context.mode, preCampaign)}</span>
        {block ? (
          <>
            <strong>{block.title}</strong>
            <p>
              {blockTime(block)}
              {block.location ? ` · ${block.location}` : ''}
            </p>
            <p className={`execution-capacity${capacity.academicHours > 8 ? ' over' : ''}`}>
              {capacity.academicHours}h protected academic load · {capacity.remainingHours}h below the 8h ceiling
            </p>
          </>
        ) : (
          <>
            <strong>No more protected blocks today</strong>
            <p>Close the day instead of manufacturing extra work.</p>
          </>
        )}
      </div>

      <div className="execution-output">
        <span>{lockedToTimer ? 'Focus locked to timer' : cardBlock === block ? 'Work output' : 'Next work output'}</span>
        {card ? (
          <>
            <strong>#{card.number} {card.title}</strong>
            {cardBlock && cardBlock !== block && <p>{blockTime(cardBlock)} scheduled block</p>}
            <dl>
              <div>
                <dt>Finish line</dt>
                <dd>{card.doneCondition || 'Complete the card checklist and leave the required output.'}</dd>
              </div>
              {card.evidenceRequirement && (
                <div>
                  <dt>Leave behind</dt>
                  <dd>{card.evidenceRequirement}</dd>
                </div>
              )}
            </dl>
            <div className="execution-actions">
              <button type="button" className="secondary-button" onClick={() => onOpenCard(card.id)}>
                Open card
              </button>
              <button type="button" className="primary-button" onClick={() => onStartSession(card.id)}>
                {lockedToTimer ? 'Open focus timer' : 'Start focus'}
              </button>
            </div>
          </>
        ) : (
          <>
            <strong>No linked card in this boundary</strong>
            <p>Finish the routine, meal, travel, or recovery block as scheduled.</p>
          </>
        )}
      </div>

      <div className="execution-next">
        <span>Then stop and switch</span>
        {nextBlock ? (
          <>
            <strong>{nextBlock.title}</strong>
            <p>{blockTime(nextBlock)}{nextBlock.location ? ` · ${nextBlock.location}` : ''}</p>
          </>
        ) : (
          <>
            <strong>End-of-day boundary</strong>
            <p>Protect sleep and restart from tomorrow's plan.</p>
          </>
        )}
      </div>
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
  dayBlocks,
  scheduleDate,
  campaignStart,
  onOpenCard,
  activeTimerCard,
}) {
  const preCampaign = Boolean(campaignStart && referenceDate < campaignStart)
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
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 60 * 1000)
    return () => window.clearInterval(id)
  }, [])
  const execution = useMemo(
    () => buildExecutionContext(dayBlocks, cards, scheduleDate || referenceDate, { now: clock, activeCard: activeTimerCard }),
    [activeTimerCard, cards, clock, dayBlocks, referenceDate, scheduleDate],
  )
  const capacity = useMemo(() => {
    const summary = summariseDay(dayBlocks)
    const academicHours = Math.round((summary.academicMinutes / 60) * 10) / 10
    return {
      academicHours,
      remainingHours: Math.max(0, Math.round((8 - academicHours) * 10) / 10),
    }
  }, [dayBlocks])

  return (
    <div className="today-view">
      <section className="today-hero panel" aria-label="Today at a glance">
        <div className="today-hero-main">
          <p className="eyebrow">{formatDate(referenceDate)}</p>
          <h2 className="today-greeting">{preCampaign ? 'The campaign starts tomorrow, Zahra.' : `${greeting()}, Zahra.`}</h2>
          <p className="today-line">
            {preCampaign
              ? 'Nothing in the rescue plan is due tonight. Preview Monday’s protected launch schedule and start rested.'
              : picks.length === 0
              ? 'Nothing urgent in the queue — pick something from the board or take the win.'
              : `Your best next ${picks.length === 1 ? 'move is' : `${picks.length} moves are`} lined up below. Start the top one.`}
          </p>
        </div>
        <div className="today-hero-side">
          {examCountdown != null && examCountdown >= 0 && (
            <div className="today-exam">
              <strong>
                <AnimatedNumber value={examCountdown} />
              </strong>
              <span>days to {examLabel}</span>
            </div>
          )}
        </div>
        <ExecutionStrip
          context={execution}
          preCampaign={preCampaign}
          capacity={capacity}
          onOpenCard={onOpenCard}
          onStartSession={actions.onStartSession}
        />
      </section>

      <section className="today-agenda panel" aria-label={preCampaign ? 'Tomorrow preview hour-by-hour' : 'Today hour-by-hour'}>
        <header className="panel-head">
          <div>
            <p className="eyebrow">Protected timetable</p>
            <h3>{preCampaign ? 'Tomorrow preview, hour by hour' : 'Today, hour by hour'}</h3>
          </div>
          <span className="muted small">Routines are blocks; outputs stay checkable cards.</span>
        </header>
        <DailyAgenda date={scheduleDate || referenceDate} blocks={dayBlocks} cards={cards} onOpenCard={onOpenCard} compact />
      </section>

      <section className="today-picks" aria-label="Top focus picks">
        <header className="section-head">
          <h3>{preCampaign ? 'Tomorrow’s launch queue' : 'Mission for today'}</h3>
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
              Nothing marked done yet today. One finished card is enough to leave real evidence.
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
