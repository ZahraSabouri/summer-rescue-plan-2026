# Summer Rescue Plan

A local-first command centre for the intensive **13 July–28 August 2026** rescue campaign. The plan reaches
exam-readiness by **16 August**, then switches to targeted maintenance through Cardiff's provisional
**17–28 August** summer assessment window. It combines an hour-by-hour timetable, a 113-card outcome tracker, module
workspaces, progress analytics, an evidence log, and a built-in study timer.

> Cardiff University branding uses an **original placeholder crest** at `public/cardiff-logo.svg` (not an
> official mark). To show the real logo, replace that single file — keep the same name — with Cardiff's
> official SVG or PNG; it then appears on the intro screen and in the sidebar automatically. The browser tab
> icon lives at `public/favicon.svg`.

---

## Table of contents

1. [What it does](#what-it-does)
2. [Tech stack](#tech-stack)
3. [Getting started](#getting-started)
4. [Project structure](#project-structure)
5. [Data model & storage](#data-model--storage)
6. [Feature guide (how to use)](#feature-guide-how-to-use)
7. [Design system](#design-system)
8. [Privacy & the repo](#privacy--the-repo)
9. [Known notes & roadmap](#known-notes--roadmap)

---

## What it does

The live rescue plan is defined in `src/data/summerRescuePlan.js`. It runs three active exam lanes, a tightly
bounded CMT501 capacity lane, a small job-search lane, and essential life/admin blocks:

| Lane | Module | Focus | Allocation |
| --- | --- | --- | --- |
| Applied ML | CMT307 | Lab-first fluency, videos only when they produce a lab/output | 36 cards / 80 h |
| Time Series | MAT508 | Concept rebuild plus repeated exam-template drills | 35 cards / 95 h |
| Data Mining | MAT700 | Tutorial-first rebuild, timed recall, and papers | 24 cards / 52 h |
| Team Project | CMT501 | Generic protected capacity only; detailed management stays elsewhere | 5 cards / 37 h |
| Job Hunt | Personal | Five tiny scans plus one weekly review/development output; hard 2 h/week cap | 7 cards / 14 h |
| Admin & Dates | Personal | Summer timetable checks, information channels, and final logistics | 6 cards / 2.75 h |

The timetable protects eight hours of sleep, caps academic work at eight hours a day (including classes and
project blocks), includes meals/commute/hygiene/chores, and avoids two consecutive stay-home days. Cards hold
the checkable outcomes; the Schedule view decides when to work on the next open card in each lane.

## Tech stack

- **React 19** + **Vite 8** (dev server, build) — plain `.jsx`, no TypeScript.
- **Plain CSS with design tokens** (`src/index.css` variables + `src/App.css`) — no Tailwind/CSS framework.
- **Google Fonts**: Fraunces (serif display), Manrope (UI), Space Grotesk (numerals). Loaded via `<link>` in
  `index.html`; falls back to system fonts if offline.
- **Local-first storage.** The Vite development server and the fixed production-local server expose `/api/state`, `/api/health`, `/api/events`,
  `/api/db/*`, and local resource endpoints. Tracker state autosaves to `local-data/summer-rescue-tracker-state.json`,
  typed task/card events append to `local-data/progress-log.ndjson`, and uploaded files are copied under
  `local-data/resources/<module-id>/`. Browser `localStorage` remains a secondary startup mirror and safety-copy store.
- **SQLite durable mirror.** Each save is also written through to `local-data/app.sqlite` (Node's built-in
  `node:sqlite` — no dependency to install) so durable entities live in queryable tables. `GET /api/db/rebuild`
  reconstructs per-card progress from the typed event log alone. See [Data model & storage](#data-model--storage).
- **Zero runtime dependencies** beyond `react` / `react-dom`. Charts, icons, and the timer are hand-built SVG —
  nothing to audit or update.

## Getting started

```bash
npm install
npm run dev        # start the dev server (http://localhost:5173)
npm run build      # production build into dist/
npm run preview    # preview the production build
npm run app        # build, then run the production-local app at http://127.0.0.1:5173
npm run app:start  # run an existing build at the same fixed local address
npm run lint       # ESLint
npm run test       # node:test API + SQLite checks
npm run assets:sync    # copy curated study resources into public/study-assets
npm run assets:verify  # check every referenced asset exists
npm run db:seed        # build local-data/app.sqlite from source data + current JSON state
npm run db:rebuild     # print the event-log recovery for the seeded cards
```

### Optional installed desktop window

`app.webmanifest` lets Chrome or Edge install Summer Rescue as a standalone window with shortcuts to Today,
Schedule, and Week. This is an installed shell, **not an offline app**: no service worker is registered, and the
local service must be running so state continues to reach the JSON file, event log, uploaded resources, and SQLite.
Always install from the canonical `http://127.0.0.1:5173` address rather than changing host names or ports.

After `npm run build`, Windows users may opt in to starting the local service at sign-in. These scripts are inert
until explicitly run and do not install themselves:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/install-startup.ps1
powershell -ExecutionPolicy Bypass -File scripts/windows/uninstall-startup.ps1
```

The startup task launches the existing production build in the background; it does not rebuild it or open a
browser window. `npm run app:start` remains the manual startup command.

> **Build on Windows.** `node_modules` holds platform-native binaries (Vite/Rolldown). If the folder was set
> up on Windows, run install/build there rather than in a Linux shell.

## Project structure

```
summer-rescue-plan-app/
├─ index.html                 # entry HTML + web-font links
├─ src/
│  ├─ main.jsx                # React root
│  ├─ App.jsx                 # shell: sidebar nav, topbar, intro gate, view router
│  ├─ App.css                 # component + layout styles (design-token driven)
│  ├─ index.css               # design tokens (light/dark), base styles, fonts
│  ├─ components/
│  │  ├─ AppIntro.jsx         # landing / mission-briefing screen
│  │  ├─ StudyTimer.jsx       # wall-clock timer + full-screen Focus Room
│  │  ├─ RescueTriage.jsx     # explicit one-card-at-a-time recovery decisions
│  │  ├─ InstallDesktopApp.jsx# honest Chromium install prompt/status
│  │  ├─ StudyHub.jsx         # cross-module home
│  │  ├─ ModuleWorkspace.jsx  # per-module hub + resource browser
│  │  ├─ TrackerViews.jsx     # Planner, Columns, Table, Week, Analytics, Evidence, Focus
│  │  ├─ ProgressView.jsx     # burn-up, pace, heatmap, module rings
│  │  ├─ Charts.jsx           # dependency-free themed SVG charts
│  │  ├─ CardDetailDrawer.jsx # edit a card (status/checklist/notes/hours/evidence)
│  │  ├─ AddCardDialog.jsx    # create a card
│  │  └─ FilterBar.jsx        # filter controls for tracker views
│  ├─ data/
│  │  ├─ baseCards.js         # seed planning cards (generated from trello_import.csv)
│  │  ├─ studyModules.js      # module definitions + curated resource lists
│  │  └─ constants.js         # view options, statuses, modules, filters
│  ├─ state/useTrackerState.js# reducer/hooks over local API + browser fallback
│  └─ utils/                  # progress math, activity history, file backup, links
└─ public/study-assets/       # local copies of the resources the app links to
```

Current local API code lives in `src/server/localTrackerApi.js`, the SQLite durable store lives in
`src/server/trackerDb.js`, and `scripts/initTrackerDb.mjs` seeds/rebuilds it. API and database coverage lives
in `tests/`. The ignored `local-data/` folder holds the tracker state file, typed progress log, the SQLite
database (`app.sqlite`), the local resource index, and uploaded resource files.

## Data model & storage

- **Cards** (`src/data/summerRescuePlan.js`): the live plan rebases selected legacy study tasks and adds MAT700,
  project-capacity, job-hunt, and admin outcomes. Each card has `id`, `title`, `module` / `moduleGroup`, `phase`, `priority`,
  `status`, `done`, `checklist`, `evidence`, `notes`, `estimateHours` / `actualHours`, `tags`, and dates.
- **Persistence**: the Vite dev/preview server writes `local-data/summer-rescue-tracker-state.json` through
  `/api/state`. `/api/health` reports active local paths and `/api/events` reads/appends recent progress events.
- **Progress log**: `local-data/progress-log.ndjson` stores typed task/card events such as
  `card.done_changed`, `card.status_changed`, `checklist_item.toggled`, `hours.logged`,
  `focus_session.completed`, `evidence.added`, `note.edited`, and `resource.linked`. Settings, notifications,
  and browser safety-copy churn are not written to this log.
- **SQLite mirror** (`local-data/app.sqlite`): every `/api/state` save is written through into normalised tables
  (`cards`, `card_progress`, `checklist_items`, `card_notes`, `card_evidence`, `card_resources`, `module_notes`,
  `resources`, `resource_reviewed`, `settings`, `notifications`) via `src/server/trackerDb.js`. Seed or reseed it
  from the source data plus the current JSON state with `npm run db:seed`; inspect table counts at
  `GET /api/db/health` / `GET /api/db/summary`. Projection is best-effort — if it ever fails, the JSON save (the
  app's primary persistence path) still succeeds. The client still reads/writes the JSON file, so JSON stays the
  export/import format; SQLite is the durable, queryable copy.
- **Event-log recovery**: `GET /api/db/rebuild` (or `npm run db:rebuild`) folds the typed events in
  `progress-log.ndjson` back over the seeded card catalog to reconstruct per-card status, done-state, logged hours,
  checklist ticks, notes, evidence, and resource links — a recovery path that does not depend on the JSON state file.
- **Uploaded resources**: module pages can upload files into `local-data/resources/<module-id>/`. Metadata is mirrored
  in the tracker state and a local resource index so the files appear in the resource browser and can be linked to cards.
- **Browser mirror**: the browser still mirrors full state to `localStorage["summer-rescue-tracker-state-v3"]` for fast
  startup and fallback resilience. The local file wins once `/api/state` loads. Nothing leaves the machine.
- **Safe migration**: state schema v4 rebases the campaign to 13 July–28 August and activates MAT700 while preserving
  existing progress, notes, evidence, custom cards, resources, snapshots, and theme settings. Generated alerts from
  the abandoned pre-13-July plan are cleared and rebuilt from the live cards.
- Additional UI keys: `srp-nav-collapsed` (sidebar), `srp-skip-intro` (landing screen).
- **Backups**: *Export JSON* downloads a full snapshot; *Import JSON* restores one; *Choose autosave file*
  (Chromium browsers) writes changes to a file you pick, automatically. *Reset* exports first, then clears.
- **Daily safety copies**: the app keeps the latest few daily snapshots in browser `localStorage` so a bad import or
  accidental reset can be previewed and restored.

> `moduleGroup: "MAT700"` is the internal key used for filtering and must stay as-is; the module is only
> *displayed* as "Data Mining" / "Mathematical Methods for Data Mining".

## Feature guide (how to use)

**Landing screen** — on load you get a mission briefing with the exam countdown, campaign progress, the exam
lanes, and Team Project. Click a lane to jump straight in, *Enter workspace* for the full app, or tick *Skip
this screen next time*.

**Sidebar** — grouped navigation (Study / Planning / Board / Focus). Collapse it with the button at the
bottom (state is remembered); on narrow screens it becomes a slide-out menu. The footer shows live campaign
progress.

**Topbar** — the current view's title, an **exam countdown** (turns red inside three weeks), your backup
status, *Add card*, the **study timer**, a light/dark toggle, and *Settings*.

**Study timer and Focus Room** — a wall-clock-accurate Focus / Short break / Long break timer with explicit
25/5, 50/10, and Custom preferences. The full-screen room keeps one linked card, its exact finish/evidence
requirements, and the current/next timetable boundary visible; it can save a one-line restart cue but never
completes or replans a card. Background-tab throttling cannot slow the countdown or inflate logged time.
Supporting browsers also get an opt-in *Keep screen awake* toggle active only during a running Focus session.

**Views**

- *Today* — the **Now → Next** execution strip answers what boundary you are in, which one card/output comes
  next, its exact finish/evidence conditions, and when to stop or switch. It reads the verified schedule and card
  data without creating work or changing the plan.
- *Study Hub* — cross-module overview and quick actions.
- *Applied ML / Time Series / Data Mining* — each module's objectives, operating rules, action cards, a
  resource browser (notes, formula sheets, past papers, local uploads), and a scratchpad. Campaign-planning
  Markdown is deliberately excluded. In-app resources use a modal reader; *Full-screen tab* opens a dedicated
  viewport reader with no app shell.
- *Schedule* — the protected hour-by-hour plan. Each study/project/job block links to the best open card in
  that lane, while routines remain timetable blocks rather than cluttering the tracker.
- *Planner* — pace banner, pipeline, and this week at a glance.
- *Progress* — burn-up vs. ideal pace (Day/Week/Month), hours-per-period, per-module rings, activity heatmap.
- *Analytics* — charts, module mix, and stats.
- *Columns / Table / Week* — Kanban, dense grid, and 7-day plan of the same cards.
- *Evidence* — proof-of-work outputs.
- *Rescue Lane* — overdue cards enter an explicit one-at-a-time triage: Done, Rescue Lane, Waiting/Blocked, or
  a manually selected valid date. There is no bulk rollover or automatic rescheduling.
- *Project Capacity / Job Hunt / Admin & Dates* — focused lanes for generic group-project capacity, bounded
  applications, and exam logistics.

**Cards** — click any card title to open the drawer and edit status, tick checklist items, log hours, attach
evidence, and add notes. *Add card* creates new ones. Use the filter bar (non-study views) to slice by module,
phase, priority, status, slot, tag, or date; on mobile the filters stay collapsed until requested.

**Settings** — planning date, campaign window, provisional exam-window start, individual exam dates when
published, desktop-window installation, and all backup/data actions. MAT700 is an active study lane throughout
the campaign.

## Design system

- **Themes**: warm-paper light + espresso dark, both defined as CSS variables in `src/index.css`
  (`:root` and `:root[data-theme='dark']`). Every component reads these tokens, so theming is automatic.
- **Accents**: teal `--accent` (calm/primary) + terracotta `--accent-2` (energy). Per-module chart colors in
  `--chart-*`.
- **Type**: `--font-serif` (headings/numerals), `--font-sans` (UI), `--font-num` (metrics/timer).
- **Layout**: the content area is a CSS **container**, so cards reflow based on the *content* width — the
  sidebar never squeezes content off-screen.

## Privacy & the repo

Personal material is kept out of version control via `.gitignore`:

- Tracker JSON backups (`*tracker-backup*.json`).
- Campaign-planning notes and private strategy PDFs. These remain planning inputs outside the resource browser
  and are not shipped as module study materials.

If any of these were committed before, untrack them once with:

```bash
git rm -r --cached --ignore-unmatch "public/study-assets/**/*Emergency Exam Study Plan*.pdf" "summer-rescue-tracker-backup-*.json"
```

**Portability rule**: keep `public/study-assets` with the app; it must not depend on sibling module folders at
runtime.

## Known notes & roadmap

- Filter/Add-card dropdowns still list the raw value `MAT700`; the label→value split is intentional so
  filtering keeps working. A display-label map in `FilterBar.jsx` / `AddCardDialog.jsx` would prettify it.
- SQLite (`local-data/app.sqlite`) is now a durable write-through mirror + event-log recovery source, but the live
  client read path is still the JSON state file. Making SQLite the authoritative read path (so `GET /api/state`
  reconstructs from tables) is the next step.
- The standalone desktop shell is now installable from Settings. It deliberately remains online-to-localhost:
  do not add a service worker or claim offline support until JSON/SQLite writes, cache versioning, and the large
  resource set have an explicit integrity design.
- Deliberately avoided during the campaign: ambient due/streak notifications, AI auto-replanning, more
  gamification, and any feature that adds another inbox or maintenance ritual.
- Ideas not yet built: richer uploaded-resource management and automated Playwright-style UI regression tests.
