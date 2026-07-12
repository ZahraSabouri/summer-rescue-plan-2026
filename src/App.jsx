import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { AddCardDialog } from './components/AddCardDialog'
import { AppIntro } from './components/AppIntro'
import { CardDetailDrawer } from './components/CardDetailDrawer'
import { CommandPalette } from './components/CommandPalette'
import { FilterBar } from './components/FilterBar'
import { MusicPopover } from './components/MusicPopover'
import { NotificationCenter } from './components/NotificationCenter'
import { StudyTimer } from './components/StudyTimer'
import { ModuleWorkspace, ResourceReader } from './components/ModuleWorkspace'
import { ProgressView } from './components/ProgressView'
import { ScheduleView } from './components/ScheduleView'
import { StudyHub } from './components/StudyHub'
import { TodayView } from './components/TodayView'
import { Celebration } from './components/Celebration'
import { ImportPreviewDialog } from './components/ImportPreviewDialog'
import {
  AnalyticsView,
  BoardView,
  DashboardView,
  EvidenceView,
  FocusView,
  TableView,
  WeekView,
} from './components/TrackerViews'
import {
  campaignMeta,
  rescueCards,
  scheduleExceptions,
  scheduleRules,
} from './data/summerRescuePlan'
import { applyAmlVideoStudyPlan } from './data/amlVideoPlan'
import { attachCardResourceLinks } from './data/cardResources'
import { FILTER_DEFAULTS, MODULE_OPTIONS, PHASE_OPTIONS, VIEW_OPTIONS } from './data/constants'
import { STUDY_MODULES } from './data/studyModules'
import { useTrackerState } from './state/useTrackerState'
import {
  chooseBackupHandle,
  fileBackupSupported,
  loadBackupHandle,
  queryBackupPermission,
  requestBackupPermission,
  writeBackupHandle,
} from './utils/fileBackup'
import { readLocalResources, uploadLocalResource } from './utils/localStateFile'
import { deriveStats, filterCards, sortCards, sumHours, todayString } from './utils/progress'
import { expandScheduleForDate } from './utils/schedule'
import { generateNotifications } from './utils/notifications'
import { listRollingBackups, readRollingBackup, recordRollingBackup } from './utils/rollingBackup'

const PLANNED_BASE_CARDS = applyAmlVideoStudyPlan(rescueCards)
const ENRICHED_BASE_CARDS = attachCardResourceLinks(PLANNED_BASE_CARDS, STUDY_MODULES)

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
  { label: 'Planning', items: ['schedule', 'dashboard', 'progress', 'analytics'] },
  { label: 'Board', items: ['board', 'table', 'week', 'evidence'] },
  { label: 'Focus', items: ['rescue', 'project', 'jobs', 'admin'] },
]

const VIEW_META = {
  today: { title: 'Today', subtitle: 'Your mission control — best next moves, streak, and split.' },
  hub: { title: 'Study Hub', subtitle: 'Command center for the whole rescue campaign.' },
  dashboard: { title: 'Planner', subtitle: 'Pace, pipeline, and this week at a glance.' },
  progress: { title: 'Progress', subtitle: 'Trajectory, streaks, and burn-down.' },
  schedule: { title: 'Schedule', subtitle: 'Hour-by-hour protected routines, study, project, and job blocks.' },
  aml: { title: 'Applied ML', subtitle: 'Lab-first practice — the priority module.' },
  'time-series': { title: 'Time Series', subtitle: 'Exam-template drills, repeated to fluency.' },
  'team-project': { title: 'Team Project', subtitle: 'Protected CMT501 capacity; detailed project management stays elsewhere.' },
  mat700: { title: 'Mathematical Methods for Data Mining', subtitle: 'Confirmed resit lane — tutorial-first recovery from 39/FF.' },
  board: { title: 'Columns', subtitle: 'Status board across every lane.' },
  table: { title: 'Table', subtitle: 'Dense, editable card grid.' },
  week: { title: 'This Week', subtitle: 'Your seven-day working plan.' },
  analytics: { title: 'Analytics', subtitle: 'Charts, heatmap, and module mix.' },
  evidence: { title: 'Evidence', subtitle: 'Outputs and proof of work.' },
  rescue: { title: 'Rescue Lane', subtitle: 'Buffers and slipped-card recovery.' },
  project: { title: 'Project Capacity', subtitle: 'Bounded CMT501 space without duplicating the project app.' },
  jobs: { title: 'Job Hunt', subtitle: 'A bounded opportunity lane that cannot consume exam preparation.' },
  admin: { title: 'Admin & Dates', subtitle: 'Exam logistics and date watch.' },
}

const VALID_VIEW_IDS = new Set(Object.keys(VIEW_META))

function parseAppHash() {
  if (typeof window === 'undefined') return { view: 'today', resourceId: '' }
  const value = window.location.hash.replace(/^#\/?/, '').trim()
  const [viewPart = '', queryString = ''] = value.split('?')
  const params = new URLSearchParams(queryString)
  return {
    view: VALID_VIEW_IDS.has(viewPart) ? viewPart : 'today',
    resourceId: params.get('resource') ?? '',
  }
}

function viewFromHash() {
  return parseAppHash().view
}

function resourceIdFromHash() {
  return parseAppHash().resourceId
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

function scopeCardsForView(view, cards) {
  if (view === 'rescue') {
    return cards.filter((card) => card.status === 'Rescue Lane' || card.tags.includes('rescue'))
  }
  if (view === 'mat700') {
    return cards.filter((card) => card.moduleGroup === 'MAT700' || card.tags.includes('insurance'))
  }
  if (view === 'project') {
    return cards.filter((card) => card.moduleGroup === 'Group Project' || card.tags.includes('project'))
  }
  if (view === 'admin') {
    return cards.filter((card) => card.moduleGroup === 'Admin' || card.tags.includes('admin') || card.tags.includes('date-watch'))
  }
  if (view === 'jobs') {
    return cards.filter((card) => card.moduleGroup === 'Job Hunt' || card.tags.includes('job-hunt'))
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
  const [filters, setFilters] = useState(FILTER_DEFAULTS)
  const [selectedCardId, setSelectedCardId] = useState(null)
  const [activeTimerCardId, setActiveTimerCardId] = useState(null)
  const [openResourceId, setOpenResourceId] = useState(null)
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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [newModuleName, setNewModuleName] = useState('')
  const [newPhaseName, setNewPhaseName] = useState('')
  const [moduleNameEdits, setModuleNameEdits] = useState({})
  const [phaseNameEdits, setPhaseNameEdits] = useState({})
  const [entered, setEntered] = useState(() => {
    try {
      return localStorage.getItem('srp-skip-intro') === '1' || Boolean(resourceIdFromHash())
    } catch {
      return Boolean(resourceIdFromHash())
    }
  })
  const [skipIntro, setSkipIntro] = useState(() => {
    try {
      return localStorage.getItem('srp-skip-intro') === '1'
    } catch {
      return false
    }
  })
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
  const addNotificationsRef = useRef(tracker.addNotifications)
  const hashResourceRef = useRef('')

  const referenceDate = tracker.state.settings.referenceDate
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
  const dayBlocks = useMemo(
    () => expandScheduleForDate(scheduleRules, scheduleExceptions, referenceDate),
    [referenceDate],
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
    let cancelled = false
    readLocalResources()
      .then((resources) => {
        if (!cancelled) setLocalResources(resources)
      })
      .catch((error) => {
        if (!cancelled) console.warn('Local resources unavailable:', error)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    referenceDateRef.current = referenceDate
  }, [referenceDate])

  useEffect(() => {
    updateSettingsRef.current = tracker.updateSettings
  }, [tracker.updateSettings])

  useEffect(() => {
    addNotificationsRef.current = tracker.addNotifications
  }, [tracker.addNotifications])

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
    const id = window.setTimeout(() => setSelectedCardId(null), 0)
    return () => window.clearTimeout(id)
  }, [activeView])

  useEffect(() => {
    function onHashChange() {
      setActiveView(viewFromHash())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const resourceId = resourceIdFromHash()
    const resourceQuery = resourceId ? `?resource=${encodeURIComponent(resourceId)}` : ''
    const nextHash = `#/${activeView}${resourceQuery}`
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash)
    }
  }, [activeView])

  // Repair a stale planning date after the async local-file state arrives. The campaign
  // starts tomorrow, so pre-campaign dates must never hide the launch schedule.
  useEffect(() => {
    const today = todayString()
    const floor = today > schedule.campaignStart ? today : schedule.campaignStart
    if (referenceDate < floor) updateSettingsRef.current({ referenceDate: floor })
  }, [referenceDate, schedule.campaignStart, tracker.localFile.status])

  // Keep "today" live so overdue cards update automatically (advances forward only;
  // a manually-set future planning date is respected). Persists via localStorage.
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
    function onKey(event) {
      if (event.key === 'Escape') {
        setSettingsOpen(false)
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
    () => scopeCardsForView(activeView, filteredCards),
    [activeView, filteredCards],
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
  const isStudyView = ['today', 'schedule', 'hub', 'aml', 'time-series', 'team-project', 'mat700'].includes(activeView)

  useEffect(() => {
    function openHashResource() {
      const resourceId = resourceIdFromHash()
      if (!resourceId) return

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
    return () => window.removeEventListener('hashchange', openHashResource)
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
  const examTarget = useMemo(() => {
    const moduleTargets = [
      ['aml', 'Applied ML', moduleExamDates.aml],
      ['time-series', 'Time Series', moduleExamDates['time-series']],
      ['mat700', 'MAT700', moduleExamDates.mat700],
    ]
      .filter(([, , date]) => date)
      .sort((a, b) => a[2].localeCompare(b[2]))
    if (moduleTargets.length > 0) {
      const [, label, date] = moduleTargets.find(([, , date]) => date >= referenceDate) ?? moduleTargets[0]
      return { label, date }
    }
    return { label: 'exam window', date: schedule.examWindowStart }
  }, [moduleExamDates, referenceDate, schedule.examWindowStart])

  const examCountdown = useMemo(() => {
    if (!examTarget.date || !referenceDate) return null
    const from = new Date(referenceDate)
    const to = new Date(examTarget.date)
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null
    return Math.round((to - from) / 86400000)
  }, [examTarget.date, referenceDate])

  useEffect(() => {
    addNotificationsRef.current?.(
      generateNotifications({
        cards: tracker.cards,
        referenceDate,
        examCountdown,
        unsavedSinceBackup,
        lastBackupAt,
        mat700Active,
        campaignStart: schedule.campaignStart,
        createdAt: tracker.state.createdAt,
      }),
    )
  }, [
    examCountdown,
    lastBackupAt,
    mat700Active,
    referenceDate,
    schedule.campaignStart,
    tracker.cards,
    tracker.state.createdAt,
    unsavedSinceBackup,
  ])

  const actions = {
    onOpen: setSelectedCardId,
    onStatusChange: tracker.setStatus,
    onToggleDone: tracker.toggleDone,
    onHoursChange: tracker.setActualHours,
    onReschedule: tracker.rescheduleCard,
    onStartSession: setActiveTimerCardId,
    referenceDate,
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
    setSelectedCardId(null)
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
    if (filters.module === value) setFilters((current) => ({ ...current, module: 'all' }))
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
    if (filters.module === oldValue) setFilters((current) => ({ ...current, module: value }))
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
    setOpenResourceId(resourceId)
    tracker.markResourceOpened(resourceId)
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

  function closeResource() {
    setOpenResourceId(null)
    hashResourceRef.current = ''
    const parsed = parseAppHash()
    if (parsed.resourceId) {
      window.history.replaceState(null, '', `#/${VALID_VIEW_IDS.has(parsed.view) ? parsed.view : activeView}`)
    }
  }

  function completeFocusSession(cardId, minutes) {
    tracker.addFocusSession(cardId, minutes)
    setMessage(`Logged ${minutes} min focus session.`)
  }

  function resetTracker() {
    const confirmed = window.confirm('Reset local tracker progress? A JSON backup will be downloaded first.')
    if (!confirmed) return
    downloadBackup(new Date().toISOString())
    tracker.resetTrackerState()
    setSelectedCardId(null)
    setMessage('Backup exported, then local tracker reset to the 13 July resit plan.')
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
          dayBlocks={dayBlocks}
          onOpenCard={setSelectedCardId}
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
          setActiveView={setActiveView}
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
            setActiveView={setActiveView}
            moduleNote={tracker.state.moduleNotes?.[activeView] ?? ''}
            onModuleNoteChange={tracker.setModuleNote}
            moduleExamDate={moduleExamDates[activeView] ?? ''}
            resourceProgress={tracker.state.resourceProgress}
            recentResourceIds={tracker.state.recentResourceIds}
            onResourceOpen={tracker.markResourceOpened}
            onResourceReviewedToggle={tracker.toggleResourceProgress}
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
            mat700Active={mat700Active}
            actions={actions}
            schedule={schedule}
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
          onOpenCard={setSelectedCardId}
          moduleExamDates={moduleExamDates}
          campaignStart={schedule.campaignStart}
          campaignEnd={schedule.campaignEnd}
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
        />
      )
    }
    if (activeView === 'board') return <BoardView cards={visibleCards} actions={actions} />
    if (activeView === 'table') return <TableView cards={visibleCards} actions={actions} />
    if (activeView === 'week') return <WeekView cards={visibleCards} referenceDate={referenceDate} actions={actions} />
    if (activeView === 'analytics') {
      return (
        <AnalyticsView
          cards={visibleCards}
          stats={stats}
          snapshots={tracker.snapshots}
          referenceDate={referenceDate}
          schedule={schedule}
        />
      )
    }
    if (activeView === 'evidence') return <EvidenceView cards={visibleCards} actions={actions} />
    if (activeView === 'rescue') {
      const rescueCards = Array.from(
        new Map([...visibleCards, ...stats.overdueCards].map((card) => [card.id, card])).values(),
      )
      return (
        <FocusView
          eyebrow="Recovery"
          title="Rescue Lane"
          description="Sunday buffers, slipped-card cleanup, and protected recovery blocks."
          cards={rescueCards}
          actions={actions}
          referenceDate={referenceDate}
          onRescheduleAllOverdue={() =>
            tracker.rescheduleCards(
              stats.overdueCards.map((card) => card.id),
              referenceDate,
            )
          }
        />
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
    if (activeView === 'admin') {
      return (
        <FocusView
          eyebrow="Date Watch"
          title="Admin and Date Watch"
          description="Assessment dates, SIMS status, exam logistics, checkpoints, and weekly plan control."
          cards={visibleCards}
          actions={actions}
        />
      )
    }
    if (activeView === 'jobs') {
      return (
        <FocusView
          eyebrow="Bounded opportunity lane"
          title="Job Hunt"
          description="One shortlist scan and at most one high-quality action most weeks. Unused time returns to exam study or recovery."
          cards={visibleCards}
          actions={actions}
        />
      )
    }
    return null
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
            /* ignore */
          }
        }}
        onEnter={() => setEntered(true)}
        onJump={(view) => {
          setActiveView(view)
          setEntered(true)
        }}
      />
    )
  }

  return (
    <div className={`app-shell${navCollapsed ? ' nav-collapsed' : ''}${navOpen ? ' nav-open' : ''}`}>
      {navOpen && <button type="button" className="nav-scrim" aria-label="Close menu" onClick={() => setNavOpen(false)} />}

      <aside className="app-sidebar" aria-label="Primary navigation">
        <div className="sidebar-brand">
          <span className="brand-mark">
            <Icon name="brand" />
          </span>
          <span className="brand-text">
            <strong>Summer Rescue</strong>
            <small>Cardiff University · MSc</small>
          </span>
        </div>

        <nav className="sidebar-nav" aria-label="Views">
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              {group.items.map((id) => (
                <button
                  type="button"
                  key={id}
                  className={`nav-item${activeView === id ? ' active' : ''}`}
                  onClick={() => setActiveView(id)}
                  title={LABEL_BY_ID[id]}
                >
                  <span className="nav-ico">
                    <Icon name={id} />
                  </span>
                  <span className="nav-label">{LABEL_BY_ID[id]}</span>
                  {id === 'mat700' && !mat700Active && <span className="nav-flag">paused</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-crest">
            <img
              src="/cardiff-logo.png"
              alt="Cardiff University"
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
            <span>Cardiff University</span>
          </div>
          <div className="mini-progress" title={`${doneCount} of ${totalCount} cards done`}>
            <div className="mini-progress-head">
              <span>Campaign progress</span>
              <strong>{donePct}%</strong>
            </div>
            <div className="mini-progress-track">
              <span style={{ width: `${donePct}%` }} />
            </div>
            <small>
              {doneCount} of {totalCount} cards · {tracker.state.addedCards.length} added
            </small>
          </div>
          <button
            type="button"
            className="collapse-btn"
            onClick={() => setNavCollapsed((value) => !value)}
            aria-label={navCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Icon name="chevron" />
            <span>Collapse</span>
          </button>
        </div>
      </aside>

      <main className="app-main">
        <header className="app-topbar">
          <div className="topbar-left">
            <button type="button" className="icon-button nav-toggle" aria-label="Open menu" onClick={() => setNavOpen(true)}>
              <Icon name="menu" />
            </button>
            <div className="topbar-title">
              <p className="eyebrow">{campaignMeta.title}</p>
              <h1>{viewMeta.title}</h1>
              {viewMeta.subtitle && <p className="topbar-sub">{viewMeta.subtitle}</p>}
            </div>
          </div>

          <div className="topbar-right">
            {examCountdown != null && (
              <div className={`countdown-chip${examCountdown <= 21 ? ' urgent' : ''}`} title={`${examTarget.label} date ${examTarget.date}`}>
                <strong>{examCountdown > 0 ? examCountdown : examCountdown === 0 ? '0' : Math.abs(examCountdown)}</strong>
                <span>{examCountdown > 0 ? `days to ${examTarget.label}` : examCountdown === 0 ? 'exam day' : 'days after exam'}</span>
              </div>
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
            <button type="button" className="primary-button" onClick={() => setAddDialogOpen(true)}>
              <Icon name="plus" />
              <span>Add card</span>
            </button>
            <StudyTimer
              activeCard={activeTimerCard}
              onCompleteSession={completeFocusSession}
              onClearActive={() => setActiveTimerCardId(null)}
            />
            <MusicPopover theme={theme} />
            <NotificationCenter
              notifications={tracker.state.notifications}
              referenceDate={referenceDate}
              onGoView={setActiveView}
              onOpenCard={setSelectedCardId}
              onSetRead={tracker.setNotificationRead}
              onMarkAllRead={tracker.markAllNotificationsRead}
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

        {!isStudyView && (
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            resultCount={visibleCards.length}
            moduleOptions={moduleOptions}
            phaseOptions={phaseOptions}
          />
        )}

        <section className="view-shell" aria-label="Active planner view">
          <div className="view-anim" key={activeView}>
            {renderView()}
          </div>
        </section>
      </main>

      {settingsOpen && (
        <div
          className="drawer-shell settings-shell"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSettingsOpen(false)
          }}
        >
          <div className="settings-panel" role="dialog" aria-label="Settings and data">
            <div className="drawer-header">
              <div>
                <p className="eyebrow">Controls</p>
                <h2>Settings &amp; data</h2>
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
                  <input type="date" value={referenceDate} onChange={(event) => tracker.updateSettings({ referenceDate: event.target.value })} />
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
                <label>
                  <span>Applied ML exam</span>
                  <input
                    type="date"
                    value={moduleExamDates.aml ?? ''}
                    onChange={(event) =>
                      tracker.updateSettings({ moduleExamDates: { ...moduleExamDates, aml: event.target.value } })
                    }
                  />
                </label>
                <label>
                  <span>Time Series exam</span>
                  <input
                    type="date"
                    value={moduleExamDates['time-series'] ?? ''}
                    onChange={(event) =>
                      tracker.updateSettings({ moduleExamDates: { ...moduleExamDates, 'time-series': event.target.value } })
                    }
                  />
                </label>
                <label>
                  <span>MAT700 exam</span>
                  <input
                    type="date"
                    value={moduleExamDates.mat700 ?? ''}
                    onChange={(event) =>
                      tracker.updateSettings({ moduleExamDates: { ...moduleExamDates, mat700: event.target.value } })
                    }
                  />
                </label>
              </div>
              <label className="toggle-field">
                <input type="checkbox" checked={mat700Active} readOnly disabled />
                <span>Data Mining resit active — 39/FF confirmed</span>
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
                <span>{tracker.state.addedCards.length} added</span>
                <span>{studyModules.length} module workspaces</span>
                <span>
                  Assets {assetManifest?.syncedAt ? `synced ${formatExportStamp(assetManifest.syncedAt)}` : 'not stamped'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <CardDetailDrawer
        key={selectedCard?.id ?? 'closed-card-drawer'}
        card={selectedCard}
        resources={allResources}
        referenceDate={referenceDate}
        onClose={() => setSelectedCardId(null)}
        onStatusChange={tracker.setStatus}
        onToggleDone={tracker.toggleDone}
        onChecklistToggle={tracker.toggleChecklistItem}
        onChecklistAdd={tracker.addChecklistItem}
        onChecklistUpdate={tracker.updateChecklistItem}
        onChecklistDelete={tracker.deleteChecklistItem}
        onHoursChange={tracker.setActualHours}
        onEvidenceAdd={tracker.addEvidence}
        onEvidenceUpdate={tracker.updateEvidence}
        onEvidenceDelete={tracker.deleteEvidence}
        onAddNote={tracker.addNote}
        onNoteUpdate={tracker.updateNote}
        onDeleteNote={tracker.deleteNote}
        onSaveDetails={tracker.updateCardDetails}
        onDeleteCard={tracker.deleteCard}
        onResetCard={(cardId) => {
          tracker.resetCardState(cardId)
          setMessage('Card reset to its original plan.')
        }}
        onStartSession={setActiveTimerCardId}
        onReschedule={tracker.rescheduleCard}
        onOpenResource={openResource}
        onAddResource={tracker.addCardResource}
        onRemoveResource={tracker.removeCardResource}
        moduleOptions={moduleOptions}
        phaseOptions={phaseOptions}
      />

      <AddCardDialog
        open={addDialogOpen}
        onClose={(newCardId) => {
          setAddDialogOpen(false)
          if (newCardId) setSelectedCardId(newCardId)
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
        onGoView={setActiveView}
        onOpenCard={setSelectedCardId}
        onOpenResource={openResource}
      />

      {activeResource && <ResourceReader resource={activeResource} onClose={closeResource} />}

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
