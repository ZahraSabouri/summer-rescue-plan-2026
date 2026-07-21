export const STATUS_OPTIONS = [
  'Today',
  'Yesterday',
  'Past Week',
  'Past Month',
  'This Week',
  'Deep Work',
  'Backlog',
  'Waiting / Blocked',
  'Rescue Lane',
  'Done',
]

export const STATUS_COLUMNS = [
  { id: 'Today', label: 'Today' },
  { id: 'Yesterday', label: 'Yesterday' },
  { id: 'Past Week', label: 'Past Week' },
  { id: 'Past Month', label: 'Past Month' },
  { id: 'This Week', label: 'This Week' },
  { id: 'Deep Work', label: 'Deep Work' },
  { id: 'Backlog', label: 'Backlog' },
  { id: 'Waiting / Blocked', label: 'Waiting' },
  { id: 'Rescue Lane', label: 'Rescue Lane' },
  { id: 'Done', label: 'Done' },
]

export const PHASE_OPTIONS = ['Phase 0', 'Phase 1', 'Phase 2']

export const MODULE_OPTIONS = [
  'Applied ML',
  'Time Series',
  'MAT700',
  'Group Project',
  'Job Hunt',
  'Admin',
  'Health',
  'Cross-module',
  'General',
]

export const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low']

export const SLOT_OPTIONS = ['AM', 'PM', 'Light/Eve', 'Fixed', 'Flex']

export const TAG_OPTIONS = [
  'rescue',
  'admin',
  'project',
  'health',
  'exam',
  'evidence',
  'fixed',
  'date-watch',
  'gitlab',
  'recovery',
  'job-hunt',
  'bounded',
]

export const VIEW_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'hub', label: 'Study Hub' },
  { id: 'dashboard', label: 'Planner' },
  { id: 'progress', label: 'Progress' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'review', label: 'Review' },
  { id: 'aml', label: 'Applied ML' },
  { id: 'time-series', label: 'Time Series' },
  { id: 'team-project', label: 'Team Project' },
  { id: 'mat700', label: 'Data Mining' },
  { id: 'board', label: 'Columns' },
  { id: 'table', label: 'Table' },
  { id: 'week', label: 'Week' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'rescue', label: 'Rescue Lane' },
  { id: 'areas', label: 'Life & Admin' },
  { id: 'project', label: 'Project Capacity' },
  { id: 'admin', label: 'Admin & Dates' },
  { id: 'jobs', label: 'Job Hunt' },
]

export const FILTER_DEFAULTS = {
  search: '',
  phase: 'all',
  module: 'all',
  modules: [],
  kind: 'all',
  priority: 'all',
  status: 'all',
  slotType: 'all',
  tag: 'all',
  dateMode: 'all',
  exactDate: '',
  dateFrom: '',
  dateTo: '',
}

// v2: 'progress' view added to VIEW_OPTIONS above.
