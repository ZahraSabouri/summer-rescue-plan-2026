import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { StudyTimer } from './StudyTimer'
import { focusRewards } from '../utils/focusRewards'
import {
  FOCUS_TAB_HASH,
  focusRoomCardId,
  onFocusMessage,
  postFocusMessage,
} from '../utils/focusSession'

// Mirrors the `resource=` param the main app writes into its own hash
// (src/App.jsx's writeRoute) so this tab's address bar reflects what's open
// here too — needed for the room's own back button and for reloads to
// reopen whatever was showing.
function resourceIdFromRoomHash(hash = window.location.hash) {
  const query = String(hash ?? '').split('?')[1] ?? ''
  return new URLSearchParams(query).get('resource') ?? ''
}

function roomHash(cardId, resourceId) {
  const params = new URLSearchParams()
  if (cardId) params.set('card', cardId)
  if (resourceId) params.set('resource', resourceId)
  const query = params.toString()
  return `${FOCUS_TAB_HASH}${query ? `?${query}` : ''}`
}

// Lazy-loaded the same way App.jsx loads it, so opening a resource here
// doesn't pull the whole ModuleWorkspace bundle into the room's own chunk.
const ResourceReader = lazy(() => import('./ModuleWorkspace').then((module) => ({ default: module.ResourceReader })))

// The Focus Room running as its own browser tab.
//
// This tab deliberately does NOT mount useTrackerState: two tabs auto-saving to
// the same localStorage key would race and clobber the campaign. Instead it asks
// the main app tab for a read-only snapshot of the card and forwards every
// mutation (checklist ticks, logged sessions, restart cues) back over the focus
// channel, so the main tab stays the single writer of tracker state.
//
// The timer itself runs here — this tab owns the clock while it is open (see the
// claim/release handshake in StudyTimer's room variant). Focus rewards are the
// one piece of state this tab drives directly: it hydrates them from the main
// tab once, then streams changes back so trees and points still persist.
export function FocusRoomTab() {
  const cardId = focusRoomCardId()
  const [snapshot, setSnapshot] = useState(null)
  const [status, setStatus] = useState(cardId ? 'connecting' : 'offline') // connecting | live | offline | closed
  const rewardsHydratedRef = useRef(false)
  const lastRewardsSentRef = useRef('')
  // This tab boots with no idea what the main tab's theme is (it's a fresh
  // document, so document.documentElement starts with no data-theme at all).
  // 'light' is just the pre-sync placeholder; the main tab's snapshot (and any
  // live 'theme' broadcast) corrects it within one round trip.
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Ask the main tab for card data, retrying until it answers (it may be loading,
  // or the room may have been reopened from history before the app tab exists).
  useEffect(() => {
    if (!cardId) return undefined

    const stop = onFocusMessage((message) => {
      if (message.type === 'snapshot' && message.cardId === cardId) {
        setSnapshot({
          card: message.card,
          resources: message.resources ?? [],
          currentBoundary: message.currentBoundary ?? null,
          nextBoundary: message.nextBoundary ?? null,
          linkedNotes: message.linkedNotes ?? [],
        })
        if (message.theme) setTheme(message.theme)
        setStatus('live')
      }
      if (message.type === 'theme' && message.theme) {
        setTheme(message.theme)
      }
      if (message.type === 'rewards-init' && !rewardsHydratedRef.current) {
        rewardsHydratedRef.current = true
        lastRewardsSentRef.current = JSON.stringify(message.state ?? {})
        focusRewards.hydrate(message.state ?? {})
      }
    })

    let attempts = 0
    postFocusMessage('request-snapshot', { cardId })
    const retry = window.setInterval(() => {
      attempts += 1
      if (attempts > 12) {
        window.clearInterval(retry)
        // Still no answer: run offline. The timer works; logging is parked until a
        // main tab appears (a fresh snapshot flips this straight back to 'live').
        setStatus((current) => (current === 'live' ? current : 'offline'))
        return
      }
      postFocusMessage('request-snapshot', { cardId })
    }, 600)

    return () => {
      window.clearInterval(retry)
      stop()
    }
  }, [cardId])

  // Stream reward changes back to the main tab so it can persist them. Deduped by
  // value so a hydrate we just received is never echoed straight back.
  useEffect(() => {
    return focusRewards.subscribe(() => {
      const serialised = JSON.stringify(focusRewards.getPersistedState())
      if (serialised === lastRewardsSentRef.current) return
      lastRewardsSentRef.current = serialised
      postFocusMessage('rewards-sync', { state: focusRewards.getPersistedState() })
    })
  }, [])

  useEffect(() => {
    if (snapshot?.card) {
      document.title = `Focus Room · ${snapshot.card.title}`
    } else {
      document.title = 'Focus Room · Summer Rescue'
    }
  }, [snapshot])

  const forward = (action, extra = {}) => postFocusMessage('action', { action, cardId, ...extra })

  // Optimistic like the other handlers below: flip the room's own theme
  // immediately, then forward it so the main tab (the sole settings writer)
  // persists it — same rule that already applies to checklist ticks and notes.
  function handleThemeChange(next) {
    setTheme(next)
    forward('set-theme', { theme: next })
  }

  function handleChecklistToggle(id, itemId) {
    // Optimistic: reflect the tick immediately; the main tab echoes the authoritative
    // card back in its next snapshot.
    setSnapshot((current) => {
      if (!current?.card) return current
      const checklist = (current.card.checklist ?? []).map((item) =>
        item.id === itemId ? { ...item, done: !item.done } : item,
      )
      return { ...current, card: { ...current.card, checklist } }
    })
    forward('toggle-checklist', { itemId })
  }

  function handleCompleteSession(id, minutes) {
    forward('complete-session', { minutes })
    // Rewards are owned by this tab while it is open; record locally and let the
    // rewards-sync effect persist them. The main tab only logs the card session.
    focusRewards.recordMinutes(minutes)
  }

  function handleSaveRestartCue(id, text) {
    forward('add-note', { text })
    return Promise.resolve()
  }

  // Notes and evidence — the same optimistic-then-reconciled pattern as
  // checklist toggling above: reflect the change immediately using a
  // temporary id, forward the real mutation to the main tab (the sole
  // writer), and let its next snapshot echo back the authoritative version.
  // Previously this tab could only ever fire one write ("add-note", used for
  // the single restart-cue box) — no update, no delete, no evidence at all.
  function handleAddNote(id, text) {
    const optimistic = { id: `pending-${Date.now()}`, text, at: new Date().toISOString() }
    setSnapshot((current) => {
      if (!current?.card) return current
      return { ...current, card: { ...current.card, notes: [optimistic, ...(current.card.notes ?? [])] } }
    })
    forward('add-note', { text })
  }

  function handleUpdateNote(id, noteId, text) {
    setSnapshot((current) => {
      if (!current?.card) return current
      const notes = (current.card.notes ?? []).map((note) => (note.id === noteId ? { ...note, text } : note))
      return { ...current, card: { ...current.card, notes } }
    })
    forward('update-note', { noteId, text })
  }

  function handleDeleteNote(id, noteId) {
    setSnapshot((current) => {
      if (!current?.card) return current
      const notes = (current.card.notes ?? []).filter((note) => note.id !== noteId)
      return { ...current, card: { ...current.card, notes } }
    })
    forward('delete-note', { noteId })
  }

  function handleAddEvidence(id, text) {
    const optimistic = { id: `pending-${Date.now()}`, text, at: new Date().toISOString() }
    setSnapshot((current) => {
      if (!current?.card) return current
      return {
        ...current,
        card: { ...current.card, evidenceEntries: [...(current.card.evidenceEntries ?? []), optimistic] },
      }
    })
    forward('add-evidence', { text })
  }

  function handleUpdateEvidence(id, evidenceId, text) {
    setSnapshot((current) => {
      if (!current?.card) return current
      const evidenceEntries = (current.card.evidenceEntries ?? []).map((entry) =>
        entry.id === evidenceId ? { ...entry, text } : entry,
      )
      return { ...current, card: { ...current.card, evidenceEntries } }
    })
    forward('update-evidence', { evidenceId, text })
  }

  function handleDeleteEvidence(id, evidenceId) {
    setSnapshot((current) => {
      if (!current?.card) return current
      const evidenceEntries = (current.card.evidenceEntries ?? []).filter((entry) => entry.id !== evidenceId)
      return { ...current, card: { ...current.card, evidenceEntries } }
    })
    forward('delete-evidence', { evidenceId })
  }

  // File objects survive BroadcastChannel's structured clone intact, so the
  // upload itself (which needs the local server) can stay entirely on the
  // main tab — no separate upload path to maintain here.
  function handleAddEvidenceFile(id, file) {
    forward('add-evidence-file', { file })
    return Promise.resolve()
  }

  // Opening a resource (video/PDF/notebook) here needs no round trip to the
  // main tab — ResourceReader renders purely from the resource object itself,
  // which already arrived whole in the snapshot. Previously this tab had no
  // onOpenResource at all, so every resource chip (in "Resources" and in "How
  // to study this card") silently did nothing when clicked.
  const [openResourceId, setOpenResourceIdState] = useState(() => resourceIdFromRoomHash() || null)
  const activeResource = snapshot?.resources?.find((resource) => resource.id === openResourceId) ?? null

  function setOpenResourceId(resourceId) {
    setOpenResourceIdState(resourceId || null)
    const nextHash = roomHash(cardId, resourceId || '')
    if (window.location.hash !== nextHash) window.history.pushState(null, '', nextHash)
  }

  // Back/forward through a resource push (or a manual hash edit) should open
  // or close the reader to match, same as the main app's hashchange handling.
  useEffect(() => {
    function syncFromHash() {
      setOpenResourceIdState(resourceIdFromRoomHash() || null)
    }
    window.addEventListener('hashchange', syncFromHash)
    window.addEventListener('popstate', syncFromHash)
    return () => {
      window.removeEventListener('hashchange', syncFromHash)
      window.removeEventListener('popstate', syncFromHash)
    }
  }, [])

  function exit() {
    postFocusMessage('release', { cardId })
    window.close()
    // window.close() is ignored for tabs the user navigated to manually; show a
    // dismissed state so they know it is safe to close.
    setStatus('closed')
  }

  if (status === 'closed') {
    return (
      <div className="focus-tab-fallback">
        <h1>Focus Room closed</h1>
        <p>You can close this tab now. Your session stays logged in the main app.</p>
      </div>
    )
  }

  if (!snapshot?.card) {
    return (
      <div className="focus-tab-fallback">
        <h1>Focus Room</h1>
        {status === 'offline' ? (
          <>
            <p>Couldn’t reach the main Summer Rescue tab.</p>
            <p>Open the app in another tab and this room will connect automatically.</p>
          </>
        ) : (
          <p>Connecting to your session…</p>
        )}
      </div>
    )
  }

  return (
    <>
      <StudyTimer
        variant="room"
        activeCard={snapshot.card}
        resources={snapshot.resources}
        currentBoundary={snapshot.currentBoundary}
        nextBoundary={snapshot.nextBoundary}
        linkedNotes={snapshot.linkedNotes}
        onCompleteSession={handleCompleteSession}
        onFocusBlockComplete={(minutes) => focusRewards.recordBlockComplete(minutes)}
        onChecklistToggle={handleChecklistToggle}
        onSaveRestartCue={handleSaveRestartCue}
        onAddNote={handleAddNote}
        onNoteUpdate={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
        onEvidenceAdd={handleAddEvidence}
        onEvidenceUpdate={handleUpdateEvidence}
        onEvidenceDelete={handleDeleteEvidence}
        onEvidenceFileAdd={handleAddEvidenceFile}
        onOpenResource={setOpenResourceId}
        onExitRoom={exit}
        theme={theme}
        onThemeChange={handleThemeChange}
      />
      {activeResource && (
        <Suspense fallback={null}>
          <ResourceReader
            resource={activeResource}
            onClose={() => setOpenResourceId(null)}
            theme={theme}
            onThemeChange={handleThemeChange}
          />
        </Suspense>
      )}
    </>
  )
}
