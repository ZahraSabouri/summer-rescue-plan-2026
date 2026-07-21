import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { FocusRoomTab } from './components/FocusRoomTab.jsx'
import { isFocusRoomRoute } from './utils/focusSession.js'

// The Focus Room opens in its own tab at #/focus-room. That tab renders ONLY the
// room (a follower of the main app tab), never the whole app — so it can't
// double-write tracker state. Everything else boots the full app.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      {isFocusRoomRoute() ? <FocusRoomTab /> : <App />}
    </ErrorBoundary>
  </StrictMode>,
)
