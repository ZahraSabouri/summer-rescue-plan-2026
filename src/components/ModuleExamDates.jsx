import { useState } from 'react'
import {
  EXAM_MODULES,
  applyModuleExamDate,
  examWindow,
  resolveModuleExamDate,
  validateModuleExamDate,
} from '../utils/examDates'
import './ModuleExamDates.css'

/**
 * Settings entry for the three personal module exam dates.
 *
 * Validation is deliberately strict: an unconfirmed date is a truthful state,
 * so a rejected entry leaves the module unconfirmed rather than storing a guess.
 * Out-of-window dates are recoverable through an explicit exception confirmation
 * because the personal timetable may legitimately fall outside the published
 * window; pre-campaign and malformed dates never are.
 */
export function ModuleExamDateFields({ moduleExamDates = {}, schedule = {}, onChange }) {
  const [issues, setIssues] = useState({})
  const { start, end } = examWindow(schedule)

  function clearIssue(moduleId) {
    setIssues((previous) => {
      if (!previous[moduleId]) return previous
      const next = { ...previous }
      delete next[moduleId]
      return next
    })
  }

  function commit(moduleId, rawValue) {
    const result = validateModuleExamDate(rawValue, { schedule })
    if (result.ok) {
      clearIssue(moduleId)
      onChange(applyModuleExamDate(moduleExamDates, moduleId, result.date))
      return
    }
    setIssues((previous) => ({
      ...previous,
      [moduleId]: {
        message: result.message,
        code: result.code,
        pendingDate: result.code === 'out-of-window' ? rawValue : null,
      },
    }))
  }

  function confirmException(moduleId) {
    const pendingDate = issues[moduleId]?.pendingDate
    if (!pendingDate) return
    const result = validateModuleExamDate(pendingDate, { schedule, allowException: true })
    if (!result.ok) return
    clearIssue(moduleId)
    onChange(applyModuleExamDate(moduleExamDates, moduleId, result.date))
  }

  return (
    <div className="module-exam-dates">
      <p className="module-exam-window-note">
        Official exam window {start} to {end}. Personal module dates stay unconfirmed until you enter
        the date Cardiff gives you — the window start is never used as a module date.
      </p>
      <div className="settings-grid">
        {EXAM_MODULES.map((module) => {
          const resolved = resolveModuleExamDate(module.id, moduleExamDates, schedule)
          const issue = issues[module.id]
          const errorId = `exam-date-error-${module.id}`
          return (
            <label key={module.id} className="module-exam-field">
              <span>
                {module.label} exam
                <span className="module-exam-code"> · {module.code}</span>
              </span>
              <input
                type="date"
                value={resolved.date ?? ''}
                min={schedule.campaignStart || undefined}
                aria-invalid={issue ? 'true' : undefined}
                aria-describedby={issue ? errorId : undefined}
                onChange={(event) => commit(module.id, event.target.value)}
              />
              <ExamDateStatus resolved={resolved} />
              {issue && (
                <span className="module-exam-error" id={errorId} role="alert">
                  {issue.message}
                  {issue.pendingDate && (
                    <button
                      type="button"
                      className="module-exam-confirm"
                      onClick={() => confirmException(module.id)}
                    >
                      Record {issue.pendingDate} anyway
                    </button>
                  )}
                </span>
              )}
            </label>
          )
        })}
      </div>
    </div>
  )
}

export function ExamDateStatus({ resolved }) {
  if (!resolved.confirmed) {
    return (
      <span className="exam-status exam-status-unconfirmed">
        Unconfirmed — no personal date yet
      </span>
    )
  }
  if (resolved.outOfWindow) {
    return (
      <span className="exam-status exam-status-exception">
        Confirmed — outside the {resolved.windowStart} to {resolved.windowEnd} window
      </span>
    )
  }
  return <span className="exam-status exam-status-confirmed">Confirmed</span>
}
