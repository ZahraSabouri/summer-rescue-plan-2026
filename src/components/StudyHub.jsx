import { STUDY_MODULES } from '../data/studyModules'
import {
  addDays,
  formatDate,
  getCardDate,
  isBetween,
  isOverdue,
  sortCards,
  sumHours,
} from '../utils/progress'
import { CardSummary } from './CardSummary'

function percent(done, total) {
  if (!total) return 0
  return Math.round((done / total) * 100)
}

function hours(value) {
  const number = Number(value || 0)
  return Number.isInteger(number) ? `${number}h` : `${number.toFixed(1)}h`
}

function ModuleCommandCard({ module, cards, referenceDate, mat700Active, onOpen, onOpenModuleView }) {
  const moduleCards = cards.filter((card) => card.moduleGroup === module.moduleGroup)
  const openCards = sortCards(moduleCards.filter((card) => !card.done))
  const dueSoonEnd = addDays(referenceDate, 7)
  const dueSoon = openCards.filter((card) => isBetween(getCardDate(card), referenceDate, dueSoonEnd))
  const overdue = openCards.filter((card) => isOverdue(card, referenceDate))
  const done = moduleCards.filter((card) => card.done).length
  const inactiveInsurance = module.id === 'mat700' && !mat700Active

  return (
    <article className={`module-command-card ${inactiveInsurance ? 'is-muted' : ''}`}>
      <div className="module-card-visual">
        <img src={(module.hero ?? module.visual).url} alt="" loading="lazy" />
      </div>
      <div className="module-card-body">
        <p className="eyebrow">{module.code}</p>
        <h2>{module.title}</h2>
        <p>{module.subtitle}</p>
        <div className="module-stat-row" aria-label={`${module.title} progress`}>
          <span>{moduleCards.length} cards</span>
          <span>{percent(done, moduleCards.length)}% done</span>
          <span>{hours(sumHours(moduleCards, 'estimatedHours'))} planned</span>
          <span>{dueSoon.length} due next 7d</span>
          {overdue.length > 0 && <span className="danger">{overdue.length} overdue</span>}
        </div>
        {inactiveInsurance && <p className="module-insurance-note">The MAT700 study lane is switched off in planner settings.</p>}
      </div>
      <div className="module-card-actions">
        <button type="button" className="primary-button" onClick={() => onOpen(module.viewId)}>
          Open workspace
        </button>
        <button type="button" className="secondary-button" onClick={() => onOpenModuleView('week', module.moduleGroup)}>
          Week queue
        </button>
      </div>
    </article>
  )
}

function CompactQueue({ title, eyebrow, cards, empty, actions }) {
  return (
    <section className="hub-queue">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="mini-card-list">
        {cards.length > 0 ? (
          sortCards(cards).map((card) => <CardSummary key={card.id} card={card} compact {...actions} />)
        ) : (
          <p className="empty-state">{empty}</p>
        )}
      </div>
    </section>
  )
}

export function StudyHub({ cards, stats, referenceDate, mat700Active, actions, setActiveView, openModuleView, onGenerateWeeklyLifeCards }) {
  const activeCards = mat700Active ? cards : cards.filter((card) => card.moduleGroup !== 'MAT700')
  const openCards = activeCards.filter((card) => !card.done)
  const overdueCards = openCards.filter((card) => isOverdue(card, referenceDate))
  const todayCards = openCards.filter((card) => getCardDate(card) === referenceDate)
  const nextSevenEnd = addDays(referenceDate, 7)
  const nextCards = openCards.filter((card) => isBetween(getCardDate(card), referenceDate, nextSevenEnd))

  return (
    <div className="study-hub">
      <section className="super-hero">
        <div className="super-hero-copy">
          <p className="eyebrow">Summer Rescue Campaign 2026</p>
          <h2>Unified study cockpit</h2>
          <p>
            One place for the rescue tracker, specialist module workspaces, local resources, evidence logging,
            bounded life lanes, and the weekly execution queue.
          </p>
          <div className="hub-command-strip" aria-label="Primary study commands">
            <button type="button" className="primary-button" onClick={() => setActiveView('dashboard')}>
              Planner dashboard
            </button>
            <button type="button" className="secondary-button" onClick={() => setActiveView('week')}>
              This week
            </button>
            <button type="button" className="secondary-button" onClick={() => setActiveView('progress')}>
              Progress
            </button>
            <button type="button" className="secondary-button" onClick={() => setActiveView('evidence')}>
              Evidence
            </button>
          </div>
        </div>
        <div className="super-hero-media" aria-label="Module resource previews">
          {STUDY_MODULES.map((module) => (
            <button
              key={module.id}
              type="button"
              className="preview-tile"
              onClick={() => setActiveView(module.viewId)}
              style={{ '--module-accent': `var(${module.accent})` }}
            >
              <img src={(module.hero ?? module.visual).url} alt="" loading="lazy" />
              <span>{module.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="hub-metrics" aria-label="Super app metrics">
        <article>
          <span>Open cards</span>
          <strong>{stats.notDone}</strong>
          <p>{hours(stats.estimatedHours - stats.loggedHours)} estimated hours still unlogged.</p>
        </article>
        <article>
          <span>Due today</span>
          <strong>{todayCards.length}</strong>
          <p>{formatDate(referenceDate)} execution queue.</p>
        </article>
        <article>
          <span>Next 7 days</span>
          <strong>{nextCards.length}</strong>
          <p>Cards dated through {formatDate(nextSevenEnd)}.</p>
        </article>
        <article>
          <span>Overdue</span>
          <strong>{overdueCards.length}</strong>
          <p>Use Rescue Lane instead of silent drift.</p>
        </article>
      </section>

      <section className="module-command-grid" aria-label="Module workspaces">
        {STUDY_MODULES.map((module) => (
          <ModuleCommandCard
            key={module.id}
            module={module}
            cards={cards}
            referenceDate={referenceDate}
            mat700Active={mat700Active}
            onOpen={setActiveView}
            onOpenModuleView={openModuleView}
          />
        ))}
      </section>

      <section className="bounded-area-grid" aria-label="Bounded life areas">
        <article>
          <p className="eyebrow">Bounded area</p>
          <h2>Job Hunt</h2>
          <p>Weekly maintenance with a hard time ceiling so it cannot consume exam preparation.</p>
          <button type="button" className="secondary-button" onClick={() => setActiveView('jobs')}>Open Job Hunt</button>
        </article>
        <article>
          <p className="eyebrow">Bounded area</p>
          <h2>Life Admin & Dates</h2>
          <p>Exam logistics, university date checks, health, and recurring life-admin boundaries.</p>
          <button type="button" className="secondary-button" onClick={() => setActiveView('admin')}>Open Life Admin</button>
          <button type="button" className="text-button" onClick={onGenerateWeeklyLifeCards}>Generate this week’s routine cards</button>
        </article>
      </section>

      <section className="hub-split">
        <CompactQueue
          eyebrow="Execute"
          title="Due today"
          cards={todayCards.slice(0, 5)}
          empty="No cards due today."
          actions={actions}
        />
        <CompactQueue
          eyebrow="Control"
          title="Overdue or at risk"
          cards={overdueCards.slice(0, 5)}
          empty="No overdue cards."
          actions={actions}
        />
      </section>

    </div>
  )
}
