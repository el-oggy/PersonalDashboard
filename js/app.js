/* ==========================================================================
   FlowOS — app.js
   Bootstraps the app: loads state, renders dashboard/settings views,
   wires up global chrome (sidebar, topbar, search, quick add).
   ========================================================================== */

const App = (() => {

  const QUOTES = [
    { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
    { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: 'Will Durant' },
    { text: 'Small daily improvements are the key to staggering long-term results.', author: 'James Clear' },
    { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
    { text: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
    { text: 'Focus on being productive instead of busy.', author: 'Tim Ferriss' },
    { text: 'The future depends on what you do today.', author: 'Mahatma Gandhi' },
    { text: 'Motivation is what gets you started. Habit is what keeps you going.', author: 'Jim Ryun' },
  ];

  function todaysQuote() {
    const dayIndex = Math.floor(Date.now() / 86400000);
    return QUOTES[dayIndex % QUOTES.length];
  }

  /* ---------------- Dashboard ---------------- */
  function renderDashboard(container) {
    const stats = Habits.todayCompletionStats();
    const events = CalendarView.todaysEvents();
    const quote = todaysQuote();
    const xp = State.get('xp').total;
    const { level } = UI.levelFromXP(xp);
    const activity = State.get('activity').slice(0, 8);
    const bestStreak = Habits.getHabits().reduce((m, h) => Math.max(m, Habits.computeStreak(h.id)), 0);
    const pStats = Projects.stats();

    container.innerHTML = `
      <div class="view">
        <div class="dashboard-grid">
          ${statCard('✅', `${stats.done}/${stats.total}`, "Today's Habits", 'var(--cat-1)')}
          ${statCard('🔥', bestStreak + 'd', 'Longest Active Streak', 'var(--cat-3)')}
          ${statCard('🚀', 'Lv ' + level, 'Current Level', 'var(--cat-2)')}
          ${statCard('📋', `${pStats.doneCards}/${pStats.totalCards}`, 'Tasks Completed', 'var(--cat-6)')}
        </div>

        <div class="dashboard-main-grid">
          <div class="card panel">
            <div class="section-heading"><h2>Today's Habits</h2><span class="hint">${Utils.formatDate(new Date(), { weekday: 'long', month: 'short', day: 'numeric' })}</span></div>
            <div id="dash-today-habits"></div>
          </div>

          <div class="card panel" style="display:flex; flex-direction:column; gap:18px;">
            <div>
              <div class="section-heading"><h2>Daily Progress</h2></div>
              <div class="progress-ring-wrap">
                ${Charts.ringSVG({ size: 128, stroke: 11, percent: stats.pct, color: 'var(--accent-violet)' })}
              </div>
              <div style="text-align:center;">
                <div class="progress-ring-num">${stats.pct}%</div>
                <div class="progress-ring-sub">${stats.done} of ${stats.total} habits done</div>
              </div>
            </div>
            <div class="card quote-card" style="background:var(--surface-2);">
              <div class="quote-text">${Utils.escapeHtml(quote.text)}</div>
              <div class="quote-author">— ${Utils.escapeHtml(quote.author)}</div>
            </div>
          </div>
        </div>

        <div class="dashboard-main-grid">
          <div class="card panel">
            <div class="section-heading"><h2>Activity Heatmap</h2><span class="hint">Last 20 weeks</span></div>
            <div class="mini-heatmap-wrap" id="dash-heatmap"></div>
            <div class="heatmap-legend"><span>Less</span>
              <div class="heatmap-cell" style="background:var(--surface-2);"></div>
              <div class="heatmap-cell" style="background:#2a5636;"></div>
              <div class="heatmap-cell" style="background:#3d7d4d;"></div>
              <div class="heatmap-cell" style="background:#4fae66;"></div>
              <div class="heatmap-cell" style="background:var(--accent-green);"></div>
              <span>More</span>
            </div>
          </div>

          <div class="card panel">
            <div class="section-heading"><h2>Recent Activity</h2></div>
            <div id="dash-activity">
              ${activity.length ? activity.map(a => `
                <div class="activity-row">
                  <div class="activity-dot" style="background:${activityColor(a.type)};"></div>
                  <div>
                    <div class="activity-text">${a.text}</div>
                    <div class="activity-time">${Utils.relativeTime(a.ts)}</div>
                  </div>
                </div>`).join('') : `<p style="color:var(--text-tertiary); font-size:13px;">No activity yet — complete a habit to get started.</p>`}
            </div>
          </div>
        </div>

        ${events.length ? `
        <div class="card panel">
          <div class="section-heading"><h2>Today's Schedule</h2></div>
          <div class="day-view-list">
            ${events.map(e => `
              <div class="day-event-row" style="padding:10px 4px;">
                <div class="day-event-time">${e.startTime ? Utils.formatTime12(e.startTime) : 'All day'}</div>
                <div class="day-event-bar" style="background:${e.color};"></div>
                <div class="day-event-title">${Utils.escapeHtml(e.title)}</div>
              </div>`).join('')}
          </div>
        </div>` : ''}
      </div>
    `;

    Habits.renderTodayList(container.querySelector('#dash-today-habits'));
    Charts.renderHeatmapGrid(container.querySelector('#dash-heatmap'), Habits.aggregateHeatmapData(), 20, 11);
  }

  function activityColor(type) {
    return { habit: 'var(--accent-green)', project: 'var(--accent-blue)', goal: 'var(--accent-amber)', note: 'var(--accent-teal)', achievement: 'var(--accent-rose)', level: 'var(--accent-violet)', calendar: 'var(--accent-blue)' }[type] || 'var(--text-tertiary)';
  }

  function statCard(icon, value, label, color) {
    return `
    <div class="card stat-card">
      <div class="stat-card-top"><div class="stat-icon" style="background:${color}22;">${icon}</div></div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>`;
  }

  /* ---------------- Settings ---------------- */
  function renderSettings(container) {
    const settings = State.get('settings');
    container.innerHTML = `
      <div class="view">
        <div class="card panel" style="margin-bottom:20px;">
          <div class="section-heading"><h2>Appearance</h2><span class="hint">Updates instantly, everywhere</span></div>
          <div class="field-row">
            <div class="field">
              <label>Theme</label>
              <div id="settings-theme-switch"></div>
            </div>
            <div class="field">
              <label>Accent Color</label>
              <div id="settings-accent-picker"></div>
            </div>
          </div>
        </div>

        <div class="card panel" style="margin-bottom:20px;">
          <div class="section-heading"><h2>Backup &amp; Restore</h2><span class="hint">Everything lives only on this device</span></div>
          <p style="color:var(--text-secondary); font-size:13px; margin-bottom:16px; line-height:1.6;">Export a single JSON file containing every habit, project, note, goal, event, and achievement. Import it later — on this device or another — to restore your entire FlowOS exactly as it was.</p>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="btn btn-primary" id="export-btn"><svg viewBox="0 0 24 24"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/></svg>Export Backup</button>
            <button class="btn btn-secondary" id="import-btn"><svg viewBox="0 0 24 24"><path d="M12 21V9m0 0l-4 4m4-4l4 4M5 3h14"/></svg>Import Backup</button>
            <input type="file" id="import-file" accept="application/json" style="display:none;" />
          </div>
        </div>

        <div class="card panel" style="margin-bottom:20px;">
          <div class="section-heading"><h2>Preferences</h2></div>
          <div class="field" style="max-width:260px;">
            <label>Week Starts On</label>
            <select id="week-start-select">
              <option value="0" ${settings.weekStartsOn === 0 ? 'selected' : ''}>Sunday</option>
              <option value="1" ${settings.weekStartsOn === 1 ? 'selected' : ''}>Monday</option>
            </select>
          </div>
        </div>

        <div class="card panel">
          <div class="section-heading"><h2>Danger Zone</h2></div>
          <p style="color:var(--text-secondary); font-size:13px; margin-bottom:14px;">Wipe all data and start fresh with sample content. This cannot be undone — export a backup first.</p>
          <button class="btn btn-danger" id="wipe-btn">Reset All Data</button>
        </div>
      </div>
    `;

    container.querySelector('#settings-theme-switch').appendChild(Theme.renderSwitcher());
    container.querySelector('#settings-accent-picker').appendChild(Theme.renderAccentPicker());
    Theme.updateSwitcherUI();
    Theme.updateAccentUI();

    container.querySelector('#export-btn').onclick = async () => {
      const data = await State.exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flowos-backup-${Utils.todayKey()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      UI.toast('Backup exported', 'success');
    };

    const fileInput = container.querySelector('#import-file');
    container.querySelector('#import-btn').onclick = () => fileInput.click();
    fileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const obj = JSON.parse(text);
        await State.importBackup(obj);
        UI.toast('Backup restored', 'success');
        UI.updateSidebarLevel();
        UI.refreshCurrent();
      } catch (err) {
        console.error(err);
        UI.toast('Could not read that file', 'danger');
      }
      fileInput.value = '';
    };

    container.querySelector('#week-start-select').onchange = (e) => {
      settings.weekStartsOn = Number(e.target.value);
      State.save('settings');
      UI.toast('Preference saved', 'info');
    };

    container.querySelector('#wipe-btn').onclick = async () => {
      const ok = await UI.confirmDialog('This will permanently delete all your data and reload sample content.', { title: 'Reset All Data', confirmLabel: 'Reset Everything' });
      if (ok) {
        await State.wipeAll();
        UI.updateSidebarLevel();
        UI.navigate('dashboard');
        UI.toast('FlowOS has been reset', 'info');
      }
    };
  }

  /* ---------------- Global search ---------------- */
  function performSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const results = [];
    Habits.getHabits().forEach(h => { if (h.name.toLowerCase().includes(q)) results.push({ type: 'Habit', label: h.name, action: () => UI.navigate('habits') }); });
    Notes.getNotes().forEach(n => { if ((n.title || '').toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q)) results.push({ type: 'Note', label: n.title || 'Untitled', action: () => { Notes.setActive && Notes.setActive(n.id); UI.navigate('notes'); } }); });
    Projects.getProjects().forEach(p => {
      if (p.name.toLowerCase().includes(q)) results.push({ type: 'Project', label: p.name, action: () => UI.navigate('projects') });
      p.cards.forEach(c => { if (c.title.toLowerCase().includes(q)) results.push({ type: 'Task', label: c.title, action: () => UI.navigate('projects') }); });
    });
    Goals.getGoals().forEach(g => { if (g.title.toLowerCase().includes(q)) results.push({ type: 'Goal', label: g.title, action: () => UI.navigate('goals') }); });
    return results.slice(0, 8);
  }

  function wireSearch() {
    // The topbar search box is a trigger for the unified Command Palette
    // (same experience as ⌘K) rather than its own separate dropdown —
    // one fast, keyboard-friendly search surface for the whole app.
    const trigger = document.getElementById('search-box-trigger');
    trigger.addEventListener('click', () => UI.openQuickAdd());
  }

  /* ---------------- Notifications ---------------- */
  function activityIcon(type) {
    return { habit: '🔁', project: '📋', goal: '🎯', note: '📝', achievement: '🥇', level: '🚀', calendar: '🗓️' }[type] || '•';
  }

  function renderNotifList() {
    const list = document.getElementById('notif-list');
    const items = State.get('activity').slice(0, 12);
    if (!items.length) {
      list.innerHTML = `<div class="empty-state" style="padding:26px 10px;"><p>No notifications yet.</p></div>`;
      return;
    }
    list.innerHTML = items.map(a => `
      <div class="notif-item">
        <span class="n-dot" style="background:${activityColor(a.type)};"></span>
        <div>
          <div class="n-text">${a.text}</div>
          <div class="n-time">${Utils.relativeTime(a.ts)}</div>
        </div>
      </div>
    `).join('');
  }

  function updateNotifDot() {
    const settings = State.get('settings');
    const lastSeen = settings.lastNotifSeen || 0;
    const hasUnread = State.get('activity').some(a => a.ts > lastSeen);
    document.getElementById('notif-dot').style.display = hasUnread ? 'block' : 'none';
  }

  function wireNotifications() {
    const btn = document.getElementById('notif-btn');
    const dropdown = document.getElementById('notif-dropdown');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains('is-open');
      if (isOpen) {
        dropdown.classList.remove('is-open');
      } else {
        renderNotifList();
        dropdown.classList.add('is-open');
        State.get('settings').lastNotifSeen = Date.now();
        State.save('settings');
        updateNotifDot();
      }
    });
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && e.target !== btn) dropdown.classList.remove('is-open');
    });
    State.on('activity', updateNotifDot);
    updateNotifDot();
  }

  /* ---------------- Bootstrap ---------------- */
  async function init() {
    await State.load();

    UI.registerView('dashboard', renderDashboard);
    UI.registerView('habits', Habits.renderView);
    UI.registerView('calendar', CalendarView.renderView);
    UI.registerView('projects', Projects.renderView);
    UI.registerView('goals', Goals.renderView);
    UI.registerView('notes', Notes.renderView);
    UI.registerView('stats', Stats.renderView);
    UI.registerView('achievements', Achievements.renderView);
    UI.registerView('settings', renderSettings);

    document.querySelectorAll('.nav-item[data-route]').forEach(el => {
      el.addEventListener('click', () => UI.navigate(el.dataset.route));
    });

    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      const shell = document.getElementById('app-shell');
      shell.classList.toggle('sidebar-collapsed');
      State.get('settings').sidebarCollapsed = shell.classList.contains('sidebar-collapsed');
      State.save('settings');
    });
    if (State.get('settings').sidebarCollapsed) {
      document.getElementById('app-shell').classList.add('sidebar-collapsed');
    }

    document.getElementById('quick-add-btn').addEventListener('click', UI.openQuickAdd);
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        UI.openQuickAdd();
      }
    });
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') UI.closeModal();
    });

    wireSearch();
    wireNotifications();
    Theme.init();

    document.getElementById('topbar-date').textContent = Utils.formatDate(new Date(), { weekday: 'short', month: 'short', day: 'numeric' });

    UI.updateSidebarLevel();

    // Re-render sidebar level whenever xp/achievements change anywhere.
    State.on('xp', () => UI.updateSidebarLevel());

    const initialRoute = (window.location.hash || '').replace('#', '') || 'dashboard';
    UI.navigate(['dashboard', 'habits', 'calendar', 'projects', 'goals', 'notes', 'stats', 'achievements', 'settings'].includes(initialRoute) ? initialRoute : 'dashboard');

    Achievements.checkAll();
  }

  return { init, performSearch };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init().catch(err => {
    console.error('FlowOS failed to start', err);
    document.getElementById('view-container').innerHTML = `<div class="empty-state"><h3>FlowOS couldn't start</h3><p>${Utils.escapeHtml(err.message || String(err))}</p></div>`;
  });
});
