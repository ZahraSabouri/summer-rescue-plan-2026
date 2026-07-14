import { useEffect, useMemo, useState } from 'react'
import { buildReplan, computeReplanSchedule } from '../utils/replan'

const MODULE_LABELS = {
  'Applied ML': 'Applied ML',
  'Time Series': 'Time Series',
  MAT700: 'Data Mining (MAT700)',
}

const STORAGE_KEY = 'summer-rescue-replan-config'

function loadConfig() {
  try {
    if (typeof localStorage === 'undefined') return {}
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') ?? {}
  } catch {
    return {}
  }
}

// Capacity-aware re-plan: shows, live from the cards, how far over capacity the
// remaining exam work is and how much each module must compress to fit the days
// left at the chosen daily load.
export function ReplanPanel({ cards, referenceDate, onApply, onUndo, canUndo }) {
  const [config, setConfig] = useState(() => ({ dailyHours: 8, projectHours: 40, ...loadConfig() }))

  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {
      /* storage unavailable */
    }
  }, [config])

  const plan = useMemo(
    () => buildReplan(cards, { referenceDate, dailyHours: config.dailyHours, projectHours: config.projectHours }),
    [cards, referenceDate, config.dailyHours, config.projectHours],
  )

  const schedule = useMemo(
    () => computeReplanSchedule(cards, { referenceDate, dailyHours: config.dailyHours }),
    [cards, referenceDate, config.dailyHours],
  )

  function handleApply() {
    if (!onApply || schedule.assignments.length === 0) return
    const ok = window.confirm(
      `Re-plan will reschedule ${schedule.count} exam cards across the days left (highest priority first, ` +
        `${config.dailyHours}h/day), and flag ${schedule.overflow} as beyond capacity.\n\n` +
        'A backup is downloaded first and you can undo. Apply now?',
    )
    if (ok) onApply(schedule.assignments)
  }

  const adjust = (key, delta, min, max) =>
    setConfig((current) => ({ ...current, [key]: Math.max(min, Math.min(max, current[key] + delta)) }))

  const maxOutstanding = Math.max(1, ...plan.modules.map((module) => module.outstanding))

  return (
    <section className="replan-panel panel" aria-label="Capacity re-plan">
      <header className="replan-head">
        <div>
          <p className="eyebrow">Rescue re-plan</p>
          <h3>{plan.daysLeft} days left · {plan.dailyHours}h/day = {plan.capacity}h capacity</h3>
        </div>
        <div className={`replan-verdict ${plan.fits ? 'ok' : 'over'}`}>
          {plan.fits ? 'Exam work fits' : `Over by ${plan.overBy}h`}
        </div>
      </header>

      <div className="replan-bignum">
        <div>
          <strong>{plan.examHours}h</strong>
          <span>exam work outstanding</span>
        </div>
        <div className="replan-vs">vs</div>
        <div>
          <strong>{plan.studyCapacity}h</strong>
          <span>study capacity (after {plan.reservedProject}h project)</span>
        </div>
        <div className="replan-vs">→</div>
        <div>
          <strong className={plan.compressionPct > 0 ? 'warn' : 'ok'}>
            {plan.compressionPct > 0 ? `−${plan.compressionPct}%` : 'fits'}
          </strong>
          <span>{plan.compressionPct > 0 ? 'must compress' : 'no cuts needed'}</span>
        </div>
      </div>

      <div className="replan-controls">
        <div className="replan-stepper">
          <span>Daily hours</span>
          <div>
            <button type="button" onClick={() => adjust('dailyHours', -1, 2, 16)} aria-label="Fewer daily hours">−</button>
            <strong>{config.dailyHours}h</strong>
            <button type="button" onClick={() => adjust('dailyHours', 1, 2, 16)} aria-label="More daily hours">+</button>
          </div>
        </div>
        <div className="replan-stepper">
          <span>My project share</span>
          <div>
            <button type="button" onClick={() => adjust('projectHours', -5, 0, 120)} aria-label="Less project time">−</button>
            <strong>{config.projectHours}h</strong>
            <button type="button" onClick={() => adjust('projectHours', 5, 0, 120)} aria-label="More project time">+</button>
          </div>
        </div>
      </div>

      <div className="replan-modules">
        {plan.modules.map((module) => {
          const outstandingPct = (module.outstanding / maxOutstanding) * 100
          const targetPct = (module.target / maxOutstanding) * 100
          return (
            <div className="replan-module" key={module.group}>
              <div className="replan-module-head">
                <strong>{MODULE_LABELS[module.group] ?? module.group}</strong>
                <span>
                  {module.outstanding}h → <em>keep {module.target}h</em>
                  {module.cut > 0 ? ` · trim ${module.cut}h` : ''} · ~{module.perDay}h/day
                </span>
              </div>
              <div className="replan-bar">
                <span className="replan-bar-outstanding" style={{ width: `${outstandingPct}%` }} />
                <span className="replan-bar-target" style={{ width: `${targetPct}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <p className="replan-guidance">
        {plan.compressionPct > 0 ? (
          <>
            To fit, run a <strong>single high-yield pass</strong>: keep one lab/paper run per session and drop the duplicate
            timed re-runs except on weak spots. Protect the <strong>6 Aug project</strong> deadline first, then split the rest
            across {MODULE_LABELS['Applied ML']}, {MODULE_LABELS['Time Series']}, and {MODULE_LABELS.MAT700}.
          </>
        ) : (
          <>You have headroom — hold the pace and keep the backlog cleared.</>
        )}
      </p>

      {onApply && (
        <div className="replan-apply">
          <button type="button" className="primary-button" onClick={handleApply}>
            Apply re-plan to my {schedule.count} exam cards
          </button>
          {canUndo && (
            <button type="button" className="text-button" onClick={onUndo}>
              Undo last re-plan
            </button>
          )}
          <small>
            Reschedules by priority, {config.dailyHours}h/day from today — {schedule.overflow} land beyond {' '}
            {plan.daysLeft} days (stretch). Backs up first; fully reversible.
          </small>
        </div>
      )}
    </section>
  )
}
