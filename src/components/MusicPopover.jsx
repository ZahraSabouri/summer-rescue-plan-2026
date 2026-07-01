import { useEffect, useRef, useState } from 'react'

const PLAYLIST_SRC =
  'https://open.spotify.com/embed/playlist/17SpQk7uL2G63B6HjXILkz?utm_source=generator'

export function MusicPopover() {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    function onDoc(event) {
      if (open && wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  function toggle() {
    setOpen((value) => !value)
    setLoaded(true)
  }

  return (
    <div className="music-wrap" ref={wrapRef}>
      <button type="button" className="icon-button" onClick={toggle} aria-label="Focus music" title="Focus music">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18V5l10-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="16" cy="16" r="3" />
        </svg>
      </button>
      {open && (
        <div className="music-pop" role="dialog" aria-label="Focus music">
          <div className="music-head">
            <strong>Focus soundtrack</strong>
            <span>Play while you work</span>
          </div>
          {/* Official Spotify embed widget */}
          {loaded && (
            <iframe
              className="spotify-embed"
              src={PLAYLIST_SRC}
              width="100%"
              height="352"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Focus playlist"
            />
          )}
        </div>
      )}
    </div>
  )
}
