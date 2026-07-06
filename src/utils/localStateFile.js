const STATE_ENDPOINT = '/api/state'
const EVENTS_ENDPOINT = '/api/events'

export const LOCAL_STATE_FILE_LABEL = 'local-data/summer-rescue-tracker-state.json'

export async function readLocalTrackerStateFile() {
  const response = await fetch(STATE_ENDPOINT, {
    headers: { Accept: 'application/json' },
  })

  if (response.status === 204) return null
  if (!response.ok) throw new Error(`Local state file read failed (${response.status})`)

  return response.json()
}

export async function writeLocalTrackerStateFile(payload) {
  const response = await fetch(STATE_ENDPOINT, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) throw new Error(`Local state file write failed (${response.status})`)
  return response.json()
}

export async function appendLocalProgressEvent(event) {
  const response = await fetch(EVENTS_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  })

  if (!response.ok) throw new Error(`Local progress event write failed (${response.status})`)
  return response.json()
}
