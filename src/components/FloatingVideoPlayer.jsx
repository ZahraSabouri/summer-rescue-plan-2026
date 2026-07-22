// A persistent, draggable, resizable mini YouTube player for studying
// alongside a long lecture/stream video. Rendered once in the app shell
// (App.jsx, next to MusicPopover) AND in the Focus Room tab (FocusRoomTab.jsx
// — a separate React root that opens in its own browser tab), so it's
// available wherever the app is open, not just the main window.
//
// Cross-tab ownership: this app is routinely open in more than one same-origin
// tab at once (main app + a Focus Room tab + a duplicated tab for slides).
// Only one tab should ever actually play the video; every other tab mirrors
// the same video paused, with a "Play here" button to claim it back. See
// utils/videoPlayerSync.js for the small BroadcastChannel protocol
// (claim / release / request-state / state) that makes this work — playback
// itself is controlled via the documented YouTube embed postMessage command
// protocol (`enablejsapi=1` + `{event:'command', func:'playVideo'|'pauseVideo'}`),
// no new dependency needed.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { youtubeEmbedUrl } from '../utils/resourceLinks.js'
import { TAB_ID, onVideoMessage, postVideoMessage } from '../utils/videoPlayerSync.js'
import './FloatingVideoPlayer.css'

const STORAGE_KEY = 'srp-floating-player'
const MARGIN = 16
const MIN_WIDTH = 220
const MAX_WIDTH = 640
const DEFAULT_WIDTH = 320
const MAXIMIZED_WIDTH = 520
const HEADER_HEIGHT = 40

function clampWidth(width) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)))
}

function estimateHeight(width) {
  return Math.round((width * 9) / 16) + HEADER_HEIGHT
}

function clamp(x, y, width) {
  const height = estimateHeight(width)
  const maxX = Math.max(0, window.innerWidth - width)
  const maxY = Math.max(0, window.innerHeight - height)
  return { x: Math.min(Math.max(0, x), maxX), y: Math.min(Math.max(0, y), maxY) }
}

function defaultPosition(width) {
  return clamp(window.innerWidth - width - MARGIN, window.innerHeight - estimateHeight(width) - MARGIN, width)
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function persistSaved(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* best-effort; losing this only means the player forgets where it was */
  }
}

function withJsApi(embedUrl) {
  const joiner = embedUrl.includes('?') ? '&' : '?'
  return `${embedUrl}${joiner}enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`
}

export function FloatingVideoPlayer() {
  // Restored via lazy initial state (read once, synchronously, at mount)
  // rather than an effect + setState — the same trick this app already uses
  // for srp-nav-collapsed etc. After mount, every open/close/move/resize
  // writes back. Position/size/minimized are per-tab local preferences —
  // only the video identity and who's playing it are cross-tab concerns.
  const [rawUrl, setRawUrl] = useState(() => loadSaved()?.rawUrl ?? '')
  const [visible, setVisible] = useState(() => {
    const saved = loadSaved()
    return Boolean(saved?.visible && saved?.rawUrl)
  })
  const [width, setWidth] = useState(() => clampWidth(loadSaved()?.width ?? DEFAULT_WIDTH))
  const [position, setPosition] = useState(() => {
    const saved = loadSaved()
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
      return clamp(saved.x, saved.y, clampWidth(saved.width ?? DEFAULT_WIDTH))
    }
    return defaultPosition(clampWidth(loadSaved()?.width ?? DEFAULT_WIDTH))
  })
  const [minimized, setMinimized] = useState(() => Boolean(loadSaved()?.minimized))
  const [maximized, setMaximized] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draftUrl, setDraftUrl] = useState('')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const dragOffset = useRef(null)
  const resizeStart = useRef(null)
  const boxRef = useRef(null)
  const wrapRef = useRef(null)
  const iframeRef = useRef(null)

  const displayWidth = maximized ? MAXIMIZED_WIDTH : width
  // The iframe always keeps this exact pixel size internally — minimizing
  // only clips it from view (the wrapper's height goes to 0 with
  // overflow:hidden) rather than shrinking the iframe itself, which is what
  // lets the audio keep playing while minimized instead of the embedded
  // player being squashed to a 0×0 frame.
  const bodyHeight = Math.round((displayWidth * 9) / 16)

  const embedUrl = rawUrl ? youtubeEmbedUrl(rawUrl) : null

  function save(overrides = {}) {
    persistSaved({ rawUrl, visible, x: position.x, y: position.y, width, minimized, ...overrides })
  }

  function sendCommand(func) {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*')
  }

  // Close the URL popover on an outside click — same pattern as MusicPopover.
  useEffect(() => {
    if (!editing) return undefined
    function onDocMouseDown(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setEditing(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [editing])

  // A window resize can strand the player off-screen (e.g. shrinking from a
  // wide monitor to a laptop) — keep it inside the viewport at all times.
  useEffect(() => {
    function onResize() {
      setPosition((current) => clamp(current.x, current.y, displayWidth))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [displayWidth])

  // Mount-time ownership negotiation: only relevant if this tab is booting
  // with an already-visible, saved video (e.g. a reload, or a second tab
  // opening). Ask once; a reply means someone else already owns it, so this
  // tab starts as a paused follower. No reply in time means this is the only
  // tab around, so it claims ownership itself. Deliberately mount-only —
  // opening a *new* video later always claims directly (see openVideo).
  useEffect(() => {
    if (!visible || !rawUrl) return undefined
    let settled = false
    const unsubscribe = onVideoMessage((message) => {
      if (settled) return
      if (message.type === 'state' && message.ownerTabId) {
        settled = true
        setIsOwner(message.ownerTabId === TAB_ID)
        unsubscribe()
      } else if (message.type === 'claim') {
        // Someone else is already active. The always-on listener below
        // handles adopting their video and setting isOwner=false from this
        // same message — this only needs to stop the timeout from *also*
        // claiming afterward, which would otherwise race it.
        settled = true
        unsubscribe()
      }
    })
    postVideoMessage('request-state', {})
    const timer = window.setTimeout(() => {
      if (!settled) {
        setIsOwner(true)
        postVideoMessage('claim', { rawUrl })
      }
      unsubscribe()
    }, 400)
    return () => {
      window.clearTimeout(timer)
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ongoing cross-tab listening: another tab claiming ownership demotes this
  // one to a follower (and adopts whatever video they claimed); a release
  // just means the previous owner stopped — no auto-reclaim, "Play here"
  // stays a manual action; a request-state from a freshly-mounted tab gets
  // answered only if this tab actually owns playback right now.
  useEffect(() => {
    return onVideoMessage((message) => {
      if (message.type === 'claim') {
        if (message.rawUrl && message.rawUrl !== rawUrl) setRawUrl(message.rawUrl)
        setIsOwner(false)
        setVisible(true)
      } else if (message.type === 'release') {
        setIsOwner(false)
      } else if (message.type === 'request-state' && isOwner) {
        postVideoMessage('state', { ownerTabId: TAB_ID, rawUrl })
      }
    })
  }, [rawUrl, isOwner])

  // Whenever ownership flips (without necessarily reloading the iframe — see
  // the src note below), push the matching play/pause command. Sent twice:
  // once immediately, once shortly after, since a command right after the
  // iframe's own message listener attaches can be missed the first time.
  useEffect(() => {
    if (!visible || !embedUrl) return undefined
    const command = isOwner ? 'playVideo' : 'pauseVideo'
    sendCommand(command)
    const retry = window.setTimeout(() => sendCommand(command), 500)
    return () => window.clearTimeout(retry)
  }, [isOwner, visible, embedUrl])

  function openVideo(nextRawUrl) {
    const embed = youtubeEmbedUrl(nextRawUrl)
    if (!embed) return false
    setRawUrl(nextRawUrl)
    setVisible(true)
    setEditing(false)
    setError('')
    setIsOwner(true)
    persistSaved({ rawUrl: nextRawUrl, visible: true, x: position.x, y: position.y, width, minimized })
    postVideoMessage('claim', { rawUrl: nextRawUrl })
    return true
  }

  function closeVideo() {
    setVisible(false)
    setIsOwner(false)
    save({ visible: false })
    postVideoMessage('release', {})
  }

  function claimHere() {
    setIsOwner(true)
    postVideoMessage('claim', { rawUrl })
  }

  function submitDraft(event) {
    event.preventDefault()
    if (!openVideo(draftUrl.trim())) {
      setError('That doesn’t look like a YouTube link.')
      return
    }
    setDraftUrl('')
  }

  function toggleMinimize() {
    setMinimized((current) => {
      const next = !current
      save({ minimized: next })
      return next
    })
  }

  function toggleMaximize() {
    setMaximized((current) => !current)
  }

  function startDrag(event) {
    if (!boxRef.current) return
    event.preventDefault()
    const rect = boxRef.current.getBoundingClientRect()
    dragOffset.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top }
    setDragging(true)
  }

  useEffect(() => {
    if (!dragging) return undefined
    function onMove(event) {
      if (!dragOffset.current) return
      setPosition(clamp(event.clientX - dragOffset.current.dx, event.clientY - dragOffset.current.dy, displayWidth))
    }
    function onUp() {
      setDragging(false)
      dragOffset.current = null
      setPosition((current) => {
        save({ x: current.x, y: current.y })
        return current
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, displayWidth])

  function startResize(event) {
    event.preventDefault()
    event.stopPropagation()
    resizeStart.current = { startX: event.clientX, startWidth: displayWidth }
    setMaximized(false)
    setResizing(true)
  }

  useEffect(() => {
    if (!resizing) return undefined
    function onMove(event) {
      if (!resizeStart.current) return
      const delta = event.clientX - resizeStart.current.startX
      setWidth(clampWidth(resizeStart.current.startWidth + delta))
    }
    function onUp() {
      setResizing(false)
      resizeStart.current = null
      setWidth((current) => {
        save({ width: current })
        return current
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizing])

  return (
    <div className="video-player-wrap" ref={wrapRef}>
      <button
        type="button"
        className="icon-button"
        onClick={() => {
          setDraftUrl(rawUrl)
          setError('')
          setEditing((value) => !value)
        }}
        aria-label="Study video player"
        aria-expanded={editing}
        title="Study video player"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="M10.5 9.3v5.4l4.7-2.7Z" fill="currentColor" stroke="none" />
        </svg>
      </button>

      {editing && (
        <form className="video-player-editor" role="dialog" aria-label="Set study video" onSubmit={submitDraft}>
          <label>
            <span>YouTube URL</span>
            <input
              type="url"
              value={draftUrl}
              onChange={(event) => setDraftUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              autoFocus
            />
          </label>
          {error && <p className="video-player-error">{error}</p>}
          <div className="video-player-editor-actions">
            <button type="submit" className="primary-button compact-button">
              Watch
            </button>
            {visible && (
              <button type="button" className="secondary-button compact-button" onClick={closeVideo}>
                Stop
              </button>
            )}
          </div>
        </form>
      )}

      {visible &&
        embedUrl &&
        createPortal(
          <div
            ref={boxRef}
            className={`floating-video-player${dragging ? ' is-dragging' : ''}${resizing ? ' is-resizing' : ''}${minimized ? ' is-minimized' : ''}`}
            style={{ left: position.x, top: position.y, width: displayWidth }}
          >
            <div className="floating-video-header" onPointerDown={startDrag}>
              <span className="floating-video-handle" aria-hidden="true">
                ⠿
              </span>
              <span className="floating-video-label">Study video</span>
              <button
                type="button"
                className="floating-video-btn"
                onClick={toggleMinimize}
                aria-label={minimized ? 'Restore video' : 'Minimize video'}
                title={minimized ? 'Restore' : 'Minimize'}
              >
                {minimized ? '▢' : '_'}
              </button>
              <button
                type="button"
                className="floating-video-btn"
                onClick={toggleMaximize}
                aria-label={maximized ? 'Restore video size' : 'Maximize video'}
                title={maximized ? 'Restore size' : 'Maximize'}
              >
                {maximized ? '❐' : '□'}
              </button>
              <button
                type="button"
                className="floating-video-btn floating-video-close"
                onClick={closeVideo}
                aria-label="Close video player"
                title="Close"
              >
                ×
              </button>
            </div>
            {!isOwner && (
              <div className="floating-video-follower-bar">
                <span>Paused · playing in another tab</span>
                <button type="button" className="text-button" onClick={claimHere}>
                  Play here
                </button>
              </div>
            )}
            <div className="floating-video-body" style={{ height: minimized ? 0 : bodyHeight }}>
              <iframe
                ref={iframeRef}
                src={withJsApi(embedUrl)}
                title="Study video"
                width={displayWidth}
                height={bodyHeight}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                onLoad={() => sendCommand(isOwner ? 'playVideo' : 'pauseVideo')}
              />
            </div>
            <div className="floating-video-resize-handle" onPointerDown={startResize} aria-hidden="true" />
          </div>,
          document.body,
        )}
    </div>
  )
}
