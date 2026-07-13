import { useEffect, useState } from 'react'
import './InstallDesktopApp.css'

const BROKER_KEY = '__summerRescueInstallBroker'

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function installBroker() {
  if (typeof window === 'undefined') {
    return { promptEvent: null, installed: false, listeners: new Set() }
  }

  if (!window[BROKER_KEY]) {
    const broker = {
      promptEvent: null,
      installed: isStandaloneDisplay(),
      listeners: new Set(),
      notify() {
        this.listeners.forEach((listener) => listener())
      },
    }

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault()
      broker.promptEvent = event
      broker.notify()
    })

    window.addEventListener('appinstalled', () => {
      broker.promptEvent = null
      broker.installed = true
      broker.notify()
    })

    window[BROKER_KEY] = broker
  }

  return window[BROKER_KEY]
}

// Create the broker when this module is imported so an install event is not
// lost if the Settings drawer is opened later in the session.
const broker = installBroker()

export function InstallDesktopApp({
  serviceAvailable = false,
  className = '',
  onInstalled,
}) {
  const [, refresh] = useState(0)
  const [installing, setInstalling] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const update = () => refresh((value) => value + 1)
    broker.listeners.add(update)
    return () => broker.listeners.delete(update)
  }, [])

  const installed = broker.installed || isStandaloneDisplay()
  const canPrompt = Boolean(broker.promptEvent) && !installed

  async function requestInstall() {
    if (!serviceAvailable || !broker.promptEvent || installing) return
    setInstalling(true)
    setMessage('')

    try {
      const promptEvent = broker.promptEvent
      const promptResult = await promptEvent.prompt()
      const choice = promptEvent.userChoice ? await promptEvent.userChoice : promptResult
      if (choice?.outcome === 'accepted') {
        setMessage('Desktop app installed. Keep the local service running whenever you use it.')
        onInstalled?.()
      } else {
        setMessage('Installation cancelled. You can install it later from Settings.')
      }
      broker.promptEvent = null
      broker.notify()
    } catch (error) {
      setMessage(`The browser could not open the install prompt: ${error.message}`)
    } finally {
      setInstalling(false)
    }
  }

  return (
    <section className={`desktop-install-card ${className}`.trim()} aria-labelledby="desktop-install-title">
      <div className="desktop-install-copy">
        <p className="eyebrow">Desktop shell</p>
        <h3 id="desktop-install-title">{installed ? 'Desktop app installed' : 'Install Summer Rescue'}</h3>
        <p>
          Opens this same private workspace in its own window. Installation does not make it offline and does
          not start the local data service.
        </p>
        <p className={`desktop-install-service ${serviceAvailable ? 'ready' : 'waiting'}`}>
          <span aria-hidden="true" />
          {serviceAvailable
            ? 'Local file service connected.'
            : 'Waiting for the local file service. Run npm run app:start before using the desktop app.'}
        </p>
      </div>

      {!installed && (
        <div className="desktop-install-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={requestInstall}
            disabled={!canPrompt || !serviceAvailable || installing}
          >
            {installing ? 'Opening install prompt…' : 'Install desktop app'}
          </button>
          {!canPrompt && (
            <small>
              If this button stays unavailable, use Chrome or Edge’s “Install this site as an app” command.
            </small>
          )}
        </div>
      )}

      {message && <p className="desktop-install-message" role="status">{message}</p>}
    </section>
  )
}

