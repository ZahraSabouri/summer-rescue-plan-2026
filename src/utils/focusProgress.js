// Pure progression logic for the focus rewards system: levels, tree variety, and
// achievements. Kept free of storage/React so it can be unit-tested directly.

export const LEVELS = [
  { level: 1, title: 'Seedling', floor: 0 },
  { level: 2, title: 'Sprout', floor: 30 },
  { level: 3, title: 'Sapling', floor: 80 },
  { level: 4, title: 'Young Tree', floor: 160 },
  { level: 5, title: 'Grove', floor: 280 },
  { level: 6, title: 'Thicket', floor: 450 },
  { level: 7, title: 'Woodland', floor: 680 },
  { level: 8, title: 'Forest', floor: 1000 },
  { level: 9, title: 'Old Growth', floor: 1500 },
  { level: 10, title: 'Wildwood', floor: 2200 },
]

// Resolve a point total to its level, plus progress toward the next level.
export function levelForPoints(points) {
  const p = Math.max(0, Number(points) || 0)
  let current = LEVELS[0]
  for (const tier of LEVELS) {
    if (p >= tier.floor) current = tier
    else break
  }
  const next = LEVELS.find((tier) => tier.floor > p) || null
  const span = next ? next.floor - current.floor : 0
  const into = p - current.floor
  return {
    level: current.level,
    title: current.title,
    floor: current.floor,
    nextFloor: next ? next.floor : null,
    nextTitle: next ? next.title : null,
    pointsIntoLevel: into,
    pointsForLevel: span,
    toNext: next ? next.floor - p : 0,
    progress: next ? Math.min(1, Math.max(0, into / span)) : 1,
    isMax: !next,
  }
}

// Pick a tree for a completed block — longer blocks earn a sturdier tree.
export function treeForMinutes(minutes) {
  const m = Number(minutes) || 0
  if (m >= 50) return '🌲'
  if (m >= 40) return '🌳'
  if (m >= 25) return '🌴'
  return '🌿'
}

export const ACHIEVEMENTS = [
  { id: 'first-tree', icon: '🌱', title: 'First tree', desc: 'Complete your first focus block.', test: (s) => s.totalTrees >= 1 },
  { id: 'trees-10', icon: '🌳', title: 'Grove keeper', desc: 'Grow 10 trees all-time.', test: (s) => s.totalTrees >= 10 },
  { id: 'trees-50', icon: '🌲', title: 'Forester', desc: 'Grow 50 trees all-time.', test: (s) => s.totalTrees >= 50 },
  { id: 'day-5-trees', icon: '🌼', title: 'Green thumb', desc: 'Grow 5 trees in a single day.', test: (s) => s.today.trees >= 5 },
  { id: 'streak-3', icon: '🔥', title: 'On a roll', desc: 'Hold a 3-day focus streak.', test: (s) => s.streak >= 3 },
  { id: 'streak-7', icon: '⚡', title: 'Unbreakable week', desc: 'Hold a 7-day focus streak.', test: (s) => s.streak >= 7 },
  { id: 'points-100', icon: '💯', title: 'Century', desc: 'Earn 100 focus points.', test: (s) => s.points >= 100 },
  { id: 'points-500', icon: '🏆', title: 'Powerhouse', desc: 'Earn 500 focus points.', test: (s) => s.points >= 500 },
  { id: 'goal-day', icon: '🎯', title: 'Goal smashed', desc: 'Hit your daily focus goal.', test: (s) => s.today.minutes >= s.dailyGoalMinutes },
  { id: 'deep-120', icon: '🧠', title: 'Deep work', desc: 'Focus 120 minutes in one day.', test: (s) => s.today.minutes >= 120 },
]

// Ids of every achievement whose condition currently holds for the given state.
export function evaluateUnlocks(state) {
  return ACHIEVEMENTS.filter((achievement) => achievement.test(state)).map((achievement) => achievement.id)
}
