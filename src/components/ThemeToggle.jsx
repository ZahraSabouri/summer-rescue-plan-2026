// A sliding light/dark switch, reused everywhere a theme control is offered:
// the top bar, every popup reader (resource/video/knowledge), and the Focus
// Room tab. One component keeps all of those in sync with the same visual
// language instead of each screen growing its own toggle.
export function ThemeToggle({ theme, onChange, className = '' }) {
  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`theme-switch${isDark ? ' is-dark' : ''}${className ? ` ${className}` : ''}`}
      onClick={() => onChange(isDark ? 'light' : 'dark')}
    >
      <span className="theme-switch-track" aria-hidden="true">
        <svg className="theme-switch-mark sun" viewBox="0 0 24 24" width="13" height="13">
          <circle cx="12" cy="12" r="4" fill="currentColor" />
          <path
            d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <svg className="theme-switch-mark moon" viewBox="0 0 24 24" width="12" height="12">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" fill="currentColor" />
        </svg>
        <span className="theme-switch-thumb" />
      </span>
    </button>
  )
}
