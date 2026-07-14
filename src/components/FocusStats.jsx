import { useSyncExternalStore } from 'react'
import { focusRewards } from '../utils/focusRewards'
import { ACHIEVEMENTS, levelForPoints } from '../utils/focusProgress'

function useRewards() {
  return useSyncExternalStore(focusRewards.subscribe, focusRewards.getState)
}

// Compact, always-visible focus stats for the top bar. Present on every screen.
export function FocusStatsBadge() {
  const r = useRewards()
  const lv = levelForPoints(r.points)
  const title =
    `Focus — Level ${lv.level} ${lv.title} · ${r.points} points · ${r.streak}-day streak · ` +
    `${r.today.trees} trees today${r.today.wilted ? ` · ${r.today.wilted} wilted` : ''} · ` +
    `${r.strict ? 'Strict' : 'Gentle'} guard`
  return (
    <div className="focus-stats-badge" title={title} aria-label={title}>
      <span className="focus-stat lvl">Lv {lv.level}</span>
      <span className="focus-stat"><em aria-hidden="true">⚡</em>{r.points}</span>
      <span className="focus-stat"><em aria-hidden="true">🔥</em>{r.streak}</span>
      <span className="focus-stat"><em aria-hidden="true">🌳</em>{r.today.trees}</span>
      {r.today.wilted > 0 && (
        <span className="focus-stat wilt"><em aria-hidden="true">🥀</em>{r.today.wilted}</span>
      )}
    </div>
  )
}

function GoalRing({ minutes, goal, onAdjust }) {
  const pct = Math.max(0, Math.min(1, goal > 0 ? minutes / goal : 0))
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const met = minutes >= goal
  return (
    <div className={`focus-goal${met ? ' met' : ''}`}>
      <div className="focus-goal-ring">
        <svg viewBox="0 0 80 80" width="80" height="80" role="img" aria-label={`Daily goal ${minutes} of ${goal} minutes`}>
          <circle cx="40" cy="40" r={radius} fill="none" strokeWidth="8" className="focus-goal-track" />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className="focus-goal-value"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            transform="rotate(-90 40 40)"
          />
          <text x="40" y="38" textAnchor="middle" className="focus-goal-now">{minutes}</text>
          <text x="40" y="53" textAnchor="middle" className="focus-goal-goal">/ {goal}m</text>
        </svg>
      </div>
      <div className="focus-goal-meta">
        <span>Daily goal{met ? ' · done 🎯' : ''}</span>
        <div className="focus-goal-adjust">
          <button type="button" onClick={() => onAdjust(-15)} aria-label="Lower daily goal by 15 minutes">−</button>
          <strong>{goal}m</strong>
          <button type="button" onClick={() => onAdjust(15)} aria-label="Raise daily goal by 15 minutes">+</button>
        </div>
      </div>
    </div>
  )
}

// Rich forest for the Today landing page: level, daily goal, forest, achievements.
export function FocusForestPanel() {
  const r = useRewards()
  const lv = levelForPoints(r.points)
  const grown = r.today.trees
  const wilted = r.today.wilted
  const bare = grown === 0 && wilted === 0
  const trees = r.today.treeList?.length ? r.today.treeList : Array.from({ length: grown }, () => '🌳')

  return (
    <section className="focus-forest-panel panel" aria-label="Focus forest">
      <header className="focus-forest-head">
        <div>
          <p className="eyebrow">Focus forest</p>
          <h3>Grow it — don’t let it wilt.</h3>
        </div>
        <span className={`focus-forest-mode ${r.strict ? 'strict' : 'gentle'}`}>
          {r.strict ? 'Strict guard' : 'Gentle guard'}
        </span>
      </header>

      <div className="focus-level">
        <div className="focus-level-head">
          <strong>Level {lv.level} · {lv.title}</strong>
          <span>{lv.isMax ? 'Max level reached' : `${lv.toNext} pts to ${lv.nextTitle}`}</span>
        </div>
        <div className="focus-level-bar">
          <span style={{ width: `${Math.round(lv.progress * 100)}%` }} />
        </div>
      </div>

      <div className="focus-forest-row">
        <GoalRing
          minutes={r.today.minutes}
          goal={r.dailyGoalMinutes}
          onAdjust={(delta) => focusRewards.setDailyGoal(r.dailyGoalMinutes + delta)}
        />
        <div className="focus-forest-stats">
          <div className="focus-forest-stat"><strong>⚡ {r.points}</strong><span>focus points</span></div>
          <div className="focus-forest-stat"><strong>🔥 {r.streak}</strong><span>day streak · best {r.bestStreak}</span></div>
          <div className="focus-forest-stat"><strong>🌳 {r.totalTrees}</strong><span>trees all-time</span></div>
        </div>
      </div>

      <div className="focus-forest-ground" aria-hidden="true">
        {bare ? (
          <p className="focus-forest-empty">
            Your ground is bare — finish a focus block to plant your first tree today.
          </p>
        ) : (
          <>
            {trees.slice(0, 40).map((emoji, index) => (
              <span key={`t${index}`} className="tree">{emoji}</span>
            ))}
            {Array.from({ length: Math.min(wilted, 40) }).map((_, index) => (
              <span key={`w${index}`} className="tree wilt">🥀</span>
            ))}
          </>
        )}
      </div>

      <div className="focus-achievements" aria-label={`Achievements: ${r.unlocked.length} of ${ACHIEVEMENTS.length} unlocked`}>
        <div className="focus-achievements-head">
          <span>Achievements</span>
          <em>{r.unlocked.length}/{ACHIEVEMENTS.length}</em>
        </div>
        <div className="focus-achievements-row">
          {ACHIEVEMENTS.map((achievement) => {
            const has = r.unlocked.includes(achievement.id)
            return (
              <span
                key={achievement.id}
                className={`focus-badge${has ? ' unlocked' : ''}`}
                title={`${achievement.title} — ${achievement.desc}${has ? ' ✓' : ''}`}
              >
                {achievement.icon}
              </span>
            )
          })}
        </div>
      </div>

      <p className="focus-forest-foot">
        Today: {grown} grown{wilted > 0 ? ` · ${wilted} wilted` : ''} · {r.totalWilted} wilted all-time
      </p>
    </section>
  )
}
