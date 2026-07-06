# Summer Rescue Plan App Health Check

Date: 2026-07-06
Audit target: current workspace state after the latest app updates.

## Executive Summary

The app is healthier than the previous audit. Several important repairs have been started:

- The local API was extracted out of `vite.config.js` into `src/server/localTrackerApi.js`.
- `/api/health`, `/api/state`, and `/api/events` now exist and respond at runtime.
- `local-data/progress-log.ndjson` now exists.
- The state hook now lets the local state file win over browser `localStorage` once the local file loads.
- The card detail view now uses `createPortal`, adds background inerting, adds Escape handling, and loops Tab focus inside the modal.
- Checklist completed items now get a checked visual and line-through styling.
- The Columns view was simplified by removing status and hours controls from board cards.
- Applied ML now has linked YouTube/video study support and card-level video-plan enrichment.

The app is still not at the target architecture:

- There is still no SQLite database.
- The progress log is generic `state.updated` metadata, not a structured task/card delta log.
- Durable entities such as modules, resources, cards, and settings are still stored in JSON/source files, not database tables.
- Resource upload into per-module directories is still missing.
- Browser `localStorage` is still used for the full tracker mirror and rolling safety copies.
- The CSS remains append-only and hard to reason about: `src/App.css` is now 5,929 lines and still repeats core selectors.
- There are no automated UI/API/unit tests beyond lint/build checks.

One practical risk: `src/server/` is currently untracked by git. Since `vite.config.js` imports `./src/server/localTrackerApi.js`, the app depends on that untracked file.

## Verification Run

Commands run:

```text
npm.cmd run lint
npm.cmd run assets:verify
npm.cmd run build
npm.cmd ls --depth=0
```

Results:

- `npm.cmd run lint`: passed.
- `npm.cmd run assets:verify`: passed. 208/208 assets available. Total size: 131.1 MB.
- `npm.cmd run build`: passed.
- Production build output:
  - CSS: 93.11 kB minified, 16.87 kB gzip.
  - JS: 523.22 kB minified, 139.30 kB gzip.
- Vite still warns that a chunk is larger than 500 kB.
- Dependencies remain minimal: React, React DOM, Vite, ESLint tooling. No database package is installed.
- Node has built-in `node:sqlite` support available.

Runtime checks:

- `npm.cmd run dev -- --host 127.0.0.1` started on `http://127.0.0.1:5174/` because 5173 was already in use.
- `GET /api/health`: passed.
- `GET /api/state`: passed.
- `GET /api/events`: passed.
- `GET /`: passed.
- The audit Vite server was stopped after checks.

Screenshot limitation:

- Playwright is still not installed.
- A direct Chrome headless screenshot attempt exited without producing `.health-check/screenshots/current-board.png`.
- UI findings below are source/CSS based.

## Current Git/Workspace State

Current modified files:

```text
M src/App.css
M src/App.jsx
M src/components/CardDetailDrawer.jsx
M src/components/CardSummary.jsx
M src/components/TrackerViews.jsx
M src/state/useTrackerState.js
M src/utils/localStateFile.js
M vite.config.js
?? src/server/
```

Diff stat for tracked files:

```text
8 files changed, 346 insertions(+), 121 deletions(-)
```

The untracked `src/server/` folder is significant. If this change is committed or moved, include it, because Vite now imports it.

## Storage and Backend Audit

What improved:

- `vite.config.js` now delegates local persistence middleware to `localTrackerStatePlugin({ projectRoot })`.
- `src/server/localTrackerApi.js` centralizes the local API.
- `/api/state` is now the preferred state endpoint, while `/api/local-tracker-state` is retained for compatibility.
- `/api/health` reports storage paths and available endpoints.
- `/api/events` can append and read recent progress events.
- `src/utils/localStateFile.js` now has `appendLocalProgressEvent`.
- `useTrackerState` no longer lets a newer browser copy beat the local file after load. The file state is normalized and applied directly.

Current local data:

```json
{
  "stateFile": "local-data/summer-rescue-tracker-state.json",
  "progressLog": "local-data/progress-log.ndjson",
  "changedCards": 1,
  "addedCards": 0,
  "notifications": 23,
  "snapshots": 1,
  "saveHintDismissed": true
}
```

Current progress log example:

```json
{
  "entityType": "tracker",
  "entityId": "state",
  "eventType": "state.updated",
  "payload": {
    "changedCards": [],
    "changedSettings": ["saveHintDismissed"],
    "changedModuleNotes": [],
    "changedResourceProgress": [],
    "addedCardsChanged": false,
    "notificationsChanged": false
  }
}
```

Main remaining storage problems:

1. No SQLite database yet.
   The app still stores structural data in source files plus one JSON state file.

2. Progress log is not yet the desired log.
   It records generic whole-state diffs, not explicit events such as `checklist_item.toggled`, `card.done_changed`, `card.status_changed`, `hours.logged`, `evidence.added`, or `resource.linked`.

3. The progress log includes non-progress changes.
   Settings and notification changes can be logged. That is useful for debugging, but it does not match the requested "only task/card changes in the local log file" strategy.

4. There is no replay/recovery path.
   Events are appended, but the app cannot rebuild state from `progress-log.ndjson`.

5. Browser full-state mirror still exists.
   `useTrackerState` still writes the full state to `localStorage["summer-rescue-tracker-state-v3"]`. The local file wins when available, but browser storage remains a full backup/mirror.

6. First paint can still come from browser storage.
   The hook initializes from browser state, then reads the local file. This is better than before because the file overwrites it, but it can still briefly render old browser state.

7. `changedObjectKeys` uses `JSON.stringify` across objects on each state change.
   This is acceptable for now, but it can become expensive as card/resource state grows.

8. Backend request bodies are read fully into memory.
   Fine for tracker JSON today, but not suitable for future resource/file upload.

## Recommended Storage Target

Keep the hybrid strategy:

```text
local-data/
  app.sqlite
  progress-log.ndjson
  summer-rescue-tracker-state.json
  snapshots/
  resources/
    <module-id>/
```

SQLite should become authoritative for:

- modules
- phases
- cards
- checklist items
- resources
- card-resource links
- module notes
- settings
- resource reviewed state
- notifications, if still needed

`progress-log.ndjson` should store typed card/task events only:

- `card.done_changed`
- `card.status_changed`
- `checklist_item.toggled`
- `checklist_item.added`
- `checklist_item.edited`
- `checklist_item.deleted`
- `hours.logged`
- `focus_session.completed`
- `evidence.added`
- `evidence.edited`
- `evidence.deleted`
- `note.added`
- `note.edited`
- `note.deleted`
- `resource.linked`
- `resource.unlinked`

Module creation/removal/rename and uploaded file registration should go to SQLite, not the progress log.

## Resource and Module Workflow Audit

What exists:

- Static module/resource definitions remain in `src/data/studyModules.js`.
- Known resources are served from `public/study-assets`.
- `scripts/syncStudyAssets.mjs` verifies/copies known resources.
- Card details can link/unlink existing resources.
- Module pages can browse/search existing resources and mark them reviewed.
- Applied ML video resources were added as YouTube remote resources.
- `src/data/amlVideoPlan.js` enriches Applied ML cards with video support and checklist text.

What is still missing:

- No Add Module wizard with structured fields.
- No backend endpoint to create a module record.
- No backend endpoint to create a module resource folder.
- No file upload/copy API.
- No resource table.
- No per-module uploaded-file directory.
- No conflict handling for duplicate uploaded filenames.
- No UI to choose local files and copy them into `local-data/resources/<module-id>/`.

Important distinction:

- The update adds better linked/video resources.
- It does not implement the requested local upload workflow.

## UI/UX Audit

Fixed or improved:

1. Card modal layering is much better.
   `CardDetailDrawer.jsx` now uses `createPortal`, and late CSS raises `.card-detail-shell` to `z-index: 80`.

2. Focus handling improved.
   The card dialog now sets the app root inert, hides it from screen readers, locks body scroll, restores focus, handles Escape, and loops Tab inside the dialog.

3. Checklist done visual exists.
   `.checklist-edit-row.is-done .checklist-text-button` uses line-through styling.

4. Columns board is less dense.
   Board cards now use the new `board` prop, hiding status and hours inputs in board mode.

5. Board layout is more deliberate.
   Late CSS changes `.board-view` to horizontal flex lanes with scroll snapping and lane max heights.

Remaining UI/UX issues:

1. The modal still carries drawer naming and old drawer styles.
   It works as a modal now, but the component/class names and early CSS still say drawer. This increases future confusion.

2. CSS is still layered by overrides instead of ownership.
   The final health-check repair block fixes symptoms, but older `.drawer-shell`, `.card-detail-shell`, `.board-view`, `.board-column`, `.work-card`, `.study-resource-card`, and `.module-layout` rules still exist earlier.

3. Board cards are improved but still action-heavy.
   Board cards still show Done, Start, Details, and overdue reschedule actions. That may be fine, but it remains denser than a typical kanban lane.

4. Settings remains a drawer overlay with separate modal behavior.
   Card modal is now more robust than settings. The app should use one modal/overlay layer system.

5. Resource reader already has its own portal layer.
   Card modal, settings, command palette, import dialog, and reader should share explicit z-index tokens rather than scattered numeric values.

6. Visual verification was not automated.
   Without Playwright or a working screenshot command, modal layering and responsive board behavior were not pixel-verified.

## Documentation and Content Issues

README is now stale in places:

- It still says the state hook is "local file + localStorage", but does not mention `/api/health` or `/api/events`.
- It still frames persistence as Vite dev/preview writing one JSON file, not the new extracted local API module.
- It still says daily safety copies are in browser `localStorage`, which remains true, but should now be positioned as secondary.
- `src/data/baseCards.js` still says user progress lives in `localStorage`; that is now misleading.

Encoding/text:

- `src/components/ModuleWorkspace.jsx` contains a Unicode close glyph `✕`. This is not broken, but the codebase otherwise mostly uses ASCII. It is acceptable if intentional.

## Performance and Maintainability

Current size:

- `src/App.css`: 5,929 lines.
- Build CSS: 93.11 kB minified.
- Build JS: 523.22 kB minified.
- Study assets: 131.1 MB.

Risks:

- App CSS continues to grow through late override blocks.
- All major views and resource rendering logic are still in the main client bundle.
- Resource metadata and card data remain static imports.
- Manual Markdown/notebook/text viewers live inside `ModuleWorkspace.jsx`.
- There are no tests around the new API/event log behavior.

Recommended maintainability work:

- Split `App.css` by feature or introduce scoped component CSS modules.
- Move modal/overlay styles into a single layer system.
- Lazy-load heavy routes/views: analytics, module workspace, resource reader.
- Split resource viewer code into dedicated components.
- Add tests for `createLocalTrackerApi`, state import/export, and event-log writes.

## Functional Status Matrix

| Area | Status | Notes |
| --- | --- | --- |
| Lint | Pass | ESLint passes. |
| Build | Pass with warning | JS chunk exceeds 500 kB. |
| Asset verification | Pass | 208/208 available. |
| Local state file | Working | `/api/state` reads JSON state. |
| Health endpoint | Working | `/api/health` reports local paths. |
| Event log endpoint | Working | `/api/events` reads existing generic events. |
| SQLite | Missing | `node:sqlite` is available but unused. |
| Typed progress log | Partial | Generic `state.updated` only. |
| Resource upload | Missing | Static/link-only resources. |
| Card modal above sidebar | Likely fixed | Portal plus higher z-index. Not screenshot-verified. |
| Checklist line-through | Fixed | CSS and class present. |
| Board density | Improved | Board mode hides status/hours controls. |
| Test suite | Missing | No test script. |
| Docs | Stale | README and baseCards comment need update. |

## Recommended Next Steps

### Step 1: Stabilize the Current Fixes

- Add `src/server/localTrackerApi.js` to git if this is the intended implementation.
- Update README and stale comments to match `/api/state`, `/api/health`, `/api/events`, and `progress-log.ndjson`.
- Rename modal classes/components away from drawer terminology when touching that area next.
- Consolidate the late CSS repair block into the primary component sections.

### Step 2: Make the Progress Log Typed

- Replace generic `buildProgressEvent(previous, next)` with explicit events emitted by mutation functions.
- Start with:
  - `toggleDone`
  - `setStatus`
  - `toggleChecklistItem`
  - `setActualHours`
  - `addFocusSession`
  - evidence/note mutations
  - resource link/unlink
- Stop logging settings and notification changes to `progress-log.ndjson`.

### Step 3: Add SQLite

- Create `local-data/app.sqlite`.
- Add migration code using `node:sqlite`.
- Seed from `baseCards`, `studyModules`, and the current JSON state.
- Keep JSON export/import compatibility.
- Add a recovery path that can rebuild progress from the SQLite data plus `progress-log.ndjson`.

### Step 4: Add Module and Resource Upload

- Add backend file APIs with size limits and safe path handling.
- Add `local-data/resources/<module-id>/`.
- Add resource records to SQLite.
- Build a UI for selecting files, assigning module/group/tags/priority, and copying them into the module directory.
- Keep existing static resources working during migration.

### Step 5: Add Tests

- API tests for `/api/health`, `/api/state`, `/api/events`.
- State tests for local-file precedence over browser state.
- Event tests for typed log writes.
- UI smoke tests for card modal, board, settings, add card, import preview, and resource reader.
- Visual regression checks once Playwright or another browser runner is available.

## Bottom Line

The update fixed several visible problems and started the local-backend/event-log direction correctly. The next important work is not more UI patching. It is turning the event log into typed task/card events and introducing SQLite as the source of truth for durable app data.

