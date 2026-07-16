# Proposed architecture — purposeful sophistication

## Architecture decision

Summer Rescue is a specialist campaign operating system, not a minimal task list. Its breadth is intentional. The design goal is therefore **purposeful complexity**: preserve rich controls, specialist workspaces, multiple analytical projections, and dense dashboards while ensuring every element has a defined input, output, action, and relationship to shared state.

The application remains JSON-authoritative during the live campaign. SQLite is a queryable projection and the NDJSON log is audit history. A full storage-authority migration during the exam campaign would add more risk than value; the normalized SQLite target remains a post-campaign phase with explicit parity and rollback gates.

## Product operating loops

The system supports six connected loops:

1. **Orient:** inspect the current time boundary, capacity, deadlines, and active risks.
2. **Decide:** select a concrete output using priority, due dates, allocation targets, and readiness.
3. **Execute:** focus against a card, checklist, material, or protected timetable block.
4. **Evidence:** leave a verifiable output, log time, and close checklist conditions.
5. **Recover:** decide explicitly what happens to missed work through rescue triage or reviewed re-planning.
6. **Review:** compare plan, execution, evidence, capacity, and module readiness over time.

A feature is justified when it strengthens at least one loop and consumes or produces shared campaign data. The focus reward system is retained as a full optional execution layer: planting, levels, achievements, streaks, daily goals, and explicit Strict/Gentle guard policies make focus behavior visible and configurable.

## Information architecture

The full navigation remains directly available. Its four groups separate capability types instead of hiding them behind a reduced shell.

### Study

- **Today:** dense execution cockpit combining current/next boundaries, ranked outputs, the complete protected timetable, missed-work context, reviewed re-planning, focus forest/achievements, streak state, priority-allocation diagnostics, shipped work, and direct jumps to connected control views.
- **Study Hub:** campaign-wide command centre with metrics, all specialist module workspaces, bounded life areas, today/overdue queues, evidence and progress entry points.
- **Applied ML:** notebook-first labs, resource catalogue, module notes, planning queue, evidence, and module-specific readiness.
- **Time Series:** mathematical templates, formula/practice resources, planning queue, evidence, and readiness.
- **Team Project:** bounded CMT501 capacity and resources without replacing the dedicated project application.
- **Data Mining:** MAT700 tutorial-first recovery with an explicit active/paused policy control.

### Planning

- **Schedule:** authoritative hour-by-hour capacity boundary, routines, classes, travel, meals, project capacity, study blocks, and day-log actions.
- **Review:** retrospective comparison of intended blocks, actual outcomes, completed cards, time, and notes.
- **Planner:** forward operational dashboard for pace, workload, and near-term pipeline.
- **Progress:** longitudinal trajectory, burn-down, completion, logged effort, and readiness.
- **Analytics:** diagnostic charts, heatmaps, allocation mix, and patterns. It is not interchangeable with Progress: Progress answers “where am I?”, Analytics answers “why does the pattern look this way?”.

### Board

- **Columns:** status-flow manipulation and visual work-in-progress control.
- **Table:** dense bulk inspection/editing with 25-row pagination.
- **Week:** temporal seven-day queue.
- **Evidence:** output-focused review with 20-item pagination.

### Focus

- **Rescue Lane:** one-card-at-a-time exception decisions plus the explicit recovery queue.
- **Project Capacity:** bounded group-project workload.
- **Job Hunt:** bounded opportunity maintenance with a hard time ceiling.
- **Admin & Dates:** assessment logistics, date watch, and life administration.
- **Life, Health & Admin:** non-academic weekly routines and completed records, explicitly excluded from academic overdue pressure and exam re-planning.

### Focus toolset

- **Planting and forest:** completed focus blocks grow duration-sensitive trees; Strict-mode forfeits can wilt a tree.
- **Levels and points:** focused minutes award points, feed levels, and unlock achievements with celebration toasts.
- **Daily goal:** the target is adjustable and visualized as a progress ring.
- **Streak:** daily study continuity is visible on Today with grace-day state.
- **Strict guard:** leaving an active block forfeits the run without time/point credit and records a wilt.
- **Gentle guard:** leaving pauses the timer and preserves the run for explicit resumption.
- **Focus Room:** combines timer presets/custom durations, current card, finish/evidence conditions, checklist, resources, notes, schedule boundaries, restart cue, rewards, and guard policy.

The choice between Strict and Gentle belongs to the user. Neither mode is silently imposed by the planning engine.

## Purpose contract for dense modules

Every dashboard panel or module must define:

| Field | Requirement |
| --- | --- |
| Question | The decision the module helps the user make |
| Inputs | Shared state, schedule, resource, or derived metric consumed |
| Output | Card mutation, evidence, focus record, day log, navigation, or diagnostic produced |
| Dependency | Which other views immediately reflect that output |
| Empty state | What the user should conclude or do when no data exists |
| Scale strategy | Pagination, bounded queue, collapse state, or lazy loading for large content |

Complexity must be explainable and connected. Reward surfaces pass this contract when they respond to real focus behavior, preserve user choice, and remain synchronized; duplicate decoration and unbounded rendering do not.

## Current synchronization architecture

### Authoritative contract

```json
{
  "schemaVersion": 4,
  "revision": 42,
  "writtenAt": "...",
  "writerId": "...",
  "state": {}
}
```

- JSON is the live authoritative store.
- `GET /api/state` returns revision metadata and an ETag.
- `PUT /api/state` requires `If-Match` with the observed revision.
- A stale write receives `409` and cannot silently overwrite a newer tab.
- A semantically unchanged state produces no file rewrite.
- Successful writes invalidate other same-origin tabs through `BroadcastChannel`.
- A missing file plus valid browser state preserves and can promote the browser copy.
- SQLite is re-projected only after an accepted JSON commit.
- NDJSON is serialized, checksummed, idempotent audit history; it is not advertised as complete recovery.

### Shared domain propagation

| Change | Connected consumers |
| --- | --- |
| Card status/done | Today, Hub, module workspaces, Schedule links, Planner, Progress, Analytics, Columns, Table, Week, Evidence, Rescue, notifications |
| Actual hours/focus | Today allocation diagnostic, module progress, Planner, Progress, Analytics, SQLite projection |
| Checklist/evidence | Card detail, Today, module workspace, Evidence, completion diagnostics |
| Due/start date | Ranked picks, Schedule linking, Planner, Week, Table, notifications, Rescue |
| MAT700 active state | Today picks/split, Hub metrics, module visibility policy, Progress, scheduling logic |
| Day logs | Today agenda, Review, snapshots, day summaries |
| Resources/review state | Module materials, card links, recent resources, resource reader |
| Campaign/exam dates | countdowns, Schedule, readiness windows, re-plan horizon, notifications |
| Focus rewards/guard | header stats, Today forest, Focus Room, JSON backup/import, cross-tab refresh, SQLite settings projection |
| Card facets and dates | shared click-through contract to specialist workspaces or filtered Table inventories |

Browser-only data is limited to harmless UI preferences and bounded safety copies. Focus points, trees, goals, achievements, streaks, and guard mode are mirrored into revisioned tracker state instead of being stranded in a browser-only subsystem.

## Infrastructure and privacy boundary

- Docker publishes only on `127.0.0.1:5173`.
- The API accepts local Host/Origin requests and rejects cross-site requests.
- State writes are atomic temporary-file replacements with revision checks.
- Event lines are parsed independently; malformed fragments are quarantined without losing valid history.
- Database rebuild is POST-only and requires a fresh one-use token.
- API/static responses apply `nosniff`, no-referrer, permissions, and CSP headers.
- Active uploaded HTML runs without script or same-origin privilege.
- `local-data`, tracker exports, SQLite files, personal backups, study assets, and QA captures are excluded from Docker build context.
- Personal backup files are ignored and removed from Git tracking while remaining available locally.
- External Google Fonts are removed; the shell has no unnecessary font-network dependency.

## Accessibility and responsive density

- One dialog primitive supplies initial focus, focus trap, Escape close, return focus, and body scroll lock.
- Route changes reset scroll and focus the page heading.
- Icon-only responsive actions retain explicit accessible names.
- The complete capability model remains on mobile; navigation moves behind a menu instead of deleting destinations.
- Dense collections page their contents so all data remains accessible without rendering the full catalogue at once.
- Horizontal density is contained inside the relevant control surface, never the document body.
- Module pages expose one global H1 and structured subordinate headings.

## Implemented campaign-safe phase

The following are implemented:

- revision/ETag/If-Match state contract;
- stale-tab conflict reporting and explicit reload;
- semantic no-op suppression;
- browser-copy preservation on an empty local file;
- BroadcastChannel invalidation;
- serialized, checksummed, idempotent event appends;
- malformed-line quarantine and health reporting;
- local network, CSP, method, and resource-sandbox boundaries;
- private-file Git/Docker exclusions;
- MAT700 policy preservation and enabled setting;
- dynamic date language;
- accessible shared dialogs and route focus;
- idempotent weekly routine-card generation anchored to the 16 July boundary, with manual generation still available;
- full four-group navigation and rich Today cockpit;
- separated specialist module and bounded life areas;
- pagination for Columns, Table, and Evidence;
- Data Health display and protected database rebuild;
- restored and upgraded planting, levels, achievements, toasts, streaks, and Strict/Gentle Focus guard;
- focus reward state mirrored into JSON backup/import, cross-tab state, and SQLite settings projection;
- production manifest shortcuts for Today, Schedule, and Week.
- zero-based Phase 0-2 windows covering the closed 16 July-16 August campaign;
- deterministic academic-only re-planning that preserves phase order and leaves overflow unscheduled;
- shared click-through navigation across Today, cards, Progress, Planner, Analytics, Schedule, and Review;
- durable Done/Skipped block logging in Today, Schedule, and Review.

## Post-campaign authoritative SQLite phase

### Normalized entities

- `areas`
- `cards`
- `card_checklist_items`
- `card_notes`
- `evidence_entries`
- `focus_sessions`
- `day_blocks`
- `day_log_entries`
- `resources`
- `card_resources`
- `notifications`
- `campaign_settings`
- `change_log`

Every mutable entity has `version`, `created_at`, `updated_at`, and optional `deleted_at`.

### Narrow commands

- `PATCH /api/cards/:id`
- `POST /api/cards/:id/focus-sessions`
- `POST /api/cards/:id/evidence`
- `PATCH /api/settings/:key`
- `PUT /api/day-logs/:date`

Each command includes the last entity version. Conflicts return `409`; successful responses return the committed entity and version.

### Read models

- `GET /api/today?date=...`
- `GET /api/areas/:id`
- `GET /api/review/summary?from=...&to=...`
- `GET /api/tasks?...`
- `GET /api/data-health`

SQLite becomes authoritative only after transactional import, domain-count and checksum parity, feature-by-feature read/write switching, a real-use observation period, and a tested rollback. JSON then becomes a portable transactional export.

## Frontend evolution

```text
src/
  app/                 shell, routes, providers, error handling
  features/
    today/
    areas/
    cards/
    focus/
    planning/
    review/
    resources/
    settings/
  shared/
    ui/
    accessibility/
    formatting/
  data/
    api-client/
    cache/
```

The current large `App.jsx`, `App.css`, and `useTrackerState` should be split incrementally behind behavior-preserving tests. Secondary analytical/resource bundles should be lazy-loaded after the live-campaign stabilization window. File moves alone are not architecture work; each split must clarify domain ownership or reduce load cost.

## Verification gates

- two tabs cannot overwrite one another silently;
- a stale tab receives `409` and can reload safely;
- 204 file plus valid browser state never resets work;
- navigation without edits leaves JSON and SQLite mtimes unchanged;
- malformed NDJSON does not break event history;
- Docker context contains no state, backups, or study assets;
- MAT700 pause survives reload/migration;
- desktop and mobile retain all 19 destinations;
- dense collections render bounded pages while preserving full access;
- Today exposes schedule, re-plan, forest/achievements, streak, allocation, history, wrap-up, and deep-view links;
- Focus Room exposes timer presets, Strict/Gentle policy, planting state, card outputs, resources, and schedule boundaries;
- one end-to-end loop works: Today → Focus → Evidence → Done → Review.

## Delivery order

1. Campaign-safe persistence, privacy, and corruption recovery — implemented.
2. Product correctness, accessibility, and performance boundaries — implemented.
3. Purposeful high-density information architecture — implemented.
4. Automated component/accessibility/visual regression coverage — next safe increment.
5. Behavior-preserving frontend modularization and bundle splitting — after campaign stabilization.
6. Authoritative normalized SQLite migration and verified backup/restore — post-campaign only.
