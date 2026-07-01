import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { AddCardDialog } from './components/AddCardDialog'
import { AppIntro } from './components/AppIntro'
import { CardDetailDrawer } from './components/CardDetailDrawer'
import { FilterBar } from './components/FilterBar'
import { StudyTimer } from './components/StudyTimer'
import { ModuleWorkspace } from './components/ModuleWorkspace'
import { ProgressView } from './components/ProgressView'
import { StudyHub } from './components/StudyHub'
import {
  AnalyticsView,
  BoardView,
  DashboardView,
  EvidenceView,
  FocusView,
  TableView,
  WeekView,
} from './components/TrackerViews'
import { baseCards, campaignMeta } from './data/baseCards'
import { FILTER_DEFAULTS, VIEW_OPTIONS } from './data/constants'
import { STUDY_MODULE_MAP } from './data/studyModules'
import { useTrackerState } from './state/useTrackerState'
import {
  chooseBackupHandle,
  fileBackupSupported,
  loadBackupHandle,
  queryBackupPermission,
  requestBackupPermission,
  writeBackupHandle,
} from './utils/fileBackup'
import { deriveStats, filterCards, sortCards } from './utils/progress'

const LABEL_BY_ID = Object.fromEntries(VIEW_OPTIONS.map((view) => [view.id, view.label]))

const NAV_GROUPS = [
  { label: 'Study', items: ['hub', 'aml', 'time-series', 'mat700'] },
  { label: 'Planning', items: ['dashboard', 'progress', 'analytics'] },
  { label: 'Board', items: ['board', 'table', 'week', 'evidence'] },
  { label: 'Focus', items: ['rescue', 'project', 'admin'] },
]

const VIEW_META = {
  hub: { title: 'Study Hub', subtitle: 'Command center for the whole rescue campaign.' },
  dashboard: { title: 'Planner', subtitle: 'Pace, pipeline, and this week at a glance.' },
  progress: { title: 'Progress', subtitle: 'Trajectory, streaks, and burn-down.' },
  aml: { title: 'Applied ML', subtitle: 'Lab-first practice — the priority module.' },
  'time-series': { title: 'Time Series', subtitle: 'Exam-template drills, repeated to fluency.' },
  mat700: { title: 'Mathematical Methods for Data Mining', subtitle: 'Data mining — kept warm as insurance.' },
  board: { title: 'Columns', subtitle: 'Status board across every lane.' },
  table: { title: 'Table', subtitle: 'Dense, editable card grid.' },
  week: { title: 'This Week', subtitle: 'Your seven-day working plan.' },
  analytics: { title: 'Analytics', subtitle: 'Charts, heatmap, and module mix.' },
  evidence: { title: 'Evidence', subtitle: 'Outputs and proof of work.' },
  rescue: { title: 'Rescue Lane', subtitle: 'Buffers and slipped-card recovery.' },
  project: { title: 'Project Ship', subtitle: 'Group project deliverables.' },
  admin: { title: 'Admin & Dates', subtitle: 'Exam logistics and date watch.' },
}

function Icon({ name }) {
  const p = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  let body = null
  switch (name) {
    case 'brand':
      body = (
        <>
          <path {...p} d="M12 3c3.6 2.8 5.6 5.6 5.6 9.2A5.6 5.6 0 0 1 6.4 12.2c0-1.5.5-2.8 1.4-4" />
          <path {...p} d="M12 21v-8" />
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

export default function App() {
  const tracker = useTrackerState(baseCards)
  const [activeView, setActiveView] = useState('hub')
  const [filters, setFilters] = useState(FILTER_DEFAULTS)
  const [selectedCardId, setSelectedCardId] = useState(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try {
      return localStorage.getItem('srp-nav-collapsed') === '1'
    } catch {
      return false
    }
  })
  const [navOpen, setNavOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [entered, setEntered] = useState(() => {
    try {
      return localStorage.getItem('srp-skip-intro') === '1'
    } catch {
      return false
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
  const [autosaveHandle, setAutosaveHandle] = useState(null)
  const [autosaveStatus, setAutosaveStatus] = useState(autosaveSupported ? 'off' : 'unsupported')
  const [autosaveSavedAt, setAutosaveSavedAt] = useState(null)
  const [autosaveDetail, setAutosaveDetail] = useState('')
  const autosaveTimerRef = useRef(null)
  const autosaveRunRef = useRef(0)

  const referenceDate = tracker.state.settings.referenceDate
  const mat700Active = tracker.state.settings.mat700Active
  const theme = tracker.state.settings.theme ?? 'light'
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
  const lastExportedAt = tracker.state.settings.lastExportedAt
  const lastBackupAt =
    !lastExportedAt ? autosaveSavedAt : !autosaveSavedAt ? lastExportedAt : autosaveSavedAt > lastExportedAt ? autosaveSavedAt : lastExportedAt
  const unsavedSinceBackup = !lastBackupAt || tracker.state.updatedAt > lastBackupAt
  const backupStatusText = unsavedSinceBackup
    ? 'Unsaved since backup'
    : autosaveSavedAt === lastBackupAt
      ? `Autosaved ${formatExportStamp(autosaveSavedAt)}`
      : `Exported ${formatExportStamp(lastExportedAt)}`
  const autosaveButtonLabel = !autosaveSupported
    ? 'Autosave unavailable'
    : autosaveStatus === 'connecting'
      ? 'Connecting...'
      : autosaveHandle
        ? 'Change autosave file'
        : 'Choose autosave file'

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme
    }
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem('srp-nav-collapsed', navCollapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [navCollapsed])

  useEffect(() => {
    setNavOpen(false)
  }, [activeView])

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
  const isStudyView = ['hub', 'aml', 'time-series', 'mat700'].includes(activeView)

  const viewMeta = VIEW_META[activeView] ?? { title: LABEL_BY_ID[activeView] ?? 'View', subtitle: '' }
  const doneCount = useMemo(() => tracker.cards.filter((card) => card.done).length, [tracker.cards])
  const totalCount = tracker.cards.length || 1
  const donePct = Math.round((doneCount / totalCount) * 100)
  const examCountdown = useMemo(() => {
    if (!schedule.examWindowStart || !referenceDate) return null
    const from = new Date(referenceDate)
    const to = new Date(schedule.examWindowStart)
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null
    return Math.round((to - from) / 86400000)
  }, [referenceDate, schedule.examWindowStart])

  const actions = {
    onOpen: setSelectedCardId,
    onStatusChange: tracker.setStatus,
    onToggleDone: tracker.toggleDone,
    onHoursChange: tracker.setActualHours,
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

  async function importBackup(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const payload = JSON.parse(await file.text())
      tracker.importTrackerState(payload)
      setSelectedCardId(null)
      setMessage('Backup imported.')
    } catch (error) {
      console.error(error)
      setMessage('Import failed: choose a valid tracker JSON export.')
    } finally {
      event.target.value = ''
    }
  }

  function resetTracker() {
    const confirmed = window.confirm('Reset local tracker progress? A JSON backup will be downloaded first.')
    if (!confirmed) return
    downloadBackup(new Date().toISOString())
    tracker.resetTrackerState()
    setSelectedCardId(null)
    setMessage('Backup exported, then local tracker reset.')
  }

  function renderView() {
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
    if (activeView === 'aml' || activeView === 'time-series' || activeView === 'mat700') {
      return (
          <ModuleWorkspace
            key={activeView}
            module={STUDY_MODULE_MAP[activeView]}
            cards={tracker.cards}
            actions={actions}
            referenceDate={referenceDate}
            mat700Active={mat700Active}
            setActiveView={setActiveView}
            moduleNote={tracker.state.moduleNotes?.[activeView] ?? ''}
            onModuleNoteChange={tracker.setModuleNote}
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
      return (
        <FocusView
          eyebrow="Recovery"
          title="Rescue Lane"
          description="Sunday buffers, slipped-card cleanup, and protected recovery blocks."
          cards={visibleCards}
          actions={actions}
        />
      )
    }
    if (activeView === 'project') {
      return (
        <FocusView
          eyebrow="Shipping"
          title="Project Shipping"
          description="Presentation, reflective report, contribution log, and submission confirmations."
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
    return null
  }

  if (!entered) {
    return (
      <AppIntro
        countdown={examCountdown}
        examDate={schedule.examWindowStart}
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
              <div className={`countdown-chip${examCountdown <= 21 ? ' urgent' : ''}`} title={`Exam window starts ${schedule.examWindowStart}`}>
                <strong>{examCountdown > 0 ? examCountdown : examCountdown === 0 ? '0' : Math.abs(examCountdown)}</strong>
                <span>{examCountdown > 0 ? 'days to exams' : examCountdown === 0 ? 'exam day' : 'days into exams'}</span>
              </div>
            )}
            <span className={`backup-status topbar-backup${unsavedSinceBackup ? ' warn' : ''}`}>{backupStatusText}</span>
            <button type="button" className="primary-button" onClick={() => setAddDialogOpen(true)}>
              <Icon name="plus" />
              <span>Add card</span>
            </button>
            <StudyTimer />
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

        {!isStudyView && <FilterBar filters={filters} setFilters={setFilters} resultCount={visibleCards.length} />}

        <section className="view-shell" aria-label="Active planner view">
          {renderView()}
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
              </div>
              <label className="toggle-field">
                <input type="checkbox" checked={mat700Active} onChange={(event) => tracker.updateSettings({ mat700Active: event.target.checked })} />
                <span>Data Mining module active</span>
              </label>
            </div>

            <div className="settings-section">
              <h3>Backup &amp; data</h3>
              <p className="muted">{autosaveDetail || backupStatusText}</p>
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
              <h3>Snapshot</h3>
              <div className="settings-stat-row">
                <span>{campaignMeta.cardCount} campaign cards</span>
                <span>{sortCards(tracker.cards).filter((card) => card.done).length} done</span>
                <span>{tracker.state.addedCards.length} added</span>
                <span>3 module workspaces</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <CardDetailDrawer
        key={selectedCard?.id ?? 'closed-card-drawer'}
        card={selectedCard}
        onClose={() => setSelectedCardId(null)}
        onStatusChange={tracker.setStatus}
        onToggleDone={tracker.toggleDone}
        onChecklistToggle={tracker.toggleChecklistItem}
        onHoursChange={tracker.setActualHours}
        onEvidenceChange={tracker.setEvidence}
        onAddNote={tracker.addNote}
        onDeleteNote={tracker.deleteNote}
        onSaveDetails={tracker.updateCardDetails}
      />

      <AddCardDialog
        open={addDialogOpen}
        onClose={(newCardId) => {
          setAddDialogOpen(false)
          if (newCardId) setSelectedCardId(newCardId)
        }}
        onAddCard={tracker.addCard}
      />
    </div>
  )
}
// redesign: sidebar shell + calm-study-OS theme
