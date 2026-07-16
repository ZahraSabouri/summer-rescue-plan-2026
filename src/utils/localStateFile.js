const STATE_ENDPOINT = '/api/state'
const EVENTS_ENDPOINT = '/api/events'
const RESOURCES_ENDPOINT = '/api/resources'
const RESOURCE_UPLOAD_ENDPOINT = '/api/resources/upload'
const DATA_HEALTH_ENDPOINT = '/api/data-health'
const DB_REBUILD_TOKEN_ENDPOINT = '/api/db/rebuild-token'
const DB_REBUILD_ENDPOINT = '/api/db/rebuild'

export const LOCAL_STATE_FILE_LABEL = 'local-data/summer-rescue-tracker-state.json'

function responseRevision(response) {
  return Math.max(0, Number(response.headers.get('X-State-Revision')) || 0)
}

export class StateConflictError extends Error {
  constructor(message, current = {}) {
    super(message)
    this.name = 'StateConflictError'
    this.current = current
  }
}

export async function readLocalTrackerStateFile() {
  const response = await fetch(STATE_ENDPOINT, {
    headers: { Accept: 'application/json' },
  })

  if (response.status === 204) {
    return { payload: null, revision: responseRevision(response), etag: response.headers.get('ETag') ?? '"0"' }
  }
  if (!response.ok) throw new Error(`Local state file read failed (${response.status})`)

  const payload = await response.json()
  return {
    payload,
    revision: responseRevision(response) || Math.max(0, Number(payload?.revision) || 0),
    etag: response.headers.get('ETag') ?? '',
    writtenAt: payload?.writtenAt ?? payload?.exportedAt ?? payload?.state?.updatedAt ?? payload?.updatedAt ?? '',
    writerId: payload?.writerId ?? 'legacy',
  }
}

export async function writeLocalTrackerStateFile(payload, { revision = 0, writerId = '' } = {}) {
  const response = await fetch(STATE_ENDPOINT, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'If-Match': `"${Math.max(0, Number(revision) || 0)}"`,
      'X-Writer-Id': writerId,
    },
    body: JSON.stringify(payload),
  })

  if (response.status === 409) {
    const body = await response.json().catch(() => ({}))
    throw new StateConflictError('Another app tab saved newer tracker data.', body.current ?? {})
  }
  if (!response.ok) throw new Error(`Local state file write failed (${response.status})`)
  const result = await response.json()
  return { ...result, revision: responseRevision(response) || result.revision }
}

export async function readLocalDataHealth() {
  const response = await fetch(DATA_HEALTH_ENDPOINT, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Data health read failed (${response.status})`)
  return response.json()
}

export async function rebuildLocalDatabase() {
  const tokenResponse = await fetch(DB_REBUILD_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  })
  if (!tokenResponse.ok) throw new Error(`Database confirmation token failed (${tokenResponse.status})`)
  const { token } = await tokenResponse.json()
  const response = await fetch(DB_REBUILD_ENDPOINT, {
    method: 'POST',
    headers: { Accept: 'application/json', 'X-Rebuild-Token': token },
  })
  if (!response.ok) throw new Error(`Database rebuild failed (${response.status})`)
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

// Card attachments reuse the resource-upload pipeline but live in their own
// module directory and are kept out of the study-resource pickers.
const ATTACHMENT_MODULE_ID = 'card-attachments'

export function isCardAttachmentResource(resource) {
  return resource?.moduleId === ATTACHMENT_MODULE_ID
}

export function isCardAttachmentUrl(url) {
  return typeof url === 'string' && url.startsWith(`${RESOURCES_ENDPOINT}/file/${ATTACHMENT_MODULE_ID}/`)
}

// Best-effort cleanup when an evidence entry that owns the file is deleted.
// The server only accepts deletes inside the card-attachments directory.
export async function deleteCardAttachmentFile(url) {
  if (!isCardAttachmentUrl(url)) throw new Error('Not a card-attachment URL.')
  const response = await fetch(url, { method: 'DELETE' })
  if (!response.ok) throw new Error(`Attachment delete failed (${response.status})`)
  return response.json()
}

export async function uploadCardAttachmentFile(file, card) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const chunks = []
  for (let index = 0; index < bytes.length; index += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + 0x8000)))
  }
  const result = await uploadLocalResource({
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    title: file.name,
    group: 'Card attachments',
    description: `Attached to card ${card?.number ?? ''}: ${card?.title ?? ''}`.trim(),
    tags: 'attachment',
    priority: 'normal',
    dataBase64: window.btoa(chunks.join('')),
    moduleId: ATTACHMENT_MODULE_ID,
    moduleKey: ATTACHMENT_MODULE_ID,
    moduleGroup: card?.moduleGroup ?? '',
  })
  if (!result?.resource?.url) throw new Error('Upload did not return a stored file.')
  return result.resource
}
