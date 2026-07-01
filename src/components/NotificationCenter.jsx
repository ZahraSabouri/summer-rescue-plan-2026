import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDate, getCardDate, isOverdue } from '../utils/progress'

function daysBetween(fromISO, toDate) {
  const from = new Date(fromISO)
  if (Number.isNaN(from.getTime()) || Number.isNaN(toDate.getTime())) return null
  return Math.round((toDate - from) / 86400000)
}

const TYPE_ICON = {
  danger: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  warning: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  info: 'M12 16v-4M12 8h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
  success: 'M20 6 9 17l-5-5',
}

export function NotificationCenter({
  cards,
  referenceDate,
  examCountdown,
  unsavedSinceBackup,
  mat700Active,
  onGoView,
  onOpenCard,
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function onDoc(event) {
      if (open && wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const notices = useMemo(() => {
    const list = []
    const today = new Date(referenceDate)

    const overdue = cards.filter((card) => !card.done && isOverdue(card, referenceDate))
    if (overdue.length) {
      list.push({
        id: 'overdue',
        type: 'danger',
        title: `${overdue.length} overdue ${overdue.length > 1 ? 'cards' : 'card'}`,
        detail: overdue.slice(0, 3).map((card) => card.title).join(' · '),
        cardId: overdue[0].id,
        action: { label: 'Rescue lane', view: 'rescue' },
      })
    }

    const dueSoon = cards
      .filter((card) => !card.done && getCardDate(card))
      .map((card) => ({ card, d: daysBetween(referenceDate, new Date(getCardDate(card))) }))
      .filter(({ d }) => d !== null && d >= 0 && d <= 3)
      .sort((a, b) => a.d - b.d)
    if (dueSoon.length) {
      list.push({
        id: 'due-soon',
        type: 'warning',
        title: `${dueSoon.length} due within 3 days`,
        detail: dueSoon.slice(0, 3).map(({ card, d }) => `${card.title} (${d === 0 ? 'today' : `${d}d`})`).join(' · '),
        cardId: dueSoon[0].card.id,
        action: { label: 'This week', view: 'week' },
      })
    }

    if (examCountdown != null && examCountdown >= 0 && examCountdown <= 45) {
      list.push({
        id: 'exam',
        type: examCountdown <= 14 ? 'danger' : 'info',
        title: examCountdown === 0 ? 'Exam window opens today' : `${examCountdown} days to exams`,
        detail: 'Keep the high-yield lanes moving.',
        action: { label: 'Progress', view: 'progress' },
      })
    }

    if (unsavedSinceBackup) {
      list.push({
        id: 'backup',
        type: 'warning',
        title: 'Unsaved since last backup',
        detail: 'Export a JSON backup or connect autosave.',
      })
    }

    const blocked = cards.filter((card) => card.status === 'Waiting / Blocked' && !card.done)
    if (blocked.length) {
      list.push({
        id: 'blocked',
        type: 'info',
        title: `${blocked.length} waiting / blocked`,
        detail: blocked.slice(0, 2).map((card) => card.title).join(' · '),
        cardId: blocked[0].id,
      })
    }

    if (!mat700Active) {
      list.push({
        id: 'mat700',
        type: 'info',
        title: 'Data Mining lane is paused',
        detail: 'Turn it on in Settings if the resit stays live.',
      })
    }

    const doneToday = cards.filter((card) => card.done).length
    if (!list.length) {
      list.push({
        id: 'clear',
        type: 'success',
        title: 'All clear — nothing overdue',
        detail: `${doneToday} cards done so far. Keep the streak going.`,
      })
    }

    return list
  }, [cards, referenceDate, examCountdown, unsavedSinceBackup, mat700Active])

  const alertCount = notices.filter((notice) => notice.type === 'danger' || notice.type === 'warning').length

  function runAction(notice) {
    if (notice.action?.view) onGoView?.(notice.action.view)
    else if (notice.cardId) onOpenCard?.(notice.cardId)
    setOpen(false)
  }

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`icon-button notif-trigger${alertCount ? ' has-alerts' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${alertCount ? `, ${alertCount} need attention` : ''}`}
        title="Notifications"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {alertCount > 0 && <span className="notif-badge">{alertCount}</span>}
      </button>

      {open && (
        <div className="notif-pop" role="dialog" aria-label="Notifications">
          <div className="notif-head">
            <strong>Notifications</strong>
            <span>{alertCount ? `${alertCount} need attention` : 'You’re on track'}</span>
          </div>
          <div className="notif-list">
            {notices.map((notice) => (
              <div key={notice.id} className={`notif-item ${notice.type}`}>
                <span className="notif-ico" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={TYPE_ICON[notice.type]} />
                  </svg>
                </span>
                <div className="notif-body">
                  <strong>{notice.title}</strong>
                  {notice.detail && <p>{notice.detail}</p>}
                </div>
                {(notice.action || notice.cardId) && (
                  <button type="button" className="notif-action" onClick={() => runAction(notice)}>
                    {notice.action?.label ?? 'Open'}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="notif-foot">Live from your cards, dates, and backup status · {formatDate(referenceDate)}</div>
        </div>
      )}
    </div>
  )
}
