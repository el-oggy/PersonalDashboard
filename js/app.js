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

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  /* ---------------- Dashboard ---------------- */
  function renderDashboard(container) {
    const stats = Habits.todayCompletionStats();
    const events = CalendarView.todaysEvents();
    const quote = todaysQuote();
    const xp = State.get('xp').total;
    const { level, into, need } = UI.levelFromXP(xp);
    const activity = State.get('activity').slice(0, 6);
    const habits = Habits.getHabits().filter(h => h.active !== false);
    const bestStreak = habits.reduce((m, h) => Math.max(m, Habits.computeStreak(h.id)), 0);
    const pStats = Projects.stats();
    const projects = Projects.getProjects();
    const goals = Goals.getGoals();
    const notesCount = Notes.count();

    // Weekly trend data
    const weekDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const today = new Date();
    const weekStart = Utils.startOfWeek(today, 1);
    const weeklyData = weekDays.map((label, i) => {
      const d = Utils.addDays(weekStart, i);
      const key = Utils.dateKey(d);
      const done = habits.filter(h => Habits.isDone(h.id, key)).length;
      return { label, value: done, isToday: Utils.isSameDay(d, today) };
    });
    const maxWeekly = Math.max(1, ...weeklyData.map(d => d.value));

    // Days since start (streak context)
    const todayPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
    const xpPct = Utils.clamp((into / need) * 100, 0, 100);

    container.innerHTML = `
      <div class="view">

        <!-- ═══════ HERO ═══════ -->
        <div class="dash-hero">
          <div class="dash-greeting">
            <h1>${greeting()}! 👋</h1>
            <div class="greeting-sub">${dailyMotivation()} · Keep the flow going.</div>
          </div>
          <div class="dash-hero-date">${Utils.formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>

        <!-- ═══════ STAT CARDS ═══════ -->
        <div class="dash-stats">
          ${statCard('✅', `${stats.done}/${stats.total}`, "Today's Habits", todayPct >= 100 ? 'var(--accent-green)' : 'var(--accent-violet)', todayPct >= 100 ? '+Perfect day!' : todayPct >= 50 ? '★ More than halfway' : '—')}
          ${statCard('🔥', bestStreak + 'd', 'Best Active Streak', 'var(--accent-amber)', bestStreak >= 7 ? '★ On a roll!' : bestStreak > 0 ? 'Building momentum' : 'Start today!')}
          ${statCard('🚀', 'Lv ' + level, 'Current Level', 'var(--accent-teal)', xp.total + ' total XP · ' + into + '/' + need + ' to next')}
          ${statCard('📋', pStats.totalCards, 'Tasks / Notes', 'var(--accent-rose)', pStats.doneCards + ' done · ' + notesCount + ' notes')}
        </div>

        <!-- ═══════ MAIN TWO-COLUMN ═══════ -->
        <div class="dash-columns">

          <!-- ─── LEFT COLUMN ─── -->
          <div>

            <!-- Today's Habits -->
            <div class="card dash-panel">
              <div class="dash-panel-header">
                <div class="dash-panel-title">
                  <svg viewBox="0 0 24 24"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>
                  Today's Habits
                </div>
                <span class="dash-panel-badge">${stats.done}/${stats.total} done</span>
              </div>
              <div id="dash-today-habits"></div>
            </div>

            <!-- Weekly Trend -->
            <div class="card dash-panel" style="margin-top:20px;">
              <div class="dash-panel-header">
                <div class="dash-panel-title">
                  <svg viewBox="0 0 24 24"><path d="M4 20V10M12 20V4M20 20v-7"/></svg>
                  Weekly Trend
                </div>
                <span class="dash-panel-badge">This week</span>
              </div>
              <div class="dash-chart-wrap">
                <div class="dash-week-bars">
                  ${weeklyData.map(d => `
                    <div class="dash-bar-col">
                      <div class="dash-bar-value">${d.value}</div>
                      <div class="dash-bar" style="height:${Math.max(4, (d.value / maxWeekly) * 80)}px; background:${d.isToday ? 'var(--gradient-brand)' : 'var(--accent-violet)'}; opacity:${d.isToday ? 1 : 0.55};">
                        <div class="dash-bar-tooltip">${d.value} completed</div>
                      </div>
                      <div class="dash-bar-label" style="${d.isToday ? 'color:var(--accent); font-weight:600;' : ''}">${d.label}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Goals at a Glance -->
            ${goals.length ? `
            <div class="card dash-panel" style="margin-top:20px;">
              <div class="dash-panel-header">
                <div class="dash-panel-title">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>
                  Goals at a Glance
                </div>
                <span class="dash-panel-badge">${goals.length} active</span>
              </div>
              <div>
                ${goals.map(g => {
                  const pct = Goals.goalProgress(g);
                  const dl = g.deadline ? Utils.daysBetween(new Date(), Utils.keyToDate(g.deadline)) : null;
                  return `
                  <div class="dash-goal-item" data-goal="${g.id}">
                    <div class="dash-goal-top">
                      <div class="dash-goal-icon" style="background:${g.color}22;">${g.icon}</div>
                      <span class="dash-goal-name">${Utils.escapeHtml(g.title)}</span>
                      <span class="dash-goal-pct" style="color:${g.color}">${pct}%</span>
                    </div>
                    <div class="dash-goal-track">
                      <div class="dash-goal-fill" style="width:${pct}%; background:${g.color};"></div>
                    </div>
                    <div class="dash-goal-deadline">${dl !== null ? (dl >= 0 ? dl + ' days left' : Math.abs(dl) + ' days overdue') : 'No deadline'}</div>
                  </div>`;
                }).join('')}
              </div>
            </div>` : ''}

          </div>

          <!-- ─── RIGHT COLUMN ─── -->
          <div>

            <!-- Daily Progress Ring -->
            <div class="card dash-panel">
              <div class="dash-panel-header">
                <div class="dash-panel-title">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg>
                  Daily Progress
                </div>
                <span class="dash-panel-badge">${Utils.formatDate(new Date(), { month: 'short', day: 'numeric' })}</span>
              </div>
              <div class="dash-progress-wrap">
                <div class="dash-progress-ring">
                  ${Charts.ringSVG({ size: 140, stroke: 12, percent: todayPct, color: 'var(--accent-violet)' })}
                  <div class="dash-progress-center">
                    <div class="dash-progress-pct">${todayPct}%</div>
                    <div class="dash-progress-label">complete</div>
                  </div>
                </div>
                <div class="dash-progress-detail">
                  <div class="dash-progress-stat">
                    <div class="dash-progress-stat-num" style="color:var(--accent-green);">${stats.done}</div>
                    <div class="dash-progress-stat-label">Done</div>
                  </div>
                  <div class="dash-progress-stat">
                    <div class="dash-progress-stat-num">${stats.total}</div>
                    <div class="dash-progress-stat-label">Total</div>
                  </div>
                  <div class="dash-progress-stat">
                    <div class="dash-progress-stat-num" style="color:var(--accent-amber);">${bestStreak}d</div>
                    <div class="dash-progress-stat-label">Streak</div>
                  </div>
                </div>
              </div>

              <!-- Quote -->
              <div class="card dash-quote" style="background:var(--surface-2);">
                <div class="dash-quote-text">${Utils.escapeHtml(quote.text)}</div>
                <div class="dash-quote-author">— ${Utils.escapeHtml(quote.author)}</div>
              </div>

              <!-- XP Bar -->
              <div class="dash-xp-bar">
                <div class="dash-xp-track">
                  <div class="dash-xp-fill" style="width:${xpPct}%;"></div>
                </div>
                <div class="dash-xp-labels">
                  <span>Level ${level}</span>
                  <span>${into} / ${need} XP</span>
                  <span>Level ${level + 1}</span>
                </div>
              </div>
            </div>

            <!-- Today's Schedule -->
            ${events.length ? `
            <div class="card dash-panel" style="margin-top:20px;">
              <div class="dash-panel-header">
                <div class="dash-panel-title">
                  <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
                  Today's Schedule
                </div>
                <span class="dash-panel-badge">${events.length} events</span>
              </div>
              <div class="dash-schedule-list">
                ${events.map(e => `
                  <div class="dash-event-item">
                    <div class="dash-event-time">${e.startTime ? Utils.formatTime12(e.startTime) : 'All day'}</div>
                    <div class="dash-event-bar" style="background:${e.color};"></div>
                    <div class="dash-event-title">${Utils.escapeHtml(e.title)}</div>
                    ${e.endTime ? `<div class="dash-event-dots">→ ${Utils.formatTime12(e.endTime)}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>` : ''}

            <!-- Activity Feed -->
            <div class="card dash-panel" style="margin-top:20px;">
              <div class="dash-panel-header">
                <div class="dash-panel-title">
                  <svg viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  Activity
                </div>
                <span class="dash-panel-badge">Latest</span>
              </div>
              <div class="dash-activity-list">
                ${activity.length ? activity.map(a => `
                  <div class="dash-activity-item">
                    <div class="dash-activity-dot" style="background:${activityColor(a.type)};"></div>
                    <div>
                      <div class="dash-activity-text">${a.text}</div>
                      <div class="dash-activity-time">${Utils.relativeTime(a.ts)}</div>
                    </div>
                  </div>
                `).join('') : `
                <div class="dash-empty">
                  <div class="dash-empty-icon">✨</div>
                  <p>No activity yet — complete a habit to get started.</p>
                </div>`}
              </div>
            </div>

          </div>
        </div>

        <!-- ═══════ PROJECT PULSE ═══════ -->
        ${projects.length ? `
        <div class="dash-column-full">
          <div class="card dash-panel">
            <div class="dash-panel-header">
              <div class="dash-panel-title">
                <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M9 4v17M15 4v17"/></svg>
                Project Pulse
              </div>
              <span class="dash-panel-badge">${pStats.doneCards}/${pStats.totalCards} tasks done</span>
            </div>
            ${projects.map(p => {
              const pPct = Projects.projectProgress(p);
              const doneCol = p.columns[p.columns.length - 1];
              const done = p.cards.filter(c => c.columnId === doneCol.id).length;
              return `
              <div class="dash-project-item">
                <div class="dash-project-dot" style="background:${p.color};"></div>
                <div class="dash-project-info">
                  <div class="dash-project-name">${Utils.escapeHtml(p.name)}</div>
                  <div class="dash-project-meta">${done}/${p.cards.length} tasks · ${p.columns.filter((_, i) => i < p.columns.length - 1).length} active columns</div>
                </div>
                <div class="dash-project-track">
                  <div class="dash-project-fill" style="width:${pPct}%; background:${p.color};"></div>
                </div>
                <div class="dash-project-stat" style="color:${p.color}">${pPct}%</div>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

        <!-- ═══════ QUICK ACTIONS ═══════ -->
        <div class="dash-column-full" style="margin-top:24px;">
          <div class="dash-actions">
            <button class="dash-action-btn" id="qa-habit">
              <div class="dash-action-icon" style="background:var(--cat-1)22;">🧘</div>
              <div>
                <div class="dash-action-label">New Habit</div>
                <div class="dash-action-hint">Track a daily behavior</div>
              </div>
            </button>
            <button class="dash-action-btn" id="qa-note">
              <div class="dash-action-icon" style="background:var(--cat-2)22;">📝</div>
              <div>
                <div class="dash-action-label">New Note</div>
                <div class="dash-action-hint">Capture a thought</div>
              </div>
            </button>
            <button class="dash-action-btn" id="qa-task">
              <div class="dash-action-icon" style="background:var(--cat-3)22;">✅</div>
              <div>
                <div class="dash-action-label">New Task</div>
                <div class="dash-action-hint">Add to a project board</div>
              </div>
            </button>
            <button class="dash-action-btn" id="qa-event">
              <div class="dash-action-icon" style="background:var(--cat-4)22;">🗓️</div>
              <div>
                <div class="dash-action-label">New Event</div>
                <div class="dash-action-hint">Schedule something</div>
              </div>
            </button>
          </div>
        </div>

      </div>
    `;

    // Wire up today's habits (interactive check-off)
    renderTodayListDashboard(container.querySelector('#dash-today-habits'));

    // Wire up quick actions
    container.querySelector('#qa-habit').onclick = () => Habits.openHabitModal();
    container.querySelector('#qa-note').onclick = () => Notes.createAndOpen();
    container.querySelector('#qa-task').onclick = () => Projects.openCardModal();
    container.querySelector('#qa-event').onclick = () => CalendarView.openEventModal();

    // Wire up goal clicks → navigate to goals
    container.querySelectorAll('[data-goal]').forEach(el => {
      el.style.cursor = 'pointer';
      el.onclick = () => UI.navigate('goals');
    });
  }

  /* ─── Interactive habit list for dashboard ─── */
  function renderTodayListDashboard(container) {
    const habits = Habits.getHabits().filter(h => h.active !== false);
    const today = Utils.todayKey();
    if (!habits.length) {
      container.innerHTML = `
        <div class="dash-empty">
          <div class="dash-empty-icon">✨</div>
          <h3>No habits yet</h3>
          <p>Create your first habit to start tracking.</p>
        </div>`;
      return;
    }
    container.innerHTML = habits.map(h => {
      const done = Habits.isDone(h.id, today);
      const streak = Habits.computeStreak(h.id);
      return `
      <div class="today-habit-item" data-hid="${h.id}">
        <button class="habit-check-ring ${done ? 'is-done' : ''}" data-toggle="${h.id}" aria-label="Toggle ${Utils.escapeHtml(h.name)}">
          <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
        </button>
        <div class="habit-item-icon" style="background:${h.color}22;">${h.icon}</div>
        <div class="habit-item-info">
          <div class="habit-item-name ${done ? 'is-done' : ''}">${Utils.escapeHtml(h.name)}</div>
          <div class="habit-item-meta">
            <span class="habit-item-cat" style="background:${h.color}22; color:${h.color};">${Utils.escapeHtml(h.category || 'Other')}</span>
            ${h.targetTime ? `<span>${Utils.formatTime12(h.targetTime)}</span>` : ''}
          </div>
        </div>
        ${streak > 0 ? `<div class="habit-item-streak">🔥 ${streak}</div>` : ''}
      </div>`;
    }).join('');

    container.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.dataset.toggle;
        const nowDone = Habits.toggleDone(id);
        renderDashboard(document.getElementById('view-container'));
        UI.updateSidebarLevel();
        if (nowDone) UI.confetti();
        else UI.toast('Unchecked', 'info');
      };
    });
  }

  function dailyMotivation() {
    const msgs = [
      'Small steps lead to big results',
      'Your future self will thank you',
      'Consistency beats intensity',
      'Make today count',
      'Progress, not perfection',
      'One day at a time',
      'You\'ve got this',
      'Stay in the flow',
    ];
    return msgs[Math.floor(Date.now() / 86400000) % msgs.length];
  }

  function activityColor(type) {
    return { habit: 'var(--accent-green)', project: 'var(--accent-blue)', goal: 'var(--accent-amber)', note: 'var(--accent-teal)', achievement: 'var(--accent-rose)', level: 'var(--accent-violet)', calendar: 'var(--accent-blue)' }[type] || 'var(--text-tertiary)';
  }

  function statCard(icon, value, label, color, trend) {
    return `
    <div class="card dash-stat-card">
      <div class="dash-stat-icon" style="background:${color}18; color:${color};">${icon}</div>
      <div class="dash-stat-body">
        <div class="dash-stat-value">${value}</div>
        <div class="dash-stat-label">${label}</div>
        ${trend && trend !== '—' ? `<div class="dash-stat-trend ${trend.includes('Perfect') || trend.includes('half') || trend.includes('roll') ? 'up' : ''}">${trend}</div>` : ''}
      </div>
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

  /* ---------------- Mobile Helpers ---------------- */
  function isMobileWidth() {
    return window.innerWidth <= 768;
  }

  function isTabletWidth() {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
  }

  function closeMobileSidebar() {
    const shell = document.getElementById('app-shell');
    const scrim = document.getElementById('sidebar-scrim');
    shell.classList.remove('sidebar-open');
    scrim.classList.remove('is-active');
  }

  function openMobileSidebar() {
    const shell = document.getElementById('app-shell');
    const scrim = document.getElementById('sidebar-scrim');
    shell.classList.add('sidebar-open');
    scrim.classList.add('is-active');
  }

  function wireSidebarToggle() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const shell = document.getElementById('app-shell');

    // Restore persisted sidebar state on desktop
    if (!isMobileWidth() && State.get('settings').sidebarCollapsed) {
      shell.classList.add('sidebar-collapsed');
    }

    toggleBtn.addEventListener('click', () => {
      if (isMobileWidth()) {
        // Phone: slide-out overlay
        if (shell.classList.contains('sidebar-open')) {
          closeMobileSidebar();
        } else {
          openMobileSidebar();
        }
      } else {
        // Tablet/desktop: icon shrink
        shell.classList.toggle('sidebar-collapsed');
        State.get('settings').sidebarCollapsed = shell.classList.contains('sidebar-collapsed');
        State.save('settings');
      }
    });

    // Auto-close mobile sidebar when window resizes to desktop
    window.addEventListener('resize', Utils.debounce(() => {
      if (!isMobileWidth()) {
        closeMobileSidebar();
      }
    }, 100));
  }

  function wireBottomNav() {
    const items = document.querySelectorAll('.bottom-nav-item[data-route]');
    items.forEach(item => {
      item.addEventListener('click', () => {
        UI.navigate(item.dataset.route);
        // Update active state
        items.forEach(i => i.classList.remove('is-active'));
        item.classList.add('is-active');
      });
    });
  }

  function updateBottomNavActive(route) {
    document.querySelectorAll('.bottom-nav-item[data-route]').forEach(item => {
      item.classList.toggle('is-active', item.dataset.route === route);
    });
  }

  /* ---------------- Service Worker ---------------- */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {
        // Fail silently — SW is a progressive enhancement
      });
    }
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

    // Sidebar navigation
    document.querySelectorAll('.nav-item[data-route]').forEach(el => {
      el.addEventListener('click', () => {
        UI.navigate(el.dataset.route);
        closeMobileSidebar();
      });
    });

    // Sidebar toggle: dual-mode — desktop shrink vs mobile slide-out
    wireSidebarToggle();

    // Mobile: close sidebar when tapping scrim
    document.getElementById('sidebar-scrim').addEventListener('click', closeMobileSidebar);

    // Bottom nav bar (mobile)
    wireBottomNav();

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

    // Date display - shorter on mobile
    const dateEl = document.getElementById('topbar-date');
    if (dateEl) {
      dateEl.textContent = isMobileWidth()
        ? Utils.formatDate(new Date(), { weekday: 'short', month: 'short', day: 'numeric' })
        : Utils.formatDate(new Date(), { weekday: 'short', month: 'short', day: 'numeric' });
    }

    UI.updateSidebarLevel();

    // Re-render sidebar level whenever xp/achievements change anywhere.
    State.on('xp', () => UI.updateSidebarLevel());

    // Register service worker for offline support
    registerServiceWorker();

    // Override UI.navigate to also update bottom nav + close mobile sidebar
    const origNavigate = UI.navigate;
    UI.navigate = function(route) {
      origNavigate(route);
      updateBottomNavActive(route);
      if (isMobileWidth()) closeMobileSidebar();
    };

    const initialRoute = (window.location.hash || '').replace('#', '') || 'dashboard';
    UI.navigate(['dashboard', 'habits', 'calendar', 'projects', 'goals', 'notes', 'stats', 'achievements', 'settings'].includes(initialRoute) ? initialRoute : 'dashboard');

    Achievements.checkAll();
  }

  return { init, performSearch };
})();

document.addEventListener('DOMContentLoaded', () => {
  App.init().catch(err => {
    console.error('Habit Tracker failed to start', err);
    document.getElementById('view-container').innerHTML = `<div class="empty-state"><h3>Habit Tracker couldn't start</h3><p>${Utils.escapeHtml(err.message || String(err))}</p></div>`;
  });
});
