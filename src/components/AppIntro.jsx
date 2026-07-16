const INTRO_MODULES = [
  { id: 'aml', label: 'Applied ML', desc: 'Lab-first practical fluency', accent: '--chart-aml', weight: '34% time' },
  { id: 'time-series', label: 'Time Series', desc: 'Concepts + exam templates', accent: '--chart-ts', weight: '41% time' },
  { id: 'team-project', label: 'Team Project', desc: 'Bounded capacity only', accent: '--chart-project', weight: 'CMT501' },
  { id: 'mat700', label: 'Data Mining', desc: 'Tutorial-first recovery', accent: '--chart-mat700', weight: '25% time' },
]

export function AppIntro({
  countdown,
  examDate,
  progressPct = 0,
  doneCount = 0,
  totalCount = 0,
  skipIntro = false,
  onToggleSkip,
  onEnter,
  onJump,
}) {
  return (
    <div className="intro-screen">
      <div className="intro-aurora" aria-hidden="true" />

      <div className="intro-card">
        <img
          className="intro-hero"
          src="/intro-hero.jpg"
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
        <header className="intro-head">
          <span className="intro-mark">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3c3.6 2.8 5.6 5.6 5.6 9.2A5.6 5.6 0 0 1 6.4 12.2c0-1.5.5-2.8 1.4-4" />
              <path d="M12 21v-8" />
            </svg>
          </span>
          <div className="intro-head-text">
            <p className="eyebrow">Summer Rescue Campaign 2026</p>
            <p className="intro-uni">Cardiff University · MSc Data Science &amp; Analytics</p>
          </div>
          <img
            className="intro-crest"
            src="/cardiff-logo.png"
            alt="Cardiff University"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
        </header>

        <h1 className="intro-title">
          Recover the summer.
          <br />
          One block at a time.
        </h1>
        <p className="intro-lede">
          A calm command center for exam lanes and CMT501 project work — practise the high-yield material, track every
          card, and ship your way back to a pass.
        </p>

        <div className="intro-stats">
          {countdown != null && (
            <div className={`intro-count${countdown <= 21 ? ' urgent' : ''}`}>
              <strong>{countdown > 0 ? countdown : countdown === 0 ? '0' : Math.abs(countdown)}</strong>
              <span>{countdown > 0 ? 'days to exams' : countdown === 0 ? 'exam day' : 'days into exams'}</span>
              {examDate && <small>window opens {examDate}</small>}
            </div>
          )}
          <div className="intro-progress">
            <div className="intro-progress-head">
              <span>Campaign progress</span>
              <strong>{progressPct}%</strong>
            </div>
            <div className="intro-progress-track">
              <span style={{ width: `${progressPct}%` }} />
            </div>
            <small>
              {doneCount} of {totalCount} cards complete
            </small>
          </div>
        </div>

        <div className="intro-modules">
          {INTRO_MODULES.map((m) => (
            <button
              key={m.id}
              type="button"
              className="intro-module"
              style={{ '--m': `var(${m.accent})` }}
              onClick={() => onJump(m.id)}
            >
              <span className="intro-module-weight">{m.weight}</span>
              <strong>{m.label}</strong>
              <span className="intro-module-desc">{m.desc}</span>
            </button>
          ))}
        </div>

        <div className="intro-cta">
          <button type="button" className="primary-button intro-enter" onClick={onEnter}>
            Enter workspace →
          </button>
          <button type="button" className="secondary-button" onClick={() => onJump('dashboard')}>
            Open planner
          </button>
          <button type="button" className="secondary-button" onClick={() => onJump('hub')}>Open Areas</button>
        </div>

        <label className="intro-skip">
          <input type="checkbox" checked={skipIntro} onChange={(event) => onToggleSkip?.(event.target.checked)} />
          <span>Skip this screen next time</span>
        </label>
      </div>
    </div>
  )
}
