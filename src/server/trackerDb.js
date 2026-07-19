// Durable SQLite store for the Summer Rescue tracker.
//
// The browser talks to the JSON state file (`/api/state`) as before; this module
// mirrors that state into `local-data/app.sqlite` so durable entities (cards,
// checklist items, notes, evidence, settings, resources, notifications) live in a
// queryable database. It also provides an event-log recovery path that rebuilds
// per-card progress from `progress-log.ndjson` alone.
//
// Server-only. Never imported by the client bundle. Uses Node's built-in
// `node:sqlite`, so there is no third-party dependency to install or audit.

import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { normaliseResourceProgressEntry } from '../utils/resourceProgress.js'

export const SCHEMA_VERSION = 2

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  module_group TEXT,
  code TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS phases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  number TEXT,
  title TEXT NOT NULL,
  module_group TEXT,
  phase TEXT,
  priority TEXT,
  base_status TEXT,
  estimated_hours REAL NOT NULL DEFAULT 0,
  due_date TEXT,
  start_date TEXT,
  custom INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  source TEXT
);

CREATE TABLE IF NOT EXISTS card_progress (
  card_id TEXT PRIMARY KEY,
  status TEXT,
  done INTEGER NOT NULL DEFAULT 0,
  actual_hours REAL NOT NULL DEFAULT 0,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  done INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS card_notes (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS card_evidence (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS card_resources (
  card_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  PRIMARY KEY (card_id, resource_id)
);

CREATE TABLE IF NOT EXISTS module_notes (
  module_id TEXT PRIMARY KEY,
  note TEXT NOT NULL DEFAULT '',
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS knowledge_notes (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'concept',
  topic TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  card_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT,
  updated_at TEXT
);

-- Review overlay. Keyed by note id rather than joined to knowledge_notes
-- because it also carries state for seeded notes, which live in the app
-- bundle and have no row of their own.
CREATE TABLE IF NOT EXISTS knowledge_meta (
  note_id TEXT PRIMARY KEY,
  starred INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TEXT,
  review_count INTEGER NOT NULL DEFAULT 0,
  confidence TEXT,
  quiz TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  module_id TEXT,
  module_key TEXT,
  module_group TEXT,
  grp TEXT,
  title TEXT,
  path TEXT,
  type TEXT,
  viewer TEXT,
  url TEXT,
  description TEXT,
  tags TEXT,
  priority TEXT,
  uploaded_at TEXT,
  size INTEGER NOT NULL DEFAULT 0,
  local INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS resource_reviewed (
  resource_id TEXT PRIMARY KEY,
  reviewed INTEGER NOT NULL DEFAULT 0,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  understanding_percent INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  card_id TEXT,
  kind TEXT,
  title TEXT,
  body TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_checklist_card ON checklist_items (card_id);
CREATE INDEX IF NOT EXISTS idx_notes_card ON card_notes (card_id);
CREATE INDEX IF NOT EXISTS idx_evidence_card ON card_evidence (card_id);
CREATE INDEX IF NOT EXISTS idx_cards_module ON cards (module_group);
`

const COUNT_TABLES = [
  'modules',
  'phases',
  'cards',
  'card_progress',
  'checklist_items',
  'card_notes',
  'card_evidence',
  'card_resources',
  'module_notes',
  'resources',
  'resource_reviewed',
  'settings',
  'notifications',
]

function toInt(value) {
  return value ? 1 : 0
}

function orNull(value) {
  return value === undefined || value === null ? null : value
}

function text(value) {
  return value === undefined || value === null ? '' : String(value)
}

function unwrapState(payload) {
  if (payload && typeof payload === 'object' && payload.state && typeof payload.state === 'object') {
    return payload.state
  }
  return payload && typeof payload === 'object' ? payload : {}
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function ensureColumn(db, table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all().map((entry) => entry.name)
  if (!columns.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

// ---------------------------------------------------------------------------
// Event-log recovery (pure — no database needed).
//
// Folds the typed events written to progress-log.ndjson back into a per-card
// progress projection. This is the "rebuild progress from the log" recovery path.
// ---------------------------------------------------------------------------

// Domains the current SQLite schema has no table or column for. Each one is a
// hard blocker on making SQLite authoritative: exporting the projection back to
// application state would silently drop them, so JSON stays the source of truth
// until they are modelled. tests/sqliteParity.test.mjs asserts this list is
// exactly what a round trip loses — it cannot be quietly shortened.
export const SQLITE_PARITY_EXCLUSIONS = [
  {
    domain: 'dayLogs',
    detail: 'Schedule and Review Done/Skipped block outcomes. No table exists.',
    blocksAuthority: true,
  },
  {
    domain: 'focusSessions',
    detail: 'Per-card focus session history. No table exists; only aggregate hours survive.',
    blocksAuthority: true,
  },
  {
    domain: 'snapshots',
    detail: 'Daily aggregate history behind the progress curves. No table exists.',
    blocksAuthority: true,
  },
  {
    domain: 'activity',
    detail: 'Per-card activity trail, which completionDay() reads to date completions.',
    blocksAuthority: true,
  },
  {
    domain: 'uploadedResources',
    detail: 'Uploaded resource metadata is not projected into the resources table.',
    blocksAuthority: true,
  },
  {
    domain: 'recentResourceIds',
    detail: 'Recently opened resource ordering. No column exists.',
    blocksAuthority: false,
  },
  {
    domain: 'userTags',
    detail: 'User-added card tags. No column exists.',
    blocksAuthority: true,
  },
  {
    domain: 'hiddenResourceIds',
    detail: 'Read on projection to filter links, but never stored, so it cannot be exported back.',
    blocksAuthority: true,
  },
  {
    domain: 'evidence attachments',
    detail: 'card_evidence stores id/text/created_at only; attachment url and fileName are dropped.',
    blocksAuthority: true,
  },
  {
    domain: 'card edits',
    detail:
      'card_progress holds status/done/actual_hours only. Edited title, dates, phase, priority, slot and estimated hours on catalogue cards are not projected.',
    blocksAuthority: true,
  },
]

export function rebuildProgressFromEvents(events = []) {
  const cards = new Map()

  const blankProgress = (cardId) => ({
    cardId,
    title: '',
    moduleGroup: '',
    status: null,
    done: false,
    actualHours: 0,
    progressPercent: 0,
    checklist: new Map(),
    notes: new Map(),
    evidence: new Map(),
    resourceIds: new Set(),
    lastEventAt: null,
  })

  const ensure = (cardId) => {
    if (!cards.has(cardId)) cards.set(cardId, blankProgress(cardId))
    return cards.get(cardId)
  }

  const ordered = [...events].sort((a, b) =>
    String(a?.occurredAt ?? '').localeCompare(String(b?.occurredAt ?? '')),
  )

  for (const event of ordered) {
    if (!event || event.entityType !== 'card' || !event.entityId) continue
    const card = ensure(event.entityId)
    const payload = plainObject(event.payload)
    if (payload.cardTitle) card.title = String(payload.cardTitle)
    if (payload.moduleGroup) card.moduleGroup = String(payload.moduleGroup)
    card.lastEventAt = event.occurredAt ?? card.lastEventAt

    switch (event.eventType) {
      case 'card.done_changed':
        card.done = Boolean(payload.done)
        if (payload.status) card.status = String(payload.status)
        break
      case 'card.status_changed':
        if (payload.status) card.status = String(payload.status)
        if (payload.done !== undefined) card.done = Boolean(payload.done)
        else if (payload.status) card.done = payload.status === 'Done'
        break
      case 'card.rescheduled':
        if (payload.status) card.status = String(payload.status)
        break
      case 'checklist_item.toggled':
      case 'checklist_item.added':
      case 'checklist_item.edited':
        if (payload.itemId) {
          const existing = card.checklist.get(payload.itemId) ?? { id: payload.itemId, text: '', done: false }
          if (payload.text) existing.text = String(payload.text)
          if (event.eventType === 'checklist_item.toggled') existing.done = Boolean(payload.done)
          card.checklist.set(payload.itemId, existing)
        }
        break
      case 'checklist_item.deleted':
        if (payload.itemId) card.checklist.delete(payload.itemId)
        break
      case 'hours.logged':
        card.actualHours = Number(payload.hours ?? card.actualHours) || 0
        break
      case 'card.progress_logged':
        card.progressPercent = Math.min(100, Math.max(0, Math.round(Number(payload.progressPercent) || 0)))
        break
      case 'focus_session.completed':
        card.actualHours = Number(payload.hoursAfter ?? card.actualHours) || 0
        break
      case 'evidence.added':
      case 'evidence.edited':
        if (payload.evidenceId) {
          card.evidence.set(payload.evidenceId, { id: payload.evidenceId, text: text(payload.text) })
        }
        break
      case 'evidence.deleted':
        if (payload.evidenceId) card.evidence.delete(payload.evidenceId)
        break
      case 'note.added':
      case 'note.edited':
        if (payload.noteId) {
          card.notes.set(payload.noteId, { id: payload.noteId, text: text(payload.text) })
        }
        break
      case 'note.deleted':
        if (payload.noteId) card.notes.delete(payload.noteId)
        break
      case 'resource.linked':
        if (payload.resourceId) card.resourceIds.add(String(payload.resourceId))
        break
      case 'resource.unlinked':
        if (payload.resourceId) card.resourceIds.delete(String(payload.resourceId))
        break
      // Clearing a card's progress is a real, replayable fact: drop everything
      // the log has accumulated for it while keeping its identity, so a later
      // overlay falls back to the catalogue rather than resurrecting old work.
      case 'card.progress_reset': {
        const fresh = blankProgress(card.cardId)
        fresh.title = card.title
        fresh.moduleGroup = card.moduleGroup
        fresh.lastEventAt = card.lastEventAt
        cards.set(event.entityId, fresh)
        break
      }
      default:
        break
    }
  }

  return [...cards.values()].map((card) => ({
    cardId: card.cardId,
    title: card.title,
    moduleGroup: card.moduleGroup,
    status: card.status,
    done: card.done,
    actualHours: card.actualHours,
    progressPercent: card.done ? 100 : card.progressPercent,
    lastEventAt: card.lastEventAt,
    checklist: [...card.checklist.values()],
    notes: [...card.notes.values()],
    evidence: [...card.evidence.values()],
    resourceIds: [...card.resourceIds],
  }))
}

// ---------------------------------------------------------------------------
// Database handle
// ---------------------------------------------------------------------------

export function openTrackerDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec(SCHEMA_SQL)
  ensureColumn(db, 'card_progress', 'progress_percent', 'INTEGER NOT NULL DEFAULT 0')
  ensureColumn(db, 'resource_reviewed', 'progress_percent', 'INTEGER NOT NULL DEFAULT 0')
  ensureColumn(db, 'resource_reviewed', 'understanding_percent', 'INTEGER NOT NULL DEFAULT 0')
  ensureColumn(db, 'resource_reviewed', 'note', "TEXT NOT NULL DEFAULT ''")
  db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(
    'schema_version',
    String(SCHEMA_VERSION),
  )

  function transaction(run) {
    db.exec('BEGIN')
    try {
      const result = run()
      db.exec('COMMIT')
      return result
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }

  const api = {
    db,

    close() {
      db.close()
    },

    getSchemaVersion() {
      const row = db.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version')
      return row ? Number(row.value) : 0
    },

    counts() {
      const result = {}
      for (const table of COUNT_TABLES) {
        const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()
        result[table] = Number(row?.n ?? 0)
      }
      return result
    },

    // Seed the durable catalog: modules, phases, and the base card list.
    seedCatalog({ modules = [], phases = [], cards = [] } = {}) {
      return transaction(() => {
        // The source card list is authoritative for non-custom cards. Remove
        // obsolete catalogue rows from an earlier campaign revision while
        // preserving cards created by the user in the app.
        const incomingCardIds = new Set(cards.map((card) => text(card?.id)).filter(Boolean))
        const obsoleteCardIds = db
          .prepare('SELECT id FROM cards WHERE custom = 0')
          .all()
          .map((row) => text(row.id))
          .filter((id) => !incomingCardIds.has(id))
        if (obsoleteCardIds.length > 0) {
          const dependentTables = ['card_progress', 'checklist_items', 'card_notes', 'card_evidence', 'card_resources']
          const dependentDeletes = dependentTables.map((table) => db.prepare(`DELETE FROM ${table} WHERE card_id = ?`))
          const notificationDelete = db.prepare('DELETE FROM notifications WHERE card_id = ?')
          const cardDelete = db.prepare('DELETE FROM cards WHERE id = ?')
          for (const cardId of obsoleteCardIds) {
            dependentDeletes.forEach((statement) => statement.run(cardId))
            notificationDelete.run(cardId)
            cardDelete.run(cardId)
          }
        }

        const moduleStmt = db.prepare(
          `INSERT INTO modules (id, name, module_group, code, active, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name,
             module_group = excluded.module_group,
             code = excluded.code,
             active = excluded.active,
             sort_order = excluded.sort_order`,
        )
        modules.forEach((module, index) => {
          moduleStmt.run(
            text(module.id || module.moduleGroup || `module-${index}`),
            text(module.name || module.label || module.title || module.moduleGroup),
            orNull(module.moduleGroup ?? module.name),
            orNull(module.code),
            toInt(module.active ?? true),
            Number(module.sortOrder ?? index),
          )
        })

        const phaseStmt = db.prepare(
          `INSERT INTO phases (id, name, sort_order)
           VALUES (?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, sort_order = excluded.sort_order`,
        )
        phases.forEach((phase, index) => {
          const id = typeof phase === 'string' ? phase : text(phase.id || phase.name)
          const name = typeof phase === 'string' ? phase : text(phase.name || phase.id)
          phaseStmt.run(id, name, Number(typeof phase === 'string' ? index : phase.sortOrder ?? index))
        })

        const cardStmt = db.prepare(
          `INSERT INTO cards (id, number, title, module_group, phase, priority, base_status, estimated_hours, due_date, start_date, custom, sort_order, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             number = excluded.number,
             title = excluded.title,
             module_group = excluded.module_group,
             phase = excluded.phase,
             priority = excluded.priority,
             base_status = excluded.base_status,
             estimated_hours = excluded.estimated_hours,
             due_date = excluded.due_date,
             start_date = excluded.start_date,
             custom = excluded.custom,
             sort_order = excluded.sort_order,
             source = excluded.source`,
        )
        const checklistStmt = db.prepare(
          `INSERT INTO checklist_items (id, card_id, text, done, position)
           VALUES (?, ?, ?, 0, ?)
           ON CONFLICT(id) DO UPDATE SET
             card_id = excluded.card_id,
             text = CASE WHEN excluded.text != '' THEN excluded.text ELSE checklist_items.text END,
             position = excluded.position`,
        )
        cards.forEach((card, index) => {
          cardStmt.run(
            text(card.id),
            orNull(card.number != null ? String(card.number) : null),
            text(card.title),
            orNull(card.moduleGroup ?? card.module),
            orNull(card.phase),
            orNull(card.priority),
            orNull(card.status),
            Number(card.estimatedHours ?? 0) || 0,
            orNull(card.dueDate),
            orNull(card.startDate),
            toInt(card.custom),
            Number(card.sortOrder ?? index),
            orNull(card.sourceList ?? 'baseCards'),
          )
          const checklist = Array.isArray(card.checklist) ? card.checklist : []
          checklist.forEach((item, position) => {
            const itemText = typeof item === 'string' ? item : text(item?.text)
            const itemId = typeof item === 'string' ? `${card.id}-check-${position}` : text(item?.id || `${card.id}-check-${position}`)
            checklistStmt.run(itemId, text(card.id), itemText, position)
          })
        })

        return api.counts()
      })
    },

    // Export the projection back into the canonical application-state shape.
    //
    // This is gate 2 of the SQLite authority migration: without a round trip
    // there is no way to test parity, and without parity there is no honest way
    // to move authority off JSON. It reads only what the schema actually holds.
    // The domains the schema cannot represent are listed in
    // SQLITE_PARITY_EXCLUSIONS and are the reason authority has not moved.
    exportState() {
      const rows = (sql) => db.prepare(sql).all()
      const cards = {}

      const ensureCard = (cardId) => {
        if (!cards[cardId]) cards[cardId] = {}
        return cards[cardId]
      }

      for (const row of rows('SELECT card_id, status, done, actual_hours, progress_percent, updated_at FROM card_progress')) {
        const card = ensureCard(row.card_id)
        card.status = row.status ?? undefined
        card.done = Boolean(row.done)
        card.actualHours = Number(row.actual_hours) || 0
        card.progressPercent = card.done ? 100 : Math.min(100, Math.max(0, Number(row.progress_percent) || 0))
        if (row.updated_at) card.updatedAt = row.updated_at
      }

      // Checklist state is keyed by item id in the JSON shape.
      for (const row of rows('SELECT id, card_id, text, done, position FROM checklist_items ORDER BY card_id, position')) {
        const card = ensureCard(row.card_id)
        card.checklist = card.checklist ?? {}
        card.checklist[row.id] = Boolean(row.done)
      }

      for (const row of rows('SELECT id, card_id, text, created_at FROM card_notes ORDER BY card_id, created_at')) {
        const card = ensureCard(row.card_id)
        card.notes = card.notes ?? []
        card.notes.push({ id: row.id, text: row.text, at: row.created_at ?? '' })
      }

      for (const row of rows('SELECT id, card_id, text, created_at FROM card_evidence ORDER BY card_id, created_at')) {
        const card = ensureCard(row.card_id)
        card.evidenceEntries = card.evidenceEntries ?? []
        card.evidenceEntries.push({ id: row.id, text: row.text, at: row.created_at ?? '' })
      }

      for (const row of rows('SELECT card_id, resource_id FROM card_resources ORDER BY card_id, resource_id')) {
        const card = ensureCard(row.card_id)
        card.resourceIds = card.resourceIds ?? []
        card.resourceIds.push(row.resource_id)
      }

      const addedCards = rows(
        `SELECT id, number, title, module_group AS moduleGroup, phase, priority, base_status AS status,
                estimated_hours AS estimatedHours, due_date AS dueDate, start_date AS startDate, sort_order AS sortOrder
         FROM cards WHERE custom = 1 ORDER BY sort_order`,
      ).map((row) => ({ ...row, module: row.moduleGroup, custom: true }))

      const moduleNotes = {}
      for (const row of rows('SELECT module_id, note FROM module_notes')) moduleNotes[row.module_id] = row.note

      const parseJson = (value, fallback) => {
        try {
          return JSON.parse(value)
        } catch {
          return fallback
        }
      }

      const knowledge = { notes: {}, meta: {} }
      for (const row of rows(
        `SELECT id, module_id, title, kind, topic, body, tags, card_ids, created_at, updated_at
         FROM knowledge_notes`,
      )) {
        knowledge.notes[row.id] = {
          id: row.id,
          moduleId: row.module_id,
          title: row.title ?? '',
          kind: row.kind ?? 'concept',
          topic: row.topic ?? '',
          body: row.body ?? '',
          tags: parseJson(row.tags, []),
          cardIds: parseJson(row.card_ids, []),
          createdAt: row.created_at ?? '',
          updatedAt: row.updated_at ?? '',
          seeded: false,
        }
      }
      for (const row of rows(
        'SELECT note_id, starred, hidden, last_reviewed_at, review_count, confidence, quiz FROM knowledge_meta',
      )) {
        knowledge.meta[row.note_id] = {
          starred: Boolean(row.starred),
          hidden: Boolean(row.hidden),
          lastReviewedAt: row.last_reviewed_at ?? null,
          reviewCount: Number(row.review_count) || 0,
          confidence: row.confidence ?? null,
          quiz: parseJson(row.quiz, {}),
        }
      }

      const notifications = {}
      for (const row of rows('SELECT id, card_id, kind, title, body, read, created_at FROM notifications')) {
        notifications[row.id] = {
          id: row.id,
          cardId: row.card_id ?? undefined,
          type: row.kind ?? undefined,
          title: row.title ?? '',
          detail: row.body ?? '',
          read: Boolean(row.read),
          createdAt: row.created_at ?? '',
        }
      }

      const resourceProgress = {}
      for (const row of rows('SELECT resource_id, reviewed, progress_percent, understanding_percent, note, updated_at FROM resource_reviewed')) {
        resourceProgress[row.resource_id] = {
          progressPercent: Math.min(100, Math.max(0, Number(row.progress_percent) || (row.reviewed ? 100 : 0))),
          understandingPercent: Math.min(100, Math.max(0, Number(row.understanding_percent) || 0)),
          note: row.note ?? '',
          updatedAt: row.updated_at ?? '',
        }
      }

      const settings = {}
      let focusRewards = null
      for (const row of rows('SELECT key, value FROM settings')) {
        let parsed
        try {
          parsed = JSON.parse(row.value)
        } catch {
          // A legacy row written before values were JSON-encoded.
          parsed = row.value
        }
        if (row.key === 'focusRewards') focusRewards = parsed
        else settings[row.key] = parsed
      }

      return { cards, addedCards, moduleNotes, knowledge, notifications, resourceProgress, settings, focusRewards }
    },

    // Mirror the live JSON tracker state into the database.
    projectState(payload) {
      const state = unwrapState(payload)
      const cardsState = plainObject(state.cards)
      const addedCards = Array.isArray(state.addedCards) ? state.addedCards : []

      return transaction(() => {
        // Custom cards created in-app become part of the durable card catalog.
        const cardStmt = db.prepare(
          `INSERT INTO cards (id, number, title, module_group, phase, priority, base_status, estimated_hours, due_date, start_date, custom, sort_order, source)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'added-in-app')
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             module_group = excluded.module_group,
             phase = excluded.phase,
             priority = excluded.priority,
             base_status = excluded.base_status,
             estimated_hours = excluded.estimated_hours,
             due_date = excluded.due_date,
             start_date = excluded.start_date,
             custom = 1`,
        )
        addedCards.forEach((card, index) => {
          cardStmt.run(
            text(card.id),
            orNull(card.number != null ? String(card.number) : null),
            text(card.title),
            orNull(card.moduleGroup ?? card.module),
            orNull(card.phase),
            orNull(card.priority),
            orNull(card.status),
            Number(card.estimatedHours ?? 0) || 0,
            orNull(card.dueDate),
            orNull(card.startDate),
            Number(card.sortOrder ?? 1000 + index),
          )
        })

        const progressStmt = db.prepare(
          `INSERT INTO card_progress (card_id, status, done, actual_hours, progress_percent, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(card_id) DO UPDATE SET
             status = excluded.status,
             done = excluded.done,
             actual_hours = excluded.actual_hours,
             progress_percent = excluded.progress_percent,
             updated_at = excluded.updated_at`,
        )
        const checklistUpsert = db.prepare(
          `INSERT INTO checklist_items (id, card_id, text, done, position)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             done = excluded.done,
             text = CASE WHEN excluded.text != '' THEN excluded.text ELSE checklist_items.text END`,
        )
        const deleteNotes = db.prepare('DELETE FROM card_notes WHERE card_id = ?')
        const insertNote = db.prepare(
          'INSERT INTO card_notes (id, card_id, text, created_at) VALUES (?, ?, ?, ?)',
        )
        const deleteEvidence = db.prepare('DELETE FROM card_evidence WHERE card_id = ?')
        const insertEvidence = db.prepare(
          'INSERT INTO card_evidence (id, card_id, text, created_at) VALUES (?, ?, ?, ?)',
        )
        const deleteCardResources = db.prepare('DELETE FROM card_resources WHERE card_id = ?')
        const insertCardResource = db.prepare(
          'INSERT INTO card_resources (card_id, resource_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
        )

        for (const [cardId, cardState] of Object.entries(cardsState)) {
          const entry = plainObject(cardState)
          const status = entry.status ?? entry.edits?.status ?? null
          const done = Boolean(entry.done || status === 'Done')
          progressStmt.run(
            cardId,
            orNull(status),
            toInt(done),
            Number(entry.actualHours ?? 0) || 0,
            Math.min(100, Math.max(0, Number(entry.progressPercent) || (done ? 100 : 0))),
            orNull(entry.updatedAt),
          )

          const editChecklist = Array.isArray(entry.edits?.checklist) ? entry.edits.checklist : []
          const textById = new Map(editChecklist.map((item, index) => [text(item?.id || `${cardId}-check-${index}`), text(item?.text)]))
          const doneMap = plainObject(entry.checklist)
          const ids = new Set([...Object.keys(doneMap), ...textById.keys()])
          let position = 0
          for (const itemId of ids) {
            checklistUpsert.run(itemId, cardId, textById.get(itemId) ?? '', toInt(doneMap[itemId]), position)
            position += 1
          }

          deleteNotes.run(cardId)
          const notes = Array.isArray(entry.notes) ? entry.notes : []
          notes.forEach((note, index) => {
            insertNote.run(text(note?.id || `${cardId}-note-${index}`), cardId, text(note?.text), orNull(note?.at))
          })

          deleteEvidence.run(cardId)
          const evidence = Array.isArray(entry.evidenceEntries) ? entry.evidenceEntries : []
          evidence.forEach((item, index) => {
            insertEvidence.run(text(item?.id || `${cardId}-evidence-${index}`), cardId, text(item?.text), orNull(item?.at))
          })

          deleteCardResources.run(cardId)
          const resourceIds = Array.isArray(entry.resourceIds) ? entry.resourceIds : []
          const hidden = new Set(Array.isArray(entry.hiddenResourceIds) ? entry.hiddenResourceIds : [])
          for (const resourceId of resourceIds) {
            if (!hidden.has(resourceId)) insertCardResource.run(cardId, String(resourceId))
          }
        }

        // Global entities: full replace for a clean projection.
        db.exec('DELETE FROM module_notes')
        const moduleNoteStmt = db.prepare(
          'INSERT INTO module_notes (module_id, note, updated_at) VALUES (?, ?, ?)',
        )
        for (const [moduleId, note] of Object.entries(plainObject(state.moduleNotes))) {
          if (String(note ?? '').trim()) moduleNoteStmt.run(moduleId, text(note), orNull(state.updatedAt))
        }

        const knowledge = plainObject(state.knowledge)
        db.exec('DELETE FROM knowledge_notes')
        const knowledgeNoteStmt = db.prepare(
          `INSERT INTO knowledge_notes (id, module_id, title, kind, topic, body, tags, card_ids, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        for (const [noteId, note] of Object.entries(plainObject(knowledge.notes))) {
          const entry = plainObject(note)
          knowledgeNoteStmt.run(
            text(entry.id || noteId),
            text(entry.moduleId),
            text(entry.title),
            text(entry.kind || 'concept'),
            text(entry.topic),
            text(entry.body),
            JSON.stringify(Array.isArray(entry.tags) ? entry.tags : []),
            JSON.stringify(Array.isArray(entry.cardIds) ? entry.cardIds : []),
            orNull(entry.createdAt),
            orNull(entry.updatedAt),
          )
        }

        db.exec('DELETE FROM knowledge_meta')
        const knowledgeMetaStmt = db.prepare(
          `INSERT INTO knowledge_meta (note_id, starred, hidden, last_reviewed_at, review_count, confidence, quiz)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        for (const [noteId, meta] of Object.entries(plainObject(knowledge.meta))) {
          const entry = plainObject(meta)
          knowledgeMetaStmt.run(
            text(noteId),
            entry.starred ? 1 : 0,
            entry.hidden ? 1 : 0,
            orNull(entry.lastReviewedAt),
            Number(entry.reviewCount) || 0,
            orNull(entry.confidence),
            JSON.stringify(plainObject(entry.quiz)),
          )
        }

        db.exec('DELETE FROM settings')
        const settingStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
        for (const [key, value] of Object.entries(plainObject(state.settings))) {
          settingStmt.run(key, JSON.stringify(value ?? null))
        }
        if (state.focusRewards && typeof state.focusRewards === 'object') {
          settingStmt.run('focusRewards', JSON.stringify(state.focusRewards))
        }

        db.exec('DELETE FROM notifications')
        const notificationStmt = db.prepare(
          'INSERT INTO notifications (id, card_id, kind, title, body, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )
        for (const record of Object.values(plainObject(state.notifications))) {
          if (!record?.id) continue
          notificationStmt.run(
            text(record.id),
            orNull(record.cardId),
            orNull(record.kind ?? record.type),
            orNull(record.title),
            orNull(record.body ?? record.message),
            toInt(record.read),
            orNull(record.createdAt),
          )
        }

        db.exec('DELETE FROM resources')
        const resourceStmt = db.prepare(
          `INSERT INTO resources (id, module_id, module_key, module_group, grp, title, path, type, viewer, url, description, tags, priority, uploaded_at, size, local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        for (const resource of Array.isArray(state.uploadedResources) ? state.uploadedResources : []) {
          if (!resource?.id) continue
          resourceStmt.run(
            text(resource.id),
            orNull(resource.moduleId),
            orNull(resource.moduleKey),
            orNull(resource.moduleGroup),
            orNull(resource.group),
            orNull(resource.title),
            orNull(resource.path),
            orNull(resource.type),
            orNull(resource.viewer),
            orNull(resource.url),
            orNull(resource.description),
            JSON.stringify(Array.isArray(resource.tags) ? resource.tags : []),
            orNull(resource.priority),
            orNull(resource.uploadedAt),
            Number(resource.size ?? 0) || 0,
            toInt(resource.local ?? true),
          )
        }

        db.exec('DELETE FROM resource_reviewed')
        const reviewedStmt = db.prepare(
          'INSERT INTO resource_reviewed (resource_id, reviewed, progress_percent, understanding_percent, note, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        for (const [resourceId, value] of Object.entries(plainObject(state.resourceProgress))) {
          const progress = normaliseResourceProgressEntry(value)
          reviewedStmt.run(
            resourceId,
            toInt(progress.progressPercent >= 100),
            progress.progressPercent,
            progress.understandingPercent,
            progress.note,
            orNull(progress.updatedAt || state.updatedAt),
          )
        }

        return api.counts()
      })
    },

    // Recovery: overlay the reconstructed event-log progress onto the seeded
    // catalog and return a per-card view. Read-only — does not mutate the DB.
    recover(events = []) {
      const rebuilt = rebuildProgressFromEvents(events)
      const byId = new Map(rebuilt.map((card) => [card.cardId, card]))
      const catalog = db.prepare('SELECT id, title, module_group AS moduleGroup, base_status AS baseStatus FROM cards').all()

      const cards = catalog.map((base) => {
        const replay = byId.get(base.id)
        byId.delete(base.id)
        return {
          cardId: base.id,
          title: base.title,
          moduleGroup: base.moduleGroup,
          status: replay?.status ?? base.baseStatus ?? null,
          done: replay?.done ?? false,
          actualHours: replay?.actualHours ?? 0,
          progressPercent: replay?.done ? 100 : replay?.progressPercent ?? 0,
          fromEventLog: Boolean(replay),
          checklist: replay?.checklist ?? [],
          notes: replay?.notes ?? [],
          evidence: replay?.evidence ?? [],
          resourceIds: replay?.resourceIds ?? [],
        }
      })

      // Cards that only exist in the event log (e.g. custom cards not yet seeded).
      for (const replay of byId.values()) {
        cards.push({
          cardId: replay.cardId,
          title: replay.title,
          moduleGroup: replay.moduleGroup,
          status: replay.status,
          done: replay.done,
          actualHours: replay.actualHours,
          progressPercent: replay.done ? 100 : replay.progressPercent,
          fromEventLog: true,
          checklist: replay.checklist,
          notes: replay.notes,
          evidence: replay.evidence,
          resourceIds: replay.resourceIds,
        })
      }

      return {
        rebuiltCardCount: rebuilt.length,
        catalogCardCount: catalog.length,
        cards,
      }
    },
  }

  return api
}

export function inspectTrackerDb(dbPath) {
  if (!fs.existsSync(dbPath)) return { available: false, integrity: 'missing' }
  const db = new DatabaseSync(dbPath, { readOnly: true })
  try {
    const integrityRow = db.prepare('PRAGMA quick_check').get()
    const schemaRow = db.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version')
    const counts = {}
    for (const table of COUNT_TABLES) {
      const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()
      counts[table] = Number(row?.n ?? 0)
    }
    return {
      available: true,
      schemaVersion: Number(schemaRow?.value ?? 0),
      counts,
      integrity: String(integrityRow?.quick_check ?? 'unknown'),
    }
  } finally {
    db.close()
  }
}
