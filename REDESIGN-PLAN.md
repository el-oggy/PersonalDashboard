# FlowOS Redesign Plan

## Current State Analysis
- **Architecture**: Vanilla JS modules with IndexedDB storage
- **Design**: Dark matte theme with aurora backgrounds, glass panels
- **Features**: Habits, Calendar, Projects (Kanban), Goals, Notes, Stats, Achievements
- **Storage**: Completely local (IndexedDB + localStorage fallback)

## Target Design (Per User Requirements)

### Design System
- **Monochrome palette**: Pure Black (#000000), Dark Gray (#1a1a1a), White (#ffffff)
- **Subtle accents**: Only when absolutely necessary
- **Large rounded corners**: 20-28px
- **Glassmorphism**: Heavy use of backdrop filters
- **Soft shadows**: Layered, subtle depth
- **Smooth animations**: Spring physics, micro-interactions

### Layout Structure

#### LEFT SIDEBAR (Permanent Task Library)
- All recurring tasks displayed permanently
- Add/Edit/Delete tasks
- Drag-and-drop reordering
- Search functionality
- Task icons + categories
- Favorite tasks

#### CENTER PANEL (Monthly Habit Tracker)
- Full month calendar view
- Rows = tasks, Columns = days (Monday-Sunday)
- Independent checkbox per cell
- Month navigation (prev/next/today/jump)
- Each checkbox is independent

#### RIGHT PANEL (Day Details Drawer)
- Slide-out panel on day click
- Shows: Date, Task Checklist, Notes, Mood, Daily Completion, Journal, Quick Actions

### Additional Features
- Dark/Light mode toggle (persisted in localStorage)
- Smooth animations everywhere
- Statistics dashboard (completion rates, streaks, heatmaps)
- Premium feel throughout

### Files to Create/Modify

**CSS Files**:
1. `monochrome-theme.css` - New design tokens (monochrome colors, both themes)
2. `new-layout.css` - Three-panel layout with sidebar, main, drawer
3. `calendar-grid.css` - Month view with task rows and day columns
4. `drawer.css` - Slide-out day details panel
5. `animations-new.css` - Smooth animations (checkbox, month switch, drawer)

**JavaScript Files**:
1. `storage.js` - Improved localStorage wrapper (replaces db.js functionality)
2. `hooks/` - Custom hook utilities
3. `components/` - Reusable UI components
4. `calendar-grid.js` - Month habit grid logic
5. `day-drawer.js` - Day details panel logic
6. `sidebar-tasks.js` - Task library management
7. `statistics.js` - Analytics engine (replaces stats.js)
8. `app-v2.js` - Main orchestrator

**Data Structure Changes**:
```javascript
{
  tasks: [{ id, name, icon, category, favorite, order, createdAt }],
  progress: { [taskId]: { [dateKey: 'YYYY-MM-DD']: { completed: boolean, notes: string, mood: number } } },
  settings: { theme: 'dark'|'light', taskOrder: [], lastView: '' }
}
```

### Phases
1. **Phase 1**: Core structure (HTML shell, main layout CSS)
2. **Phase 2**: Monochrome theme engine (dark/light)
3. **Phase 3**: Left sidebar - task library
4. **Phase 4**: Center - monthly habit grid
5. **Phase 5**: Right drawer - day details
6. **Phase 6**: Animation system
7. **Phase 7**: Statistics and analytics
8. **Phase 8**: Polish and PWA setup