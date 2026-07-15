import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDate } from '../utils/progress'

const TYPE_ICON = {
  danger: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  warning: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  info: 'M12 16v-4M12 8h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
  success: 'M20 6 9 17l-5-5',
}

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'overdue', label: 'Overdue' },
]

export function NotificationCenter({
  notifications,
  referenceDate,
  onGoView,
  onOpenCard,
  onSetRead,
  onMarkAllRead,
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('all')
  const wrapRef = useRef(null)

  useEffect(() => {
    function onDoc(event) {
      if (open && wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const notices = useMemo(
    () => Object.values(notifications ?? {}).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    [notifications],
  )
  const unreadCount = notices.filter((notice) => !notice.read).length
  const overdueCount = notices.filter((notice) => notice.rule === 'overdue').length
  const filteredNotices = notices.filter((notice) => {
    if (tab === 'unread') return !notice.read
    if (tab === 'overdue') return notice.rule === 'overdue'
    return true
  })

  function runAction(notice) {
    onSetRead?.(notice.id, true)
    if (notice.cardId) onOpenCard?.(notice.cardId)
    else if (notice.rule === 'exam-countdown') onGoView?.('progress')
    else if (notice.rule === 'backup-stale') onGoView?.('dashboard')
    else if (notice.rule === 'mat700-paused') onGoView?.('mat700')
    setOpen(false)
  }

  function countFor(tabId) {
    if (tabId === 'unread') return unreadCount
    if (tabId === 'overdue') return overdueCount
    return notices.length
  }

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`icon-button notif-trigger${unreadCount ? ' has-alerts' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        title="Notifications"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-pop" role="dialog" aria-label="Notifications">
          <div className="notif-head">
            <div>
              <strong>Notifications</strong>
              <span>{unreadCount ? `${unreadCount} unread` : 'All read'}</span>
            </div>
            <button type="button" className="notif-action" onClick={onMarkAllRead} disabled={!unreadCount}>
              Mark all read
            </button>
          </div>

          <div className="notif-tabs" role="tablist" aria-label="Notification filters">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={tab === item.id ? 'active' : ''}
                onClick={() => setTab(item.id)}
              >
                {item.label} <span>{countFor(item.id)}</span>
              </button>
            ))}
          </div>

          <div className="notif-list">
            {filteredNotices.length === 0 && (
              <div className="notif-item success is-read">
                <span className="notif-ico" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={TYPE_ICON.success} />
                  </svg>
                </span>
                <div className="notif-body">
                  <strong>All clear</strong>
                  <p>No notifications in this filter.</p>
                </div>
              </div>
            )}
            {filteredNotices.map((notice) => (
              <div key={notice.id} className={`notif-item ${notice.type} ${notice.read ? 'is-read' : 'is-unread'}`}>
                <button
                  type="button"
                  className="notif-open-target"
                  onClick={() => runAction(notice)}
                  title={notice.cardId ? 'Open this card' : 'Open the related view'}
                >
                  <span className="notif-ico" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={TYPE_ICON[notice.type] ?? TYPE_ICON.info} />
                    </svg>
                  </span>
                  <span className="notif-body">
                    <strong>
                      {!notice.read && <i className="unread-dot" aria-hidden="true" />}
                      {notice.title}
                    </strong>
                    {notice.detail && <span className="notif-detail">{notice.detail}</span>}
                    <time>{formatDate(notice.createdAt)}</time>
                  </span>
                </button>
                <div className="notif-row-actions">
                  <button
                    type="button"
                    className="notif-read-toggle"
                    onClick={() => onSetRead?.(notice.id, !notice.read)}
                  >
                    {notice.read ? 'Unread' : 'Read'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="notif-foot">Persisted in tracker data - {formatDate(referenceDate)}</div>
        </div>
      )}
    </div>
  )
}
