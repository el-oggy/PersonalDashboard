/* ==========================================================================
   FlowOS — habits.js
   Habit CRUD, daily completion toggling, streak math, heatmap data.
   ========================================================================== */

const Habits = (() => {

  const CATEGORIES = ['Mindfulness', 'Health', 'Learning', 'Work', 'Creativity', 'Social', 'Finance', 'Other'];
  const ICONS = ['🧘', '📖', '💪', '💧', '⚡', '🏃', '🍎', '🎨', '🎵', '💤', '☀️', '🌙', '✍️', '💻', '🧠', '❤️', '🌱', '🎯', '📞', '🧹', '🥗', '🚴', '🙏', '💰'];
  const COLORS = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)', 'var(--cat-7)', 'var(--cat-8)'];

  let activeFilter = 'All';

  function getHabits() {
    return [...State.get('habits')].sort((a, b) => a.order - b.order);
  }

  function isDone(habitId, key) {
    const logs = State.get('habitLogs')[habitId];
    return !!(logs && logs[key]);
  }

  function toggleDone(habitId, key = Utils.todayKey()) {
    const logs = State.get('habitLogs');
    logs[habitId] = logs[habitId] || {};
    const wasDone = !!logs[habitId][key];
    if (wasDone) {
      delete logs[habitId][key];
    } else {
      logs[habitId][key] = true;
    }
    State.save('habitLogs');

    const habit = State.get('habits').find(h => h.id === habitId);
    if (!wasDone && habit) {
      Achievements.awardXP(10, `Completed <b>${Utils.escapeHtml(habit.name)}</b>`);
      State.logActivity(`Completed <b>${Utils.escapeHtml(habit.name)}</b>`, 'habit');
      Achievements.checkHabitAchievements();
    }
    return !wasDone;
  }

  function computeStreak(habitId) {
    const logs = State.get('habitLogs')[habitId] || {};
    let streak = 0;
    let cursor = new Date();
    // if today isn't done yet, start counting from yesterday so an unbroken
    // streak isn't shown as reset before the day is even over.
    if (!logs[Utils.dateKey(cursor)]) {
      cursor = Utils.addDays(cursor, -1);
    }
    while (logs[Utils.dateKey(cursor)]) {
      streak++;
      cursor = Utils.addDays(cursor, -1);
    }
    return streak;
  }

  function computeBestStreak(habitId) {
    const logs = State.get('habitLogs')[habitId] || {};
    const keys = Object.keys(logs).sort();
    if (!keys.length) return 0;
    let best = 1, run = 1;
    for (let i = 1; i < keys.length; i++) {
      const prev = Utils.keyToDate(keys[i - 1]);
      const cur = Utils.keyToDate(keys[i]);
      if (Utils.daysBetween(prev, cur) === 1) {
        run++;
      } else {
        run = 1;
      }
      best = Math.max(best, run);
    }
    return best;
  }

  function completionRateLast(habitId, days) {
    const logs = State.get('habitLogs')[habitId] || {};
    let done = 0;
    for (let i = 0; i < days; i++) {
      const key = Utils.dateKey(Utils.addDays(new Date(), -i));
      if (logs[key]) done++;
    }
    return done / days;
  }

  function aggregateHeatmapData() {
    const habits = getHabits();
    const map = {};
    habits.forEach(h => {
      const logs = State.get('habitLogs')[h.id] || {};
      Object.keys(logs).forEach(key => {
        if (logs[key]) map[key] = (map[key] || 0) + 1;
      });
    });
    return map;
  }

  function todayCompletionStats() {
    const habits = getHabits().filter(h => h.active !== false);
    const today = Utils.todayKey();
    const done = habits.filter(h => isDone(h.id, today)).length;
    return { done, total: habits.length, pct: habits.length ? Math.round((done / habits.length) * 100) : 0 };
  }

  /* ---------------- Dashboard: today's habits ---------------- */
  function renderTodayList(container) {
    const habits = getHabits().filter(h => h.active !== false);
    const today = Utils.todayKey();
    if (!habits.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">✨</div><h3>No habits yet</h3><p>Create your first habit to start building streaks.</p><button class="btn btn-primary" id="empty-add-habit" style="margin-top:8px;">Add Habit</button></div>`;
      container.querySelector('#empty-add-habit').onclick = () => openHabitModal();
      return;
    }
    container.innerHTML = habits.map(h => {
      const done = isDone(h.id, today);
      const streak = computeStreak(h.id);
      return `
      <div class="today-habit-row" data-id="${h.id}">
        <button class="habit-check ${done ? 'is-done' : ''}" data-toggle="${h.id}" aria-label="Toggle ${Utils.escapeHtml(h.name)}">
          <svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
        </button>
        <div class="today-habit-icon" style="background:${h.color}22;">${h.icon}</div>
        <div class="today-habit-info">
          <div class="today-habit-name ${done ? 'is-done' : ''}">${Utils.escapeHtml(h.name)}</div>
          <div class="today-habit-meta">
            <span>${Utils.escapeHtml(h.category || '')}</span>
            ${h.targetTime ? `<span>· ${Utils.formatTime12(h.targetTime)}</span>` : ''}
          </div>
        </div>
        <div class="streak-flame">🔥 ${streak}</div>
      </div>`;
    }).join('');

    container.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.toggle;
        const nowDone = toggleDone(id);
        renderTodayList(container);
        UI.refreshCurrent();
        UI.updateSidebarLevel();
        if (nowDone) UI.confetti();
      };
    });
  }

  /* ---------------- Habit modal (create/edit) ---------------- */
  function openHabitModal(existing = null) {
    const isEdit = !!existing;
    const h = existing || { name: '', icon: ICONS[0], color: COLORS[0], category: CATEGORIES[0], targetTime: '', notes: '', order: getHabits().length };

    openModalHTML(isEdit, h);

    function openModalHTML(isEdit, h) {
      UI.openModal(`
        <div class="modal-header"><h2>${isEdit ? 'Edit Habit' : 'New Habit'}</h2>
          <button class="icon-btn" id="modal-close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        </div>
        <div class="field">
          <label>Name</label>
          <input type="text" id="hab-name" value="${Utils.escapeHtml(h.name)}" placeholder="e.g. Morning Run" />
        </div>
        <div class="field">
          <label>Icon</label>
          <div class="icon-picker" id="hab-icons">
            ${ICONS.map(i => `<button type="button" class="icon-pick ${i === h.icon ? 'is-selected' : ''}" data-icon="${i}">${i}</button>`).join('')}
          </div>
        </div>
        <div class="field">
          <label>Color</label>
          <div class="color-swatches" id="hab-colors">
            ${COLORS.map(c => `<button type="button" class="color-swatch ${c === h.color ? 'is-selected' : ''}" data-color="${c}" style="background:${c};"></button>`).join('')}
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Category</label>
            <select id="hab-category">
              ${CATEGORIES.map(c => `<option value="${c}" ${c === h.category ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Target Time</label>
            <input type="time" id="hab-time" value="${h.targetTime || ''}" />
          </div>
        </div>
        <div class="field">
          <label>Notes</label>
          <textarea id="hab-notes" placeholder="Any details, cues, or reminders…">${Utils.escapeHtml(h.notes || '')}</textarea>
        </div>
        <div class="modal-footer">
          ${isEdit ? `<button class="btn btn-danger" id="hab-delete">Delete</button>` : ''}
          <button class="btn btn-secondary" id="hab-cancel">Cancel</button>
          <button class="btn btn-primary" id="hab-save">${isEdit ? 'Save Changes' : 'Create Habit'}</button>
        </div>
      `, {
        width: '460px',
        onMount: (panel) => {
          let selectedIcon = h.icon, selectedColor = h.color;
          panel.querySelector('#modal-close').onclick = UI.closeModal;
          panel.querySelector('#hab-cancel').onclick = UI.closeModal;
          panel.querySelectorAll('[data-icon]').forEach(btn => {
            btn.onclick = () => {
              panel.querySelectorAll('[data-icon]').forEach(b => b.classList.remove('is-selected'));
              btn.classList.add('is-selected');
              selectedIcon = btn.dataset.icon;
            };
          });
          panel.querySelectorAll('[data-color]').forEach(btn => {
            btn.onclick = () => {
              panel.querySelectorAll('[data-color]').forEach(b => b.classList.remove('is-selected'));
              btn.classList.add('is-selected');
              selectedColor = btn.dataset.color;
            };
          });
          if (isEdit) {
            panel.querySelector('#hab-delete').onclick = async () => {
              const ok = await UI.confirmDialog(`Delete "${h.name}"? This removes all of its history.`, { title: 'Delete Habit' });
              if (ok) {
                deleteHabit(h.id);
                UI.closeModal();
                UI.refreshCurrent();
              }
            };
          }
          panel.querySelector('#hab-save').onclick = () => {
            const name = panel.querySelector('#hab-name').value.trim();
            if (!name) { UI.toast('Give your habit a name', 'warn'); return; }
            const payload = {
              name,
              icon: selectedIcon,
              color: selectedColor,
              category: panel.querySelector('#hab-category').value,
              targetTime: panel.querySelector('#hab-time').value,
              notes: panel.querySelector('#hab-notes').value.trim(),
            };
            if (isEdit) {
              updateHabit(h.id, payload);
            } else {
              createHabit(payload);
            }
            UI.closeModal();
            UI.refreshCurrent();
          };
        }
      });
    }
  }

  function createHabit(payload) {
    const habits = State.get('habits');
    habits.push({
      id: Utils.uid('hab'), active: true, order: habits.length, createdAt: Date.now(), ...payload
    });
    State.save('habits');
    State.get('habitLogs')[habits[habits.length - 1].id] = {};
    State.save('habitLogs');
    State.logActivity(`Created habit <b>${Utils.escapeHtml(payload.name)}</b>`, 'habit');
    Achievements.checkHabitAchievements();
    UI.toast('Habit created', 'success');
  }

  function updateHabit(id, payload) {
    const habits = State.get('habits');
    const h = habits.find(x => x.id === id);
    if (h) Object.assign(h, payload);
    State.save('habits');
    UI.toast('Habit updated', 'success');
  }

  function deleteHabit(id) {
    let habits = State.get('habits').filter(h => h.id !== id);
    habits.forEach((h, i) => h.order = i);
    State.get('habits').length = 0;
    State.get('habits').push(...habits);
    State.save('habits');
    const logs = State.get('habitLogs');
    delete logs[id];
    State.save('habitLogs');
    UI.toast('Habit deleted', 'info');
  }

  function reorder(fromId, toId) {
    const habits = getHabits();
    const fromIdx = habits.findIndex(h => h.id === fromId);
    const toIdx = habits.findIndex(h => h.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = habits.splice(fromIdx, 1);
    habits.splice(toIdx, 0, moved);
    habits.forEach((h, i) => h.order = i);
    const raw = State.get('habits');
    raw.length = 0;
    raw.push(...habits);
    State.save('habits');
  }

  /* ---------------- Full Habits view ---------------- */
  function renderView(container) {
    const habits = getHabits().filter(h => activeFilter === 'All' || h.category === activeFilter);
    const usedCats = ['All', ...new Set(getHabits().map(h => h.category).filter(Boolean))];
    const today = new Date();
    const weekDates = Array.from({ length: 7 }, (_, i) => Utils.addDays(Utils.startOfWeek(today, 1), i));

    container.innerHTML = `
      <div class="view">
        <div class="habits-toolbar">
          <div class="filter-pills">${usedCats.map(c => `<button class="filter-pill ${c === activeFilter ? 'is-active' : ''}" data-cat="${Utils.escapeHtml(c)}">${Utils.escapeHtml(c)}</button>`).join('')}</div>
          <button class="btn btn-primary" id="add-habit-btn"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>New Habit</button>
        </div>

        <div class="card" style="padding:20px; margin-bottom:20px;">
          <div class="section-heading"><h2>Yearly Overview</h2><span class="hint">Last 12 months of combined activity</span></div>
          <div class="heatmap-full-wrap" id="full-heatmap"></div>
        </div>

        <div class="habit-list" id="habit-list">
          ${habits.length ? habits.map((h, i) => habitCardHTML(h, weekDates, i, habits.length)).join('') : `<div class="empty-state"><div class="empty-icon">🗂️</div><h3>Nothing in this category</h3><p>Try another filter or add a new habit.</p></div>`}
        </div>
      </div>
    `;

    Charts.renderHeatmapGrid(container.querySelector('#full-heatmap'), aggregateHeatmapData(), 52, 10);

    container.querySelectorAll('[data-cat]').forEach(btn => {
      btn.onclick = () => { activeFilter = btn.dataset.cat; renderView(container); };
    });
    container.querySelector('#add-habit-btn').onclick = () => openHabitModal();

    const isTouch = window.innerWidth <= 768;

    container.querySelectorAll('.habit-card').forEach(card => {
      // Show reorder buttons on touch devices
      const reorderDiv = card.querySelector('.habit-reorder-btns');
      if (reorderDiv && isTouch) reorderDiv.style.display = 'flex';

      card.querySelectorAll('[data-week-toggle]').forEach(dot => {
        dot.onclick = (e) => {
          e.stopPropagation();
          toggleDone(card.dataset.id, dot.dataset.weekToggle);
          renderView(container);
          UI.updateSidebarLevel();
        };
      });
      card.querySelector('[data-edit]').onclick = (e) => {
        e.stopPropagation();
        const habit = State.get('habits').find(h => h.id === card.dataset.id);
        openHabitModal(habit);
      };
      card.querySelector('[data-menu]').onclick = (e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const habit = State.get('habits').find(h => h.id === card.dataset.id);
        UI.openContextMenu(rect.left, rect.bottom + 6, [
          { label: 'Edit', action: () => openHabitModal(habit) },
          { label: 'Delete', danger: true, action: async () => {
            const ok = await UI.confirmDialog(`Delete "${habit.name}"?`, { title: 'Delete Habit' });
            if (ok) { deleteHabit(habit.id); renderView(container); }
          }}
        ]);
      };

      // Reorder buttons (touch)
      card.querySelectorAll('[data-reorder]').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const dir = btn.dataset.reorder; // 'up' or 'down'
          const habitsVisible = getHabits().filter(h => activeFilter === 'All' || h.category === activeFilter);
          const idx = habitsVisible.findIndex(h => h.id === card.dataset.id);
          if (dir === 'up' && idx > 0) reorder(habitsVisible[idx].id, habitsVisible[idx - 1].id);
          if (dir === 'down' && idx < habitsVisible.length - 1) reorder(habitsVisible[idx].id, habitsVisible[idx + 1].id);
          renderView(container);
        };
      });

      card.setAttribute('draggable', 'true');
      card.addEventListener('dragstart', () => card.classList.add('is-dragging'));
      card.addEventListener('dragend', () => card.classList.remove('is-dragging'));
      card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drop-target'); });
      card.addEventListener('dragleave', () => card.classList.remove('drop-target'));
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drop-target');
        const draggingEl = container.querySelector('.is-dragging');
        if (draggingEl && draggingEl !== card) {
          reorder(draggingEl.dataset.id, card.dataset.id);
          renderView(container);
        }
      });
    });
  }

  function habitCardHTML(h, weekDates, index, total) {
    const streak = computeStreak(h.id);
    const best = computeBestStreak(h.id);
    const reorderBtns = `
      <div class="habit-reorder-btns" style="display:none;">
        ${index > 0 ? `<button class="habit-reorder-btn" data-reorder="up" title="Move up"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg></button>` : `<span style="width:32px;"></span>`}
        ${index < total - 1 ? `<button class="habit-reorder-btn" data-reorder="down" title="Move down"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></button>` : `<span style="width:32px;"></span>`}
      </div>`;
    return `
    <div class="card habit-card" data-id="${h.id}">
      <span class="drag-handle"><svg viewBox="0 0 10 18" fill="currentColor"><circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/><circle cx="2" cy="9" r="1.5"/><circle cx="8" cy="9" r="1.5"/><circle cx="2" cy="16" r="1.5"/><circle cx="8" cy="16" r="1.5"/></svg></span>
      <div class="habit-card-icon" style="background:${h.color}22;">${h.icon}</div>
      <div class="habit-card-body">
        <div class="habit-card-name">${Utils.escapeHtml(h.name)}</div>
        <div class="habit-card-meta">
          <span class="cat-tag" style="background:${h.color}22; color:${h.color};">${Utils.escapeHtml(h.category || 'Other')}</span>
          ${h.targetTime ? `<span>${Utils.formatTime12(h.targetTime)}</span>` : ''}
          <span>Best streak: ${best}d</span>
        </div>
      </div>
      <div class="habit-card-week">
        ${weekDates.map(d => {
          const key = Utils.dateKey(d);
          const done = isDone(h.id, key);
          const isToday = Utils.isSameDay(d, new Date());
          return `<div class="week-dot ${done ? 'is-done' : ''} ${isToday ? 'is-today' : ''}" data-week-toggle="${key}" title="${Utils.weekdayName(d)}">${Utils.weekdayName(d).slice(0, 1)}</div>`;
        }).join('')}
      </div>
      <div class="habit-card-streak"><span class="num">🔥${streak}</span><span class="lbl">streak</span></div>
      ${reorderBtns}
      <div class="habit-card-actions">
        <button class="icon-btn" data-edit title="Edit"><svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
        <button class="icon-btn" data-menu title="More"><svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg></button>
      </div>
    </div>`;
  }

  return {
    CATEGORIES, ICONS, COLORS,
    getHabits, isDone, toggleDone, computeStreak, computeBestStreak,
    completionRateLast, aggregateHeatmapData, todayCompletionStats,
    renderTodayList, openHabitModal, createHabit, updateHabit, deleteHabit,
    renderView
  };
})();
