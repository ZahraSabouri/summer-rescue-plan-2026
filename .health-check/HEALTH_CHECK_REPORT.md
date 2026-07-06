# Summer Rescue Plan App Health Check

Date: 2026-07-06

Scope: storage architecture, local persistence behavior, data model, resource/module workflow, UI/UX, build health, performance, maintainability, and staged repair plan.

## Executive Summary

The app is not broken at the basic build level. Lint passes, production build passes, and all referenced study assets verify. The main problems are architectural and UX-level:

- Persistence is a partial local-file solution, not a database-backed local app. It still starts from browser `localStorage` and can leak state between app copies served from the same browser origin.
- The local file API is implemented as a Vite dev/preview middleware, so it is not a durable backend yet.
- There is no SQLite database, no append-only task progress log, and no clean separation between durable entities such as modules/resources and progress events such as checklist toggles.
- Adding resources currently means linking existing static resources, not choosing files and copying them into a module directory.
- The card detail overlay can render under the sidebar because the sidebar has a higher z-index than the drawer overlay.
- The "Columns" board is structurally cramped: seven fixed min-width lanes, dense card controls inside each card, and repeated CSS overrides make the final layout hard to reason about.
- Styling is maintained through a single 5,798-line `App.css` with repeated distant definitions for key components. This is a major source of visual drift.

Recommended direction: keep JSON import/export and "Choose autosave file", but make a local Node API authoritative. Use SQLite for modules/cards/resources/settings and an append-only local log file for progress/card deltas. Browser storage should be downgraded to UI preferences and an optional workspace-keyed cache only.

## Verification Run

Commands run:

```text
npm.cmd run lint
npm.cmd run assets:verify
npm.cmd run build
npm.cmd ls --depth=0
```

Results:

- `npm.cmd run lint`: pass.
- `npm.cmd run assets:verify`: pass. 208/208 assets available, total asset size 131.1 MB.
- `npm.cmd run build`: pass.
- Build warning: generated JS chunk is 516.18 kB minified, slightly above Vite's 500 kB warning threshold.
- Dependencies are minimal: React, React DOM, Vite, ESLint tooling. No database package is installed.
- Local dev server worked at `http://127.0.0.1:5173/`.
- `GET /api/local-tracker-state` returned the existing local JSON state.
- Node runtime has built-in SQLite support via `node:sqlite`, so a first SQLite implementation can avoid adding a native dependency.

Screenshot limitation:

- I attempted a headless Chrome/Edge CDP screenshot pass, but both installed browsers exited immediately under remote debugging and direct screenshot mode produced no file. UI findings below are therefore based on source/CSS analysis plus successful build/runtime endpoint checks.

## Current Persistence Inventory

What exists:

- Vite middleware reads/writes `local-data/summer-rescue-tracker-state.json` at `vite.config.js:10`, `vite.config.js:27`, `vite.config.js:36`, `vite.config.js:53`, and `vite.config.js:57`.
- The browser client calls `/api/local-tracker-state` through `src/utils/localStateFile.js`.
- The main state hook mirrors all state to `localStorage["summer-rescue-tracker-state-v3"]` at `src/state/useTrackerState.js:9`, `src/state/useTrackerState.js:187`, and `src/state/useTrackerState.js:428`.
- File System Access autosave exists for Chromium browsers and stores the chosen handle in IndexedDB, not the actual app data, at `src/utils/fileBackup.js`.
- Rolling daily safety copies are browser-only `localStorage` snapshots at `src/utils/rollingBackup.js`.
- JSON export/import exists and is intentionally still useful.

Local state summary from `local-data/summer-rescue-tracker-state.json`:

```json
{
  "exportedAt": "2026-07-06T19:09:57.288Z",
  "version": 3,
  "changedCards": 1,
  "addedCards": 0,
  "notifications": 23,
  "snapshots": 1,
  "updatedAt": "2026-07-06T19:03:55.997Z"
}
```

Main storage problems:

1. Browser storage is still in the boot path.
   `useTrackerState` starts with `readStoredStateSnapshot()` and only then reads the local file. If the browser copy is newer than the local file, the browser copy wins. This can reintroduce the exact problem you described: app progress can follow the browser origin instead of the folder the app is running from.

2. The storage key is global to the browser origin.
   Any copy served from the same origin, for example `127.0.0.1:5173`, can use the same `summer-rescue-tracker-state-v3` browser key.

3. The local file is a whole-state JSON snapshot.
   Every progress change eventually rewrites the entire tracker state. That is simple, but it does not give you a clean event history, partial recovery, or separation between progress and structural edits.

4. The Vite plugin is not a real backend.
   It works under Vite dev/preview. It is not a standalone local app service, and it does not cover static hosting or opening built files directly.

5. Modules/resources/progress are mixed in one state object.
   Added cards, custom modules, custom phases, resource progress, notifications, settings, notes, evidence, and snapshots all share the same JSON state shape.

## Recommended Storage Architecture

Use a hybrid local persistence model:

```text
local-data/
  app.sqlite
  progress-log.ndjson
  snapshots/
    summer-rescue-tracker-state.latest.json
  resources/
    <module-id>/
      <uploaded files>
  instance.json
```

SQLite should store durable structure:

- modules
- phases
- cards
- checklist items
- resources
- card-resource links
- module notes
- settings
- notifications
- resource reviewed state

Append-only log should store progress/card deltas:

- card marked done/not done
- status changed
- checklist item toggled
- actual hours changed
- focus session added
- note added/edited/deleted
- evidence added/edited/deleted
- card resource linked/unlinked if we consider that card-level progress

Module/resource creation, deletion, rename, and uploaded file registration should go to SQLite, not the progress log.

Browser storage should only store:

- intro dismissed
- collapsed sidebar
- theme if desired
- last active view
- optional cache keyed by `local-data/instance.json`, not a global app key

Proposed first schema:

```sql
CREATE TABLE modules (
  id TEXT PRIMARY KEY,
  code TEXT,
  title TEXT NOT NULL,
  module_group TEXT NOT NULL,
  accent TEXT,
  hero_path TEXT,
  exam_shape TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE TABLE phases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE cards (
  id TEXT PRIMARY KEY,
  module_id TEXT,
  phase_id TEXT,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  slot_type TEXT,
  slot_label TEXT,
  start_date TEXT,
  due_date TEXT,
  estimated_hours REAL DEFAULT 0,
  description TEXT,
  evidence_requirement TEXT,
  done_condition TEXT,
  custom INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE TABLE checklist_items (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived_at TEXT
);

CREATE TABLE resources (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL,
  group_name TEXT,
  title TEXT NOT NULL,
  type TEXT,
  viewer TEXT,
  storage_path TEXT,
  original_name TEXT,
  description TEXT,
  tags_json TEXT,
  priority TEXT DEFAULT 'normal',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE TABLE card_resources (
  card_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (card_id, resource_id)
);

CREATE TABLE progress_events (
  id TEXT PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Even if `progress_events` is in SQLite, still mirror progress events to `progress-log.ndjson` so the folder contains a human-inspectable recovery trail.

## Resource and Module Workflow Gap

What exists now:

- Module/resource definitions are static code in `src/data/studyModules.js`.
- Resource URLs are derived from `public/study-assets/...` through `src/utils/resourceLinks.js`.
- `scripts/syncStudyAssets.mjs` copies known resources from known source folders into `public/study-assets`.
- Card details can link or unlink existing resources in `CardDetailDrawer.jsx`.
- Module workspaces can browse, search, open, and mark existing resources reviewed.

What does not exist:

- No "Add module" wizard with structured module fields.
- No backend endpoint to create a module folder.
- No file upload/copy workflow.
- No user-added resource database table.
- No persistent per-module upload directory.
- No validation around duplicate files, filename conflicts, large files, missing files, or deleted resources.

Recommended resource flow:

1. Add module:
   - title, code, module group, exam date, color/accent, optional hero image
   - backend creates module row and `local-data/resources/<module-id>/`

2. Add resource:
   - choose one or more files
   - choose module, group, tags, priority, description
   - backend copies files into `local-data/resources/<module-id>/`
   - backend inserts resource rows in SQLite
   - app serves file content through `/api/resources/:id/file`

3. Link resource to card:
   - choose from the database resources for that module
   - write the relationship to SQLite
   - optionally append a card-level event to `progress-log.ndjson`

This avoids relying on `public/` as user-writeable app data.

## UI/UX Findings

1. Card detail overlay can sit under the sidebar.
   CSS evidence: `.drawer-shell` uses `z-index: 20` at `src/App.css:752`, while `.app-sidebar` uses `z-index: 30` at `src/App.css:2542`. The card detail overlay is not portaled to a higher modal layer, so the sidebar can cover it.

2. Card detail is implemented as a drawer, then styled like a modal.
   `CardDetailDrawer.jsx` renders an `aside.detail-drawer`. The later CSS centers it, but the semantic and layering model is still a drawer. This should become a real modal dialog rendered through `createPortal(document.body)`.

3. The modal has no focus trap or background inerting.
   Escape closes it, but keyboard focus can still move behind it. This is a usability and accessibility problem.

4. Completed checklist items do not get a clear line-through style.
   State exists for checklist done toggles, but CSS search found no line-through or checked-state visual for `.checklist-edit-row` / `.checklist-text-button`.

5. The Columns board is cramped by design.
   `BoardView` renders seven status columns. CSS uses `grid-template-columns: repeat(7, minmax(260px, 1fr))`, so the board wants at least 1,820px before gaps. On normal laptop widths this becomes a horizontal-scroll view with dense controls inside each card.

6. Card controls are too heavy for compact board cards.
   Each card includes done toggle, status select, hours input, start button, and details button. In columns this creates visual clutter and inconsistent heights. The board should show only key card info and one/two quick actions; detailed editing belongs in the modal.

7. CSS is too large and repeatedly overrides itself.
   `src/App.css` has 5,798 lines. Key selectors are defined multiple times across the file:
   - `.work-card`
   - `.board-column`
   - `.study-resource-card`
   - `.resource-browser`
   - `.module-layout`
   - `.card-detail-shell`

8. The resource reader has a better layering model than the card detail modal.
   `ResourceReader` uses `createPortal` and `.reader-shell` has `z-index: 70`. The card modal should use the same modal-layer approach.

9. Module workspaces are feature-rich but visually overloaded.
   The module pages combine hero, tabs, stats, progress, guidance, scratchpad, card lists, drills, resource browser, and reader. This should be split visually into a quieter workspace hierarchy.

10. Font scale is inconsistent.
   Several late CSS overrides shrink resource-card text and module headings. That explains the "some places too big, some too small" feeling.

## Functional Findings

- Add card exists.
- Custom module/custom phase names exist in Settings.
- Renaming a custom module updates cards using that module.
- Deleting a custom module only removes the option; cards using that module can become orphaned unless they are reassigned first.
- Import JSON has a preview and backs up current state before applying.
- Reset exports a JSON backup first.
- Resource linking exists, but resource uploading does not.
- Module notes exist.
- Resource reviewed tracking exists.
- Focus timer and focus-session hour logging exist.
- There is no test suite beyond lint/build.

## Performance and Maintainability

Current load pressure:

- 131.1 MB of study assets under `public/study-assets`.
- 516.18 kB minified JS bundle.
- A single large CSS file.
- Large static arrays for modules/resources/cards included in the client bundle.
- Resource viewers for Markdown, text, code, notebook, video, image, PDF/HTML are all in one component file.

Recommended performance work:

- Move resource metadata into SQLite/API so it is not all part of the client source bundle.
- Lazy-load heavy views: analytics, resource reader, module workspace, charts.
- Split CSS by feature area.
- Virtualize or paginate resource grids and long card lists if they grow.

## Repair Plan

### Phase 1: Immediate UI Fixes

Goal: make the existing app usable without changing storage yet.

Tasks:

- Convert card detail from drawer-layer to modal-layer using `createPortal`.
- Set modal overlay z-index above sidebar, settings, command palette, and below/above reader intentionally.
- Center the card modal with responsive max width and max height.
- Add focus trap, Escape close, and background inerting or equivalent.
- Add checklist checked styling: line-through, muted color, stable row height.
- Simplify board cards in Columns view.
- Make board lanes horizontally scroll in a deliberate container, or switch Columns to status tabs/segmented lanes on smaller screens.
- Consolidate repeated CSS for card, board, modal, module, and resource components.

### Phase 2: Local Backend Boundary

Goal: stop treating Vite config as the app backend.

Tasks:

- Extract the local file API out of `vite.config.js` into a reusable local server module.
- Keep Vite middleware during development, but make the API module standalone.
- Add `/api/health`, `/api/state`, `/api/events`, `/api/resources`, and `/api/files/:resourceId`.
- Keep JSON export/import unchanged at the UI level.
- Keep "Choose autosave file" as an optional extra snapshot target.

### Phase 3: SQLite Schema and Migration

Goal: make SQLite authoritative for durable structure.

Tasks:

- Create `local-data/app.sqlite` using `node:sqlite`.
- Add schema migrations.
- Seed from current `baseCards`, `studyModules`, and current JSON state.
- Import current `local-data/summer-rescue-tracker-state.json` into the database.
- Preserve the existing JSON shape for export compatibility.
- Add tests for migration and export equivalence.

### Phase 4: Append-Only Progress Log

Goal: track progress as local events, not only final state.

Tasks:

- Add `local-data/progress-log.ndjson`.
- On every card/progress mutation, write a SQLite event and append an NDJSON line.
- Rebuild current progress from database plus events.
- Add recovery command: replay log into a fresh database.
- Stop writing full JSON state on every small change; write snapshots periodically and on manual export/save.

### Phase 5: Module and Resource Management

Goal: support real module/resource creation and upload.

Tasks:

- Add structured Add Module dialog.
- Add module directory creation in backend.
- Add resource upload endpoint.
- Copy selected files into `local-data/resources/<module-id>/`.
- Register resources in SQLite with title/group/type/viewer/tags/priority.
- Update ModuleWorkspace and CardDetail resource pickers to read from API/database.
- Add conflict handling for duplicate filenames.

### Phase 6: Test and QA Layer

Goal: make future changes safer.

Tasks:

- Add unit tests for progress reducers and data normalization.
- Add API integration tests for SQLite and event log writes.
- Add UI smoke tests for Today, Columns, card modal, Settings, Add Card, Module resources, Import preview.
- Add visual checks for modal above sidebar and mobile board behavior.
- Add accessibility checks for modal focus, labels, and keyboard navigation.

## Proposed First Implementation Order

1. Fix card modal layering and checklist done visuals.
2. Clean Columns view enough that it is usable.
3. Extract local API from `vite.config.js`.
4. Add SQLite database with migrations.
5. Add progress event log.
6. Add resource upload and module directory workflow.
7. Move static resources/modules/cards progressively from source files into the database.

This order keeps risk controlled: first fix what you see every day, then change storage with migration safety, then add the richer module/resource workflow.

