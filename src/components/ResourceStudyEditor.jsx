import { normaliseResourceProgressEntry } from '../utils/resourceProgress.js'

function learningState(progress) {
  if (progress.progressPercent >= 100) return 'Reviewed'
  if (progress.progressPercent > 0 || progress.understandingPercent > 0 || progress.note.trim()) return 'In progress'
  return 'Not started'
}

function Metric({ label, value, tone }) {
  return (
    <div className={`resource-learning-metric ${tone}`}>
      <div>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <span className="resource-learning-meter" aria-hidden="true">
        <span style={{ width: `${value}%` }} />
      </span>
    </div>
  )
}

// The same saved record appears wherever a source is useful: its module library
// and every task that links to it. That keeps progress about the source itself,
// not trapped in one particular card.
export function ResourceStudyEditor({
  resourceId,
  progress,
  onProgressChange = () => {},
  onToggleReviewed,
  compact = false,
}) {
  const saved = normaliseResourceProgressEntry(progress)
  const state = learningState(saved)
  const reviewed = saved.progressPercent >= 100

  function update(patch) {
    onProgressChange(resourceId, patch)
  }

  return (
    <section className={`resource-study-editor${compact ? ' compact' : ''}`} aria-label={`Study progress: ${saved.progressPercent}% studied, ${saved.understandingPercent}% understood`}>
      <div className="resource-learning-overview">
        <div className="resource-learning-state">
          <span>{state}</span>
          {onToggleReviewed && (
            <label className="resource-reviewed-toggle">
              <input type="checkbox" checked={reviewed} onChange={() => onToggleReviewed(resourceId)} />
              <span>Reviewed</span>
            </label>
          )}
        </div>
        <div className="resource-learning-metrics">
          <Metric label="Studied" value={saved.progressPercent} tone="studied" />
          <Metric label="Understood" value={saved.understandingPercent} tone="understood" />
        </div>
      </div>
      <details className="resource-study-details">
        <summary>{compact ? 'Update study progress, notes & questions' : 'Progress, notes & questions'}</summary>
        <div className="resource-progress-fields">
          <label>
            <span>Read / studied</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={saved.progressPercent}
              onChange={(event) => update({ progressPercent: event.target.value })}
            />
            <output>{saved.progressPercent}%</output>
          </label>
          <label>
            <span>Understood</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={saved.understandingPercent}
              onChange={(event) => update({ understandingPercent: event.target.value })}
            />
            <output>{saved.understandingPercent}%</output>
          </label>
          <label className="resource-progress-note">
            <span>Notes / questions</span>
            <textarea
              rows={compact ? 2 : 3}
              value={saved.note}
              placeholder="What made sense? What is unclear? What should you return to?"
              onChange={(event) => update({ note: event.target.value })}
            />
          </label>
        </div>
      </details>
    </section>
  )
}
