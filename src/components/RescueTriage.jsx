import { useState } from 'react'
import { checklistDoneCount, formatDate } from '../utils/progress'
import { getRescueTriageCards, isValidTriageDate } from '../utils/rescueTriage'
import './RescueTriage.css'

function cardNumberLabel(number) {
  if (number === undefined || number === null || number === '') return 'Custom card'
  return String(number).startsWith('#') ? String(number) : `#${number}`
}

function TriageCard({
  card,
  referenceDate,
  onOpenCard,
  onMarkDone,
  onMoveToRescueLane,
  onMarkWaiting,
  onSaveWaitingReason,
  onDefer,
}) {
  const [waitingReason, setWaitingReason] = useState('')
  const [deferDate, setDeferDate] = useState('')
  const checklistDone = checklistDoneCount(card)
  const checklistTotal = card.checklist?.length ?? 0
  const validDeferDate = isValidTriageDate(deferDate, referenceDate)

  function markWaiting() {
    const reason = waitingReason.trim()
    onMarkWaiting?.(card.id)
    if (reason && onSaveWaitingReason) onSaveWaitingReason(card.id, reason)
  }

  return (
    <article className="rescue-triage-card" aria-labelledby={`rescue-triage-title-${card.id}`}>
      <header className="rescue-triage-card-header">
        <div>
          <p className="eyebrow">Needs one decision</p>
          <div className="rescue-triage-title-row">
            <span className="card-number">{cardNumberLabel(card.number)}</span>
            <h3 id={`rescue-triage-title-${card.id}`}>{card.title}</h3>
          </div>
        </div>
        <button type="button" className="secondary-button" onClick={() => onOpenCard?.(card.id)} disabled={!onOpenCard}>
          Open card
        </button>
      </header>

      <div className="rescue-triage-meta" aria-label="Canonical card information">
        <span>{card.moduleGroup || card.module || 'No module'}</span>
        <span>{card.phase || 'No phase'}</span>
        <span>{card.priority || 'No priority'}</span>
        <span>Due {formatDate(card.dueDate)}</span>
        <span>{card.status || 'No status'}</span>
      </div>

      <div className="rescue-triage-context">
        <p>{card.description || 'No card description recorded.'}</p>
        {card.doneCondition && (
          <p>
            <strong>Finish when:</strong> {card.doneCondition}
          </p>
        )}
        {card.evidenceRequirement && (
          <p>
            <strong>Evidence:</strong> {card.evidenceRequirement}
          </p>
        )}
        {checklistTotal > 0 && (
          <p className="rescue-triage-checklist">
            {checklistDone}/{checklistTotal} checklist items complete
          </p>
        )}
      </div>

      <div className="rescue-triage-decisions" aria-label={`Choose what happens to ${card.title}`}>
        <button type="button" className="primary-button" onClick={() => onMarkDone?.(card.id)} disabled={!onMarkDone}>
          Mark done
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={() => onMoveToRescueLane?.(card.id)}
          disabled={!onMoveToRescueLane}
        >
          Move to Rescue Lane
        </button>
      </div>

      <div className="rescue-triage-secondary-decisions">
        <div className="rescue-triage-waiting">
          {onSaveWaitingReason && (
            <label>
              <span>Optional blocker reason</span>
              <input
                type="text"
                value={waitingReason}
                maxLength="160"
                placeholder="What must happen before this can continue?"
                onChange={(event) => setWaitingReason(event.target.value)}
              />
            </label>
          )}
          <button type="button" className="secondary-button" onClick={markWaiting} disabled={!onMarkWaiting}>
            Mark Waiting / Blocked
          </button>
        </div>

        <div className="rescue-triage-defer">
          <label>
            <span>Selected new due date</span>
            <input
              type="date"
              value={deferDate}
              min={referenceDate}
              onChange={(event) => setDeferDate(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="secondary-button"
            onClick={() => onDefer?.(card.id, deferDate)}
            disabled={!onDefer || !validDeferDate}
          >
            Defer to selected date
          </button>
        </div>
      </div>
    </article>
  )
}

export function RescueTriage({
  overdueCards,
  referenceDate,
  onOpenCard,
  onMarkDone,
  onMoveToRescueLane,
  onMarkWaiting,
  onSaveWaitingReason,
  onDefer,
}) {
  const cards = getRescueTriageCards(overdueCards, referenceDate)
  const [selectedCardId, setSelectedCardId] = useState('')
  const selectedIndex = Math.max(0, cards.findIndex((card) => card.id === selectedCardId))
  const card = cards[selectedIndex] ?? null

  if (!card) {
    return (
      <section className="rescue-triage rescue-triage-empty" aria-label="Missed-card triage">
        <p className="eyebrow">Triage complete</p>
        <h2>No overdue cards need a decision.</h2>
        <p>Rescue Lane remains available if a card slips later.</p>
      </section>
    )
  }

  return (
    <section className="rescue-triage" aria-label="Missed-card triage">
      <header className="rescue-triage-heading">
        <div>
          <p className="eyebrow">Missed-card triage</p>
          <h2>Decide one card at a time</h2>
          <p>Nothing moves until you choose an action or a date for this card.</p>
        </div>
        <div className="rescue-triage-position" aria-live="polite">
          <strong>{selectedIndex + 1}</strong>
          <span>of {cards.length}</span>
        </div>
      </header>

      <TriageCard
        key={card.id}
        card={card}
        referenceDate={referenceDate}
        onOpenCard={onOpenCard}
        onMarkDone={onMarkDone}
        onMoveToRescueLane={onMoveToRescueLane}
        onMarkWaiting={onMarkWaiting}
        onSaveWaitingReason={onSaveWaitingReason}
        onDefer={onDefer}
      />

      {cards.length > 1 && (
        <nav className="rescue-triage-navigation" aria-label="Overdue cards">
          <button
            type="button"
            className="ghost-button"
            onClick={() => setSelectedCardId(cards[selectedIndex - 1].id)}
            disabled={selectedIndex === 0}
          >
            Previous card
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setSelectedCardId(cards[selectedIndex + 1].id)}
            disabled={selectedIndex === cards.length - 1}
          >
            Next card
          </button>
        </nav>
      )}
    </section>
  )
}
