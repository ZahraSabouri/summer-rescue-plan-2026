import { STATUS_COLUMNS } from '../data/constants'
import { buildActivityHeatmap, buildBurnUp, buildHoursSeries, buildPace, bucketSeries } from '../utils/history'
import {
  addDays,
  cardKind,
  checklistDoneCount,
  formatDate,
  getCardDate,
  getWeekDays,
  getWeekLabel,
  groupBy,
  hasEvidence,
  isCurrentWeek,
  KIND_META,
  requiresEvidence,
  sortCards,
  sumHours,
} from '../utils/progress'
import { CardSummary } from './CardSummary'
import { BarSeries, CalendarHeatmap, DonutRing, LineChart, StackedModuleBars } from './Charts'

const MODULE_COLORS = {
  'Applied ML': '--chart-aml',
  'Time Series': '--chart-ts',
  MAT700: '--chart-mat700',
  'Group Project': '--chart-project',
  Admin: '--chart-admin',
  Health: '--chart-health',
  'Cross-module': '--chart-1',
  General: '--muted',
}

function moduleColor(label) {
  return MODULE_COLORS[label] ?? '--chart-1'
}

function percent(done, total) {
  if (!total) return 0
  return Math.round((done / total) * 100)
}

function hours(value) {
  const number = Number(value || 0)
  return Number.isInteger(number) ? `${number}h` : `${number.toFixed(1)}h`
}

function rate(value) {
  const number = Number(value || 0)
  return Number.isInteger(number) ? String(number) : number.toFixed(1)
}

function MetricTile({ label, value, detail, tone = 'neutral' }) {
  return (
    <article className={`metric-tile ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <p>{detail}</p>}
    </article>
  )
}

function BarRow({ label, value, max, detail }) {
  const width = max ? Math.max(4, Math.round((value / max) * 100)) : 0
  return (
    <div className="bar-row">
      <div>
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>
      <div className="bar-track" aria-hidden="true">
        <span style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function MiniCardList({ cards, empty, actions }) {
  if (cards.length === 0) return <p className="empty-state">{empty}</p>

  return (
    <div className="mini-card-list">
      {sortCards(cards).map((card) => (
        <CardSummary key={card.id} card={card} compact {...actions} />
      ))}
    </div>
  )
}

export function DashboardView({ cards, stats, referenceDate, weekReferenceDate = referenceDate, mat700Active, actions, schedule, scopeLabel = '' }) {
  const displayScope = scopeLabel === 'MAT700' ? 'Data Mining' : scopeLabel
  const donePct = percent(stats.done, stats.total)
  const weekOpen = cards.filter(
    (card) => !card.done && isCurrentWeek(getCardDate(card), weekReferenceDate),
  )
  const weekHours = sumHours(weekOpen, 'estimatedHours')
  const next7End = addDays(referenceDate, 7)
  const phaseMax = Math.max(...stats.byPhase.map((item) => item.total), 1)
  const moduleMax = Math.max(...stats.byModule.map((item) => item.estimated), 1)
  const scopedCards = mat700Active ? cards : cards.filter((card) => card.moduleGroup !== 'MAT700')
  const pace = buildPace(scopedCards, referenceDate, { schedule })
  const burn = buildBurnUp(scopedCards, referenceDate, { schedule })
  const burnSeries = bucketSeries(
    burn.series.map((point) => ({
      ...point,
      done: point.isFuture ? null : point.done,
    })),
    'week',
  )
  const moduleRows = stats.byModule.map((item) => ({
    label: item.label,
    done: item.done,
    total: item.total,
    color: moduleColor(item.label),
  }))

  return (
    <div className="view-grid dashboard-view">
      {displayScope && (
        <section className="planner-scope-banner" aria-label={`${displayScope} planner scope`}>
          <div>
            <p className="eyebrow">Module planner</p>
            <strong>{displayScope}</strong>
          </div>
          <span>Every metric and card below is limited to this module. Use Clear above for the whole campaign.</span>
        </section>
      )}
      <section className="command-grid" aria-label="Progress figures">
        <article className={`command-panel pace-card ${pace.onTrack ? 'on-track' : 'behind'}`}>
          <div>
            <p className="eyebrow">{pace.onTrack ? 'Required pace covered' : 'Pace shortfall'}</p>
            <h2>{pace.remaining} cards left</h2>
            <p>
              Need {rate(pace.requiredPerDay)}/day across {pace.studyDaysLeft} study days. Recent rate:{' '}
              {rate(pace.recentPerDay)}/day. Linear ideal: {pace.done}/{pace.total} complete,{' '}
              {pace.delta >= 0 ? '+' : ''}{pace.delta} vs plan. Exam window in {pace.daysToExam} days.
            </p>
          </div>
          <DonutRing
            value={pace.done}
            total={pace.total}
            sublabel="done"
            color={pace.onTrack ? '--chart-ts' : '--chart-mat700'}
            size={112}
          />
        </article>

        <article className="command-panel chart-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Trajectory</p>
              <h2>Completion vs pace</h2>
            </div>
          </div>
          <LineChart
            data={burnSeries}
            xKey="label"
            height={168}
            yMax={burn.total}
            series={[
              { key: 'done', color: '--chart-1' },
              { key: 'ideal', color: '--chart-ideal', dashed: true },
            ]}
          />
        </article>

        <article className="command-panel module-figure">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Modules</p>
              <h2>{displayScope ? `${displayScope} completion` : 'Completion split'}</h2>
            </div>
          </div>
          <StackedModuleBars rows={moduleRows} />
        </article>
      </section>

      <section className="metric-grid" aria-label="Campaign metrics">
        <MetricTile label={displayScope ? `${displayScope} cards` : 'Campaign cards'} value={stats.baseTotal} detail={`${stats.done} done / ${stats.notDone} open`} />
        <MetricTile label="Completion" value={`${donePct}%`} detail="Done across active tracker" tone="green" />
        <MetricTile
          label="Hours"
          value={`${hours(stats.loggedHours)} / ${hours(stats.estimatedHours)}`}
          detail="Logged vs estimated"
        />
        <MetricTile label={weekReferenceDate > referenceDate ? 'Launch week' : 'Current week'} value={weekOpen.length} detail={`${hours(weekHours)} planned`} tone="amber" />
        <MetricTile label="Overdue" value={stats.overdueCards.length} detail="Open cards past due date" tone="red" />
        <MetricTile label="Due today" value={stats.dueToday.length} detail={formatDate(referenceDate)} />
        <MetricTile label="Next 7 days" value={stats.nextSevenCards.length} detail={`${formatDate(referenceDate)} - ${formatDate(next7End)}`} />
        {!displayScope && <MetricTile label="Rescue lane" value={stats.rescueCards.length} detail="Buffer and recovery cards" tone="amber" />}
        <MetricTile label="Waiting" value={stats.waitingCards.length} detail="Blocked or date-dependent" />
        {(!displayScope || scopeLabel === 'MAT700') && (
          <MetricTile label="Data Mining" value={mat700Active ? 'Study lane active' : 'Paused'} detail="Tutorial-first recovery lane" tone="green" />
        )}
        {(!displayScope || scopeLabel === 'Group Project') && (
          <MetricTile
            label="Project ship"
            value={`${percent(stats.project.done, stats.project.total)}%`}
            detail={`${stats.project.done}/${stats.project.total} project cards done`}
          />
        )}
        {!displayScope && (
          <MetricTile
            label="Exam readiness"
            value={`${percent(stats.examReadiness.done, stats.examReadiness.examCards)}%`}
            detail={`${stats.examReadiness.done}/${stats.examReadiness.examCards} exam cards done`}
          />
        )}
      </section>

      <section className="split-grid">
        <div className="workspace-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Today</p>
              <h2>Due today</h2>
            </div>
          </div>
          <MiniCardList cards={stats.dueToday.slice(0, 8)} empty="No open cards due today." actions={actions} />
        </div>

        <div className="workspace-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Week</p>
              <h2>{getWeekLabel(weekReferenceDate)}</h2>
            </div>
          </div>
          <MiniCardList cards={weekOpen.slice(0, 8)} empty="No open cards in the selected week." actions={actions} />
        </div>
      </section>

      <section className="split-grid">
        <div className="workspace-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Phase Load</p>
              <h2>Cards by phase</h2>
            </div>
          </div>
          <div className="bar-stack">
            {stats.byPhase.map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                value={item.total}
                max={phaseMax}
                detail={`${item.done}/${item.total} done, ${hours(item.estimated)} est`}
              />
            ))}
          </div>
        </div>

        <div className="workspace-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Module Load</p>
              <h2>Estimated workload</h2>
            </div>
          </div>
          <div className="bar-stack">
            {stats.byModule.map((item) => (
              <BarRow
                key={item.label}
                label={item.label}
                value={item.estimated}
                max={moduleMax}
                detail={`${item.total} cards, ${hours(item.logged)} logged`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Attention</p>
            <h2>Overdue, waiting, and rescue</h2>
          </div>
        </div>
        <div className="three-column-list">
          <div>
            <h3>Overdue</h3>
            <MiniCardList cards={stats.overdueCards.slice(0, 5)} empty="No overdue cards." actions={actions} />
          </div>
          <div>
            <h3>Waiting</h3>
            <MiniCardList cards={stats.waitingCards.slice(0, 5)} empty="No waiting cards." actions={actions} />
          </div>
          <div>
            <h3>Rescue</h3>
            <MiniCardList cards={stats.rescueCards.slice(0, 5)} empty="No rescue cards." actions={actions} />
          </div>
        </div>
      </section>
    </div>
  )
}

export function BoardView({ cards, actions }) {
  const grouped = groupBy(cards, (card) => card.status)

  return (
    <section className="board-view" aria-label="Status columns">
      {STATUS_COLUMNS.map((column) => {
        const columnCards = sortCards(grouped[column.id] ?? [])
        return (
          <div className="board-column" key={column.id}>
            <header>
              <h2>{column.label}</h2>
              <span>{columnCards.length}</span>
            </header>
            <div className="board-card-list">
              {columnCards.map((card) => (
                <CardSummary key={card.id} card={card} compact board {...actions} />
              ))}
              {columnCards.length === 0 && <p className="empty-state">No cards.</p>}
            </div>
          </div>
        )
      })}
    </section>
  )
}

export function TableView({ cards, actions }) {
  return (
    <section className="table-shell" aria-label="Card table">
      <p className="table-scroll-note">Card titles stay pinned; scroll sideways for status, hours, evidence, and completion.</p>
      <table className="card-table">
        <thead>
          <tr>
            <th>Card</th>
            <th>Module</th>
            <th>Kind</th>
            <th>Phase</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Due</th>
            <th>Hours</th>
            <th>Checklist</th>
            <th>Evidence</th>
            <th>Done</th>
          </tr>
        </thead>
        <tbody>
          {sortCards(cards).map((card) => (
            <tr key={card.id}>
              <td>
                <button type="button" className="text-button strong" onClick={() => actions.onOpen(card.id)}>
                  {card.number}. {card.title}
                </button>
              </td>
              <td>{card.module}</td>
              <td>
                <span className={`kind-chip kind-${cardKind(card)}`}>{KIND_META[cardKind(card)].label}</span>
              </td>
              <td>{card.phase}</td>
              <td>{card.priority}</td>
              <td>
                <select value={card.status} onChange={(event) => actions.onStatusChange(card.id, event.target.value)}>
                  {STATUS_COLUMNS.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.id}
                    </option>
                  ))}
                </select>
              </td>
              <td>{formatDate(card.dueDate || card.startDate)}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={card.actualHours}
                  onChange={(event) => actions.onHoursChange(card.id, event.target.value)}
                  aria-label={`Actual hours for card ${card.number}`}
                />
                <span className="muted"> / {hours(card.estimatedHours)}</span>
              </td>
              <td>
                {checklistDoneCount(card)}/{card.checklist.length}
              </td>
              <td>{hasEvidence(card) ? 'Logged' : 'Open'}</td>
              <td>
                <input type="checkbox" checked={card.done} onChange={() => actions.onToggleDone(card.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export function WeekView({ cards, referenceDate, actions }) {
  const days = getWeekDays(referenceDate)
  const noDateCards = sortCards(cards.filter((card) => !getCardDate(card)))

  return (
    <section className="week-view" aria-label="Week view">
      <header className="section-heading">
        <div>
          <p className="eyebrow">Calendar</p>
          <h2>{getWeekLabel(referenceDate)}</h2>
          <p className="week-view-note">
            Cards appear on their due date. Due-card estimates show the size of the whole card, not that day&apos;s reserved workload; use Schedule for daily hours.
          </p>
        </div>
      </header>

      <div className="week-grid">
        {days.map((day) => {
          const dayCards = sortCards(cards.filter((card) => getCardDate(card) === day))
          const dayHours = sumHours(dayCards, 'estimatedHours')
          return (
            <section className="day-column" key={day}>
              <header>
                <strong>{formatDate(day)}</strong>
                <span>{dayCards.length} due · {hours(dayHours)} card estimate</span>
              </header>
              <div className="day-card-list">
                {dayCards.map((card) => (
                  <CardSummary key={card.id} card={card} compact {...actions} />
                ))}
                {dayCards.length === 0 && <p className="empty-state">No cards.</p>}
              </div>
            </section>
          )
        })}
      </div>

      {noDateCards.length > 0 && (
        <section className="workspace-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Floating</p>
              <h2>No fixed date</h2>
            </div>
          </div>
          <MiniCardList cards={noDateCards} empty="No floating cards." actions={actions} />
        </section>
      )}
    </section>
  )
}

export function AnalyticsView({ cards, stats, snapshots, referenceDate, schedule }) {
  const weekCards = cards.filter((card) => isCurrentWeek(getCardDate(card), referenceDate))
  const statusMax = Math.max(...stats.byStatus.map((item) => item.total), 1)
  const burn = buildBurnUp(cards, referenceDate, { schedule })
  const burnSeries = bucketSeries(
    burn.series.map((point) => ({
      ...point,
      done: point.isFuture ? null : point.done,
    })),
    'week',
  )
  const hoursByWeek = buildHoursSeries(snapshots, 'week')
  const heatmap = buildActivityHeatmap(cards, referenceDate, { schedule })
  const moduleRows = stats.byModule.map((item) => ({
    label: item.label,
    done: item.done,
    total: item.total,
    color: moduleColor(item.label),
  }))
  const weeks = Object.entries(groupBy(cards.filter((card) => getCardDate(card)), (card) => getWeekLabel(getCardDate(card))))
    .map(([label, group]) => ({
      label,
      total: group.length,
      estimated: sumHours(group, 'estimatedHours'),
      logged: sumHours(group, 'actualHours'),
      done: group.filter((card) => card.done).length,
    }))
    .slice(0, 10)
  const weekMax = Math.max(...weeks.map((item) => item.estimated), 1)

  return (
    <div className="analytics-grid">
      <section className="workspace-section wide figure-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Runway</p>
            <h2>Cumulative completion vs ideal pace</h2>
          </div>
        </div>
        <LineChart
          data={burnSeries}
          xKey="label"
          height={230}
          yMax={burn.total}
          showDots
          series={[
            { key: 'done', color: '--chart-1' },
            { key: 'ideal', color: '--chart-ideal', dashed: true },
          ]}
        />
        <div className="chart-legend">
          <span className="legend-dot c1">Completed</span>
          <span className="legend-dot ideal">Ideal pace</span>
        </div>
      </section>

      <section className="workspace-section figure-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Effort</p>
            <h2>Recorded hours by week</h2>
          </div>
        </div>
        <BarSeries data={hoursByWeek.series} valueKey="logged" xKey="label" color="--chart-2" />
        <p className="chart-caption">{hours(hoursByWeek.totalLogged)} recorded from saved daily snapshots.</p>
      </section>

      <section className="workspace-section figure-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Module Progress</p>
            <h2>Done share</h2>
          </div>
        </div>
        <div className="ring-row">
          {moduleRows.slice(0, 5).map((module) => (
            <DonutRing
              key={module.label}
              value={module.done}
              total={module.total}
              label={module.label}
              color={module.color}
              size={104}
            />
          ))}
        </div>
      </section>

      <section className="workspace-section figure-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Consistency</p>
            <h2>Completion heatmap</h2>
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
      </section>

      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Status</p>
            <h2>Board distribution</h2>
          </div>
        </div>
        <div className="bar-stack">
          {stats.byStatus.map((item) => (
            <BarRow
              key={item.label}
              label={item.label}
              value={item.total}
              max={statusMax}
              detail={`${item.done}/${item.total} done, ${hours(item.logged)} logged`}
            />
          ))}
        </div>
      </section>

      <section className="workspace-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">This Week</p>
            <h2>Workload mix</h2>
          </div>
        </div>
        <div className="stat-table">
          {Object.entries(groupBy(weekCards, (card) => card.moduleGroup)).map(([module, group]) => (
            <div key={module}>
              <span>{module}</span>
              <strong>{group.length}</strong>
              <span>{hours(sumHours(group, 'estimatedHours'))}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="workspace-section wide figure-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Module Load</p>
            <h2>Progress per module</h2>
          </div>
        </div>
        <StackedModuleBars rows={moduleRows} />
      </section>

      <section className="workspace-section wide">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Runway</p>
            <h2>Weekly estimated load</h2>
          </div>
        </div>
        <div className="bar-stack">
          {weeks.map((item) => (
            <BarRow
              key={item.label}
              label={item.label}
              value={item.estimated}
              max={weekMax}
              detail={`${item.total} cards, ${item.done} done, ${hours(item.logged)} logged`}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

export function EvidenceView({ cards, actions }) {
  // Kind-gated: only cards that owe evidence (study/project kinds, or an
  // explicit requirement) plus anything that already logged proof.
  const evidenceCards = sortCards(
    cards.filter((card) => requiresEvidence(card) || hasEvidence(card)),
  )

  return (
    <section className="evidence-view" aria-label="Evidence logbook">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Logbook</p>
          <h2>Evidence and notes</h2>
        </div>
      </div>
      <div className="evidence-list">
        {evidenceCards.map((card) => (
          <article key={card.id} className="evidence-row">
            <div>
              <button type="button" className="text-button strong" onClick={() => actions.onOpen(card.id)}>
                {card.number}. {card.title}
              </button>
              <p>{card.evidenceRequirement || 'No evidence requirement recorded.'}</p>
              {card.notes[0] && <small>{card.notes[0].text}</small>}
            </div>
            <div>
              <span className={`status-pill ${hasEvidence(card) ? 'green' : 'amber'}`}>
                {hasEvidence(card) ? 'Logged' : 'Open'}
              </span>
              <span>{card.notes.length} notes</span>
              <span>{checklistDoneCount(card)}/{card.checklist.length} checklist</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function FocusView({
  title,
  eyebrow,
  description,
  cards,
  actions,
  emptyTitle = 'No open cards in this view.',
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
}) {
  const sorted = sortCards(cards)
  const openCards = sorted.filter((card) => !card.done)
  const doneCards = sorted.filter((card) => card.done)

  return (
    <section className="focus-view" aria-label={title}>
      <header className="focus-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <div className="focus-stats">
          <MetricTile label="Open" value={openCards.length} />
          <MetricTile label="Done" value={doneCards.length} />
          <MetricTile label="Estimate" value={hours(sumHours(sorted, 'estimatedHours'))} />
        </div>
      </header>

      <div className="focus-list">
        {openCards.map((card) => (
          <CardSummary key={card.id} card={card} {...actions} />
        ))}
        {openCards.length === 0 && (
          <div className="focus-empty-state" role="status">
            <strong>{emptyTitle}</strong>
            {emptyDescription && <p>{emptyDescription}</p>}
            {emptyActionLabel && onEmptyAction && (
              <button type="button" className="secondary-button" onClick={onEmptyAction}>
                {emptyActionLabel}
              </button>
            )}
          </div>
        )}
      </div>

      {doneCards.length > 0 && (
        <details className="done-details">
          <summary>{doneCards.length} done cards</summary>
          <div className="focus-list">
            {doneCards.map((card) => (
              <CardSummary key={card.id} card={card} compact {...actions} />
            ))}
          </div>
        </details>
      )}
    </section>
  )
}
