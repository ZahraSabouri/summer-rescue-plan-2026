import { useMemo, useState } from 'react'
import {
  BarSeries,
  CalendarHeatmap,
  ChartEmpty,
  DonutRing,
  LineChart,
  StackedModuleBars,
} from './Charts'
import {
  bucketSeries,
  buildActivityHeatmap,
  buildBurnUp,
  buildHoursSeries,
  buildPace,
} from '../utils/history'
import { formatDate, groupBy, isTrackableCard } from '../utils/progress'

const MODULE_COLORS = {
  'Applied ML': '--chart-aml',
  'Time Series': '--chart-ts',
  MAT700: '--chart-mat700',
  'Group Project': '--chart-project',
  Admin: '--chart-admin',
  Health: '--chart-health',
}

function moduleColor(name) {
  return MODULE_COLORS[name] ?? '--chart-1'
}

const GRAINS = [
  { id: 'day', label: 'Days' },
  { id: 'week', label: 'Weeks' },
  { id: 'month', label: 'Months' },
]

function rate(value) {
  const number = Number(value || 0)
  return Number.isInteger(number) ? String(number) : number.toFixed(1)
}

export function ProgressView({ cards, snapshots, referenceDate, mat700Active, schedule }) {
  const [grain, setGrain] = useState('day')

  const scopedCards = useMemo(
    () => (mat700Active ? cards : cards.filter((c) => c.moduleGroup !== 'MAT700')),
    [cards, mat700Active],
  )

  const pace = useMemo(() => buildPace(scopedCards, referenceDate, { schedule }), [scopedCards, referenceDate, schedule])

  const burnSeries = useMemo(() => {
    const { series, total } = buildBurnUp(scopedCards, referenceDate, { schedule })
    // For the chart, stop the actual line at "today" but keep the ideal line running.
    const today = referenceDate.slice(0, 10)
    const trimmed = series.map((p) => ({
      ...p,
      done: p.isFuture ? null : p.done,
    }))
    return { series: bucketSeries(trimmed, grain), total, today }
  }, [scopedCards, referenceDate, grain, schedule])

  const hours = useMemo(() => buildHoursSeries(snapshots, grain), [snapshots, grain])

  const heatmap = useMemo(
    () => buildActivityHeatmap(scopedCards, referenceDate, { schedule }),
    [scopedCards, referenceDate, schedule],
  )

  const moduleRows = useMemo(() => {
    const planned = scopedCards.filter(isTrackableCard)
    return Object.entries(groupBy(planned, (c) => c.moduleGroup))
      .map(([label, group]) => ({
        label,
        done: group.filter((c) => c.done).length,
        total: group.length,
        color: moduleColor(label),
      }))
      .sort((a, b) => b.total - a.total)
  }, [scopedCards])

  const topModules = moduleRows.slice(0, 4)
  const loggedTotal = hours.totalLogged

  return (
    <div className="progress-view">
      <section className={`pace-banner ${pace.onTrack ? 'on-track' : 'behind'}`}>
        <div className="pace-headline">
          <p className="eyebrow">{pace.onTrack ? 'Required pace covered' : 'Pace shortfall'}</p>
          <h2>
            {pace.remaining} cards left across {pace.studyDaysLeft} study days
          </h2>
          <p className="pace-sub">
            Clear {rate(pace.requiredPerDay)} cards/day from here. Recent rate: {rate(pace.recentPerDay)}/day
            over {pace.recentDays} days. Linear ideal: {pace.done}/{pace.total} done, {pace.delta >= 0 ? '+' : ''}
            {pace.delta} vs plan. Exam window {formatDate(schedule.examWindowStart)} ({pace.daysToExam} days away).
          </p>
        </div>
        <DonutRing value={pace.done} total={pace.total} sublabel="done" color={pace.onTrack ? '--chart-ts' : '--chart-mat700'} />
      </section>

      <section className="workspace-section">
        <div className="section-heading with-toggle">
          <div>
            <p className="eyebrow">Progression</p>
            <h2>Cumulative completion vs ideal pace</h2>
          </div>
          <div className="grain-toggle" role="group" aria-label="Time grain">
            {GRAINS.map((g) => (
              <button
                key={g.id}
                type="button"
                className={grain === g.id ? 'active' : ''}
                onClick={() => setGrain(g.id)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <LineChart
          data={burnSeries.series}
          xKey="label"
          yMax={burnSeries.total}
          series={[
            { key: 'done', color: '--chart-1', label: 'Completed' },
            { key: 'ideal', color: '--chart-ideal', label: 'Ideal pace', dashed: true },
          ]}
        />
        <div className="chart-legend">
          <span className="legend-dot c1">Completed (actual)</span>
          <span className="legend-dot ideal">Ideal pace line</span>
        </div>
      </section>

      <section className="split-grid">
        <div className="workspace-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Effort</p>
              <h2>Hours recorded per {grain === 'day' ? 'day' : grain === 'week' ? 'week' : 'month'}</h2>
            </div>
          </div>
          {hours.series.length > 0 ? (
            <>
              <BarSeries data={hours.series} valueKey="logged" xKey={grain === 'day' ? 'day' : 'label'} color="--chart-2" />
              <p className="chart-caption">{loggedTotal}h recorded in total since tracking began.</p>
            </>
          ) : (
            <ChartEmpty message="Log hours on cards and a daily bar appears here automatically." />
          )}
        </div>

        <div className="workspace-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">By module</p>
              <h2>Completion share</h2>
            </div>
          </div>
          <div className="ring-row">
            {topModules.map((m) => (
              <DonutRing
                key={m.label}
                value={m.done}
                total={m.total}
                label={m.label}
                color={m.color}
                size={104}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="split-grid">
        <div className="workspace-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Module load</p>
              <h2>Progress per module</h2>
            </div>
          </div>
          <StackedModuleBars rows={moduleRows} />
        </div>

        <div className="workspace-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Consistency</p>
              <h2>Activity heatmap</h2>
            </div>
          </div>
          <CalendarHeatmap days={heatmap} />
          <div className="heat-legend">
            <span>Less</span>
            <span className="heat-cell heat-1" />
            <span className="heat-cell heat-2" />
            <span className="heat-cell heat-3" />
            <span className="heat-cell heat-4" />
            <span>More</span>
          </div>
        </div>
      </section>
    </div>
  )
}
