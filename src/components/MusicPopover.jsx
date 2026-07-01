import { useEffect, useRef, useState } from 'react'

const PLAYLIST_ID = '17SpQk7uL2G63B6HjXILkz'
const PLAYLIST_SRC = `https://open.spotify.com/embed/playlist/${PLAYLIST_ID}?utm_source=generator`
const PLAYLIST_URL = `https://open.spotify.com/playlist/${PLAYLIST_ID}`

export function MusicPopover({ theme = 'light' }) {
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

  const embedSrc = `${PLAYLIST_SRC}${theme === 'dark' ? '&theme=0' : ''}`

  return (
    <div className="music-wrap" ref={wrapRef}>
      <button
        type="button"
        className="icon-button"
        onClick={toggle}
        aria-label="Focus music"
        aria-expanded={open}
        title="Focus music"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18V5l10-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="16" cy="16" r="3" />
        </svg>
      </button>
      {loaded && (
        <div className={`music-pop ${open ? 'is-open' : 'is-hidden'}`} role="dialog" aria-label="Focus music" aria-hidden={!open}>
          <div className="music-head">
            <strong>Focus soundtrack</strong>
            <span>Spotify embed preview</span>
          </div>
          <iframe
            key={theme}
            className="spotify-embed"
            src={embedSrc}
            width="100%"
            height="352"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            tabIndex={open ? 0 : -1}
            title="Focus playlist"
          />
          <a className="music-full-link" href={PLAYLIST_URL} target="_blank" rel="noreferrer" tabIndex={open ? 0 : -1}>
            Open full playlist in Spotify
          </a>
        </div>
      )}
    </div>
  )
}
