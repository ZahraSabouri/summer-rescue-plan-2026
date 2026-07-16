import { AccessibleDialog } from './AccessibleDialog'

function Row({ label, incoming, current, highlightDrop = false }) {
  const drop = highlightDrop && Number(incoming) < Number(current)
  return (
    <div className={`import-row${drop ? ' drop' : ''}`}>
      <span className="import-row-label">{label}</span>
      <span className="import-row-incoming">{incoming}</span>
      <span className="import-row-current">{current}</span>
    </div>
  )
}

// Modal preview shown before a JSON import or safety-copy restore replaces
// the local tracker state. A backup of the current state is downloaded on
// confirm (handled by the caller), so this action is always reversible.
export function ImportPreviewDialog({ open, sourceName, incoming, current, onCancel, onConfirm }) {
  if (!open) return null

  const losesProgress =
    Number(incoming.done) < Number(current.done) || Number(incoming.hours) < Number(current.hours)

  return (
    <AccessibleDialog
      open={open}
      onClose={onCancel}
      className="import-dialog"
      overlayClassName="import-shell"
      ariaLabel="Import preview"
    >
        <header className="drawer-header">
          <div>
            <p className="eyebrow">Import preview</p>
            <h2>Replace tracker state?</h2>
          </div>
        </header>

        <p className="muted">
          Source: <strong>{sourceName}</strong>
          {incoming.exportedAt ? ` · saved ${incoming.exportedAt}` : ''}
        </p>

        <div className="import-table" role="table" aria-label="Backup comparison">
          <div className="import-row import-row-head">
            <span className="import-row-label" />
            <span className="import-row-incoming">Backup</span>
            <span className="import-row-current">Current</span>
          </div>
          <Row label="Cards done" incoming={incoming.done} current={current.done} highlightDrop />
          <Row label="Hours logged" incoming={incoming.hours} current={current.hours} highlightDrop />
          <Row label="Custom cards" incoming={incoming.added} current={current.added} highlightDrop />
          <Row label="History days" incoming={incoming.snapshotDays} current={current.snapshotDays} />
        </div>

        {losesProgress && (
          <p className="import-warning">
            This backup has less progress than your current state. Importing will roll you back —
            a JSON copy of the current state downloads first, so you can undo.
          </p>
        )}

        <div className="import-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="primary-button" onClick={onConfirm}>
            Back up current, then import
          </button>
        </div>
    </AccessibleDialog>
  )
}
