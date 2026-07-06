// Seed / rebuild the durable SQLite store (local-data/app.sqlite).
//
//   node scripts/initTrackerDb.mjs            migrate + seed catalog + mirror current JSON state
//   node scripts/initTrackerDb.mjs --rebuild  print the event-log recovery for the seeded cards
//
// The catalog (modules, phases, base cards) comes from the source data files;
// live progress comes from local-data/summer-rescue-tracker-state.json when present.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { baseCards } from '../src/data/baseCards.js'
import { STUDY_MODULES } from '../src/data/studyModules.js'
import { PHASE_OPTIONS } from '../src/data/constants.js'
import { openTrackerDb } from '../src/server/trackerDb.js'

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const localDataDir = path.join(projectRoot, 'local-data')
const dbPath = path.join(localDataDir, 'app.sqlite')
const statePath = path.join(localDataDir, 'summer-rescue-tracker-state.json')
const progressLogPath = path.join(localDataDir, 'progress-log.ndjson')

const modules = STUDY_MODULES.map((module, index) => ({
  id: module.id,
  name: module.label ?? module.title ?? module.moduleGroup,
  moduleGroup: module.moduleGroup,
  code: module.code ?? '',
  active: true,
  sortOrder: index,
}))

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function readEvents() {
  try {
    const raw = await fs.readFile(progressLogPath, 'utf8')
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line)
        } catch {
          return null
        }
      })
      .filter(Boolean)
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

async function main() {
  const rebuildOnly = process.argv.includes('--rebuild')
  const db = openTrackerDb(dbPath)

  try {
    if (rebuildOnly) {
      const events = await readEvents()
      const recovery = db.recover(events)
      const reconstructed = recovery.cards.filter((card) => card.fromEventLog)
      console.log(`Event-log recovery from ${events.length} events:`)
      console.log(`  cards touched by the log : ${recovery.rebuiltCardCount}`)
      console.log(`  cards in DB catalog      : ${recovery.catalogCardCount}`)
      console.log(`  done via replay          : ${reconstructed.filter((card) => card.done).length}`)
      return
    }

    const seeded = db.seedCatalog({ modules, phases: PHASE_OPTIONS, cards: baseCards })
    console.log(`Seeded catalog: ${seeded.modules} modules, ${seeded.phases} phases, ${seeded.cards} cards.`)

    const stateEnvelope = await readJson(statePath)
    if (stateEnvelope) {
      const counts = db.projectState(stateEnvelope)
      console.log(
        `Mirrored live state: ${counts.card_progress} card progress rows, ` +
          `${counts.checklist_items} checklist items, ${counts.resources} uploaded resources, ` +
          `${counts.notifications} notifications.`,
      )
    } else {
      console.log('No local-data/summer-rescue-tracker-state.json yet — catalog seeded only.')
    }

    console.log(`SQLite store ready at ${path.relative(projectRoot, dbPath)} (schema v${db.getSchemaVersion()}).`)
  } finally {
    db.close()
  }
}

main().catch((error) => {
  console.error('initTrackerDb failed:', error)
  process.exitCode = 1
})
