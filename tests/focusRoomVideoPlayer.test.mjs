import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const focusRoomPath = fileURLToPath(new URL('../src/components/FocusRoom.jsx', import.meta.url))
const focusTabPath = fileURLToPath(new URL('../src/components/FocusRoomTab.jsx', import.meta.url))
const playerPath = fileURLToPath(new URL('../src/components/FloatingVideoPlayer.jsx', import.meta.url))

test('the connected Focus Room exposes the study-video launcher in its topbar', async () => {
  const source = await fs.readFile(focusRoomPath, 'utf8')
  assert.match(source, /import \{ FloatingVideoPlayer \} from '\.\/FloatingVideoPlayer'/)

  const actions = source.match(
    /<div className="focus-room-topbar-actions">([\s\S]*?)<\/div>\s*<\/header>/,
  )?.[1]
  assert.ok(actions, 'the Focus Room topbar actions are present')
  assert.match(actions, /<FloatingVideoPlayer portal=\{false\} \/>/)
})

test('the Focus Room tab does not mount a duplicate player behind the room overlay', async () => {
  const source = await fs.readFile(focusTabPath, 'utf8')
  const launchers = source.match(/<FloatingVideoPlayer\b/g) ?? []
  assert.equal(launchers.length, 1, 'only the disconnected fallback keeps its standalone player')
})

test('the floating player can render inside the Focus Room stacking context', async () => {
  const source = await fs.readFile(playerPath, 'utf8')
  assert.match(source, /export function FloatingVideoPlayer\(\{ portal = true \}\)/)
  assert.match(source, /portal \? createPortal\(floatingWindow, document\.body\) : floatingWindow/)
})
