import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// -----------------------------------------------------------------------
// Confetti burst — fired when a card is completed. Pure CSS animation, no
// dependencies; honours prefers-reduced-motion via the global kill switch
// in index.css (animations collapse to ~0ms, so it is effectively skipped).
// -----------------------------------------------------------------------

const PIECE_COUNT = 34
const COLOR_VARS = ['--accent', '--accent-2', '--chart-aml', '--chart-project', '--amber']

function buildPieces(seed) {
  const pieces = []
  for (let index = 0; index < PIECE_COUNT; index += 1) {
    // Deterministic-ish spread using the trigger seed so each burst differs.
    const rand = (n) => {
      const x = Math.sin(seed * 997 + index * 131 + n * 17) * 10000
      return x - Math.floor(x)
    }
    pieces.push({
      id: `${seed}-${index}`,
      left: 8 + rand(1) * 84, // vw
      dx: (rand(2) - 0.5) * 220, // px horizontal drift
      fall: 55 + rand(3) * 35, // vh fall distance
      rotate: (rand(4) - 0.5) * 940,
      delay: rand(5) * 0.18,
      duration: 1.05 + rand(6) * 0.7,
      size: 6 + rand(7) * 7,
      colorVar: COLOR_VARS[index % COLOR_VARS.length],
      round: rand(8) > 0.6,
    })
  }
  return pieces
}

export function Celebration({ trigger }) {
  const [burst, setBurst] = useState(null)
  const firstRun = useRef(true)

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false
      return undefined
    }
    if (!trigger) return undefined
    setBurst({ seed: trigger, pieces: buildPieces(trigger) })
    const id = window.setTimeout(() => setBurst(null), 2100)
    return () => window.clearTimeout(id)
  }, [trigger])

  if (!burst || typeof document === 'undefined') return null

  return createPortal(
    <div className="confetti-layer" aria-hidden="true">
      {burst.pieces.map((piece) => (
        <span
          key={piece.id}
          className={`confetti-piece${piece.round ? ' round' : ''}`}
          style={{
            left: `${piece.left}vw`,
            width: `${piece.size}px`,
            height: `${piece.size * (piece.round ? 1 : 1.6)}px`,
            background: `var(${piece.colorVar})`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            '--dx': `${piece.dx}px`,
            '--fall': `${piece.fall}vh`,
            '--rot': `${piece.rotate}deg`,
          }}
        />
      ))}
    </div>,
    document.body,
  )
}

// -----------------------------------------------------------------------
// AnimatedNumber — counts toward its value whenever the value changes.
// -----------------------------------------------------------------------

export function AnimatedNumber({ value, decimals = 0, duration = 650, suffix = '' }) {
  const target = Number(value) || 0
  const [display, setDisplay] = useState(target)
  const fromRef = useRef(target)
  const frameRef = useRef(null)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return undefined
    const start = performance.now()

    function tick(now) {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = from + (target - from) * eased
      setDisplay(next)
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      fromRef.current = target
    }
  }, [target, duration])

  const factor = 10 ** decimals
  const shown = Math.round(display * factor) / factor
  return (
    <span className="animated-number">
      {decimals > 0 ? shown.toFixed(decimals) : Math.round(shown)}
      {suffix}
    </span>
  )
}
