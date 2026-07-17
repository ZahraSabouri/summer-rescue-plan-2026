// Event-coverage matrix for the NDJSON progress log.
//
// This is the honest answer to "can the event log rebuild my state?". Today it
// cannot, and this file records exactly why, per mutation family, so that Data
// Health can say so specifically instead of hedging.
//
// The matrix is verified against the real emission sites by
// tests/eventCoverage.test.mjs: every declared eventType must exist in
// useTrackerState.js, every emitted eventType must be declared here, and every
// declared mutation must be exported by the hook. A new mutation that forgets an
// event therefore fails the suite rather than silently eroding recovery.
//
// Emission and replay are separate questions, and conflating them is how a log
// starts lying. `status` answers "is it written down?"; `replayed` answers "can
// rebuildProgressFromEvents actually reconstruct it?". An event can be a perfect
// audit record and still rebuild nothing — card.deleted is exactly that today.
//
// status:
//   covered - every mutation in the family emits an event
//   partial - some paths emit, others silently skip the log
//   missing - no event is emitted; replay cannot see this change at all
//
// replayed:
//   true  - rebuildProgressFromEvents reconstructs this family's final state
//   false - the event exists as history only; replay ignores or cannot apply it

export const EVENT_COVERAGE = [
  {
    family: 'Cards added',
    entity: 'cards',
    mutations: ['addCard'],
    events: ['card.added'],
    status: 'covered',
    replayed: false,
    identified: true,
    tombstoned: false,
    note: "Full card payload is written, but replay only restores identity, title and module; status, dates, priority and estimate have no column, so an added card comes back incomplete.",
  },
  {
    family: 'Cards deleted',
    entity: 'cards',
    mutations: ['deleteCard'],
    events: ['card.deleted'],
    status: 'covered',
    replayed: false,
    identified: true,
    tombstoned: true,
    note: 'Deletion is an explicit tombstone event, but rebuildProgressFromEvents has no case for it, so a replayed card comes back. Closing this needs a decision on whether deleting a catalogue card removes the card or only its progress.',
  },
  {
    family: 'Card progress reset',
    entity: 'cards',
    mutations: ['resetCardState'],
    events: ['card.progress_reset'],
    status: 'covered',
    replayed: true,
    identified: true,
    tombstoned: true,
    note: 'Emits a tombstone that replay honours by clearing the card’s accumulated progress.',
  },
  {
    family: 'Status changes',
    entity: 'cards',
    mutations: ['setStatus'],
    events: ['card.status_changed'],
    status: 'covered',
    replayed: true,
    identified: true,
    tombstoned: false,
    note: 'Carries the previous and next status.',
  },
  {
    family: 'Done changes',
    entity: 'cards',
    mutations: ['toggleDone'],
    events: ['card.done_changed'],
    status: 'covered',
    replayed: true,
    identified: true,
    tombstoned: false,
    note: 'The two historical completed records were written through this path.',
  },
  {
    family: 'Dates',
    entity: 'cards',
    mutations: ['rescheduleCard', 'rescheduleCards', 'applyReplanSchedule', 'updateCardDetails'],
    events: ['card.rescheduled', 'card.details_edited'],
    status: 'covered',
    replayed: false,
    identified: true,
    tombstoned: false,
    note: 'Single, bulk and re-plan rescheduling all emit card.rescheduled; detail edits emit the field diff. Replay restores the status a reschedule implies but has no date column, so the date itself is audit history only.',
  },
  {
    family: 'Phase',
    entity: 'cards',
    mutations: ['updateCardDetails'],
    events: ['card.details_edited'],
    status: 'covered',
    replayed: false,
    identified: true,
    tombstoned: false,
    note: 'Emitted by updateCardDetails as a field-level diff. Replay has no column for it, so it is audit history only.',
  },
  {
    family: 'Module and area',
    entity: 'cards',
    mutations: ['updateCardDetails'],
    events: ['card.details_edited'],
    status: 'covered',
    replayed: false,
    identified: true,
    tombstoned: false,
    note: 'Emitted by updateCardDetails as a field-level diff. Replay has no column for it, so it is audit history only.',
  },
  {
    family: 'Priority',
    entity: 'cards',
    mutations: ['updateCardDetails'],
    events: ['card.details_edited'],
    status: 'covered',
    replayed: false,
    identified: true,
    tombstoned: false,
    note: 'Emitted by updateCardDetails as a field-level diff. Replay has no column for it, so it is audit history only.',
  },
  {
    family: 'Slot',
    entity: 'cards',
    mutations: ['updateCardDetails'],
    events: ['card.details_edited'],
    status: 'covered',
    replayed: false,
    identified: true,
    tombstoned: false,
    note: 'Emitted by updateCardDetails as a field-level diff. Replay has no column for it, so it is audit history only.',
  },
  {
    family: 'Estimated hours',
    entity: 'cards',
    mutations: ['updateCardDetails'],
    events: ['card.details_edited'],
    status: 'covered',
    replayed: false,
    identified: true,
    tombstoned: false,
    note: 'Emitted by updateCardDetails as a field-level diff. Replay has no column for it, so it is audit history only.',
  },
  {
    family: 'Actual hours',
    entity: 'cards',
    mutations: ['setActualHours'],
    events: ['hours.logged'],
    status: 'covered',
    replayed: true,
    identified: true,
    tombstoned: false,
    note: 'Carries the absolute hour total, so replay is idempotent.',
  },
  {
    family: 'Card progress percentage',
    entity: 'cards',
    mutations: ['setCardProgress'],
    events: ['card.progress_logged'],
    status: 'covered',
    replayed: true,
    identified: true,
    tombstoned: false,
    note: 'Carries the absolute completion percentage, so replay is idempotent.',
  },
  {
    family: 'Checklist items',
    entity: 'card_checklist_items',
    mutations: ['toggleChecklistItem', 'addChecklistItem', 'updateChecklistItem', 'deleteChecklistItem'],
    events: [
      'checklist_item.toggled',
      'checklist_item.added',
      'checklist_item.edited',
      'checklist_item.deleted',
    ],
    status: 'covered',
    replayed: true,
    identified: true,
    tombstoned: true,
    note: 'All four mutations emit against a stable item id.',
  },
  {
    family: 'Evidence entries',
    entity: 'evidence_entries',
    mutations: ['addEvidence', 'updateEvidence', 'deleteEvidence', 'setEvidence'],
    events: ['evidence.added', 'evidence.edited', 'evidence.deleted'],
    status: 'covered',
    replayed: true,
    identified: true,
    tombstoned: true,
    note: 'Add, edit and delete all emit against a stable evidence id.',
  },
  {
    family: 'Evidence attachments',
    entity: 'evidence_entries',
    mutations: ['addEvidence'],
    events: ['evidence.added'],
    status: 'covered',
    replayed: false,
    identified: true,
    tombstoned: false,
    note: "Attachment url and fileName ride inside evidence.added, but replay keeps only id and text, so the attachment link is lost on rebuild.",
  },
  {
    family: 'Notes',
    entity: 'card_notes',
    mutations: ['addNote', 'updateNote', 'deleteNote'],
    events: ['note.added', 'note.edited', 'note.deleted'],
    status: 'covered',
    replayed: true,
    identified: true,
    tombstoned: true,
    note: 'Add, edit and delete all emit against a stable note id.',
  },
  {
    family: 'Card resource links',
    entity: 'card_resources',
    mutations: ['addCardResource', 'removeCardResource'],
    events: ['resource.linked', 'resource.unlinked'],
    status: 'covered',
    replayed: true,
    identified: true,
    tombstoned: true,
    note: 'Link and unlink both emit.',
  },
  {
    family: 'Focus sessions',
    entity: 'focus_sessions',
    mutations: ['addFocusSession'],
    events: ['focus_session.completed'],
    status: 'covered',
    replayed: true,
    identified: true,
    tombstoned: false,
    note: 'Completed focus blocks emit with their duration.',
  },
  {
    family: 'Focus rewards',
    entity: 'campaign_settings',
    mutations: ['updateSettings'],
    events: [],
    status: 'missing',
    replayed: false,
    identified: false,
    tombstoned: false,
    note: 'Points, levels, trees, streaks and guard mode live in settings and emit nothing.',
  },
  {
    family: 'Module notes',
    entity: 'card_notes',
    mutations: ['setModuleNote'],
    events: [],
    status: 'missing',
    replayed: false,
    identified: false,
    tombstoned: false,
    note: 'Module-level notes are JSON-only.',
  },
  {
    family: 'Notifications',
    entity: 'notifications',
    mutations: ['addNotifications', 'setNotificationRead', 'markAllNotificationsRead'],
    events: [],
    status: 'missing',
    replayed: false,
    identified: false,
    tombstoned: false,
    note: 'Read state and generated notices are JSON-only.',
  },
  {
    family: 'Day logs',
    entity: 'day_log_entries',
    mutations: ['updateSettings'],
    events: [],
    status: 'missing',
    replayed: false,
    identified: false,
    tombstoned: false,
    note: 'Schedule Done/Skipped outcomes are JSON-only; replay cannot rebuild a day log.',
  },
  {
    family: 'Uploaded resources',
    entity: 'resources',
    mutations: ['addUploadedResource', 'markResourceOpened', 'toggleResourceProgress', 'updateResourceProgress'],
    events: [],
    status: 'missing',
    replayed: false,
    identified: false,
    tombstoned: false,
    note: 'Upload metadata and review state are JSON-only; the files themselves live on disk.',
  },
  {
    family: 'Campaign settings',
    entity: 'campaign_settings',
    mutations: ['updateSettings'],
    events: [],
    status: 'missing',
    replayed: false,
    identified: false,
    tombstoned: false,
    note: 'Campaign window, theme and MAT700 policy are JSON-only.',
  },
  {
    family: 'Module exam dates',
    entity: 'campaign_settings',
    mutations: ['updateSettings'],
    events: [],
    status: 'missing',
    replayed: false,
    identified: false,
    tombstoned: false,
    note: 'Confirmed exam dates are JSON-only.',
  },
  {
    family: 'Whole-state import and reset',
    entity: 'cards',
    mutations: ['importTrackerState', 'resetTrackerState'],
    events: [],
    status: 'missing',
    replayed: false,
    identified: false,
    tombstoned: false,
    note: 'Bulk replacement of the entire state is invisible to the log.',
  },
]

export const COVERAGE_STATUSES = ['covered', 'partial', 'missing']

/**
 * Every eventType the matrix claims is emitted. Used by the drift test to prove
 * the matrix still matches useTrackerState.js.
 */
export function declaredEventTypes() {
  return [...new Set(EVENT_COVERAGE.flatMap((entry) => entry.events))].sort()
}

export function declaredMutations() {
  return [...new Set(EVENT_COVERAGE.flatMap((entry) => entry.mutations))].sort()
}

export function coverageSummary() {
  const counts = { covered: 0, partial: 0, missing: 0 }
  for (const entry of EVENT_COVERAGE) counts[entry.status] += 1
  const emissionGaps = EVENT_COVERAGE.filter((entry) => entry.status !== 'covered')
  const replayGaps = EVENT_COVERAGE.filter((entry) => !entry.replayed)
  return {
    families: EVENT_COVERAGE.length,
    ...counts,
    replayed: EVENT_COVERAGE.length - replayGaps.length,
    // Writing a change down is not the same as being able to rebuild from it.
    // Replay is safe only when every family both emits and replays; reporting
    // safety on emission alone is the precise failure this file guards against.
    replaySafe: emissionGaps.length === 0 && replayGaps.length === 0,
    missingFamilies: emissionGaps.map((entry) => entry.family),
    replayGapFamilies: replayGaps.map((entry) => entry.family),
    entities: [...new Set(EVENT_COVERAGE.map((entry) => entry.entity))].sort(),
  }
}
