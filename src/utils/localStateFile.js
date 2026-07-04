const ENDPOINT = '/api/local-tracker-state'

export const LOCAL_STATE_FILE_LABEL = 'local-data/summer-rescue-tracker-state.json'

export async function readLocalTrackerStateFile() {
  const response = await fetch(ENDPOINT, {
    headers: { Accept: 'application/json' },
  })

  if (response.status === 204) return null
  if (!response.ok) throw new Error(`Local state file read failed (${response.status})`)

  return response.json()
}

export async function writeLocalTrackerStateFile(payload) {
  const response = await fetch(ENDPOINT, {
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
