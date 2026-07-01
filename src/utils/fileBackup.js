const DB_NAME = 'summer-rescue-file-backup-v1'
const STORE_NAME = 'handles'
const TRACKER_HANDLE_KEY = 'tracker-backup-file'

export function fileBackupSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof window.showSaveFilePicker === 'function' &&
    typeof indexedDB !== 'undefined'
  )
}

function openBackupDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore(mode, action) {
  const db = await openBackupDb()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode)
      const store = transaction.objectStore(STORE_NAME)
      const request = action(store)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
      transaction.onerror = () => reject(transaction.error)
    })
  } finally {
    db.close()
  }
}

export async function loadBackupHandle() {
  if (!fileBackupSupported()) return null
  return withStore('readonly', (store) => store.get(TRACKER_HANDLE_KEY))
}

export async function saveBackupHandle(handle) {
  if (!fileBackupSupported()) return
  await withStore('readwrite', (store) => store.put(handle, TRACKER_HANDLE_KEY))
}

export async function clearBackupHandle() {
  if (!fileBackupSupported()) return
  await withStore('readwrite', (store) => store.delete(TRACKER_HANDLE_KEY))
}

export async function chooseBackupHandle(suggestedName) {
  const handle = await window.showSaveFilePicker({
    suggestedName,
    types: [
      {
        description: 'JSON backup',
        accept: { 'application/json': ['.json'] },
      },
    ],
  })
  await saveBackupHandle(handle)
  return handle
}

export async function queryBackupPermission(handle) {
  if (!handle) return false
  if (typeof handle.queryPermission !== 'function') return true
  return (await handle.queryPermission({ mode: 'readwrite' })) === 'granted'
}

export async function requestBackupPermission(handle) {
  if (!handle) return false
  if (await queryBackupPermission(handle)) return true
  if (typeof handle.requestPermission !== 'function') return true
  return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted'
}

export async function writeBackupHandle(handle, payload) {
  const writable = await handle.createWritable()
  try {
    await writable.write(JSON.stringify(payload, null, 2))
  } finally {
    await writable.close()
  }
}
