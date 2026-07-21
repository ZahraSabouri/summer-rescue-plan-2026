import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { AddCardDialog } from './components/AddCardDialog'
import { AccessibleDialog } from './components/AccessibleDialog'
import { AppIntro } from './components/AppIntro'
import { CardDetailDrawer } from './components/CardDetailDrawer'
import { CommandPalette } from './components/CommandPalette'
import { FilterBar } from './components/FilterBar'
import { MusicPopover } from './components/MusicPopover'
import { NotificationCenter } from './components/NotificationCenter'
import { StudyTimer } from './components/StudyTimer'
import { FocusStatsBadge } from './components/FocusStats'
import { FocusToasts } from './components/FocusToasts'
import { ExamDateStatus, ModuleExamDateFields } from './components/ModuleExamDates'
import { TodayView } from './components/TodayView'
import { Celebration } from './components/Celebration'
import { ImportPreviewDialog } from './components/ImportPreviewDialog'
import { InstallDesktopApp } from './components/InstallDesktopApp'
import { buildHashRoute, parseHashRoute } from './utils/appRoute'

// Route-level code splitting.
//
// Today is the landing route and stays eager; every other heavy destination is
// fetched on first navigation. The chunks are same-origin static files emitted
// next to the app, so a lazy route still works with no network — this must never
// become a runtime dependency on anything remote.
//
// The shell's <h1> is rendered outside renderView(), so route focus management is
// unaffected by suspending the view body.
const lazyNamed = (loader, name) => lazy(() => loader().then((module) => ({ default: module[name] })))

const ModuleWorkspace = lazyNamed(() => import('./components/ModuleWorkspace'), 'ModuleWorkspace')
const ResourceReader = lazyNamed(() => import('./components/ModuleWorkspace'), 'ResourceReader')
const ProgressView = lazyNamed(() => import('./components/ProgressView'), 'ProgressView')
const ScheduleView = lazyNamed(() => import('./components/ScheduleView'), 'ScheduleView')
const StudyHub = lazyNamed(() => import('./components/StudyHub'), 'StudyHub')
const DayReview = lazyNamed(() => import('./components/DayReview'), 'DayReview')
const JobHuntPlaybook = lazyNamed(() => import('./components/JobHuntPlaybook'), 'JobHuntPlaybook')
const RescueTriage = lazyNamed(() => import('./components/RescueTriage'), 'RescueTriage')
const AnalyticsView = lazyNamed(() => import('./components/TrackerViews'), 'AnalyticsView')
const BoardView = lazyNamed(() => import('./components/TrackerViews'), 'BoardView')
const DashboardView = lazyNamed(() => import('./components/TrackerViews'), 'DashboardView')
const EvidenceView = lazyNamed(() => import('./components/TrackerViews'), 'EvidenceView')
const FocusView = lazyNamed(() => import('./components/TrackerViews'), 'FocusView')
const TableView = lazyNamed(() => import('./components/TrackerViews'), 'TableView')
const WeekView = lazyNamed(() => import('./components/TrackerViews'), 'WeekView')

function ViewLoading({ label = 'Loading view' }) {
  return (
    <div className="view-loading" role="status" aria-live="polite">
      <span className="view-loading-spinner" aria-hidden="true" />
      <p>{label}…</p>
    </div>
  )
}
import {
  campaignMeta,
  rescueCards,
  scheduleExceptions,
  scheduleRules,
} from './data/summerRescuePlan'
import { applyAmlVideoStudyPlan } from './data/amlVideoPlan'
import { applyCardStudySequences } from './data/cardStudySequences'
import { attachCardResourceLinks } from './data/cardResources'
import { FILTER_DEFAULTS, MODULE_OPTIONS, PHASE_OPTIONS, TAG_OPTIONS, VIEW_OPTIONS } from './data/constants'
import { STUDY_MODULES } from './data/studyModules'
import { KNOWLEDGE_SEEDS } from './data/knowledgeSeeds'
import { relatedNotesForCard, resolveModuleNotes } from './utils/knowledge'
import { onFocusMessage, postFocusMessage } from './utils/focusSession'
import { EVENT_COVERAGE, coverageSummary } from './state/eventCoverage'
import { useTrackerState } from './state/useTrackerState'
import {
  examCountdownDays,
  examWindow,
  resolveExamTarget,
  resolveModuleExamDates,
} from './utils/examDates'
import {
  chooseBackupHandle,
  fileBackupSupported,
  loadBackupHandle,
  queryBackupPermission,
  requestBackupPermission,
  writeBackupHandle,
} from './utils/fileBackup'
import {
  isCardAttachmentResource,
  readLocalDataHealth,
  readLocalResources,
  rebuildLocalDatabase,
  uploadCardAttachmentFile,
  uploadLocalResource,
} from './utils/localStateFile'
import { cardPlanLane, deriveStats, filterCards, sortCards, startOfWeek, sumHours, todayString } from './utils/progress'
import { buildWeeklyLifeCardInputs, recurringLifeCardIdentity } from './utils/lifeCards'
import { buildExecutionContext, expandScheduleForDate } from './utils/schedule'
import { applyBlockTimeOverride, blockLogKey } from './utils/dayReview'
import { generateNotifications } from './utils/notifications'
import { focusRewards } from './utils/focusRewards'
import { listRollingBackups, readRollingBackup, recordRollingBackup } from './utils/rollingBackup'

const PLANNED_BASE_CARDS = applyAmlVideoStudyPlan(rescueCards)
const SEQUENCED_BASE_CARDS = applyCardStudySequences(PLANNED_BASE_CARDS)
const ENRICHED_BASE_CARDS = attachCardResourceLinks(SEQUENCED_BASE_CARDS, STUDY_MODULES)

const LABEL_BY_ID = Object.fromEntries(VIEW_OPTIONS.map((view) => [view.id, view.label]))

function cleanCustomOptions(options) {
  if (!Array.isArray(options)) return []
  return [...new Set(options.map((option) => String(option).trim()).filter(Boolean))]
}

function mergeOptions(baseOptions, customOptions) {
  const seen = new Set()
  return [...baseOptions, ...cleanCustomOptions(customOptions)].filter((option) => {
    const key = option.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function mergeResources(resources) {
  const byId = new Map()
  for (const resource of resources) {
    if (!resource?.id) continue
    byId.set(resource.id, {
      ...(byId.get(resource.id) ?? {}),
      ...resource,
    })
  }
  return [...byId.values()]
}

function optionExists(options, value, except = '') {
  const normalised = value.toLowerCase()
  const excluded = except.toLowerCase()
  return options.some((option) => option.toLowerCase() === normalised && option.toLowerCase() !== excluded)
}

const NAV_GROUPS = [
  { label: 'Study', items: ['today', 'hub', 'aml', 'time-series', 'team-project', 'mat700'] },
  { label: 'Planning', items: ['schedule', 'review', 'dashboard', 'progress', 'analytics'] },
  { label: 'Board', items: ['board', 'table', 'week', 'evidence'] },
  { label: 'Focus', items: ['rescue', 'areas', 'project', 'jobs', 'admin'] },
]

const FILTERABLE_VIEWS = new Set(['evidence', 'rescue', 'table', 'dashboard', 'analytics', 'week', 'board'])

function routeFilters(filters = {}) {
  const modules = Array.isArray(filters.modules) && filters.modules.length > 0
    ? filters.modules
    : filters.module && filters.module !== 'all' ? [filters.module] : []
  return {
    ...FILTER_DEFAULTS,
    ...filters,
    module: 'all',
    modules,
  }
}

const VIEW_META = {
  today: { title: 'Today', subtitle: 'Your mission control — now, next, and protected capacity.' },
  hub: { title: 'Study Hub', subtitle: 'Command center for the whole rescue campaign.' },
  dashboard: { title: 'Planner', subtitle: 'Pace, pipeline, and this week at a glance.' },
  progress: { title: 'Progress', subtitle: 'Trajectory, pace, and burn-down.' },
  schedule: { title: 'Schedule', subtitle: 'Hour-by-hour protected routines, study, project, and job blocks.' },
  review: { title: 'Review', subtitle: 'Walk back through past days — what was planned, what actually happened.' },
  aml: { title: 'Applied ML', subtitle: 'Lab-first practice — the priority module.' },
  'time-series': { title: 'Time Series', subtitle: 'Exam-template drills, repeated to fluency.' },
  'team-project': { title: 'Team Project', subtitle: 'Protected CMT501 capacity; detailed project management stays elsewhere.' },
  mat700: { title: 'Mathematical Methods for Data Mining', subtitle: 'Tutorial-first recovery, timed recall, and paper practice.' },
  board: { title: 'Columns', subtitle: 'Status board across every lane.' },
  table: { title: 'Table', subtitle: 'Dense, editable card grid.' },
  week: { title: 'This Week', subtitle: 'Your seven-day working plan.' },
  analytics: { title: 'Analytics', subtitle: 'Charts, heatmap, and module mix.' },
  evidence: { title: 'Evidence', subtitle: 'Outputs and proof of work.' },
  rescue: { title: 'Rescue Lane', subtitle: 'Buffers and slipped-card recovery.' },
  project: { title: 'Project Capacity', subtitle: 'Bounded CMT501 space without duplicating the project app.' },
  jobs: { title: 'Job Hunt', subtitle: 'A bounded opportunity lane that cannot consume exam preparation.' },
  admin: { title: 'Admin & Dates', subtitle: 'Exam logistics and date watch.' },
  areas: { title: 'Life, Health & Admin', subtitle: 'Personal routines and logistics, tracked separately from academic pace.' },
}

const VALID_VIEW_IDS = new Set(Object.keys(VIEW_META))

function parseAppHash() {
  if (typeof window === 'undefined') return parseHashRoute('', VALID_VIEW_IDS)
  return parseHashRoute(window.location.hash, VALID_VIEW_IDS)
}

function viewFromHash() {
  return parseAppHash().view
}

// Mirrors the server's viewerFor mapping for the file types attachments use.
const ATTACHMENT_VIEWER_BY_TYPE = {
  PDF: 'frame',
  HTML: 'frame',
  MD: 'markdown',
  TXT: 'text',
  CSV: 'text',
  IPYNB: 'notebook',
  MP4: 'video',
  WEBM: 'video',
  MOV: 'video',
  PNG: 'image',
  JPG: 'image',
  JPEG: 'image',
  WEBP: 'image',
  GIF: 'image',
}

function resourceIdFromHash() {
  return parseAppHash().resourceId
}

function resourceModeFromHash() {
  return parseAppHash().resourceMode
}

function Icon({ name }) {
  const p = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  let body
  switch (name) {
    case 'brand':
      body = (
        <>
          <path {...p} d="M12 3c3.6 2.8 5.6 5.6 5.6 9.2A5.6 5.6 0 0 1 6.4 12.2c0-1.5.5-2.8 1.4-4" />
          <path {...p} d="M12 21v-8" />
        </>
      )
      break
    case 'today':
      body = (
        <>
          <circle {...p} cx="12" cy="13" r="6" />
          <path {...p} d="M12 10.5V13l2 2M12 3v2M4.6 5.6 6 7M19.4 5.6 18 7" />
        </>
      )
      break
    case 'hub':
      body = (
        <>
          <path {...p} d="M12 3 3 8l9 5 9-5-9-5Z" />
          <path {...p} d="M3 13l9 5 9-5" />
        </>
      )
      break
    case 'aml':
      body = (
        <>
          <rect {...p} x="7" y="7" width="10" height="10" rx="2" />
          <path {...p} d="M10 3v3M14 3v3M10 18v3M14 18v3M3 10h3M3 14h3M18 10h3M18 14h3" />
        </>
      )
      break
    case 'time-series':
      body = <path {...p} d="M3 12h3l2-6 4 12 3-8 1.5 3H21" />
      break
    case 'review':
      body = (
        <>
          <path {...p} d="M4 12a8 8 0 1 0 2.3-5.6L4 8.5" />
          <path {...p} d="M4 4v4.5h4.5M12 8v4l3 2" />
        </>
      )
      break
    case 'team-project':
      body = (
        <>
          <path {...p} d="M21 8l-9-5-9 5v8l9 5 9-5V8Z" />
          <path {...p} d="M3 8l9 5 9-5M12 13v8" />
          <path {...p} d="M8 15l4 2 4-2" />
        </>
      )
      break
    case 'mat700':
      body = (
        <>
          <circle {...p} cx="6" cy="6" r="1.3" />
          <circle {...p} cx="12" cy="6" r="1.3" />
          <circle {...p} cx="18" cy="6" r="1.3" />
          <circle {...p} cx="6" cy="12" r="1.3" />
          <circle {...p} cx="12" cy="12" r="1.3" />
          <circle {...p} cx="18" cy="12" r="1.3" />
          <circle {...p} cx="6" cy="18" r="1.3" />
          <circle {...p} cx="12" cy="18" r="1.3" />
          <circle {...p} cx="18" cy="18" r="1.3" />
        </>
      )
      break
    case 'dashboard':
      body = (
        <>
          <rect {...p} x="3" y="3" width="18" height="18" rx="2.5" />
          <path {...p} d="M3 9h18M9 21V9" />
        </>
      )
      break
    case 'progress':
      body = (
        <>
          <path {...p} d="M3 17l6-6 4 4 8-8" />
          <path {...p} d="M17 7h4v4" />
        </>
      )
      break
    case 'analytics':
      body = (
        <>
          <path {...p} d="M3 21h18" />
          <rect {...p} x="5" y="12" width="3" height="7" rx="1" />
          <rect {...p} x="10.5" y="6" width="3" height="13" rx="1" />
          <rect {...p} x="16" y="14" width="3" height="5" rx="1" />
        </>
      )
      break
    case 'board':
      body = (
        <>
          <rect {...p} x="3" y="4" width="5" height="16" rx="1.4" />
          <rect {...p} x="9.5" y="4" width="5" height="11" rx="1.4" />
          <rect {...p} x="16" y="4" width="5" height="16" rx="1.4" />
        </>
      )
      break
    case 'table':
      body = (
        <>
          <rect {...p} x="3" y="4" width="18" height="16" rx="2.5" />
          <path {...p} d="M3 9.5h18M3 15h18M9 4v16" />
        </>
      )
      break
    case 'week':
      body = (
        <>
          <rect {...p} x="3" y="5" width="18" height="16" rx="2.5" />
          <path {...p} d="M3 9.5h18M8 3v4M16 3v4" />
        </>
      )
      break
    case 'schedule':
      body = (
        <>
          <rect {...p} x="3" y="5" width="18" height="16" rx="2.5" />
          <path {...p} d="M3 9.5h18M8 3v4M16 3v4M7 13h4M7 17h7" />
        </>
      )
      break
    case 'evidence':
      body = (
        <>
          <rect {...p} x="3" y="3" width="18" height="18" rx="3.5" />
          <path {...p} d="M8 12l3 3 5-6" />
        </>
      )
      break
    case 'rescue':
      body = (
        <>
          <circle {...p} cx="12" cy="12" r="9" />
          <circle {...p} cx="12" cy="12" r="3.6" />
          <path {...p} d="M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4" />
        </>
      )
      break
    case 'project':
      body = (
        <>
          <path {...p} d="M21 8l-9-5-9 5v8l9 5 9-5V8Z" />
          <path {...p} d="M3 8l9 5 9-5M12 13v9" />
        </>
      )
      break
    case 'admin':
      body = (
        <>
          <path {...p} d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z" />
          <path {...p} d="M9 12l2 2 4-4" />
        </>
      )
      break
    case 'areas':
      body = (
        <>
          <path {...p} d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z" />
          <path {...p} d="M12 8v8M8 12h8" />
        </>
      )
      break
    case 'jobs':
      body = (
        <>
          <rect {...p} x="3" y="7" width="18" height="13" rx="2.5" />
          <path {...p} d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
        </>
      )
      break
    case 'settings':
      body = <path {...p} d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
      break
    case 'menu':
      body = <path {...p} d="M3 6h18M3 12h18M3 18h18" />
      break
    case 'chevron':
      body = <path {...p} d="M15 6l-6 6 6 6" />
      break
    case 'plus':
      body = <path {...p} d="M12 5v14M5 12h14" />
      break
    case 'close':
      body = <path {...p} d="M6 6l12 12M18 6 6 18" />
      break
    case 'sun':
      body = (
        <>
          <circle {...p} cx="12" cy="12" r="4" />
          <path {...p} d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      )
      break
    case 'moon':
      body = <path {...p} d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
      break
    default:
      body = <circle {...p} cx="12" cy="12" r="8" />
  }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      {body}
    </svg>
  )
}

function scopeCardsForView(view, cards, referenceDate) {
  if (view === 'rescue') {
    return cards.filter(
      (card) => cardPlanLane(card, referenceDate) === 'Rescue Lane' || card.tags.includes('rescue'),
    )
  }
  if (view === 'mat700') {
    return cards.filter((card) => card.moduleGroup === 'MAT700')
  }
  if (view === 'project') {
    return cards.filter((card) => card.moduleGroup === 'Group Project')
  }
  if (view === 'admin') {
    return cards.filter((card) => card.moduleGroup === 'Admin')
  }
  if (view === 'jobs') {
    return cards.filter((card) => card.moduleGroup === 'Job Hunt')
  }
  return cards
}

function buildBackupName() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `summer-rescue-tracker-backup-${stamp}.json`
}

function formatExportStamp(value) {
  if (!value) return 'No export yet'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function latestStamp(...values) {
  return values.filter(Boolean).sort().at(-1) ?? null
}

function buildTrackerBackupPayload(state, snapshots, exportedAt) {
  return {
    exportedAt,
    app: 'summer-rescue-plan-app',
    campaignMeta,
    state: {
      ...state,
      settings: {
        ...state.settings,
        lastExportedAt: exportedAt,
      },
      snapshots,
    },
  }
}

function backupDoneCount(rawState) {
  const cardStates = rawState?.cards && typeof rawState.cards === 'object' ? rawState.cards : {}
  const addedCards = Array.isArray(rawState?.addedCards) ? rawState.addedCards : []
  let done = 0

  for (const baseCard of ENRICHED_BASE_CARDS) {
    const cardState = cardStates[baseCard.id] ?? {}
    if (cardState.done || cardState.status === 'Done') done += 1
  }
  for (const card of addedCards) {
    const cardState = cardStates[card.id] ?? {}
    if (cardState.done || cardState.status === 'Done' || card.status === 'Done') done += 1
  }
  return done
}

export default function App() {
  const tracker = useTrackerState(ENRICHED_BASE_CARDS)
  const [activeView, setActiveView] = useState(() => viewFromHash())
  const [activeModuleTab, setActiveModuleTab] = useState(() => parseAppHash().tab || 'overview')
  const [knowledgeFocus, setKnowledgeFocus] = useState(() => {
    const route = parseAppHash()
    return route.noteId ? { moduleId: route.view, noteId: route.noteId } : null
  })
  const [filters, setFilters] = useState(() => routeFilters(parseAppHash().filters))
  const [routeDate, setRouteDate] = useState(() => parseAppHash().date || '')
  const [selectedCardId, setSelectedCardId] = useState(() => parseAppHash().cardId || null)
  const [activeTimerCardId, setActiveTimerCardId] = useState(null)
  const [sessionStartSignal, setSessionStartSignal] = useState(0)
  // Set to the card id a Focus Room tab is mirroring, so this tab keeps feeding it
  // fresh snapshots. '' when no room tab is connected.
  const [focusRoomCardId, setFocusRoomCardId] = useState('')
  const [replanUndo, setReplanUndo] = useState(null)
  const [openResourceId, setOpenResourceId] = useState(null)
  const [attachmentResource, setAttachmentResource] = useState(null)
  const [commandOpen, setCommandOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [celebrateSeed, setCelebrateSeed] = useState(0)
  const [pendingImport, setPendingImport] = useState(null)
  const [safetyCopies, setSafetyCopies] = useState([])
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try {
      return localStorage.getItem('srp-nav-collapsed') === '1'
    } catch {
      return false
    }
  })
  const [navOpen, setNavOpen] = useState(false)
  const [cardiffLinksOpen, setCardiffLinksOpen] = useState(false)
  // Bumped on every nav click, including a click back to the page you're
  // already on. `.view-anim`'s key below combines this with activeView, so a
  // repeat click still forces a full remount (filters/local view state reset
  // to fresh) instead of being a no-op because activeView didn't change.
  const [navRefreshKey, setNavRefreshKey] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [newModuleName, setNewModuleName] = useState('')
  const [newPhaseName, setNewPhaseName] = useState('')
  const [moduleNameEdits, setModuleNameEdits] = useState({})
  const [phaseNameEdits, setPhaseNameEdits] = useState({})
  const [entered, setEntered] = useState(() => {
    const route = parseAppHash()
    try {
      return localStorage.getItem('srp-skip-intro') === '1' || route.view !== 'today' || Boolean(route.cardId || route.resourceId)
    } catch {
      return route.view !== 'today' || Boolean(route.cardId || route.resourceId)
    }
  })
  const [skipIntro, setSkipIntro] = useState(() => {
    try {
      return localStorage.getItem('srp-skip-intro') === '1'
    } catch {
      return false
    }
  })
  const [dataHealth, setDataHealth] = useState(null)
  const [dataHealthStatus, setDataHealthStatus] = useState('idle')
  const autosaveSupported = fileBackupSupported()
  const [assetManifest, setAssetManifest] = useState(null)
  const [localResources, setLocalResources] = useState([])
  const [autosaveHandle, setAutosaveHandle] = useState(null)
  const [autosaveStatus, setAutosaveStatus] = useState(autosaveSupported ? 'off' : 'unsupported')
  const [autosaveSavedAt, setAutosaveSavedAt] = useState(null)
  const [autosaveDetail, setAutosaveDetail] = useState('')
  const autosaveTimerRef = useRef(null)
  const autosaveRunRef = useRef(0)
  const saveNowRef = useRef(null)
  const hashResourceRef = useRef('')
  const pageHeadingRef = useRef(null)

  const configuredReferenceDate = tracker.state.settings.referenceDate
  const referenceDate = configuredReferenceDate < todayString() ? todayString() : configuredReferenceDate
  const mat700Active = tracker.state.settings.mat700Active
  const theme = tracker.state.settings.theme ?? 'light'
  const referenceDateRef = useRef(referenceDate)
  const updateSettingsRef = useRef(tracker.updateSettings)
  const schedule = useMemo(
    () => ({
      campaignStart: tracker.state.settings.campaignStart,
      campaignEnd: tracker.state.settings.campaignEnd,
      examWindowStart: tracker.state.settings.examWindowStart,
    }),
    [
      tracker.state.settings.campaignEnd,
      tracker.state.settings.campaignStart,
      tracker.state.settings.examWindowStart,
    ],
  )
  const moduleExamDates = useMemo(
    () => tracker.state.settings.moduleExamDates ?? {},
    [tracker.state.settings.moduleExamDates],
  )
  const dayScheduleDate = referenceDate < schedule.campaignStart ? schedule.campaignStart : referenceDate
  const baseDayBlocks = useMemo(
    () => expandScheduleForDate(scheduleRules, scheduleExceptions, dayScheduleDate),
    [dayScheduleDate],
  )
  const dayLogs = tracker.state.dayLogs
  const dayBlocks = useMemo(
    () => {
      const details = dayLogs?.[dayScheduleDate]?.blockDetails ?? {}
      return baseDayBlocks.map((block) => applyBlockTimeOverride(block, details[blockLogKey(block)]))
    },
    [baseDayBlocks, dayLogs, dayScheduleDate],
  )
  const customModules = useMemo(
    () => cleanCustomOptions(tracker.state.settings.customModules),
    [tracker.state.settings.customModules],
  )
  const customPhases = useMemo(
    () => cleanCustomOptions(tracker.state.settings.customPhases),
    [tracker.state.settings.customPhases],
  )
  const moduleOptions = useMemo(
    () => mergeOptions(MODULE_OPTIONS, customModules),
    [customModules],
  )
  const phaseOptions = useMemo(
    () => mergeOptions(PHASE_OPTIONS, customPhases),
    [customPhases],
  )
  const tagOptions = useMemo(
    () => mergeOptions(TAG_OPTIONS, tracker.cards.flatMap((card) => card.tags ?? [])),
    [tracker.cards],
  )
  const lastExportedAt = tracker.state.settings.lastExportedAt
  const localFileSavedAt = tracker.localFile.savedAt
  const localFileActive = ['ready', 'saved', 'saving'].includes(tracker.localFile.status)
  const lastBackupAt = latestStamp(lastExportedAt, autosaveSavedAt, localFileSavedAt)
  const unsavedSinceBackup = !lastBackupAt || tracker.state.updatedAt > lastBackupAt
  const backupStatusText = unsavedSinceBackup
    ? 'Unsaved since backup'
    : localFileSavedAt === lastBackupAt
      ? `Local file saved ${formatExportStamp(localFileSavedAt)}`
      : autosaveSavedAt === lastBackupAt
      ? `Autosaved ${formatExportStamp(autosaveSavedAt)}`
      : `Exported ${formatExportStamp(lastExportedAt)}`
  const localFileStatusText =
    tracker.localFile.status === 'checking'
      ? 'Local state file: checking'
      : tracker.localFile.status === 'unavailable'
        ? 'Local state file unavailable; using browser cache fallback.'
        : tracker.localFile.status === 'conflict'
          ? `Save conflict: ${tracker.localFile.error}`
          : tracker.localFile.status === 'error'
          ? `Local state file error: ${tracker.localFile.error}`
          : tracker.localFile.status === 'saving'
            ? `Saving ${tracker.localFile.path}`
            : `Local state file: ${tracker.localFile.path}`
  const autosaveButtonLabel = !autosaveSupported
    ? 'Autosave unavailable'
    : autosaveStatus === 'connecting'
      ? 'Connecting...'
      : autosaveHandle
        ? 'Change autosave file'
        : 'Choose autosave file'
  const saveButtonLabel =
    tracker.localFile.status === 'saving' || autosaveStatus === 'writing'
      ? 'Saving...'
      : !unsavedSinceBackup && lastBackupAt
        ? `Saved ${formatExportStamp(lastBackupAt)}`
        : 'Save'
  const saveButtonDetail = localFileActive
    ? 'Local file'
    : !autosaveSupported
    ? 'Exports JSON'
    : autosaveHandle
      ? backupStatusText
      : 'Choose file once'

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme
    }
  }, [theme])

  useEffect(() => {
    let cancelled = false
    fetch('/study-assets-manifest.json')
      .then((response) => (response.ok ? response.json() : null))
      .then((manifest) => {
        if (!cancelled) setAssetManifest(manifest)
      })
      .catch(() => {
        if (!cancelled) setAssetManifest(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!settingsOpen) return undefined
    let cancelled = false
    readLocalDataHealth()
      .then((result) => {
        if (cancelled) return
        setDataHealth(result)
        setDataHealthStatus('ready')
      })
      .catch((error) => {
        if (cancelled) return
        setDataHealth(null)
        setDataHealthStatus(`error:${error.message}`)
      })
    return () => {
      cancelled = true
    }
  }, [settingsOpen, tracker.localFile.revision])

  useEffect(() => {
    referenceDateRef.current = referenceDate
  }, [referenceDate])

  useEffect(() => {
    updateSettingsRef.current = tracker.updateSettings
  }, [tracker.updateSettings])

  useEffect(() => {
    const today = todayString()
    if (configuredReferenceDate < today) updateSettingsRef.current({ referenceDate: today })
  }, [configuredReferenceDate, tracker.localFile.status])

  useEffect(() => {
    function syncToday() {
      const today = todayString()
      if (today > referenceDateRef.current) updateSettingsRef.current({ referenceDate: today })
    }
    syncToday()
    const id = window.setInterval(syncToday, 60000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    readLocalResources()
      .then((resources) => {
        // Card attachments live on cards, not in the study-resource pickers.
        if (!cancelled) setLocalResources(resources.filter((resource) => !isCardAttachmentResource(resource)))
      })
      .catch((error) => {
        if (!cancelled) console.warn('Local resources unavailable:', error)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('srp-nav-collapsed', navCollapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [navCollapsed])

  useEffect(() => {
    const id = window.setTimeout(() => setNavOpen(false), 0)
    return () => window.clearTimeout(id)
  }, [activeView])

  useEffect(() => {
    function syncRouteFromLocation() {
      const route = parseAppHash()
      setActiveView(route.view)
      setActiveModuleTab(route.tab || 'overview')
      setSelectedCardId(route.cardId || null)
      setRouteDate(route.date || '')
      setFilters(routeFilters(route.filters))
      setKnowledgeFocus(route.noteId ? { moduleId: route.view, noteId: route.noteId } : null)
    }
    window.addEventListener('hashchange', syncRouteFromLocation)
    window.addEventListener('popstate', syncRouteFromLocation)
    return () => {
      window.removeEventListener('hashchange', syncRouteFromLocation)
      window.removeEventListener('popstate', syncRouteFromLocation)
    }
  }, [])

  // A refresh or view change should land you at the top of the page, not wherever
  // the browser remembered the scroll position from the previous session.
  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    document.querySelector('.app-main')?.scrollTo?.(0, 0)
    const frame = window.requestAnimationFrame(() => pageHeadingRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [activeView])

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') {
        setNavOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!autosaveSupported) return undefined
    let cancelled = false

    loadBackupHandle()
      .then(async (handle) => {
        if (!handle || cancelled) return
        setAutosaveStatus('checking')
        const hasPermission = await queryBackupPermission(handle)
        if (cancelled) return

        if (hasPermission) {
          setAutosaveHandle(handle)
          setAutosaveStatus('ready')
          setAutosaveDetail(`Autosave ready: ${handle.name ?? 'backup file'}`)
        } else {
          setAutosaveStatus('permission')
          setAutosaveDetail('Autosave permission needed')
        }
      })
      .catch((error) => {
        if (cancelled) return
        console.error(error)
        setAutosaveStatus('error')
        setAutosaveDetail(`Autosave setup failed: ${error.message}`)
      })

    return () => {
      cancelled = true
    }
  }, [autosaveSupported])

  useEffect(() => {
    if (!autosaveSupported || !autosaveHandle) return undefined

    const runId = autosaveRunRef.current + 1
    autosaveRunRef.current = runId

    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = window.setTimeout(async () => {
      const savedAt = new Date().toISOString()
      setAutosaveStatus('writing')

      try {
        const hasPermission = await requestBackupPermission(autosaveHandle)
        if (!hasPermission) throw new Error('File permission was not granted.')
        await writeBackupHandle(autosaveHandle, buildTrackerBackupPayload(tracker.state, tracker.snapshots, savedAt))
        if (autosaveRunRef.current !== runId) return
        setAutosaveSavedAt(savedAt)
        setAutosaveStatus('saved')
        setAutosaveDetail(`Autosaved ${formatExportStamp(savedAt)} to ${autosaveHandle.name ?? 'backup file'}`)
      } catch (error) {
        if (autosaveRunRef.current !== runId) return
        console.error(error)
        setAutosaveStatus('error')
        setAutosaveDetail(`Autosave failed: ${error.message}`)
      }
    }, 1200)

    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    }
  }, [autosaveHandle, autosaveSupported, tracker.snapshots, tracker.state])

  const filteredCards = useMemo(
    () => filterCards(tracker.cards, filters, referenceDate),
    [tracker.cards, filters, referenceDate],
  )
  const visibleCards = useMemo(
    () => scopeCardsForView(activeView, filteredCards, referenceDate),
    [activeView, filteredCards, referenceDate],
  )
  const stats = useMemo(
    () => deriveStats(filteredCards, referenceDate, mat700Active),
    [filteredCards, referenceDate, mat700Active],
  )
  const allStats = useMemo(
    () => deriveStats(tracker.cards, referenceDate, mat700Active),
    [tracker.cards, referenceDate, mat700Active],
  )
  const selectedCard = tracker.cards.find((card) => card.id === selectedCardId)
  const activeTimerCard = tracker.cards.find((card) => card.id === activeTimerCardId) ?? null
  const focusExecutionContext = useMemo(
    () => buildExecutionContext(dayBlocks, tracker.cards, dayScheduleDate, { activeCard: activeTimerCard }),
    [activeTimerCard, dayBlocks, dayScheduleDate, tracker.cards],
  )
  const uploadedResources = useMemo(
    () => mergeResources([...(tracker.state.uploadedResources ?? []), ...localResources]),
    [localResources, tracker.state.uploadedResources],
  )
  const studyModules = useMemo(
    () =>
      STUDY_MODULES.map((module) => {
        const moduleResources = uploadedResources
          .filter(
            (resource) =>
              resource.moduleId === module.id ||
              resource.moduleKey === module.id ||
              resource.moduleGroup === module.moduleGroup,
          )
          .map((resource) => ({
            ...resource,
            moduleId: module.id,
            moduleGroup: resource.moduleGroup || module.moduleGroup,
          }))
        return {
          ...module,
          resources: mergeResources([...module.resources, ...moduleResources]),
        }
      }),
    [uploadedResources],
  )
  const studyModuleMap = useMemo(
    () => Object.fromEntries(studyModules.map((module) => [module.id, module])),
    [studyModules],
  )
  const allResources = useMemo(
    () =>
      studyModules.flatMap((module) =>
        module.resources.map((resource) => ({
          ...resource,
          moduleId: module.id,
          moduleGroup: module.moduleGroup,
          moduleTitle: module.title,
        })),
      ),
    [studyModules],
  )
  const activeResource = allResources.find((resource) => resource.id === openResourceId) ?? null
  const standaloneResource = activeResource && resourceModeFromHash() === 'reader' ? activeResource : null
  const showCardFilters = FILTERABLE_VIEWS.has(activeView)

  function writeRoute(patch, { replace = false } = {}) {
    const nextHash = buildHashRoute({ ...parseAppHash(), ...patch })
    if (window.location.hash === nextHash) return
    window.history[replace ? 'replaceState' : 'pushState'](null, '', nextHash)
  }

  function openCard(cardId) {
    setSelectedCardId(cardId)
    writeRoute({ cardId })
  }

  function closeCard({ replace = false } = {}) {
    setSelectedCardId(null)
    writeRoute({ cardId: '' }, { replace })
  }

  function openModuleTab(tab) {
    setActiveModuleTab(tab)
    setKnowledgeFocus(null)
    setSelectedCardId(null)
    setOpenResourceId(null)
    hashResourceRef.current = ''
    writeRoute({ tab, cardId: '', resourceId: '', resourceMode: '', noteId: '' })
  }

  function selectKnowledgeNote(noteId) {
    const moduleId = studyModuleMap[activeView]?.id
    setKnowledgeFocus(noteId && moduleId ? { moduleId, noteId } : null)
    writeRoute({ noteId: noteId || '' })
  }

  function selectRouteDate(date) {
    setRouteDate(date || '')
    writeRoute({ date: date || '' })
  }

  useEffect(() => {
    if (!FILTERABLE_VIEWS.has(activeView)) return
    writeRoute({ filters }, { replace: true })
  }, [activeView, filters])

  useEffect(() => {
    function openHashResource() {
      const resourceId = resourceIdFromHash()
      if (!resourceId) {
        hashResourceRef.current = ''
        setOpenResourceId(null)
        return
      }

      const resource = allResources.find((item) => item.id === resourceId)
      if (!resource) return

      if (VALID_VIEW_IDS.has(resource.moduleId) && activeView !== resource.moduleId) {
        setActiveView(resource.moduleId)
      }

      if (hashResourceRef.current === resourceId && openResourceId === resourceId) return
      hashResourceRef.current = resourceId
      setOpenResourceId(resourceId)
      tracker.markResourceOpened(resourceId)
    }

    openHashResource()
    window.addEventListener('hashchange', openHashResource)
    window.addEventListener('popstate', openHashResource)
    return () => {
      window.removeEventListener('hashchange', openHashResource)
      window.removeEventListener('popstate', openHashResource)
    }
  }, [activeView, allResources, openResourceId, tracker])

  const viewMeta = VIEW_META[activeView] ?? { title: LABEL_BY_ID[activeView] ?? 'View', subtitle: '' }
  const doneCount = useMemo(() => tracker.cards.filter((card) => card.done).length, [tracker.cards])

  // Celebrate completions: any path that increases the done count fires a
  // confetti burst (skipped on mount, collapses under prefers-reduced-motion).
  const prevDoneRef = useRef(null)
  useEffect(() => {
    if (prevDoneRef.current != null && doneCount > prevDoneRef.current) {
      setCelebrateSeed(Date.now())
    }
    prevDoneRef.current = doneCount
  }, [doneCount])

  // Rolling daily safety copy of the tracker state (localStorage, last ~5 days).
  const trackerRef = useRef({ state: tracker.state, snapshots: tracker.snapshots })
  useEffect(() => {
    trackerRef.current = { state: tracker.state, snapshots: tracker.snapshots }
  })
  useEffect(() => {
    function record() {
      const { state, snapshots } = trackerRef.current
      recordRollingBackup(buildTrackerBackupPayload(state, snapshots, new Date().toISOString()))
      setSafetyCopies(listRollingBackups())
    }
    record()
    const id = window.setInterval(record, 60 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [])
  const totalCount = tracker.cards.length || 1
  const donePct = Math.round((doneCount / totalCount) * 100)
  const examTarget = useMemo(
    () => resolveExamTarget({ moduleExamDates, schedule, referenceDate }),
    [moduleExamDates, referenceDate, schedule],
  )

  const examCountdown = useMemo(
    () => examCountdownDays(examTarget.date, referenceDate),
    [examTarget.date, referenceDate],
  )
  const resolvedExamDates = useMemo(
    () => resolveModuleExamDates(moduleExamDates, schedule),
    [moduleExamDates, schedule],
  )
  const examWindowRange = useMemo(() => examWindow(schedule), [schedule])
  // Static: derived from the coverage matrix, not from live data.
  const eventCoverage = useMemo(() => coverageSummary(), [])

  const generatedNotifications = useMemo(
    () =>
      generateNotifications({
        cards: tracker.cards,
        referenceDate,
        examCountdown,
        examConfirmed: examTarget.confirmed,
        examLabel: examTarget.label,
        unsavedSinceBackup,
        lastBackupAt,
        mat700Active,
        campaignStart: schedule.campaignStart,
        createdAt: tracker.state.createdAt,
      }),
    [
      examCountdown,
      examTarget.confirmed,
      examTarget.label,
      lastBackupAt,
      mat700Active,
      referenceDate,
      schedule.campaignStart,
      tracker.cards,
      tracker.state.createdAt,
      unsavedSinceBackup,
    ],
  )
  const displayNotifications = useMemo(() => {
    const persisted = tracker.state.notifications ?? {}
    const merged = { ...persisted }
    for (const notice of generatedNotifications) {
      merged[notice.id] = {
        ...(persisted[notice.id] ?? {}),
        ...notice,
        read: persisted[notice.id]?.read ?? notice.read,
      }
    }
    return merged
  }, [generatedNotifications, tracker.state.notifications])

  function setDisplayNotificationRead(notificationId, read = true) {
    if (tracker.state.notifications?.[notificationId]) {
      tracker.setNotificationRead(notificationId, read)
      return
    }
    const generated = generatedNotifications.find((notice) => notice.id === notificationId)
    if (generated) tracker.addNotifications([{ ...generated, read }])
  }

  function markAllDisplayNotificationsRead() {
    const missing = generatedNotifications
      .filter((notice) => !tracker.state.notifications?.[notice.id])
      .map((notice) => ({ ...notice, read: true }))
    tracker.addNotifications(missing)
    tracker.markAllNotificationsRead()
  }

  function generateWeeklyLifeCards() {
    const calendarWeekStart = startOfWeek(referenceDate)
    const weekStart = calendarWeekStart < schedule.campaignStart ? schedule.campaignStart : calendarWeekStart
    const inputs = buildWeeklyLifeCardInputs(weekStart)
    const existingKeys = new Set(tracker.cards.map(recurringLifeCardIdentity).filter(Boolean))
    const missing = inputs.filter((input) => !existingKeys.has(input.recurrenceKey))
    missing.forEach((input) => tracker.addCard(input))
    setMessage(missing.length ? `Added ${missing.length} bounded routine cards for the week.` : 'This week’s routine cards already exist.')
  }

  const seededWeekRef = useRef('')
  useEffect(() => {
    if (tracker.localFile.status === 'checking') return
    const calendarWeekStart = startOfWeek(referenceDate)
    const weekStart = calendarWeekStart < schedule.campaignStart ? schedule.campaignStart : calendarWeekStart
    if (seededWeekRef.current === weekStart) return
    seededWeekRef.current = weekStart
    const existingKeys = new Set(tracker.cards.map(recurringLifeCardIdentity).filter(Boolean))
    for (const input of buildWeeklyLifeCardInputs(weekStart)) {
      if (!existingKeys.has(input.recurrenceKey)) tracker.addCard(input)
    }
  }, [referenceDate, schedule.campaignStart, tracker])

  // A card can already be the active timer card, so setState alone is a no-op and
  // the timer effect never re-fires. Bump a signal on every request so re-clicking
  // the same card reliably re-opens the session timer.
  function startSession(cardId) {
    setActiveTimerCardId(cardId)
    setSessionStartSignal((signal) => signal + 1)
  }

  // Apply a capacity re-plan to the live cards. Downloads a backup first and keeps
  // the previous due dates in memory so the whole thing can be undone in one click.
  function applyReplan(assignments) {
    if (!Array.isArray(assignments) || assignments.length === 0) return
    const affected = new Set(assignments.map((item) => item.cardId))
    // Capture every affected card — an empty dueDate must round-trip so undo can
    // restore cards that had no due date at all; startDate too (apply clamps it).
    const previous = tracker.cards
      .filter((card) => affected.has(card.id))
      .map((card) => ({
        cardId: card.id,
        dueDate: card.dueDate ?? '',
        startDate: card.startDate ?? '',
        status: card.status,
      }))
    downloadBackup(new Date().toISOString())
    tracker.applyReplanSchedule(assignments)
    setReplanUndo(previous)
    setMessage(`Re-plan applied to ${assignments.length} cards. A backup was downloaded first — you can undo below.`)
  }

  function undoReplan() {
    if (!replanUndo || replanUndo.length === 0) return
    tracker.applyReplanSchedule(replanUndo)
    setReplanUndo(null)
    setMessage('Re-plan reverted to the previous dates.')
  }

  const actions = {
    onOpen: openCard,
    onStatusChange: tracker.setStatus,
    onToggleDone: tracker.toggleDone,
    onHoursChange: tracker.setActualHours,
    onProgressChange: tracker.setCardProgress,
    onReschedule: tracker.rescheduleCard,
    onStartSession: startSession,
    activeSessionCardId: activeTimerCardId,
    onApplyReplan: applyReplan,
    onUndoReplan: undoReplan,
    replanCanUndo: replanUndo != null && replanUndo.length > 0,
    referenceDate,
    onNavigateMeta: openCardFacet,
  }

  // Concept notes linked to a card, resolved from the module that owns it so any
  // surface (drawer, Focus Room tab) can list them without knowing about seeds or
  // review scheduling.
  const resolveLinkedNotesForCard = useCallback(
    (card) => {
      if (!card) return []
      const owner = STUDY_MODULES.find((entry) => entry.moduleGroup === card.moduleGroup)
      if (!owner) return []
      return relatedNotesForCard(
        resolveModuleNotes({
          seeds: KNOWLEDGE_SEEDS,
          knowledge: tracker.state.knowledge,
          moduleId: owner.id,
          referenceDate,
        }),
        card,
      )
    },
    [referenceDate, tracker.state.knowledge],
  )

  const linkedKnowledgeNotes = useMemo(
    () => resolveLinkedNotesForCard(selectedCard),
    [resolveLinkedNotesForCard, selectedCard],
  )

  function openKnowledgeNote(note) {
    const owner = STUDY_MODULES.find((entry) => entry.id === note.moduleId)
    if (!owner) return
    setSelectedCardId(null)
    setKnowledgeFocus({ moduleId: owner.id, noteId: note.id })
    setActiveView(owner.viewId)
    setActiveModuleTab('knowledge')
    writeRoute({ view: owner.viewId, tab: 'knowledge', cardId: '', resourceId: '', resourceMode: '', noteId: note.id, date: '', filters: {} })
  }

  const knowledgeActions = {
    onSaveNote: tracker.saveKnowledgeNote,
    onDeleteNote: tracker.deleteKnowledgeNote,
    onToggleStar: tracker.toggleKnowledgeStar,
    onMarkReviewed: tracker.markKnowledgeReviewed,
    onRateQuestion: tracker.rateKnowledgeQuestion,
    onSetCardLinks: tracker.setKnowledgeCardLinks,
  }

  function downloadBackup(exportedAt) {
    const payload = buildTrackerBackupPayload(tracker.state, tracker.snapshots, exportedAt)
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = buildBackupName()
    link.click()
    URL.revokeObjectURL(url)
  }

  function exportBackup() {
    const exportedAt = new Date().toISOString()
    downloadBackup(exportedAt)
    tracker.markExported(exportedAt)
    setMessage('Backup exported.')
  }

  async function connectAutosave() {
    if (!autosaveSupported) {
      setMessage('File autosave is not supported in this browser.')
      return
    }

    setAutosaveStatus('connecting')
    try {
      const handle = await chooseBackupHandle(buildBackupName())
      const hasPermission = await requestBackupPermission(handle)
      if (!hasPermission) throw new Error('File permission was not granted.')

      const savedAt = new Date().toISOString()
      await writeBackupHandle(handle, buildTrackerBackupPayload(tracker.state, tracker.snapshots, savedAt))
      setAutosaveHandle(handle)
      setAutosaveSavedAt(savedAt)
      setAutosaveStatus('saved')
      setAutosaveDetail(`Autosaved ${formatExportStamp(savedAt)} to ${handle.name ?? 'backup file'}`)
      setMessage('File autosave connected.')
    } catch (error) {
      if (error.name === 'AbortError') {
        setAutosaveStatus(autosaveHandle ? 'ready' : 'off')
        return
      }
      console.error(error)
      setAutosaveStatus('error')
      setAutosaveDetail(`Autosave failed: ${error.message}`)
      setMessage('File autosave failed.')
    }
  }

  async function saveNow() {
    if (tracker.localFile.status === 'saving') {
      setMessage('Local file save already running.')
      return
    }

    if (tracker.localFile.status !== 'checking' && tracker.localFile.status !== 'unavailable') {
      try {
        await tracker.saveLocalFileNow()
        setMessage(`Saved local tracker file: ${tracker.localFile.path}`)
        return
      } catch (error) {
        console.error(error)
        setMessage('Local file save failed. Use Export JSON or choose an autosave file as a fallback.')
        return
      }
    }

    if (!autosaveSupported) {
      exportBackup()
      return
    }

    if (!autosaveHandle) {
      setMessage('Pick a file once. The app will keep saving to it automatically.')
      await connectAutosave()
      return
    }

    const savedAt = new Date().toISOString()
    setAutosaveStatus('writing')
    try {
      const hasPermission = await requestBackupPermission(autosaveHandle)
      if (!hasPermission) throw new Error('File permission was not granted.')
      await writeBackupHandle(autosaveHandle, buildTrackerBackupPayload(tracker.state, tracker.snapshots, savedAt))
      setAutosaveSavedAt(savedAt)
      setAutosaveStatus('saved')
      setAutosaveDetail(`Saved ${formatExportStamp(savedAt)} to ${autosaveHandle.name ?? 'backup file'}`)
      setMessage('Saved file copy.')
    } catch (error) {
      console.error(error)
      setAutosaveStatus('error')
      setAutosaveDetail(`Save failed: ${error.message}`)
      setMessage('Save failed.')
    }
  }

  useEffect(() => {
    saveNowRef.current = saveNow
  })

  useEffect(() => {
    function onSaveShortcut(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        saveNowRef.current?.()
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', onSaveShortcut)
    return () => window.removeEventListener('keydown', onSaveShortcut)
  }, [])

  function summariseTrackerPayload(payload) {
    const raw = payload?.state ?? payload ?? {}
    const cardStates = raw.cards && typeof raw.cards === 'object' ? raw.cards : {}
    const hours = Object.values(cardStates).reduce(
      (sum, cardState) => sum + Number(cardState?.actualHours ?? 0),
      0,
    )
    return {
      done: backupDoneCount(raw),
      added: Array.isArray(raw.addedCards) ? raw.addedCards.length : 0,
      hours: Math.round(hours * 10) / 10,
      snapshotDays: Object.keys(raw.snapshots ?? {}).length,
      exportedAt: formatExportStamp(
        payload?.exportedAt ?? raw?.settings?.lastExportedAt ?? raw?.updatedAt,
      ),
    }
  }

  const currentSummary = useMemo(
    () => ({
      done: doneCount,
      added: tracker.state.addedCards.length,
      hours: Math.round(sumHours(tracker.cards, 'actualHours') * 10) / 10,
      snapshotDays: Object.keys(tracker.snapshots ?? {}).length,
    }),
    [doneCount, tracker.cards, tracker.snapshots, tracker.state.addedCards.length],
  )

  async function importBackup(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const payload = JSON.parse(await file.text())
      setPendingImport({
        payload,
        sourceName: file.name,
        incoming: summariseTrackerPayload(payload),
      })
    } catch (error) {
      console.error(error)
      setMessage('Import failed: choose a valid tracker JSON export.')
    } finally {
      event.target.value = ''
    }
  }

  function restoreSafetyCopy(day) {
    const payload = readRollingBackup(day)
    if (!payload) {
      setMessage('That safety copy could not be read.')
      return
    }
    setPendingImport({
      payload,
      sourceName: `Daily safety copy · ${day}`,
      incoming: summariseTrackerPayload(payload),
    })
  }

  function confirmPendingImport() {
    if (!pendingImport) return
    downloadBackup(new Date().toISOString())
    tracker.importTrackerState(pendingImport.payload)
    closeCard({ replace: true })
    setPendingImport(null)
    setSettingsOpen(false)
    setMessage('Current state backed up, then import applied.')
  }

  function addCustomModule() {
    const value = newModuleName.trim()
    if (!value || optionExists(moduleOptions, value)) {
      setNewModuleName('')
      return
    }
    tracker.updateSettings({ customModules: [...customModules, value] })
    setNewModuleName('')
  }

  function deleteCustomModule(value) {
    tracker.updateSettings({ customModules: customModules.filter((module) => module !== value) })
    setModuleNameEdits((current) => {
      const next = { ...current }
      delete next[value]
      return next
    })
    setFilters((current) => ({
      ...current,
      module: current.module === value ? 'all' : current.module,
      modules: (current.modules ?? []).filter((module) => module !== value),
    }))
  }

  function renameCustomModule(oldValue) {
    const value = (moduleNameEdits[oldValue] ?? oldValue).trim()
    if (!value || value === oldValue || optionExists(moduleOptions, value, oldValue)) {
      setModuleNameEdits((current) => ({ ...current, [oldValue]: oldValue }))
      return
    }
    tracker.updateSettings({ customModules: customModules.map((module) => (module === oldValue ? value : module)) })
    tracker.cards
      .filter((card) => card.moduleGroup === oldValue)
      .forEach((card) => tracker.updateCardDetails(card.id, { module: value, moduleGroup: value }))
    setModuleNameEdits((current) => {
      const next = { ...current }
      delete next[oldValue]
      return next
    })
    setFilters((current) => ({
      ...current,
      module: current.module === oldValue ? value : current.module,
      modules: (current.modules ?? []).map((module) => module === oldValue ? value : module),
    }))
  }

  function addCustomPhase() {
    const value = newPhaseName.trim()
    if (!value || optionExists(phaseOptions, value)) {
      setNewPhaseName('')
      return
    }
    tracker.updateSettings({ customPhases: [...customPhases, value] })
    setNewPhaseName('')
  }

  function deleteCustomPhase(value) {
    tracker.updateSettings({ customPhases: customPhases.filter((phase) => phase !== value) })
    setPhaseNameEdits((current) => {
      const next = { ...current }
      delete next[value]
      return next
    })
    if (filters.phase === value) setFilters((current) => ({ ...current, phase: 'all' }))
  }

  function renameCustomPhase(oldValue) {
    const value = (phaseNameEdits[oldValue] ?? oldValue).trim()
    if (!value || value === oldValue || optionExists(phaseOptions, value, oldValue)) {
      setPhaseNameEdits((current) => ({ ...current, [oldValue]: oldValue }))
      return
    }
    tracker.updateSettings({ customPhases: customPhases.map((phase) => (phase === oldValue ? value : phase)) })
    tracker.cards
      .filter((card) => card.phase === oldValue)
      .forEach((card) =>
        tracker.updateCardDetails(card.id, {
          phase: value,
          phaseId: value.toLowerCase().replace(/\s+/g, '-'),
        }),
      )
    setPhaseNameEdits((current) => {
      const next = { ...current }
      delete next[oldValue]
      return next
    })
    if (filters.phase === oldValue) setFilters((current) => ({ ...current, phase: value }))
  }

  function openResource(resourceId) {
    // PDFs and local HTML render via <iframe src>, which the in-app overlay/
    // full-screen-tab both wrap in our own page — fragile (CSP frame-ancestors,
    // browser caching of a once-blocked response) for no benefit, since neither
    // needs the checklist/notes alongside it the way a video does. A real new
    // tab straight to the file sidesteps all of that AND leaves whatever's open
    // behind it (a study card drawer, Focus Room) completely untouched, since
    // no app state changes at all.
    const resource = allResources.find((item) => item.id === resourceId)
    if (resource?.viewer === 'frame') {
      window.open(resource.url, '_blank', 'noopener')
      tracker.markResourceOpened(resourceId)
      return
    }
    setOpenResourceId(resourceId)
    hashResourceRef.current = resourceId
    writeRoute({ resourceId, resourceMode: '' })
    tracker.markResourceOpened(resourceId)
  }

  // Evidence attachments only persist {url, fileName, fileType, size}, so a
  // pseudo-resource is rebuilt for the shared ResourceReader overlay.
  function openAttachment(entry) {
    setAttachmentResource({
      id: `attachment:${entry.url}`,
      title: entry.fileName || entry.text || 'Attachment',
      url: entry.url,
      type: entry.fileType || 'FILE',
      viewer: ATTACHMENT_VIEWER_BY_TYPE[entry.fileType] ?? 'file',
      description: '',
      group: 'Card attachments',
    })
  }

  async function uploadResourceForModule(module, payload) {
    const result = await uploadLocalResource({
      ...payload,
      moduleId: module.id,
      moduleKey: payload.moduleKey || module.id,
      moduleGroup: module.moduleGroup,
    })
    const resource = result.resource
    if (!resource) throw new Error('Upload did not return a resource record.')
    setLocalResources((current) => mergeResources([resource, ...current]))
    tracker.addUploadedResource(resource)
    setMessage(`Uploaded resource: ${resource.title}`)
    return resource
  }

  async function addEvidenceAttachment(cardId, file) {
    const card = tracker.cards.find((item) => item.id === cardId)
    const resource = await uploadCardAttachmentFile(file, card)
    tracker.addEvidence(cardId, file.name, {
      url: resource.url,
      fileName: file.name,
      fileType: resource.type,
      size: resource.size,
    })
    setMessage(`Attached ${file.name} to the card.`)
  }

  function closeResource() {
    setOpenResourceId(null)
    hashResourceRef.current = ''
    writeRoute({ resourceId: '', resourceMode: '' })
  }

  function completeFocusSession(cardId, minutes) {
    tracker.addFocusSession(cardId, minutes)
    focusRewards.recordMinutes(minutes)
    setMessage(`Logged ${minutes} min focus session.`)
  }

  // Bridge to the Focus Room tab. This tab stays the sole writer of tracker state:
  // it answers the room's snapshot requests and applies the mutations the room
  // forwards. Rewards are the exception — the room drives them while open and
  // streams them here to persist (so we must NOT also credit minutes to rewards on
  // a logged session, or every block would count twice).
  const focusBridgeRef = useRef({})
  useEffect(() => {
    focusBridgeRef.current.send = (id) => {
      const card = tracker.cards.find((entry) => entry.id === id)
      if (!card) return
      postFocusMessage('snapshot', {
        cardId: id,
        card,
        resources: allResources.filter((resource) => (card.resourceIds ?? []).includes(resource.id)),
        currentBoundary: activeTimerCardId === id ? focusExecutionContext.block ?? null : null,
        nextBoundary: activeTimerCardId === id ? focusExecutionContext.nextBlock ?? null : null,
        linkedNotes: resolveLinkedNotesForCard(card),
      })
    }
    focusBridgeRef.current.apply = (message) => {
      if (message.action === 'toggle-checklist') tracker.toggleChecklistItem(message.cardId, message.itemId)
      else if (message.action === 'complete-session') {
        tracker.addFocusSession(message.cardId, message.minutes)
        setMessage(`Logged ${message.minutes} min focus session (Focus Room).`)
      } else if (message.action === 'add-note') tracker.addNote(message.cardId, message.text)
      else if (message.action === 'update-note') tracker.updateNote(message.cardId, message.noteId, message.text)
      else if (message.action === 'delete-note') tracker.deleteNote(message.cardId, message.noteId)
      else if (message.action === 'add-evidence') tracker.addEvidence(message.cardId, message.text)
      else if (message.action === 'update-evidence') tracker.updateEvidence(message.cardId, message.evidenceId, message.text)
      else if (message.action === 'delete-evidence') tracker.deleteEvidence(message.cardId, message.evidenceId)
      else if (message.action === 'add-evidence-file') {
        addEvidenceAttachment(message.cardId, message.file).catch((error) => {
          setMessage(`Attachment from Focus Room failed: ${error.message || 'is the local server running?'}`)
        })
      }
    }
  })

  useEffect(() => {
    return onFocusMessage((message) => {
      const bridge = focusBridgeRef.current
      switch (message.type) {
        case 'request-snapshot':
        case 'claim':
          if (message.cardId) {
            setActiveTimerCardId(message.cardId)
            setFocusRoomCardId(message.cardId)
            postFocusMessage('rewards-init', { state: focusRewards.getPersistedState() })
            bridge.send?.(message.cardId)
          }
          break
        case 'release':
          setFocusRoomCardId('')
          break
        case 'action':
          bridge.apply?.(message)
          break
        case 'rewards-sync':
          if (message.state) focusRewards.hydrate(message.state)
          break
        default:
          break
      }
    })
  }, [])

  // Re-push a snapshot whenever the mirrored card's data or its schedule boundaries
  // change, so the room reflects checklist ticks, notes and knowledge live.
  useEffect(() => {
    if (!focusRoomCardId) return
    focusBridgeRef.current.send?.(focusRoomCardId)
  }, [focusRoomCardId, activeTimerCard, focusExecutionContext, allResources, resolveLinkedNotesForCard])

  async function verifyDatabaseMirror() {
    if (!window.confirm('Rebuild the SQLite mirror from the audit event log? JSON remains authoritative.')) return
    try {
      const result = await rebuildLocalDatabase()
      setMessage(`Database mirror rebuilt from ${result.eventCount ?? 0} valid audit events.`)
      setDataHealth(await readLocalDataHealth())
      setDataHealthStatus('ready')
    } catch (error) {
      setMessage(`Database rebuild failed: ${error.message}`)
    }
  }

  async function reloadAfterConflict() {
    if (!window.confirm('Reload the newer local file? Export JSON first if you need to keep this tab’s unsaved edits.')) return
    try {
      await tracker.reloadLocalFileNow()
      setMessage('Reloaded the latest local tracker file.')
    } catch (error) {
      setMessage(`Reload failed: ${error.message}`)
    }
  }

  function resetTracker() {
    const confirmed = window.confirm(
      'Restore the unfinished canonical 20 July plan? Completed cards and past day/focus history are retained, and a JSON backup is downloaded first. This does not move the campaign start to today; use Re-plan remaining exam cards for slippage.',
    )
    if (!confirmed) return
    downloadBackup(new Date().toISOString())
    tracker.resetTrackerState()
    closeCard({ replace: true })
    setMessage('Backup exported; unfinished work restored to the 20 July plan while completed history was retained.')
  }

  // Real hrefs on every nav link, so the browser's own "open in new tab" /
  // "open in new window" context-menu entries and ctrl/cmd/middle-click all
  // work — a plain onClick-only button never offers those. A plain left
  // click still does the instant SPA navigation via openGlobalView; anything
  // else (modifier held, or a click the browser already intends to open
  // elsewhere) is left alone so the browser's native behavior takes over.
  function navHref(view, extra = {}) {
    return buildHashRoute({ view, tab: studyModuleMap[view] ? 'overview' : '', ...extra })
  }

  function handleNavClick(event, view, options) {
    if (event.defaultPrevented || event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    openGlobalView(view, options)
  }

  function openGlobalView(view, { date = '' } = {}) {
    const tab = studyModuleMap[view] ? 'overview' : ''
    setFilters(routeFilters())
    setRouteDate(date)
    setKnowledgeFocus(null)
    setActiveView(view)
    setActiveModuleTab(tab || 'overview')
    setSelectedCardId(null)
    setOpenResourceId(null)
    setNavRefreshKey((n) => n + 1)
    hashResourceRef.current = ''
    writeRoute({ view, tab, cardId: '', resourceId: '', resourceMode: '', date, noteId: '', filters: {} })
    setNavOpen(false)
  }

  function openModuleView(view, moduleGroup) {
    const tab = studyModuleMap[view] ? 'overview' : ''
    setFilters(routeFilters({ module: moduleGroup }))
    setNavRefreshKey((n) => n + 1)
    setRouteDate('')
    setKnowledgeFocus(null)
    setActiveView(view)
    setActiveModuleTab(tab || 'overview')
    setSelectedCardId(null)
    setOpenResourceId(null)
    hashResourceRef.current = ''
    writeRoute({ view, tab, cardId: '', resourceId: '', resourceMode: '', date: '', noteId: '', filters: {} })
    setNavOpen(false)
  }

  function openCardFacet(type, value) {
    if (type !== 'all' && !value) return
    const moduleViews = {
      'Applied ML': 'aml',
      'Time Series': 'time-series',
      MAT700: 'mat700',
      'Group Project': 'team-project',
      'Job Hunt': 'jobs',
      Admin: 'admin',
      Health: 'areas',
      General: 'areas',
    }
    if (type === 'module' && moduleViews[value]) {
      openModuleView(moduleViews[value], value)
      setSelectedCardId(null)
      return
    }
    const next = routeFilters()
    if (type === 'all') {
      setFilters(next)
      setActiveView('table')
      setSelectedCardId(null)
      setActiveModuleTab('overview')
      writeRoute({ view: 'table', tab: '', cardId: '', resourceId: '', resourceMode: '', date: '', noteId: '', filters: next })
      setNavOpen(false)
      return
    }
    if (type === 'date') next.exactDate = value
    else if (Object.hasOwn(next, type)) next[type] = value
    else return
    setFilters(next)
    setActiveView('table')
    setSelectedCardId(null)
    setActiveModuleTab('overview')
    writeRoute({ view: 'table', tab: '', cardId: '', resourceId: '', resourceMode: '', date: '', noteId: '', filters: next })
    setNavOpen(false)
  }

  function renderView() {
    if (activeView === 'today') {
      return (
        <TodayView
          cards={tracker.cards}
          snapshots={tracker.snapshots}
          referenceDate={referenceDate}
          mat700Active={mat700Active}
          actions={actions}
          examCountdown={examCountdown}
          examLabel={examTarget.label}
          examConfirmed={examTarget.confirmed}
          dayBlocks={dayBlocks}
          scheduleDate={dayScheduleDate}
          campaignStart={schedule.campaignStart}
          onOpenCard={openCard}
          onOpenView={openGlobalView}
          activeTimerCard={activeTimerCard}
        />
      )
    }
    if (activeView === 'hub') {
      return (
        <StudyHub
          cards={tracker.cards}
          stats={allStats}
          referenceDate={referenceDate}
          mat700Active={mat700Active}
          actions={actions}
          setActiveView={openGlobalView}
          openModuleView={openModuleView}
          onGenerateWeeklyLifeCards={generateWeeklyLifeCards}
        />
      )
    }
    if (studyModuleMap[activeView]) {
      return (
          <ModuleWorkspace
            key={activeView}
            module={studyModuleMap[activeView]}
            cards={tracker.cards}
            actions={actions}
            referenceDate={referenceDate}
            mat700Active={mat700Active}
            setActiveView={(view) => openModuleView(view, studyModuleMap[activeView].moduleGroup)}
            activeTab={activeModuleTab}
            onTabChange={openModuleTab}
            moduleNote={tracker.state.moduleNotes?.[activeView] ?? ''}
            onModuleNoteChange={tracker.setModuleNote}
            moduleExamDate={moduleExamDates[activeView] ?? ''}
            knowledge={tracker.state.knowledge}
            knowledgeActions={knowledgeActions}
            focusKnowledgeNoteId={
              knowledgeFocus?.moduleId === studyModuleMap[activeView].id ? knowledgeFocus.noteId : ''
            }
            onKnowledgeNoteChange={selectKnowledgeNote}
            resourceProgress={tracker.state.resourceProgress}
            recentResourceIds={tracker.state.recentResourceIds}
            onResourceOpen={tracker.markResourceOpened}
            onOpenResource={openResource}
            activeResourceId={openResourceId}
            onResourceReviewedToggle={tracker.toggleResourceProgress}
            onResourceProgressChange={tracker.updateResourceProgress}
            onResourceUpload={uploadResourceForModule}
          />
        )
    }
    if (activeView === 'dashboard') {
      return (
          <DashboardView
            cards={filteredCards}
            stats={stats}
            snapshots={tracker.snapshots}
            referenceDate={referenceDate}
            weekReferenceDate={dayScheduleDate}
            mat700Active={mat700Active}
            actions={actions}
            schedule={schedule}
            scopeLabel={(filters.modules ?? []).join(', ')}
          />
        )
    }
    if (activeView === 'schedule') {
      return (
        <ScheduleView
          rules={scheduleRules}
          exceptions={scheduleExceptions}
          cards={tracker.cards}
          referenceDate={referenceDate}
          onOpenCard={openCard}
          onCardStatusChange={tracker.setStatus}
          onToggleCardDone={tracker.toggleDone}
          moduleExamDates={moduleExamDates}
          campaignStart={schedule.campaignStart}
          campaignEnd={schedule.campaignEnd}
          selectedWeekStart={routeDate}
          onWeekChange={selectRouteDate}
        />
      )
    }
    if (activeView === 'progress') {
      return (
        <ProgressView
          cards={tracker.cards}
          snapshots={tracker.snapshots}
          referenceDate={referenceDate}
          mat700Active={mat700Active}
          schedule={schedule}
          onNavigateMeta={openCardFacet}
        />
      )
    }
    if (activeView === 'review') {
      return (
        <DayReview
          cards={tracker.cards}
          referenceDate={referenceDate}
          onOpenCard={openCard}
          onCardStatusChange={tracker.setStatus}
          onToggleCardDone={tracker.toggleDone}
          selectedDate={routeDate}
          onSelectedDateChange={selectRouteDate}
        />
      )
    }
    if (activeView === 'board') return <BoardView cards={visibleCards} actions={actions} referenceDate={referenceDate} />
    if (activeView === 'table') return <TableView cards={visibleCards} actions={actions} referenceDate={referenceDate} />
    if (activeView === 'week') return <WeekView cards={visibleCards} referenceDate={dayScheduleDate} actions={actions} />
    if (activeView === 'analytics') {
      return (
        <AnalyticsView
          cards={visibleCards}
          stats={stats}
          snapshots={tracker.snapshots}
          referenceDate={referenceDate}
          schedule={schedule}
          actions={actions}
        />
      )
    }
    if (activeView === 'evidence') return <EvidenceView cards={visibleCards} actions={actions} />
    if (activeView === 'rescue') {
      const rescueCards = Array.from(
        new Map([...visibleCards, ...stats.overdueCards].map((card) => [card.id, card])).values(),
      )
      const needsTriage = stats.overdueCards.some(
        (card) => !['Rescue Lane', 'Waiting / Blocked'].includes(card.status),
      )
      return (
        <div className="view-grid">
          {needsTriage && (
            <RescueTriage
              overdueCards={stats.overdueCards}
              referenceDate={referenceDate}
              onOpenCard={openCard}
              onMarkDone={tracker.toggleDone}
              onMoveToRescueLane={(cardId) => tracker.setStatus(cardId, 'Rescue Lane')}
              onMarkWaiting={(cardId) => tracker.setStatus(cardId, 'Waiting / Blocked')}
              onSaveWaitingReason={(cardId, reason) => tracker.addNote(cardId, `Blocker: ${reason}`)}
              onDefer={tracker.rescheduleCard}
            />
          )}
          <FocusView
            eyebrow="Recovery"
            title="Rescue Lane"
            description="Sunday buffers, slipped-card cleanup, and protected recovery blocks."
            cards={rescueCards}
            actions={actions}
            emptyTitle="No cards need recovery."
            emptyDescription="Nothing is overdue or in Rescue Lane. Sunday recovery buffers remain protected in Schedule and are ready only if something slips."
            emptyActionLabel="Open Schedule"
            onEmptyAction={() => openGlobalView('schedule')}
          />
        </div>
      )
    }
    if (activeView === 'project') {
      return (
        <FocusView
          eyebrow="Shipping"
          title="Project Capacity"
          description="Protected CMT501 blocks only: current bottleneck, integration, coordination, and evidence. Detailed project management stays elsewhere."
          cards={visibleCards}
          actions={actions}
        />
      )
    }
    if (activeView === 'areas') {
      const areaCards = tracker.cards.filter((card) => ['Admin', 'Health', 'General'].includes(card.moduleGroup))
      const currentRoutines = areaCards.filter((card) => card.custom && card.startDate >= schedule.campaignStart && !card.done)
      const campaignAdmin = areaCards.filter((card) => card.moduleGroup === 'Admin' && !card.custom)
      const historical = areaCards.filter((card) => card.done)
      return (
        <div className="view-grid">
          <section className="panel area-boundary-note">
            <p className="eyebrow">Separate operating lane</p>
            <h2>Life, health and admin</h2>
            <p>These cards remain visible and checkable, but they never count as academic backlog or consume exam re-planning capacity.</p>
            <div className="area-count-links">
              <button type="button" className="metric-tile" onClick={() => openCardFacet('kind', 'life')}><strong>{currentRoutines.length}</strong><span>current weekly routines</span></button>
              <button type="button" className="metric-tile" onClick={() => openCardFacet('module', 'Admin')}><strong>{campaignAdmin.length}</strong><span>fixed campaign admin checkpoints</span></button>
              <button type="button" className="metric-tile" onClick={() => openCardFacet('status', 'Done')}><strong>{historical.length}</strong><span>completed records</span></button>
            </div>
            <p className="muted small">The routine set is deliberately generated as two household cards, one movement card, and one bounded admin card per week. Add personal chores only when they are real; the app does not invent a household inventory.</p>
          </section>
          <FocusView
            eyebrow="Personal operations"
            title="Live routines and records"
            description="Weekly essentials, movement, room reset, forms, and exam administration—including completed history."
            cards={areaCards}
            actions={actions}
          />
        </div>
      )
    }
    if (activeView === 'admin') {
      return (
        <div className="view-grid">
          <section className="panel" aria-labelledby="exam-date-watch-title">
            <p className="eyebrow">Exam date watch</p>
            <h2 id="exam-date-watch-title">Module exam dates</h2>
            <p>
              The official resit window is {examWindowRange.start} to {examWindowRange.end}. Personal
              module dates are only shown once Cardiff confirms them; the window start is never used
              as a substitute.
            </p>
            <ul className="exam-date-watch">
              {resolvedExamDates.map((resolved) => (
                <li key={resolved.moduleId}>
                  <span className="exam-date-watch-name">
                    <strong>{resolved.label}</strong>
                    <span>{resolved.code}</span>
                  </span>
                  {resolved.date ? <time dateTime={resolved.date}>{resolved.date}</time> : <span>—</span>}
                  <ExamDateStatus resolved={resolved} />
                </li>
              ))}
            </ul>
            <button type="button" className="ghost-button" onClick={() => setSettingsOpen(true)}>
              {resolvedExamDates.some((entry) => entry.confirmed) ? 'Edit exam dates' : 'Add a confirmed exam date'}
            </button>
          </section>
          <FocusView
            eyebrow="Date Watch"
            title="Admin and Date Watch"
            description="Assessment dates, SIMS status, exam logistics, checkpoints, and weekly plan control."
            cards={visibleCards}
            actions={actions}
          />
        </div>
      )
    }
    if (activeView === 'jobs') {
      return (
        <div className="view-grid">
          <JobHuntPlaybook />
          <FocusView
            eyebrow="Bounded opportunity lane"
            title="Job Hunt cards"
            description="One weekly maintenance card, a hard two-hour ceiling, and a 30-minute reserve that returns to study unless a strong role closes within seven days."
            cards={visibleCards}
            actions={actions}
          />
        </div>
      )
    }
    return null
  }

  if (standaloneResource) {
    return (
      <Suspense fallback={<ViewLoading label="Loading resource" />}>
        <ResourceReader resource={standaloneResource} onClose={closeResource} standalone />
      </Suspense>
    )
  }

  if (!entered) {
    return (
      <AppIntro
        countdown={examCountdown}
        examDate={examTarget.date}
        progressPct={donePct}
        doneCount={doneCount}
        totalCount={totalCount}
        skipIntro={skipIntro}
        onToggleSkip={(value) => {
          setSkipIntro(value)
          try {
            localStorage.setItem('srp-skip-intro', value ? '1' : '0')
          } catch {
            /* keep the current-session preference */
          }
        }}
        onEnter={() => setEntered(true)}
        onJump={(view) => {
          openGlobalView(view)
          setEntered(true)
        }}
      />
    )
  }

  return (
    <div className={`app-shell${navCollapsed ? ' nav-collapsed' : ''}${navOpen ? ' nav-open' : ''}`}>
      {navOpen && <button type="button" className="nav-scrim" aria-label="Close menu" onClick={() => setNavOpen(false)} />}

      <aside className="app-sidebar" aria-label="Primary navigation">
        <a href={navHref('today')} className="sidebar-brand" onClick={(event) => handleNavClick(event, 'today')} title="Open Today">
          <span className="brand-mark">
            <Icon name="brand" />
          </span>
          <span className="brand-text">
            <strong>Summer Rescue</strong>
            <small>Cardiff University · MSc</small>
          </span>
        </a>

        <nav className="sidebar-nav" aria-label="Views">
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              {group.items.map((id) => (
                <a
                  href={navHref(id)}
                  key={id}
                  className={`nav-item${activeView === id ? ' active' : ''}`}
                  onClick={(event) => handleNavClick(event, id)}
                  title={LABEL_BY_ID[id]}
                  aria-current={activeView === id ? 'page' : undefined}
                >
                  <span className="nav-ico">
                    <Icon name={id} />
                  </span>
                  <span className="nav-label">{LABEL_BY_ID[id]}</span>
                  {id === 'mat700' && !mat700Active && <span className="nav-flag">paused</span>}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-crest-group">
            <button
              type="button"
              className="sidebar-crest"
              aria-expanded={cardiffLinksOpen}
              onClick={() => setCardiffLinksOpen((value) => !value)}
            >
              <img
                src="/cardiff-logo.png"
                alt="Cardiff University"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
              <span>Cardiff University</span>
              <span className={`sidebar-crest-chevron${cardiffLinksOpen ? ' is-open' : ''}`}>
                <Icon name="chevron" />
              </span>
            </button>
            {cardiffLinksOpen && (
              <ul className="sidebar-crest-links">
                <li>
                  <a href="https://learningcentral.cf.ac.uk/" target="_blank" rel="noreferrer">
                    Learning Central
                  </a>
                </li>
                <li>
                  <a href="https://www.cardiff.ac.uk/" target="_blank" rel="noreferrer">
                    Cardiff University website
                  </a>
                </li>
                <li>
                  <a href="https://sims.cardiff.ac.uk/" target="_blank" rel="noreferrer">
                    SIMS portal
                  </a>
                </li>
              </ul>
            )}
          </div>
          <a
            href={navHref('progress')}
            className="mini-progress"
            title="Open the full progress record"
            onClick={(event) => handleNavClick(event, 'progress')}
          >
            <div className="mini-progress-head">
              <span>Campaign progress</span>
              <strong>{donePct}%</strong>
            </div>
            <div className="mini-progress-track">
              <span style={{ width: `${donePct}%` }} />
            </div>
            <small>
              {doneCount} of {totalCount} completed · {tracker.state.addedCards.length} personal/routine
            </small>
          </a>
          <div className="collapse-row">
            <button
              type="button"
              className="collapse-btn"
              onClick={() => setNavCollapsed((value) => !value)}
              aria-label={navCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Icon name="chevron" />
              <span>Collapse</span>
            </button>
            {navCollapsed && (
              <button
                type="button"
                className={`nav-lock-btn${navLocked ? ' is-locked' : ''}`}
                onClick={() => setNavLocked((value) => !value)}
                title={navLocked ? 'Locked collapsed — click to allow hover-to-expand' : 'Hover-to-expand — click to lock collapsed'}
                aria-pressed={navLocked}
              >
                {navLocked ? '🔒' : '🔓'}
              </button>
            )}
          </div>
        </div>
      </aside>

      <main className="app-main">
        <header className="app-topbar">
          <div className="topbar-left">
            <button type="button" className="icon-button nav-toggle" aria-label="Open menu" onClick={() => setNavOpen(true)}>
              <Icon name="menu" />
            </button>
            <div className="topbar-title">
              <a
                href={navHref('today')}
                className="eyebrow topbar-home-link"
                title="Go to Today"
                onClick={(event) => handleNavClick(event, 'today')}
              >
                {campaignMeta.title}
              </a>
              <h1 ref={pageHeadingRef} tabIndex={-1}>{viewMeta.title}</h1>
              {viewMeta.subtitle && <p className="topbar-sub">{viewMeta.subtitle}</p>}
            </div>
          </div>

          <div className="topbar-right">
            {examCountdown != null && (
              <button
                type="button"
                className={`countdown-chip${examCountdown <= 21 ? ' urgent' : ''}`}
                title={`${examTarget.label} date ${examTarget.date} — open the schedule`}
                onClick={() => openGlobalView('schedule')}
              >
                <strong>{examCountdown > 0 ? examCountdown : examCountdown === 0 ? '0' : Math.abs(examCountdown)}</strong>
                <span>{examCountdown > 0 ? `days to ${examTarget.label}` : examCountdown === 0 ? 'exam day' : 'days after exam'}</span>
              </button>
            )}
            <button
              type="button"
              className={`save-button${unsavedSinceBackup ? ' warn' : ''}${autosaveStatus === 'writing' ? ' saving' : ''}`}
              onClick={saveNow}
              title={autosaveDetail || backupStatusText}
            >
              <strong>{saveButtonLabel}</strong>
              <span>{saveButtonDetail}</span>
            </button>
            <button type="button" className="primary-button" onClick={() => setAddDialogOpen(true)} aria-label="Add card">
              <Icon name="plus" />
              <span>Add card</span>
            </button>
            <FocusStatsBadge />
            <FocusToasts />
            <StudyTimer
              activeCard={activeTimerCard}
              startSignal={sessionStartSignal}
              currentBoundary={focusExecutionContext.block}
              nextBoundary={focusExecutionContext.nextBlock}
              onCompleteSession={completeFocusSession}
              onFocusBlockComplete={(minutes) => focusRewards.recordBlockComplete(minutes)}
              onClearActive={() => setActiveTimerCardId(null)}
              onSaveRestartCue={(cardId, text) => tracker.addNote(cardId, text)}
              onChecklistToggle={tracker.toggleChecklistItem}
              resources={allResources}
              onOpenResource={openResource}
            />
            <MusicPopover theme={theme} />
            <NotificationCenter
              notifications={displayNotifications}
              referenceDate={referenceDate}
              onGoView={openGlobalView}
              onOpenCard={openCard}
              onSetRead={setDisplayNotificationRead}
              onMarkAllRead={markAllDisplayNotificationsRead}
            />
            <button
              type="button"
              className="icon-button"
              onClick={() => tracker.updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
              aria-label="Toggle dark mode"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
            <button type="button" className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Settings and data" title="Settings and data">
              <Icon name="settings" />
            </button>
          </div>
        </header>

        {message && (
          <div className="toast" role="status">
            <span>{message}</span>
            <button type="button" className="text-button" onClick={() => setMessage('')}>
              Dismiss
            </button>
          </div>
        )}

        {!tracker.state.settings.saveHintDismissed && (
          <div className="save-hint" role="status">
            <span>Progress autosaves to the local state file when the dev server is running, and also in this browser. Export JSON remains available in Settings.</span>
            <button type="button" className="text-button" onClick={() => tracker.updateSettings({ saveHintDismissed: true })}>
              Dismiss
            </button>
          </div>
        )}

        {showCardFilters && (
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            resultCount={visibleCards.length}
            moduleOptions={moduleOptions}
            phaseOptions={phaseOptions}
            tagOptions={tagOptions}
          />
        )}

        <section className="view-shell" aria-label="Active planner view">
          <div className="view-anim" key={`${activeView}-${navRefreshKey}`}>
            <Suspense fallback={<ViewLoading label={`Loading ${viewMeta.title}`} />}>
              {renderView()}
            </Suspense>
          </div>
        </section>
      </main>

      <AccessibleDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        className="settings-panel"
        overlayClassName="settings-shell"
        labelledBy="settings-title"
      >
            <div className="drawer-header">
              <div>
                <p className="eyebrow">Controls</p>
                <h2 id="settings-title">Settings &amp; data</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">
                <Icon name="close" />
              </button>
            </div>

            <div className="settings-section">
              <h3>Planning window</h3>
              <div className="settings-grid">
                <label>
                  <span>Planning date</span>
                  <input type="date" value={configuredReferenceDate} onChange={(event) => tracker.updateSettings({ referenceDate: event.target.value })} />
                </label>
                <label>
                  <span>Campaign start</span>
                  <input type="date" value={schedule.campaignStart} onChange={(event) => tracker.updateSettings({ campaignStart: event.target.value })} />
                </label>
                <label>
                  <span>Campaign end</span>
                  <input type="date" value={schedule.campaignEnd} onChange={(event) => tracker.updateSettings({ campaignEnd: event.target.value })} />
                </label>
                <label>
                  <span>Exam start</span>
                  <input type="date" value={schedule.examWindowStart} onChange={(event) => tracker.updateSettings({ examWindowStart: event.target.value })} />
                </label>
              </div>
              <h3>Module exam dates</h3>
              <ModuleExamDateFields
                moduleExamDates={moduleExamDates}
                schedule={schedule}
                onChange={(next) => tracker.updateSettings({ moduleExamDates: next })}
              />
              <label className="toggle-field">
                <input
                  type="checkbox"
                  checked={mat700Active}
                  onChange={(event) => tracker.updateSettings({ mat700Active: event.target.checked })}
                />
                <span>Data Mining study lane active (pause only after a safely passed result)</span>
              </label>
            </div>

            <div className="settings-section">
              <h3>Planner taxonomy</h3>
              <div className="taxonomy-grid">
                <div className="taxonomy-block">
                  <label>
                    <span>New module</span>
                    <div className="taxonomy-add-row">
                      <input
                        value={newModuleName}
                        onChange={(event) => setNewModuleName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') addCustomModule()
                        }}
                        placeholder="Module name"
                      />
                      <button type="button" className="secondary-button" onClick={addCustomModule} disabled={!newModuleName.trim()}>
                        Add
                      </button>
                    </div>
                  </label>
                  <div className="taxonomy-list" aria-label="Custom modules">
                    {customModules.length === 0 ? (
                      <p className="muted">No custom modules yet.</p>
                    ) : (
                      customModules.map((module) => (
                        <span key={module}>
                          <input
                            value={moduleNameEdits[module] ?? module}
                            onChange={(event) =>
                              setModuleNameEdits((current) => ({ ...current, [module]: event.target.value }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') renameCustomModule(module)
                            }}
                            aria-label={`Edit ${module}`}
                          />
                          <button
                            type="button"
                            className="secondary-button compact-button"
                            onClick={() => renameCustomModule(module)}
                            disabled={(moduleNameEdits[module] ?? module).trim() === module}
                          >
                            Save
                          </button>
                          <button type="button" className="text-button danger" onClick={() => deleteCustomModule(module)}>
                            Delete
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <div className="taxonomy-block">
                  <label>
                    <span>New phase</span>
                    <div className="taxonomy-add-row">
                      <input
                        value={newPhaseName}
                        onChange={(event) => setNewPhaseName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') addCustomPhase()
                        }}
                        placeholder="Phase name"
                      />
                      <button type="button" className="secondary-button" onClick={addCustomPhase} disabled={!newPhaseName.trim()}>
                        Add
                      </button>
                    </div>
                  </label>
                  <div className="taxonomy-list" aria-label="Custom phases">
                    {customPhases.length === 0 ? (
                      <p className="muted">No custom phases yet.</p>
                    ) : (
                      customPhases.map((phase) => (
                        <span key={phase}>
                          <input
                            value={phaseNameEdits[phase] ?? phase}
                            onChange={(event) => setPhaseNameEdits((current) => ({ ...current, [phase]: event.target.value }))}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') renameCustomPhase(phase)
                            }}
                            aria-label={`Edit ${phase}`}
                          />
                          <button
                            type="button"
                            className="secondary-button compact-button"
                            onClick={() => renameCustomPhase(phase)}
                            disabled={(phaseNameEdits[phase] ?? phase).trim() === phase}
                          >
                            Save
                          </button>
                          <button type="button" className="text-button danger" onClick={() => deleteCustomPhase(phase)}>
                            Delete
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <InstallDesktopApp serviceAvailable={localFileActive} />
            </div>

            <div className="settings-section">
              <h3>Backup &amp; data</h3>
              <p className="muted">{autosaveDetail || backupStatusText}</p>
              <p className="muted">{localFileStatusText}</p>
              <div className="settings-actions">
                <button type="button" className="secondary-button" onClick={exportBackup}>
                  Export JSON
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={connectAutosave}
                  disabled={!autosaveSupported || autosaveStatus === 'connecting'}
                >
                  {autosaveButtonLabel}
                </button>
                <label className="secondary-button import-button">
                  Import JSON
                  <input type="file" accept="application/json" onChange={importBackup} />
                </label>
                <button type="button" className="ghost-button danger-ghost" onClick={resetTracker}>
                  Reset tracker
                </button>
              </div>
              {tracker.localFile.status === 'conflict' && (
                <div className="data-conflict" role="alert">
                  <strong>A newer local revision exists.</strong>
                  <p>Export this tab first if needed, then reload the authoritative local file.</p>
                  <button type="button" className="secondary-button" onClick={reloadAfterConflict}>Reload newer file</button>
                </div>
              )}
            </div>

            <div className="settings-section">
              <h3>Data health</h3>
              {dataHealthStatus === 'loading' && <p className="muted">Checking state, audit log, database, and assets…</p>}
              {dataHealthStatus.startsWith('error:') && <p className="data-health-error">{dataHealthStatus.slice(6)}</p>}
              {dataHealth && (
                <dl className="data-health-grid">
                  <div><dt>Authoritative store</dt><dd>{dataHealth.authoritativeStore}</dd></div>
                  <div><dt>State revision</dt><dd>{dataHealth.state?.revision ?? 0}</dd></div>
                  <div><dt>State schema</dt><dd>{dataHealth.state?.schemaVersion ?? 'unknown'}</dd></div>
                  <div><dt>Last committed</dt><dd>{formatExportStamp(dataHealth.state?.writtenAt) || 'not written'}</dd></div>
                  <div><dt>SQLite integrity</dt><dd>{dataHealth.database?.integrity ?? 'unavailable'}</dd></div>
                  <div><dt>Audit events</dt><dd>{dataHealth.eventLog?.validCount ?? 0} valid</dd></div>
                  <div><dt>Quarantined</dt><dd>{dataHealth.eventLog?.malformedCount ?? 0} malformed</dd></div>
                  <div>
                    <dt>Last valid event</dt>
                    <dd>
                      {dataHealth.eventLog?.lastValidEvent
                        ? `${dataHealth.eventLog.lastValidEvent.eventType} · ${formatExportStamp(dataHealth.eventLog.lastValidEvent.occurredAt) || 'undated'}`
                        : 'none recorded'}
                    </dd>
                  </div>
                  <div>
                    <dt>Full replay</dt>
                    <dd>{eventCoverage.replaySafe ? 'safe' : 'not safe — gaps below'}</dd>
                  </div>
                  <div>
                    <dt>Recorded in the log</dt>
                    <dd>
                      {eventCoverage.covered} of {eventCoverage.families} families
                      {eventCoverage.missing > 0 ? ` · ${eventCoverage.missing} never written` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt>Rebuildable by replay</dt>
                    <dd>
                      {eventCoverage.replayed} of {eventCoverage.families} families
                    </dd>
                  </div>
                  <div><dt>Study assets</dt><dd>{dataHealth.assets?.available ? `${dataHealth.assets.count ?? 0} indexed` : 'unavailable'}</dd></div>
                </dl>
              )}
              <p className="muted small">
                The event log is partial audit history, not a full recovery source. Replaying it
                rebuilds card status, done state, logged hours, checklists, evidence text, notes and
                resource links, but {eventCoverage.replayGapFamilies.length} of{' '}
                {eventCoverage.families} mutation families cannot be rebuilt from it — some are never
                written down, and others are written but have nowhere to replay into. A replay
                therefore cannot reproduce your current state.
              </p>
              <details className="advanced-data-action">
                <summary>What a replay would not restore ({eventCoverage.replayGapFamilies.length})</summary>
                <ul className="event-coverage-list">
                  {EVENT_COVERAGE.filter((entry) => !entry.replayed).map((entry) => (
                    <li key={entry.family}>
                      <span
                        className={`event-coverage-status event-coverage-${
                          entry.status === 'covered' ? 'history-only' : entry.status
                        }`}
                      >
                        {entry.status === 'covered' ? 'history only' : entry.status}
                      </span>
                      <span>
                        <strong>{entry.family}</strong> — {entry.note}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
              <details className="advanced-data-action">
                <summary>Advanced database repair</summary>
                <p className="muted small">Replays only valid audit events into the SQLite mirror. JSON remains authoritative and is not replaced.</p>
                <button type="button" className="secondary-button" onClick={verifyDatabaseMirror}>Rebuild audit projection</button>
              </details>
            </div>

            <div className="settings-section">
              <h3>Daily safety copies</h3>
              <p className="muted">
                Kept automatically in this browser. Restoring shows a preview first and backs up your
                current state.
              </p>
              {safetyCopies.length === 0 ? (
                <p className="muted">No safety copies yet — one is written each day you open the app.</p>
              ) : (
                <ul className="safety-copy-list">
                  {safetyCopies.map((copy) => (
                    <li key={copy.day}>
                      <span>{copy.day}</span>
                      <button type="button" className="secondary-button" onClick={() => restoreSafetyCopy(copy.day)}>
                        Restore
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="settings-section">
              <h3>Snapshot</h3>
              <div className="settings-stat-row">
                <span>{campaignMeta.cardCount} campaign cards</span>
                <span>{sortCards(tracker.cards).filter((card) => card.done).length} done</span>
                <span>{tracker.state.addedCards.length} personal/routine cards</span>
                <span>{studyModules.length} academic workspaces</span>
                <span>
                  Assets {assetManifest?.syncedAt ? `synced ${formatExportStamp(assetManifest.syncedAt)}` : 'not stamped'}
                </span>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setSettingsOpen(false)
                  setEntered(false)
                }}
              >
                Open About / welcome screen
              </button>
            </div>
      </AccessibleDialog>

      <CardDetailDrawer
        key={selectedCard?.id ?? 'closed-card-drawer'}
        card={selectedCard}
        resources={allResources}
        resourceProgress={tracker.state.resourceProgress}
        referenceDate={referenceDate}
        onClose={() => closeCard()}
        linkedNotes={linkedKnowledgeNotes}
        onOpenKnowledgeNote={openKnowledgeNote}
        onStatusChange={tracker.setStatus}
        onToggleDone={tracker.toggleDone}
        onChecklistToggle={tracker.toggleChecklistItem}
        onChecklistAdd={tracker.addChecklistItem}
        onChecklistUpdate={tracker.updateChecklistItem}
        onChecklistDelete={tracker.deleteChecklistItem}
        onHoursChange={tracker.setActualHours}
        onProgressChange={tracker.setCardProgress}
        onEvidenceAdd={tracker.addEvidence}
        onEvidenceUpdate={tracker.updateEvidence}
        onEvidenceDelete={tracker.deleteEvidence}
        onEvidenceFileAdd={addEvidenceAttachment}
        onAddNote={tracker.addNote}
        onNoteUpdate={tracker.updateNote}
        onDeleteNote={tracker.deleteNote}
        onSaveDetails={tracker.updateCardDetails}
        onDeleteCard={tracker.deleteCard}
        onResetCard={(cardId) => {
          tracker.resetCardState(cardId)
          setMessage('Card reset to its original plan.')
        }}
        onStartSession={startSession}
        activeSessionCardId={activeTimerCardId}
        onReschedule={tracker.rescheduleCard}
        onOpenResource={openResource}
        onOpenAttachment={openAttachment}
        onAddResource={tracker.addCardResource}
        onRemoveResource={tracker.removeCardResource}
        onResourceProgressChange={tracker.updateResourceProgress}
        onResourceReviewedToggle={tracker.toggleResourceProgress}
        onNavigateMeta={openCardFacet}
        moduleOptions={moduleOptions}
        phaseOptions={phaseOptions}
      />

      <AddCardDialog
        open={addDialogOpen}
        onClose={(newCardId) => {
          setAddDialogOpen(false)
          if (newCardId) openCard(newCardId)
        }}
        onAddCard={tracker.addCard}
        moduleOptions={moduleOptions}
        phaseOptions={phaseOptions}
      />

      <CommandPalette
        open={commandOpen}
        views={VIEW_OPTIONS}
        cards={tracker.cards}
        resources={allResources}
        onClose={() => setCommandOpen(false)}
        onGoView={openGlobalView}
        onOpenCard={openCard}
        onOpenResource={openResource}
      />

      {activeResource && (
        <Suspense fallback={<ViewLoading label="Loading resource" />}>
          <ResourceReader resource={activeResource} onClose={closeResource} />
        </Suspense>
      )}
      {!activeResource && attachmentResource && (
        <Suspense fallback={<ViewLoading label="Loading attachment" />}>
          <ResourceReader resource={attachmentResource} onClose={() => setAttachmentResource(null)} />
        </Suspense>
      )}

      <Celebration trigger={celebrateSeed} />

      <ImportPreviewDialog
        open={Boolean(pendingImport)}
        sourceName={pendingImport?.sourceName ?? ''}
        incoming={pendingImport?.incoming ?? {}}
        current={currentSummary}
        onCancel={() => setPendingImport(null)}
        onConfirm={confirmPendingImport}
      />
    </div>
  )
}
// redesign: sidebar shell + calm-study-OS theme
