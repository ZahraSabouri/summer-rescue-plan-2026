import './JobHuntPlaybook.css'

const cadence = [
  {
    minutes: 25,
    label: 'Weekday scans',
    detail: 'Five 5-minute Student Futures checks. Save or ignore only.',
  },
  {
    minutes: 20,
    label: 'Sunday review',
    detail: 'Review accumulated leads once and choose no more than one priority.',
  },
  {
    minutes: 45,
    label: 'Weekly development',
    detail: 'Complete the single dated output for this week.',
  },
  {
    minutes: 30,
    label: 'Urgent reserve',
    detail: 'Use only when a verified strong role closes within seven days.',
  },
]

const workstreams = [
  {
    title: 'CV and application materials',
    text: 'Maintain one strong UK master CV, then two lightweight variants. Tailor only for a lead that passes the interruption gate.',
  },
  {
    title: 'Online profiles',
    text: 'Build one profile at a time and enable only relevant software, data, AI/ML and research alerts.',
  },
  {
    title: 'Opportunity monitoring',
    text: 'Track paid, study-safe work after August 2026 and a small 2027 graduate or internship runway.',
  },
  {
    title: 'GitHub evidence',
    text: 'Keep three relevant repositories easy to assess, with one presentable project README and clear contribution evidence.',
  },
  {
    title: 'Professional presentation',
    text: 'Keep role titles, dates, skills, availability and links consistent across the CV, profiles and applications.',
  },
]

const weeklyTasks = [
  ['13–19 Jul', 'Score the master CV once', 'Run Cardiff’s CV checker, save the baseline and select five high-value fixes.'],
  ['20–26 Jul', 'Improve one clean master CV', 'Remove repetition, strengthen outcomes and measurements, then lock the UK master.'],
  ['27 Jul–2 Aug', 'Create two lightweight CV tracks', 'Create Software/Backend/Platform and Data/Analytics/ML versions with 80–85% shared content.'],
  ['3–9 Aug', 'Set up Higherin', 'Create the core profile, add availability and location, and enable useful alerts only.'],
  ['10–16 Aug', 'Set up Bright Network', 'Reuse the verified core profile information and enable relevant graduate or internship alerts.'],
  ['17–23 Aug', 'Set up Gradcracker', 'Create the STEM profile and focused software, data, AI/ML and data-engineering alerts.'],
  ['24–28 Aug', 'Build a minimum viable GitHub profile', 'Improve the profile README, pin three relevant repositories and polish one project README.'],
]

const sources = [
  ['Verify', 'Official employer career pages, official vacancy pages, university/public-sector sites and GOV.UK.'],
  ['Approach', 'Official talent communities, speculative-application forms or named recruitment routes.'],
  ['Discover', 'jobs.ac.uk, NHS/public listings, specialist graduate boards and credible local ecosystems.'],
  ['Triage only', 'Public LinkedIn, Indeed, Reed, Totaljobs and similar aggregators; follow every lead to its official source.'],
  ['Manual input', 'Student Futures, private emails and logged-in portals are checked by Zahra, then pasted in for review if useful.'],
]

export function JobHuntPlaybook() {
  return (
    <section className="job-playbook" aria-labelledby="job-playbook-title">
      <header className="job-playbook-header">
        <div>
          <p className="job-playbook-eyebrow">Maintenance mode · 13 July–28 August</p>
          <h2 id="job-playbook-title">Job hunt playbook</h2>
          <p>
            Preserve the opportunity pipeline without letting it displace the rescue plan. The weekly
            limit is a hard two hours, not a target to exceed.
          </p>
        </div>
        <div className="job-playbook-cap" aria-label="Hard weekly job-hunt cap">
          <strong>2h</strong>
          <span>hard weekly cap</span>
        </div>
      </header>

      <dl className="job-cadence" aria-label="Weekly time budget">
        {cadence.map((item) => (
          <div className="job-cadence-item" key={item.label}>
            <dt>
              <span>{item.minutes}m</span> {item.label}
            </dt>
            <dd>{item.detail}</dd>
          </div>
        ))}
      </dl>

      <div className="job-playbook-grid">
        <section className="job-playbook-panel" aria-labelledby="job-workstreams-title">
          <div className="job-section-heading">
            <p className="job-playbook-eyebrow">Keep warm, do not expand</p>
            <h3 id="job-workstreams-title">Five workstreams</h3>
          </div>
          <ol className="job-workstreams">
            {workstreams.map((workstream) => (
              <li key={workstream.title}>
                <div>
                  <strong>{workstream.title}</strong>
                  <p>{workstream.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="job-playbook-panel" aria-labelledby="job-development-title">
          <div className="job-section-heading">
            <p className="job-playbook-eyebrow">One output per week</p>
            <h3 id="job-development-title">Dated development tasks</h3>
          </div>
          <ol className="job-weekly-tasks">
            {weeklyTasks.map(([date, title, detail]) => (
              <li key={date}>
                <time>{date}</time>
                <div>
                  <strong>{title}</strong>
                  <p>{detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="job-playbook-details">
        <details>
          <summary>Source hierarchy and agent roles</summary>
          <div className="job-details-body">
            <ol className="job-source-list">
              {sources.map(([level, text]) => (
                <li key={level}>
                  <strong>{level}</strong>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
            <div className="job-agent-rule">
              <p>
                <strong>ChatGPT:</strong> recurring public discovery, current visa/timing filters and one
                tightly prioritised weekly shortlist.
              </p>
              <p>
                <strong>Claude:</strong> an occasional second opinion on one important job description,
                application answer or CV version. It does not run a second recurring hunt.
              </p>
            </div>
          </div>
        </details>

        <details>
          <summary>Application interruption gate</summary>
          <div className="job-details-body job-gate">
            <p>An application may use the 30-minute reserve only when every condition below is true:</p>
            <ul>
              <li>The opportunity is paid employee work and has a direct, current source.</li>
              <li>The hours, location, start timing and visa conditions appear study-safe.</li>
              <li>It is a strong fit and closes within seven days.</li>
              <li>The exact missing facts and next action are already recorded.</li>
            </ul>
            <p className="job-gate-stop">
              If any condition fails, save the lead for Sunday. If the work needs more than the reserve,
              stop at 120 minutes and schedule no extra time without an explicit trade-off decision.
            </p>
          </div>
        </details>
      </div>
    </section>
  )
}

export default JobHuntPlaybook
