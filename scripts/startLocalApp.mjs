import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  LOCAL_APP_HOST,
  LOCAL_APP_PORT,
  startLocalAppServer,
} from '../src/server/localAppServer.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let server
try {
  server = await startLocalAppServer({ projectRoot })
} catch (error) {
  if (error.code === 'EADDRINUSE') {
    console.error(`Cannot start Summer Rescue: http://${LOCAL_APP_HOST}:${LOCAL_APP_PORT} is already in use.`)
    console.error('Close the other local server and run npm run app:start again.')
  } else {
    console.error(`Cannot start Summer Rescue: ${error.message}`)
  }
  process.exit(1)
}
const address = server.address()
// A wildcard bind (0.0.0.0, used inside Docker so the host's port mapping has
// something to reach) isn't itself a browsable URL — show the loopback name
// that actually works, whether you're on the host or port-forwarded into it.
const host = address.address === '127.0.0.1' ? address.address : LOCAL_APP_HOST === '0.0.0.0' ? '127.0.0.1' : LOCAL_APP_HOST
const port = address.port ?? LOCAL_APP_PORT

console.log(`Summer Rescue is ready at http://${host}:${port}/#/today`)
console.log('Keep this local service running while you use the installed desktop app.')
console.log('Press Ctrl+C to stop it.')

function close() {
  server.close(() => process.exit(0))
}

process.on('SIGINT', close)
process.on('SIGTERM', close)
