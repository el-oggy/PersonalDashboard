# FlowOS

A premium, offline-first personal productivity dashboard — habits, calendar,
projects (Kanban), goals, notes, analytics, and an XP/leveling system — built
with plain HTML5, CSS3, and vanilla JavaScript (ES6). No frameworks, no
build step, no backend, no accounts.

## Running it

FlowOS is a static site. Two ways to open it:

**Simplest:** double-click `index.html` to open it directly in your browser.

**Most compatible (recommended):** serve the folder with any static file
server so storage APIs behave identically to a normal website, e.g.:

```bash
cd flowos
python3 -m http.server 8080
# then open http://localhost:8080
```

Everything you do — creating habits, checking them off, writing notes,
building Kanban boards, setting goals — is saved automatically to your
browser's IndexedDB (falling back to localStorage if IndexedDB isn't
available). Nothing ever leaves your machine. Closing the tab, restarting
your browser, or rebooting your computer will not lose any data.

## Project structure

```
flowos/
├── index.html              Single HTML shell; all views render into #view-container
├── css/
│   ├── variables.css        Design tokens: color, type, radius, shadow, motion
│   ├── base.css              Reset + global typography
│   ├── layout.css            Sidebar / topbar / app shell
│   ├── components.css        Buttons, cards, modals, toasts, forms, context menu
│   ├── dashboard.css         Dashboard-specific layout (stat cards, rings, feed)
│   ├── habits.css            Habit list, week dots, drag handles
│   ├── calendar.css          Month/week/day calendar grids
│   ├── kanban.css            Project board + card styles
│   ├── notes.css             Notes list + editor
│   ├── goals.css             Goal cards + milestone checklist
│   ├── achievements.css      XP hero + badge grid
│   └── animations.css        Keyframes: view transitions, pop, confetti, toasts
└── js/
    ├── utils.js               Dates, ids, formatting, debounce — no dependencies
    ├── db.js                  IndexedDB wrapper with localStorage fallback
    ├── state.js               In-memory store, persistence, first-run seed data
    ├── theme.js                Dark/Light/System theme engine + accent colors
    ├── charts.js               SVG progress rings, heatmaps, bar/line charts
    ├── ui.js                   Router, modals, toasts, command palette, confetti
    ├── habits.js                Habit CRUD, streaks, drag-to-reorder, heatmap data
    ├── calendar.js               Month/week/day views + event CRUD
    ├── projects.js               Kanban boards, drag-and-drop cards
    ├── goals.js                  Goals + milestone checklists
    ├── notes.js                  Notes list/editor with autosave
    ├── stats.js                  Analytics view (trends, category consistency)
    ├── achievements.js           XP, leveling, badge unlock logic
    └── app.js                    Bootstraps everything, dashboard + settings views
```

## Features

- **Theme engine** — Dark, Light, and System modes with an animated fade/blur
  transition on switch; System mode follows your OS live. Plus six accent
  color presets (Settings → Appearance) that instantly recolor every button,
  ring, and highlight via CSS variables — no duplicated styles.
- **Command Palette** — ⌘K / Ctrl+K (or click the search bar) opens a single
  fast, keyboard-navigable palette that searches habits, notes, projects,
  tasks, and goals, and runs "New Habit / Note / Task / Event / Goal" and
  page-navigation commands. Arrow keys + Enter, just like Spotlight/Raycast.
- **Notifications** — a bell in the topbar shows a live feed of recent
  activity with an unread indicator; toasts got a redesign with per-type
  icons and an auto-dismiss progress bar.
- **Floating glass shell** — the sidebar and topbar are now separate
  translucent, blurred, floating panels (macOS-Sonoma style) instead of a
  flush layout, with an animated aurora gradient drifting subtly behind
  everything (respects `prefers-reduced-motion`).
- **Dashboard** — today's habits, daily completion ring, longest streak,
  level, recent activity feed, daily quote, mini activity heatmap, today's
  schedule.
- **Habits** — full CRUD (name, icon, color, category, target time, notes),
  drag-and-drop reordering, per-habit weekly dots, streaks, and a full
  12-month GitHub-style heatmap.
- **Calendar** — month, week, and day views; click any cell/hour to create
  an event; full event CRUD.
- **Projects** — Kanban boards (Backlog → In Progress → Review → Done) with
  drag-and-drop cards, priorities, and due dates. Multiple projects
  supported via tabs.
- **Goals** — long-term goals with icon, color, deadline, and a milestone
  checklist that drives a progress bar.
- **Notes** — a notes list + editor pane with tags, autosaving as you type.
- **Analytics** — 7-day and 6-week completion trends, category consistency,
  and the full activity heatmap.
- **Achievements** — XP awarded for completing habits, tasks, and
  milestones; a leveling system with a progress ring in the sidebar; a
  badge grid that unlocks automatically.
- **Settings** — Appearance (theme + accent), export/import your entire
  dataset as one JSON file, or reset everything back to sample data.

### Coming in later passes (not yet built)
This is being upgraded in phases. Not yet in this build: draggable/resizable
dashboard widgets, a rich Markdown notes editor with backlinks/pinning,
subtasks/recurring tasks, a 5-view calendar with drag-and-drop event editing,
Focus Mode + Pomodoro timer, and a mobile bottom nav. Ask and they'll get
built out the same way — incrementally, on top of what's already here.

## Design system

Dark matte background (`#0a0a0c`) with layered translucent "glass" surfaces,
soft borders, and two accent colors (violet `#7c7aff` and teal `#57d9c4`).
Headings use **Fraunces** (a warm serif) for a distinctive, non-default
feel; body and UI text use **Inter**; numeric/mono data uses
**JetBrains Mono**. All motion runs on CSS transitions/keyframes using
`cubic-bezier` easing tuned for a spring-like, native-app feel, and respects
`prefers-reduced-motion`.
