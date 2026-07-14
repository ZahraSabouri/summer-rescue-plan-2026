import { useState } from 'react'
import { CardSummary } from './CardSummary'

function ageMeta(days) {
  if (days <= 1) return { text: 'yesterday', level: 'soft' }
  if (days <= 7) return { text: `${days}d late`, level: 'warn' }
  return { text: `${days}d late`, level: 'severe' }
}

// How buried a module is, from its oldest slip and how many are stacked up.
function severityFor(group) {
  const score = Math.min(1, (group.maxDaysLate / 14) * 0.6 + (group.count / 6) * 0.4)
  const level = score >= 0.66 ? 'severe' : score >= 0.33 ? 'warn' : 'soft'
  const label = level === 'severe' ? 'Deep backlog' : level === 'warn' ? 'Behind' : 'Slipping'
  return { pct: Math.round(Math.max(0.12, score) * 100), level, label }
}

function headline(total) {
  if (total <= 2) return 'Almost clear — knock these out and you’re current.'
  if (total <= 6) return 'A manageable backlog. Clear the oldest in each module first.'
  return 'Deep backlog. Pick the most-behind module and dig out before adding more.'
}

// A "recovery board" for overdue work: a runway bar showing how far the backlog
// stretches, per-module severity, and a highlighted entry point in each module.
export function CatchUpPanel({ catchUp, actions }) {
  const [expanded, setExpanded] = useState({})
  if (!catchUp || catchUp.total === 0) return null

  const { total, moduleCount, groups, buckets } = catchUp
  const oldest = Math.max(...groups.map((group) => group.maxDaysLate))
  const runway = [
    { key: 'older', label: 'Over a week', value: buckets.older, level: 'severe' },
    { key: 'week', label: 'This week', value: buckets.week, level: 'warn' },
    { key: 'yesterday', label: 'Yesterday', value: buckets.yesterday, level: 'soft' },
  ].filter((segment) => segment.value > 0)

  return (
    <section className="catchup-panel panel" aria-label="Overdue tasks to catch up on">
      <header className="catchup-hero">
        <div className="catchup-hero-lead">
          <p className="eyebrow">Catch up first</p>
          <h3>
            <span className="catchup-count">{total}</span>
            {total === 1 ? ' task' : ' tasks'} behind · {moduleCount} {moduleCount === 1 ? 'module' : 'modules'}
          </h3>
          <p className="catchup-sub">
            {headline(total)} Oldest is <strong>{oldest} {oldest === 1 ? 'day' : 'days'}</strong> old.
          </p>
        </div>
        <div className="catchup-runway">
          <div className="catchup-runway-bar" aria-hidden="true">
            {runway.map((segment) => (
              <span
                key={segment.key}
                className={`seg ${segment.level}`}
                style={{ flexGrow: segment.value }}
                title={`${segment.value} ${segment.label}`}
              />
            ))}
          </div>
          <div className="catchup-runway-legend">
            {runway.map((segment) => (
              <span key={segment.key} className={segment.level}>
                <em aria-hidden="true" /> {segment.value} {segment.label.toLowerCase()}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="catchup-lanes">
        {groups.map((group) => {
          const sev = severityFor(group)
          const isOpen = Boolean(expanded[group.group])
          const [first, ...rest] = group.items
          const firstAge = ageMeta(first.daysLate)
          return (
            <div className={`catchup-lane ${sev.level}`} key={group.group}>
              <div className="catchup-lane-head">
                <div className="catchup-lane-title">
                  <strong>{group.label}</strong>
                  <span className={`catchup-sev ${sev.level}`}>{sev.label}</span>
                </div>
                <div className="catchup-lane-meta">
                  <span>
                    {group.count} behind · up to {group.maxDaysLate}d
                    {group.hoursBehind > 0 ? ` · ~${group.hoursBehind}h` : ''}
                  </span>
                  <div className="catchup-sev-bar">
                    <span className={sev.level} style={{ width: `${sev.pct}%` }} />
                  </div>
                </div>
              </div>

              <div className="catchup-cards">
                <div className="catchup-card start-here">
                  <span className="catchup-flag">▶ Start here · {firstAge.text}</span>
                  <CardSummary card={first.card} compact {...actions} />
                </div>
                {isOpen &&
                  rest.map(({ card, daysLate }) => {
                    const meta = ageMeta(daysLate)
                    return (
                      <div className="catchup-card" key={card.id}>
                        <span className={`catchup-late ${meta.level}`}>{meta.text}</span>
                        <CardSummary card={card} compact {...actions} />
                      </div>
                    )
                  })}
              </div>

              {rest.length > 0 && (
                <button
                  type="button"
                  className="catchup-more"
                  onClick={() => setExpanded((current) => ({ ...current, [group.group]: !isOpen }))}
                >
                  {isOpen ? 'Show less' : `Show ${rest.length} more behind in ${group.label}`}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
