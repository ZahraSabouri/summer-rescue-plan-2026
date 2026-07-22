import { useEffect, useRef, useState } from 'react'

// Generated locally with the Web Audio API rather than shipping audio files —
// consistent with the app's "no CDN, no runtime network dependency" rule
// (see index.css's self-hosted-fonts note). Three honest noise colors rather
// than fake "cafe"/"lo-fi" beds we have no real recording for; actual music
// is still available via MusicPopover, rendered alongside this.
const SOUNDS = [
  { id: 'white', label: 'White noise' },
  { id: 'brown', label: 'Rain (brown noise)' },
  { id: 'pink', label: 'Pink noise' },
]

const BUFFER_SECONDS = 4

function buildNoiseBuffer(context, kind) {
  const length = Math.floor(context.sampleRate * BUFFER_SECONDS)
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)

  if (kind === 'brown') {
    let last = 0
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    }
  } else if (kind === 'pink') {
    // Paul Kellet's refined pink-noise filter.
    let b0 = 0
    let b1 = 0
    let b2 = 0
    let b3 = 0
    let b4 = 0
    let b5 = 0
    let b6 = 0
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }
  } else {
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1
  }
  return buffer
}

export function AmbientSoundPlayer({ className = '' }) {
  const [open, setOpen] = useState(false)
  const [sound, setSound] = useState('')
  const [volume, setVolume] = useState(0.4)
  const wrapRef = useRef(null)
  const contextRef = useRef(null)
  const sourceRef = useRef(null)
  const gainRef = useRef(null)

  useEffect(() => {
    function onDoc(event) {
      if (open && wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    return () => {
      sourceRef.current?.stop()
      contextRef.current?.close()
    }
  }, [])

  function play(kind) {
    sourceRef.current?.stop()
    sourceRef.current = null
    if (!kind) {
      setSound('')
      return
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    const context = contextRef.current ?? new AudioContextClass()
    contextRef.current = context
    if (context.state === 'suspended') context.resume()

    const source = context.createBufferSource()
    source.buffer = buildNoiseBuffer(context, kind)
    source.loop = true
    const gain = context.createGain()
    gain.gain.value = volume
    source.connect(gain).connect(context.destination)
    source.start()
    sourceRef.current = source
    gainRef.current = gain
    setSound(kind)
  }

  function changeVolume(next) {
    setVolume(next)
    if (gainRef.current) gainRef.current.gain.value = next
  }

  return (
    <div className={`music-wrap${className ? ` ${className}` : ''}`} ref={wrapRef}>
      <button
        type="button"
        className={`icon-button${sound ? ' is-active' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label="Ambient sound"
        aria-expanded={open}
        title="Ambient sound"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 10v4M7 6v12M11 3v18M15 6v12M19 10v4" />
        </svg>
      </button>
      <div className={`music-pop ambient-sound-pop ${open ? 'is-open' : 'is-hidden'}`} role="dialog" aria-label="Ambient sound" aria-hidden={!open}>
        <div className="music-head">
          <strong>Ambient sound</strong>
          <span>Generated locally — no files, no network</span>
        </div>
        <div className="ambient-sound-options">
          <button type="button" className={!sound ? 'active' : ''} onClick={() => play('')} tabIndex={open ? 0 : -1}>
            Off
          </button>
          {SOUNDS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={sound === item.id ? 'active' : ''}
              onClick={() => play(item.id)}
              tabIndex={open ? 0 : -1}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="ambient-sound-volume">
          <span>Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(event) => changeVolume(Number(event.target.value))}
            tabIndex={open ? 0 : -1}
          />
        </label>
      </div>
    </div>
  )
}
