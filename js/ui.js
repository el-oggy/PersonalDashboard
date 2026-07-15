/* ==========================================================================
   FlowOS — ui.js
   Router, modal system, toasts, command palette, sidebar chrome.
   Each view module (habits.js, calendar.js, ...) registers a render function
   via UI.registerView(name, renderFn) and UI.navigate(name) swaps views.
   ========================================================================== */

const UI = (() => {
  const viewContainer = () => document.getElementById('view-container');
  const pageTitle = () => document.getElementById('page-title');
  const views = {};
  let currentRoute = 'dashboard';

  const routeTitles = {
    dashboard: 'Dashboard', habits: 'Habits', calendar: 'Calendar',
    projects: 'Projects', goals: 'Goals', notes: 'Notes',
    stats: 'Analytics', achievements: 'Achievements', settings: 'Settings'
  };

  function registerView(name, renderFn) {
    views[name] = renderFn;
  }

  function navigate(name) {
    if (!views[name]) return;
    currentRoute = name;
    document.querySelectorAll('.nav-item[data-route]').forEach(el => {
      el.classList.toggle('is-active', el.dataset.route === name);
    });
    pageTitle().textContent = routeTitles[name] || name;
    const container = viewContainer();
    container.classList.remove('view');
    void container.offsetWidth; // restart animation
    views[name](container);
    window.location.hash = name;
  }

  function refreshCurrent() {
    if (views[currentRoute]) views[currentRoute](viewContainer());
  }

  /* ---------------- Sidebar level ring ---------------- */
  function xpForLevel(level) {
    return 100 + (level - 1) * 60; // xp required to go from level -> level+1
  }

  function levelFromXP(totalXP) {
    let level = 1;
    let remaining = totalXP;
    while (remaining >= xpForLevel(level)) {
      remaining -= xpForLevel(level);
      level++;
    }
    return { level, into: remaining, need: xpForLevel(level) };
  }

  function updateSidebarLevel() {
    const xp = State.get('xp').total || 0;
    const { level, into, need } = levelFromXP(xp);
    const pct = Utils.clamp((into / need) * 100, 0, 100);
    const circumference = 2 * Math.PI * 17;
    const offset = circumference - (pct / 100) * circumference;
    document.getElementById('sidebar-level-num').textContent = level;
    document.getElementById('sidebar-level-label').textContent = level;
    document.getElementById('sidebar-xp-label').textContent = `${into} / ${need} XP`;
    const ring = document.getElementById('sidebar-ring-fill');
    ring.style.strokeDasharray = String(circumference);
    ring.style.strokeDashoffset = String(offset);
  }

  /* ---------------- Toasts ---------------- */
  const TOAST_ICONS = {
    success: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>',
    info: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
    warn: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 9v4M12 17h.01M10.3 3.9L2.8 17a1.8 1.8 0 001.5 2.7h15.4a1.8 1.8 0 001.5-2.7L13.7 3.9a1.8 1.8 0 00-3.4 0z"/></svg>',
    danger: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };

  function toast(message, type = 'info', ms = 3200) {
    const stack = document.getElementById('toast-stack');
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `
      <span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
      <span class="toast-text">${message}</span>
      <span class="toast-progress" style="animation-duration:${ms}ms;"></span>
    `;
    stack.appendChild(el);
    setTimeout(() => {
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 200);
    }, ms);
  }

  /* ---------------- Modal ---------------- */
  function openModal(html, { onMount, width } = {}) {
    const overlay = document.getElementById('modal-overlay');
    const panel = document.getElementById('modal-panel');
    panel.innerHTML = html;
    if (width) panel.style.width = width;
    overlay.classList.add('is-open');
    if (onMount) onMount(panel);
    const escHandler = (e) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', escHandler);
    overlay._escHandler = escHandler;
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('is-open');
    document.getElementById('modal-panel').style.width = '';
    if (overlay._escHandler) document.removeEventListener('keydown', overlay._escHandler);
  }

  function confirmDialog(message, { title = 'Are you sure?', danger = true, confirmLabel = 'Delete' } = {}) {
    return new Promise((resolve) => {
      openModal(`
        <div class="modal-header"><h2>${Utils.escapeHtml(title)}</h2></div>
        <p style="color:var(--text-secondary); font-size:13.5px; line-height:1.6;">${Utils.escapeHtml(message)}</p>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="confirm-cancel">Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">${Utils.escapeHtml(confirmLabel)}</button>
        </div>
      `, {
        onMount: (panel) => {
          panel.querySelector('#confirm-cancel').onclick = () => { closeModal(); resolve(false); };
          panel.querySelector('#confirm-ok').onclick = () => { closeModal(); resolve(true); };
        }
      });
    });
  }

  /* ---------------- Context menu ---------------- */
  function openContextMenu(x, y, items) {
    closeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.id = 'active-context-menu';
    items.forEach(item => {
      if (item.divider) {
        const hr = document.createElement('div');
        hr.style.cssText = 'height:1px;background:var(--border-subtle);margin:4px 0;';
        menu.appendChild(hr);
        return;
      }
      const btn = document.createElement('button');
      if (item.danger) btn.classList.add('danger');
      btn.textContent = item.label;
      btn.onclick = () => { closeContextMenu(); item.action(); };
      menu.appendChild(btn);
    });
    document.body.appendChild(menu);
    const rect = menu.getBoundingClientRect();
    const px = Math.min(x, window.innerWidth - rect.width - 10);
    const py = Math.min(y, window.innerHeight - rect.height - 10);
    menu.style.left = px + 'px';
    menu.style.top = py + 'px';
    setTimeout(() => document.addEventListener('click', closeContextMenu, { once: true }), 0);
  }

  function closeContextMenu() {
    const el = document.getElementById('active-context-menu');
    if (el) el.remove();
  }

  /* ---------------- Command Palette (⌘K / Ctrl+K) ----------------
     Unifies "quick add" actions, page navigation, and a live search across
     habits, notes, projects, tasks, goals, and calendar events. Arrow keys
     move the selection, Enter runs it, Escape closes. */
  const COMMANDS = [
    { icon: '🧘', label: 'New Habit', hint: 'Track a daily behavior', section: 'Create', action: () => Habits.openHabitModal() },
    { icon: '📝', label: 'New Note', hint: 'Capture a thought', section: 'Create', action: () => Notes.createAndOpen() },
    { icon: '✅', label: 'New Task', hint: 'Add to a project board', section: 'Create', action: () => Projects.openCardModal() },
    { icon: '🗓️', label: 'New Event', hint: 'Schedule something', section: 'Create', action: () => CalendarView.openEventModal() },
    { icon: '🎯', label: 'New Goal', hint: 'Set a long-term target', section: 'Create', action: () => Goals.openGoalModal() },
    { icon: '🏠', label: 'Go to Dashboard', hint: '', section: 'Navigate', action: () => navigate('dashboard') },
    { icon: '🔁', label: 'Go to Habits', hint: '', section: 'Navigate', action: () => navigate('habits') },
    { icon: '📅', label: 'Go to Calendar', hint: '', section: 'Navigate', action: () => navigate('calendar') },
    { icon: '📋', label: 'Go to Projects', hint: '', section: 'Navigate', action: () => navigate('projects') },
    { icon: '🏆', label: 'Go to Goals', hint: '', section: 'Navigate', action: () => navigate('goals') },
    { icon: '📖', label: 'Go to Notes', hint: '', section: 'Navigate', action: () => navigate('notes') },
    { icon: '📈', label: 'Go to Analytics', hint: '', section: 'Navigate', action: () => navigate('stats') },
    { icon: '🥇', label: 'Go to Achievements', hint: '', section: 'Navigate', action: () => navigate('achievements') },
    { icon: '⚙️', label: 'Go to Settings', hint: '', section: 'Navigate', action: () => navigate('settings') },
  ];

  let paletteFlatItems = [];
  let paletteSelectedIdx = 0;

  function openQuickAdd() {
    const overlay = document.getElementById('palette-overlay');
    const panel = document.getElementById('palette-panel');
    panel.innerHTML = `
      <div class="palette-input-row">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
        <input id="palette-input" type="text" placeholder="Search or run a command…" autocomplete="off" />
      </div>
      <div id="palette-results"></div>
    `;
    overlay.classList.add('is-open');
    const input = panel.querySelector('#palette-input');
    const resultsEl = panel.querySelector('#palette-results');

    function buildSections(query) {
      const q = query.trim().toLowerCase();
      const sections = [];

      const cmdMatches = COMMANDS.filter(c => !q || c.label.toLowerCase().includes(q));
      if (cmdMatches.length) {
        ['Create', 'Navigate'].forEach(sec => {
          const items = cmdMatches.filter(c => c.section === sec);
          if (items.length) sections.push({ title: sec, items: items.map(c => ({ icon: c.icon, label: c.label, hint: c.hint, type: 'Command', action: c.action })) });
        });
      }

      if (q && typeof App !== 'undefined' && App.performSearch) {
        const found = App.performSearch(q);
        if (found.length) {
          sections.push({
            title: 'Results',
            items: found.map(r => ({ icon: searchIcon(r.type), label: r.label, hint: '', type: r.type, action: r.action }))
          });
        }
      }
      return sections;
    }

    function searchIcon(type) {
      return { Habit: '🔁', Note: '📝', Project: '📋', Task: '✅', Goal: '🎯' }[type] || '🔎';
    }

    function render(query = '') {
      const sections = buildSections(query);
      paletteFlatItems = [];
      if (!sections.length) {
        resultsEl.innerHTML = `<div class="palette-empty">No matches. Try a different search.</div>`;
        return;
      }
      resultsEl.innerHTML = sections.map(sec => `
        <div class="palette-section-label">${sec.title}</div>
        ${sec.items.map(item => {
          const idx = paletteFlatItems.push(item) - 1;
          return `
          <button class="palette-option" data-idx="${idx}">
            <span class="p-icon">${item.icon}</span>
            <span class="p-main">
              <span class="p-label">${Utils.escapeHtml(item.label)}</span>
              ${item.hint ? `<span class="p-hint">${Utils.escapeHtml(item.hint)}</span>` : ''}
            </span>
            <span class="p-type">${item.type}</span>
          </button>`;
        }).join('')}
      `).join('');

      resultsEl.querySelectorAll('.palette-option').forEach(btn => {
        btn.onclick = () => runSelected(Number(btn.dataset.idx));
        btn.onmouseenter = () => setSelected(Number(btn.dataset.idx));
      });
      paletteSelectedIdx = 0;
      setSelected(0);
    }

    function setSelected(idx) {
      paletteSelectedIdx = Utils.clamp(idx, 0, paletteFlatItems.length - 1);
      resultsEl.querySelectorAll('.palette-option').forEach(btn => {
        btn.classList.toggle('is-selected', Number(btn.dataset.idx) === paletteSelectedIdx);
      });
      const activeEl = resultsEl.querySelector('.palette-option.is-selected');
      if (activeEl && typeof activeEl.scrollIntoView === 'function') activeEl.scrollIntoView({ block: 'nearest' });
    }

    function runSelected(idx) {
      const item = paletteFlatItems[idx];
      if (!item) return;
      closeQuickAdd();
      item.action();
    }

    render();
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(paletteSelectedIdx + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(paletteSelectedIdx - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); runSelected(paletteSelectedIdx); }
    });
    setTimeout(() => input.focus(), 50);
    overlay.onclick = (e) => { if (e.target === overlay) closeQuickAdd(); };
    document._paletteEsc = (e) => { if (e.key === 'Escape') closeQuickAdd(); };
    document.addEventListener('keydown', document._paletteEsc);
  }

  function closeQuickAdd() {
    document.getElementById('palette-overlay').classList.remove('is-open');
    if (document._paletteEsc) document.removeEventListener('keydown', document._paletteEsc);
  }

  /* ---------------- Confetti ---------------- */
  function confetti() {
    const colors = ['#7c7aff', '#57d9c4', '#ffb454', '#ff6b8b', '#5aa9ff'];
    for (let i = 0; i < 24; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = (40 + Math.random() * 20) + 'vw';
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = (Math.random() * 0.2) + 's';
      piece.style.top = (30 + Math.random() * 10) + 'vh';
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 1400);
    }
  }

  return {
    registerView, navigate, refreshCurrent, updateSidebarLevel, levelFromXP,
    toast, openModal, closeModal, confirmDialog,
    openContextMenu, closeContextMenu,
    openQuickAdd, closeQuickAdd, confetti
  };
})();
