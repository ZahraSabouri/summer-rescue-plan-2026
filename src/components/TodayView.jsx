import { useEffect, useMemo, useState } from 'react'
import { formatDate, isOverdue } from '../utils/progress'
import {
  buildCatchUp,
  buildDaySummary,
  buildSplitGuardrail,
  buildStudyStreak,
  buildTodayPicks,
  pickReason,
} from '../utils/insights'
import { AnimatedNumber } from './Celebration'
import { CardSummary } from './CardSummary'
import { CardSessionTimer } from './CardSessionTimer'
import { FocusForestPanel } from './FocusStats'
import { CatchUpPanel } from './CatchUpPanel'
import { ReplanPanel } from './ReplanPanel'
import { YesterdayStrip } from './DayReview'
import { DailyAgenda } from './ScheduleView'
import { buildExecutionContext, summariseDay } from '../utils/schedule.js'

function PersistedDetails({ storageKey, className, children }) {
  const [open, setOpen] = useState(() => {
    try {
      return window.localStorage.getItem(storageKey) === '1'
    } catch {
      return false
    }
  })

  return (
    <details
      className={className}
      open={open}
      onToggle={(event) => {
        const next = event.currentTarget.open
        setOpen(next)
        try {
          window.localStorage.setItem(storageKey, next ? '1' : '0')
        } catch {
          // The diagnostic remains usable when browser storage is unavailable.
        }
      }}
    >
      {children}
    </details>
  )
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 5) return 'Late-night session'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function SplitGuardrail({ guardrail, onNavigateMeta }) {
  return (
    <section className="panel split-panel" aria-label="Priority allocation diagnostic">
      <header className="panel-head">
        <div>
          <p className="eyebrow">Allocation diagnostic</p>
          <h3>Priority split</h3>
        </div>
        <span className="muted small">
          {guardrail.meaningful
            ? `${guardrail.totalHours}h logged across modules`
            : 'Activates after approximately four logged hours'}
        </span>
      </header>

      <div className="split-rows">
        {guardrail.rows.map((row) => (
          <button type="button" className={`split-row ${row.status}`} key={row.group} onClick={() => onNavigateMeta?.('module', row.group)}>
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
          </button>
        ))}
      </div>

      {guardrail.alert && <p className="split-alert">{guardrail.alert}</p>}
    </section>
  )
}

function StreakBadge({ streak }) {
  const { current, studiedToday, graceUsed, graceAvailable } = streak
  const lit = current > 0
  const state = studiedToday ? 'done' : lit ? 'pending' : 'empty'
  const caption =
    state === 'empty'
      ? 'One focused session lights it up.'
      : state === 'done'
        ? current === 1
          ? 'Day one — strong start.'
          : 'Studied today — streak protected.'
        : graceAvailable
          ? 'Focus today to extend it · one grace day available.'
          : 'Focus today to extend the streak.'

  return (
    <div
      className={`streak-badge streak-${state}`}
      aria-label={`Study streak: ${current} day${current === 1 ? '' : 's'}${studiedToday ? ', studied today' : ''}`}
    >
      <div className="streak-row">
        <span className="streak-flame" aria-hidden="true">{lit ? '🔥' : '✷'}</span>
        <strong className="streak-count"><AnimatedNumber value={current} /></strong>
        <span className="streak-unit">
          day{current === 1 ? '' : 's'}{graceUsed ? ' · grace used' : ''}
        </span>
      </div>
      <p className="streak-caption">{caption}</p>
    </div>
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

function ExecutionStrip({ context, preCampaign, capacity, onOpenCard, onStartSession, activeSessionCardId, onOpenSchedule }) {
  const { block, nextBlock, card, cardBlock, lockedToTimer } = context

  return (
    <section className="execution-strip" aria-label="Now and next execution guide">
      <button type="button" className="execution-boundary execution-nav" onClick={onOpenSchedule}>
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
      </button>

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
              {activeSessionCardId !== card.id && (
                <button type="button" className="primary-button" onClick={() => onStartSession(card.id)}>
                  {lockedToTimer ? 'Open focus timer' : 'Start focus'}
                </button>
              )}
            </div>
            {activeSessionCardId === card.id && <CardSessionTimer cardId={card.id} />}
          </>
        ) : (
          <>
            <strong>No linked card in this boundary</strong>
            <p>Finish the routine, meal, travel, or recovery block as scheduled.</p>
          </>
        )}
      </div>

      <button type="button" className="execution-next execution-nav" onClick={onOpenSchedule}>
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
      </button>
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
  examConfirmed = false,
  dayBlocks,
  scheduleDate,
  campaignStart,
  onOpenCard,
  onOpenView,
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
  const catchUp = useMemo(
    () => buildCatchUp(cards, referenceDate, mat700Active),
    [cards, referenceDate, mat700Active],
  )
  const streak = useMemo(
    () => buildStudyStreak(cards, snapshots, referenceDate, { schedule: { campaignStart } }),
    [cards, snapshots, referenceDate, campaignStart],
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
          <button type="button" className="eyebrow today-date-link" onClick={() => onOpenView('schedule')}>{formatDate(referenceDate)}</button>
          <h2 className="today-greeting">{preCampaign ? 'The campaign starts soon, Zahra.' : `${greeting()}, Zahra.`}</h2>
          <p className="today-line">
            {preCampaign
              ? `Nothing in the rescue plan is due yet. Preview the protected launch on ${formatDate(campaignStart)} and start rested.`
              : picks.length === 0
              ? 'Nothing urgent in the queue — pick something from the board or take the win.'
              : `Your best next ${picks.length === 1 ? 'move is' : `${picks.length} moves are`} lined up below. Start the top one.`}
          </p>
        </div>
        <div className="today-hero-side">
          {!preCampaign && <button type="button" className="today-stat-link" onClick={() => onOpenView('progress')}><StreakBadge streak={streak} /></button>}
          {examCountdown != null && examCountdown >= 0 && (
            <button
              type="button"
              className="today-exam today-stat-link"
              onClick={() => onOpenView('admin')}
              title={
                examConfirmed
                  ? `Confirmed ${examLabel} exam date`
                  : 'No confirmed module exam date yet — counting to the start of the exam window'
              }
            >
              <strong>
                <AnimatedNumber value={examCountdown} />
              </strong>
              <span>days to {examLabel}</span>
              {!examConfirmed && <span className="today-exam-unconfirmed">Unconfirmed</span>}
            </button>
          )}
        </div>
        <ExecutionStrip
          context={execution}
          preCampaign={preCampaign}
          capacity={capacity}
          onOpenCard={onOpenCard}
          onStartSession={actions.onStartSession}
          activeSessionCardId={actions.activeSessionCardId}
          onOpenSchedule={() => onOpenView('schedule')}
        />
      </section>

      <CatchUpPanel catchUp={catchUp} actions={actions} />

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
                {!isOverdue(item.card, referenceDate) &&
                  (() => {
                    const behind = catchUp.groups.find((group) => group.group === item.card.moduleGroup)
                    return behind ? (
                      <p className="pick-behind-warn">
                        ⚠ {behind.count} behind in {behind.label} — catch those up first
                      </p>
                    ) : null
                  })()}
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

      <section className="today-agenda panel" aria-label={preCampaign ? 'Campaign launch preview hour-by-hour' : 'Today hour-by-hour'}>
        <header className="panel-head">
          <div>
            <p className="eyebrow">Protected timetable</p>
            <h3>{preCampaign ? 'Launch preview, hour by hour' : 'Today, hour by hour'}</h3>
          </div>
          <span className="muted small">
            {preCampaign
              ? 'Routines are protected blocks; outputs remain traceable cards.'
              : 'Log each block as it actually went — Done or Skipped, directly from the agenda.'}
          </span>
        </header>
        <DailyAgenda
          date={scheduleDate || referenceDate}
          blocks={dayBlocks}
          cards={cards}
          onOpenCard={onOpenCard}
          onOpenBlock={() => onOpenView('review')}
          onCardStatusChange={actions.onStatusChange}
          onToggleCardDone={actions.onToggleDone}
          referenceDate={referenceDate}
          logDate={preCampaign ? '' : scheduleDate || referenceDate}
          editDate={scheduleDate || referenceDate}
          compact
        />
      </section>

      <YesterdayStrip cards={cards} referenceDate={referenceDate} />

      <PersistedDetails storageKey="srp-today-tools-replan" className="today-tools panel">
        <summary>
          <strong>Re-plan remaining exam cards</strong>
          <span className="muted small">Reflow the full academic dependency chain after slippage; life routines never enter this model.</span>
        </summary>
        <ReplanPanel
          cards={cards}
          referenceDate={referenceDate}
          onApply={actions.onApplyReplan}
          onUndo={actions.onUndoReplan}
          canUndo={actions.replanCanUndo}
        />
      </PersistedDetails>

      <PersistedDetails storageKey="srp-today-tools-forest" className="today-tools panel">
        <summary>
          <strong>Focus forest, achievements & priority allocation</strong>
          <span className="muted small">Plant completed blocks, track goals and levels, and compare effort with the module allocation policy.</span>
        </summary>
        <FocusForestPanel />
        <SplitGuardrail guardrail={guardrail} onNavigateMeta={actions.onNavigateMeta} />
      </PersistedDetails>

      <div className="today-lower">
        <section className="panel wrapup-panel" aria-label="Day wrap-up">
          <header className="panel-head">
            <div>
              <p className="eyebrow">Wrap-up</p>
              <h3>Shipped today</h3>
            </div>
            <button type="button" className="secondary-button" onClick={() => onOpenView('review')}>
              Review the day
            </button>
          </header>
          {daySummary.doneToday.length === 0 ? (
            <p className="empty-note">Nothing marked done yet today. Completed cards and their evidence will appear here.</p>
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

      <section className="today-destinations panel" aria-label="Plan and review shortcuts">
        <div>
          <p className="eyebrow">Connected workspaces</p>
          <h3>Move from execution into deeper control views</h3>
          <p className="muted">The same cards, dates, status, evidence, and progress data continue across every view.</p>
        </div>
        <div className="today-destination-actions">
          <button type="button" className="secondary-button" onClick={() => onOpenView('schedule')}>View day</button>
          <button type="button" className="secondary-button" onClick={() => onOpenView('rescue')}>Handle exceptions</button>
          <button type="button" className="primary-button" onClick={() => onOpenView('review')}>Close or review day</button>
        </div>
      </section>
    </div>
  )
}
