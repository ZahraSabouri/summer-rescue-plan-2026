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
