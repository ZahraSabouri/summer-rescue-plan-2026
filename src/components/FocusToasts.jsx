import { useEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { focusRewards } from '../utils/focusRewards'

function Toast({ notice }) {
  useEffect(() => {
    const id = window.setTimeout(() => focusRewards.dismissNotice(notice.key), 4600)
    return () => window.clearTimeout(id)
  }, [notice.key])

  return (
    <div className={`focus-toast focus-toast-${notice.kind}`} role="status">
      <span className="focus-toast-icon" aria-hidden="true">{notice.icon}</span>
      <div className="focus-toast-body">
        <strong>{notice.kind === 'levelup' ? notice.title : `Achievement · ${notice.title}`}</strong>
        <span>{notice.desc}</span>
      </div>
      <button
        type="button"
        className="focus-toast-close"
        aria-label="Dismiss"
        onClick={() => focusRewards.dismissNotice(notice.key)}
      >
        ×
      </button>
    </div>
  )
}

// Renders celebration toasts for level-ups and achievement unlocks, driven by the
// rewards store's notice queue. Each toast auto-dismisses after a few seconds.
export function FocusToasts() {
  const rewards = useSyncExternalStore(focusRewards.subscribe, focusRewards.getState)
  if (typeof document === 'undefined' || rewards.notices.length === 0) return null

  return createPortal(
    <div className="focus-toast-stack" aria-live="polite">
      {rewards.notices.map((notice) => (
        <Toast key={notice.key} notice={notice} />
      ))}
    </div>,
    document.body,
  )
}
