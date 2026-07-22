// A persistent, draggable mini YouTube player for studying alongside a long
// lecture/stream video. Rendered once in the app shell (see App.jsx, next to
// MusicPopover) rather than inside any routed view, so navigating between
// pages never remounts the iframe — playback keeps running. Position, the
// current video, and whether it's open are saved to localStorage so a
// refresh restores exactly what was showing (or staying closed, if that's
// how it was left — same "sticky until you reopen it" behaviour as this
// app's other dismissible panels).
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { youtubeEmbedUrl } from '../utils/resourceLinks.js'
import './FloatingVideoPlayer.css'

const STORAGE_KEY = 'srp-floating-player'
const WIDTH = 320
const HEIGHT = 216
const MARGIN = 16

function clamp(x, y) {
  const maxX = Math.max(0, window.innerWidth - WIDTH)
  const maxY = Math.max(0, window.innerHeight - HEIGHT)
  return { x: Math.min(Math.max(0, x), maxX), y: Math.min(Math.max(0, y), maxY) }
}

function defaultPosition() {
  return clamp(window.innerWidth - WIDTH - MARGIN, window.innerHeight - HEIGHT - MARGIN)
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

function withAutoplay(embedUrl) {
  return `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1`
}

export function FloatingVideoPlayer() {
  // Restored via lazy initial state (read once, synchronously, at mount)
  // rather than an effect + setState — the same trick this app already uses
  // for srp-nav-collapsed etc. After mount, every open/close/move writes back.
  const [rawUrl, setRawUrl] = useState(() => loadSaved()?.rawUrl ?? '')
  const [visible, setVisible] = useState(() => {
    const saved = loadSaved()
    return Boolean(saved?.visible && saved?.rawUrl)
  })
  const [position, setPosition] = useState(() => {
    const saved = loadSaved()
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') return clamp(saved.x, saved.y)
    return defaultPosition()
  })
  const [editing, setEditing] = useState(false)
  const [draftUrl, setDraftUrl] = useState('')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef(null)
  const boxRef = useRef(null)

  // A window resize can strand the player off-screen (e.g. shrinking from a
  // wide monitor to a laptop) — keep it inside the viewport at all times.
  useEffect(() => {
    function onResize() {
      setPosition((current) => clamp(current.x, current.y))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const embedUrl = rawUrl ? youtubeEmbedUrl(rawUrl) : null

  function openVideo(nextRawUrl) {
    const embed = youtubeEmbedUrl(nextRawUrl)
    if (!embed) return false
    setRawUrl(nextRawUrl)
    setVisible(true)
    setEditing(false)
    setError('')
    persistSaved({ rawUrl: nextRawUrl, visible: true, x: position.x, y: position.y })
    return true
  }

  function closeVideo() {
    setVisible(false)
    persistSaved({ rawUrl, visible: false, x: position.x, y: position.y })
  }

  function submitDraft(event) {
    event.preventDefault()
    if (!openVideo(draftUrl.trim())) {
      setError('That doesn’t look like a YouTube link.')
      return
    }
    setDraftUrl('')
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
      setPosition(clamp(event.clientX - dragOffset.current.dx, event.clientY - dragOffset.current.dy))
    }
    function onUp() {
      setDragging(false)
      dragOffset.current = null
      setPosition((current) => {
        persistSaved({ rawUrl, visible, x: current.x, y: current.y })
        return current
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragging, rawUrl, visible])

  return (
    <div className="video-player-wrap">
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
            className={`floating-video-player${dragging ? ' is-dragging' : ''}`}
            style={{ left: position.x, top: position.y, width: WIDTH }}
          >
            <div className="floating-video-header" onPointerDown={startDrag}>
              <span className="floating-video-handle" aria-hidden="true">
                ⠿
              </span>
              <span className="floating-video-label">Study video</span>
              <button type="button" className="floating-video-close" onClick={closeVideo} aria-label="Close video player">
                ×
              </button>
            </div>
            <div className="floating-video-body">
              <iframe
                src={withAutoplay(embedUrl)}
                title="Study video"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
