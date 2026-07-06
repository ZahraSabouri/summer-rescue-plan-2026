const STATE_ENDPOINT = '/api/state'
const EVENTS_ENDPOINT = '/api/events'
const RESOURCES_ENDPOINT = '/api/resources'
const RESOURCE_UPLOAD_ENDPOINT = '/api/resources/upload'

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

export async function readLocalResources() {
  const response = await fetch(RESOURCES_ENDPOINT, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) throw new Error(`Local resources read failed (${response.status})`)
  const payload = await response.json()
  return Array.isArray(payload.resources) ? payload.resources : []
}

export async function uploadLocalResource(payload) {
  const response = await fetch(RESOURCE_UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) throw new Error(`Local resource upload failed (${response.status})`)
  return response.json()
}
