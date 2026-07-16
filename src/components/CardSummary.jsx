import { STATUS_OPTIONS } from '../data/constants'
import {
  addDays,
  cardKind,
  checklistDoneCount,
  checklistPercent,
  formatDate,
  hasEvidence,
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
  const overdue =
    referenceDate && kindFeatures(card).overdue && card.dueDate && card.dueDate < referenceDate && !card.done

  return (
    <article className={`work-card ${compact ? 'compact' : ''} ${board ? 'board-card' : ''} ${card.done ? 'is-done' : ''}`}>
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
        <div className="progress-line" aria-label={`Checklist ${checklist}% complete`}>
          <span style={{ width: `${checklist}%` }} />
        </div>
        <span>
          {doneItems}/{totalItems} checklist
        </span>
        {evidenceExpected && <span>{evidenceReady ? 'Evidence logged' : 'Evidence open'}</span>}
      </div>

      <div className="work-card-controls">
        <label className="done-toggle">
          <input type="checkbox" checked={card.done} onChange={() => onToggleDone(card.id)} />
          <span>Done</span>
        </label>

        {!board && (
          <>
            <select
              aria-label={`Move card ${cardNumberLabel(card.number)}`}
              value={card.status}
              onChange={(event) => onStatusChange(card.id, event.target.value)}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

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
          </>
        )}

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

      {isActiveSession && <CardSessionTimer cardId={card.id} />}
    </article>
  )
}
