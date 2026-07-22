import { STATUS_OPTIONS } from '../data/constants'
import {
  addDays,
  cardPlanLane,
  cardKind,
  checklistDoneCount,
  checklistPercent,
  formatDate,
  hasEvidence,
  isOverdue,
  kindFeatures,
  requiresEvidence,
} from '../utils/progress'
import { CardSessionTimer } from './CardSessionTimer'

function cardNumberLabel(number) {
  return typeof number === 'number' ? `#${number}` : number
}

export function CardSummary({
  card,
  compact = false,
  board = false,
  onOpen,
  onStatusChange,
  onToggleDone,
  onHoursChange,
  onProgressChange,
  onReschedule,
  onStartSession,
  activeSessionCardId,
  referenceDate,
  onNavigateMeta,
}) {
  const isActiveSession = activeSessionCardId != null && activeSessionCardId === card.id
  const doneItems = checklistDoneCount(card)
  const totalItems = card.checklist.length
  const checklist = checklistPercent(card)
  const kind = cardKind(card)
  const evidenceExpected = requiresEvidence(card)
  const evidenceReady = hasEvidence(card)
  const latestNote = card.notes[0]?.text ?? ''
  const planLane = referenceDate ? cardPlanLane(card, referenceDate) : card.status
  const overdue = Boolean(referenceDate && isOverdue(card, referenceDate))

  return (
    <article
      className={`work-card ${compact ? 'compact' : ''} ${board ? 'board-card' : ''} ${card.done ? 'is-done' : ''} ${overdue ? 'is-overdue' : ''}`}
    >
      <div className="work-card-main">
        <div className="work-card-head">
          <span className="card-number">{cardNumberLabel(card.number)}</span>
          <button type="button" className="text-button card-title-button" onClick={() => onOpen(card.id)}>
            {card.title}
          </button>
        </div>

        <div className="meta-strip" aria-label="Card metadata">
          <button type="button" className={`meta-chip-button kind-chip kind-${kind}`} onClick={() => onNavigateMeta?.('kind', kind)}>{kindFeatures(card).label}</button>
          <button type="button" className="meta-chip-button" onClick={() => onNavigateMeta?.('phase', card.phase)}>{card.phase}</button>
          <button type="button" className="meta-chip-button" onClick={() => onNavigateMeta?.('module', card.moduleGroup)}>{card.module}</button>
          <button type="button" className="meta-chip-button" onClick={() => onNavigateMeta?.('priority', card.priority)}>{card.priority}</button>
          <button type="button" className="meta-chip-button" onClick={() => onNavigateMeta?.('slotType', card.slotType)}>{card.slotType}</button>
          <button type="button" className="meta-chip-button" onClick={() => onNavigateMeta?.('date', card.dueDate || card.startDate)}>{formatDate(card.dueDate || card.startDate)}</button>
        </div>

        {!compact && !board && (
          <p className="card-preview">
            {latestNote || card.description || card.doneCondition || 'No description recorded.'}
          </p>
        )}
      </div>

      <div className="work-card-progress">
        <div className="progress-line" aria-label={`Task ${card.progressPercent}% complete`}>
          <span style={{ width: `${card.progressPercent}%` }} />
        </div>
        <span>{card.progressPercent}% progress</span>
        <span>
          {doneItems}/{totalItems} checklist ({checklist}%)
        </span>
        {evidenceExpected && <span>{evidenceReady ? 'Evidence logged' : 'Evidence open'}</span>}
      </div>

      <div className="work-card-controls">
        <div className="card-control-fields">
          <label className="done-toggle">
            <input type="checkbox" checked={card.done} onChange={() => onToggleDone(card.id)} />
            <span>Done</span>
          </label>

          {!board && (
            <>
            <select
              aria-label={`Move card ${cardNumberLabel(card.number)}`}
              value={planLane}
              onChange={(event) => onStatusChange(card.id, event.target.value)}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <div className="hours-progress-group">
              <label className="hours-field">
                <span>Hours</span>
                <input
                  type="number"
                  min="0"
                  step="0.25"
                  value={card.actualHours}
                  onChange={(event) => onHoursChange(card.id, event.target.value)}
                  aria-label={`Actual hours for card ${cardNumberLabel(card.number)}`}
                />
              </label>
              <label className="hours-field progress-percent-field">
                <span>Progress</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  value={card.progressPercent}
                  onChange={(event) => onProgressChange?.(card.id, event.target.value)}
                  aria-label={`Progress percentage for card ${cardNumberLabel(card.number)}`}
                />
                <span>%</span>
              </label>
            </div>
            </>
          )}
        </div>

        <div className="card-control-actions">
          {overdue && (
            <div className="reschedule-inline" aria-label="Reschedule overdue card">
              <button type="button" onClick={() => onReschedule?.(card.id, referenceDate)}>
                Today
              </button>
              <button type="button" onClick={() => onReschedule?.(card.id, addDays(referenceDate, 1))}>
                Tomorrow
              </button>
            </div>
          )}

          {!isActiveSession && (
            <button type="button" className="secondary-button" onClick={() => onStartSession?.(card.id)}>
              Start
            </button>
          )}

          <button type="button" className="secondary-button" onClick={() => onOpen(card.id)}>
            Details
          </button>
        </div>
      </div>

      {isActiveSession && <CardSessionTimer cardId={card.id} />}
    </article>
  )
}
