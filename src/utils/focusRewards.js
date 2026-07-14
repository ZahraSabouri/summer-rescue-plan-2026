// Gamified focus rewards: points per focused minute, a daily streak (and all-time
// best), a daily focus-minutes goal, and a forest that grows a tree per completed
// block. Points feed a level system and unlock achievements; level-ups and unlocks
// are queued as transient "notices" for celebration toasts. Persisted to
// localStorage (notices excluded); components subscribe via useSyncExternalStore.

import { ACHIEVEMENTS, evaluateUnlocks, levelForPoints, treeForMinutes } from './focusProgress'

const STORAGE_KEY = 'summer-rescue-focus-rewards'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayStr() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

const defaultState = {
  points: 0,
  streak: 0,
  bestStreak: 0,
  lastDate: null,
  totalTrees: 0,
  totalWilted: 0,
  strict: true,
  dailyGoalMinutes: 90,
  unlocked: [],
  notices: [],
  today: { date: null, trees: 0, minutes: 0, wilted: 0, treeList: [] },
}

function load() {
  try {
    if (typeof localStorage === 'undefined') return { ...defaultState }
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultState }
    const parsed = JSON.parse(raw)
    return {
      ...defaultState,
      ...parsed,
      unlocked: Array.isArray(parsed.unlocked) ? parsed.unlocked : [],
      notices: [],
      today: {
        ...defaultState.today,
        ...(parsed.today ?? {}),
        treeList: Array.isArray(parsed.today?.treeList) ? parsed.today.treeList : [],
      },
    }
  } catch {
    return { ...defaultState }
  }
}

let state = load()
let noticeSeq = 0
const listeners = new Set()

function persist() {
  try {
    if (typeof localStorage === 'undefined') return
    // Notices are transient celebration cues — persist everything else.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, notices: undefined }))
  } catch {
    /* storage unavailable — keep in-memory only */
  }
}

function commit(next) {
  state = next
  persist()
  listeners.forEach((listener) => listener())
}

// Reset per-day counters when the calendar day changes.
function rolledToday(current) {
  const day = todayStr()
  if (current.today.date === day) return current
  return { ...current, today: { date: day, trees: 0, minutes: 0, wilted: 0, treeList: [] } }
}

// Continue the streak if we already logged today, extend from yesterday, else reset to 1.
function nextStreak(current) {
  if (current.lastDate === todayStr()) return current.streak
  if (current.lastDate === yesterdayStr()) return current.streak + 1
  return 1
}

// Fold newly-unlocked achievements and any level-up into `next`, queuing notices.
function finalize(base, next) {
  const newlyUnlocked = evaluateUnlocks(next).filter((id) => !next.unlocked.includes(id))
  const notices = [...next.notices]
  for (const id of newlyUnlocked) {
    const achievement = ACHIEVEMENTS.find((item) => item.id === id)
    noticeSeq += 1
    notices.push({ key: `n${noticeSeq}`, kind: 'achievement', icon: achievement.icon, title: achievement.title, desc: achievement.desc })
  }
  if (levelForPoints(next.points).level > levelForPoints(base.points).level) {
    const lv = levelForPoints(next.points)
    noticeSeq += 1
    notices.push({ key: `n${noticeSeq}`, kind: 'levelup', icon: '🌟', title: `Level ${lv.level}: ${lv.title}`, desc: 'Your focus leveled up.' })
  }
  return {
    ...next,
    unlocked: newlyUnlocked.length ? [...next.unlocked, ...newlyUnlocked] : next.unlocked,
    notices,
  }
}

export const focusRewards = {
  getState() {
    return state
  },
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  // Focused minutes were logged (full or partial block). Award points and keep the streak alive.
  recordMinutes(minutes) {
    const mins = Math.max(0, Math.round(Number(minutes) || 0))
    if (mins <= 0) return
    const base = rolledToday(state)
    const streak = nextStreak(base)
    commit(finalize(base, {
      ...base,
      points: base.points + mins,
      streak,
      bestStreak: Math.max(base.bestStreak, streak),
      lastDate: todayStr(),
      today: { ...base.today, minutes: base.today.minutes + mins },
    }))
  },
  // A focus block ran to completion. Grow a tree sized to the block length.
  recordBlockComplete(minutes) {
    const base = rolledToday(state)
    const tree = treeForMinutes(minutes)
    commit(finalize(base, {
      ...base,
      totalTrees: base.totalTrees + 1,
      today: { ...base.today, trees: base.today.trees + 1, treeList: [...base.today.treeList, tree] },
    }))
  },
  // A running block was abandoned in strict mode. Wilt a tree (no points, no credit).
  recordBlockForfeit() {
    const base = rolledToday(state)
    commit(finalize(base, {
      ...base,
      totalWilted: base.totalWilted + 1,
      today: { ...base.today, wilted: base.today.wilted + 1 },
    }))
  },
  // Guard strictness: true = forfeit on leaving, false = pause & nudge.
  setStrict(next) {
    commit({ ...state, strict: Boolean(next) })
  },
  // Daily focus-minutes target (clamped to a sane range).
  setDailyGoal(minutes) {
    const goal = Math.max(15, Math.min(480, Math.round(Number(minutes) || 0)))
    const base = rolledToday(state)
    commit(finalize(base, { ...base, dailyGoalMinutes: goal }))
  },
  // Remove a celebration notice once its toast has shown.
  dismissNotice(key) {
    if (!state.notices.some((notice) => notice.key === key)) return
    commit({ ...state, notices: state.notices.filter((notice) => notice.key !== key) })
  },
}
