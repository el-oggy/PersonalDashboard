# Habit Tracker (formerly FlowOS)

A premium, **fully responsive** offline-first personal productivity dashboard — habits, calendar,
projects (Kanban), goals, notes, analytics, and an XP/leveling system — built
with plain HTML5, CSS3, and vanilla JavaScript (ES6). No frameworks, no
build step, no backend, no accounts.

**Works everywhere:** desktop, tablet, and mobile — all from one HTML file.

---

## Live Demo

[https://el-oggy.github.io/PersonalDashboard](https://el-oggy.github.io/PersonalDashboard)

---

## Running it

Habit Tracker is a static site. Two ways to open it:

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

---

## Features

### 🌐 Universal Responsiveness
- **Desktop** (>1024px): full sidebar, multi-column layouts, keyboard shortcuts
- **Tablet** (768–1024px): collapsed icons sidebar, 2–3 column grids, all views functional
- **Phone** (<768px): slide-out hamburger sidebar, fixed bottom nav bar, single-column stacking, touch-optimized controls (≥44px tap targets)
- **PWA installable** — add to your home screen on any device
- **Offline support** — service worker caches everything on first load

### 🎨 Theme Engine
- Dark, Light, and System modes with animated fade/blur transitions
- Six accent color presets (Violet, Teal, Amber, Rose, Blue, Green) — Settings → Appearance
- System mode follows your OS live
- Respects `prefers-reduced-motion`

### 🔍 Command Palette
- ⌘K / Ctrl+K (or tap the search bar) opens a keyboard-navigable palette
- Searches habits, notes, projects, tasks, and goals
- Quick commands: New Habit / Note / Task / Event / Goal
- Arrow keys + Enter — just like Spotlight/Raycast

### 📊 Dashboard
- Today's habits with quick check-off
- Daily completion ring + progress bar
- Longest streak tracker
- XP level with animated progress bar
- Weekly completion bars (last 7 days)
- Today's schedule preview
- Recent activity feed
- Daily quote
- Quick action buttons

### 🔁 Habits
- Full CRUD: name, icon, color, category, target time, notes
- Drag-and-drop reordering (desktop) or up/down buttons (touch)
- Per-habit weekly check dots with instant toggle
- Streak tracking (current + best)
- 12-month GitHub-style activity heatmap
- Category filtering

### 📅 Calendar
- Month, week, and day views
- Click any cell/hour to create events
- Full event CRUD with date/time/description
- Today shortcut

### 📋 Projects (Kanban)
- Kanban boards: Backlog → In Progress → Review → Done
- Drag-and-drop cards between columns (desktop)
- Touch-compatible column move buttons (phone/tablet)
- Priority labels (Low / Medium / High)
- Due dates with formatted display
- Multiple projects via tabbed interface
- Project-level progress bars
- XP rewards for completing tasks

### 🎯 Goals
- Long-term goals with icon, color, and deadline
- Milestone checklists with real-time progress
- Visual progress bars for each goal

### 📝 Notes
- Notes list + editor with autosave
- Tagging system
- Full-screen editor on mobile with back button

### 📈 Analytics
- 7-day completion trends
- 6-week category consistency breakdown
- Full activity heatmap

### 🏆 Achievements
- XP awarded for completing habits, tasks, and milestones
- Leveling system with a progress ring in the sidebar
- Badge grid that unlocks automatically as you progress
- Confetti celebrations on level-ups and task completions

### ⚙️ Settings
- Appearance: theme mode + accent color picker
- Export / Import your entire dataset as one JSON file
- Reset everything back to sample data

---

## Project structure

```
flowos/
├── index.html              Single HTML shell; all views render into #view-container
├── manifest.json           PWA manifest (installable on mobile)
├── sw.js                   Service worker (offline caching)
├── css/
│   ├── variables.css        Design tokens: color, type, radius, shadow, motion
│   ├── base.css              Reset + global typography
│   ├── layout.css            Sidebar / topbar / app shell
│   ├── components.css        Buttons, cards, modals, toasts, forms, context menu
│   ├── mobile.css            All responsive breakpoints (tablet + phone overrides)
│   ├── dashboard.css         Dashboard-specific layout (stat cards, rings, feed)
│   ├── dashboard-v2.css      Dashboard overhaul (glass panels, stats, weekly bars)
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
    ├── theme.js               Dark/Light/System theme engine + accent colors
    ├── charts.js              SVG progress rings, heatmaps, bar/line charts
    ├── ui.js                  Router, modals, toasts, command palette, confetti
    ├── habits.js              Habit CRUD, streaks, reorder (touch + drag), heatmap
    ├── calendar.js            Month/week/day views + event CRUD
    ├── projects.js            Kanban boards, drag + touch column move
    ├── goals.js               Goals + milestone checklists
    ├── notes.js               Notes list/editor with autosave
    ├── stats.js               Analytics view (trends, category consistency)
    ├── achievements.js        XP, leveling, badge unlock logic
    └── app.js                 Bootstraps everything, dual-mode sidebar, bottom nav
```

---

## Design system

Dark matte background (`#0a0a0c`) with layered translucent "glass" surfaces,
soft borders, and two accent colors (violet `#7c7aff` and teal `#57d9c4`).
Headings use **Fraunces** (a warm serif) for a distinctive, non-default
feel; body and UI text use **Inter**; numeric/mono data uses
**JetBrains Mono**. All motion runs on CSS transitions/keyframes using
`cubic-bezier` easing tuned for a spring-like, native-app feel, and respects
`prefers-reduced-motion`.
