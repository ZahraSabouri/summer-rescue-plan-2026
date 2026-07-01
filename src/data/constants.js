export const STATUS_OPTIONS = [
  'Today',
  'This Week',
  'Deep Work',
  'Backlog',
  'Waiting / Blocked',
  'Rescue Lane',
  'Done',
]

export const STATUS_COLUMNS = [
  { id: 'Today', label: 'Today' },
  { id: 'This Week', label: 'This Week' },
  { id: 'Deep Work', label: 'Deep Work' },
  { id: 'Backlog', label: 'Backlog' },
  { id: 'Waiting / Blocked', label: 'Waiting' },
  { id: 'Rescue Lane', label: 'Rescue Lane' },
  { id: 'Done', label: 'Done' },
]

export const PHASE_OPTIONS = ['Phase 2', 'Phase 3', 'Phase 4']

export const MODULE_OPTIONS = [
  'Applied ML',
  'Time Series',
  'MAT700',
  'Group Project',
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
  'insurance',
  'exam',
  'evidence',
  'fixed',
  'date-watch',
]

export const VIEW_OPTIONS = [
  { id: 'hub', label: 'Study Hub' },
  { id: 'dashboard', label: 'Planner' },
  { id: 'progress', label: 'Progress' },
  { id: 'aml', label: 'Applied ML' },
  { id: 'time-series', label: 'Time Series' },
  { id: 'mat700', label: 'Data Mining' },
  { id: 'board', label: 'Columns' },
  { id: 'table', label: 'Table' },
  { id: 'week', label: 'Week' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'rescue', label: 'Rescue Lane' },
  { id: 'project', label: 'Project Ship' },
  { id: 'admin', label: 'Admin Watch' },
]

export const FILTER_DEFAULTS = {
  search: '',
  phase: 'all',
  module: 'all',
  priority: 'all',
  status: 'all',
  slotType: 'all',
  tag: 'all',
  dateMode: 'all',
}

// v2: 'progress' view added to VIEW_OPTIONS above.
