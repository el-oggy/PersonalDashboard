/* ==========================================================================
   FlowOS — calendar.js
   Month / Week / Day calendar views with event CRUD.
   ========================================================================== */

const CalendarView = (() => {
  let cursor = new Date();       // the date currently in focus
  let mode = 'month';            // 'month' | 'week' | 'day'
  const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6am - 8pm

  function eventsOn(dateKey) {
    return State.get('events').filter(e => e.date === dateKey).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }

  function renderView(container) {
    container.innerHTML = `
      <div class="view">
        <div class="calendar-toolbar">
          <div class="calendar-nav">
            <button class="icon-btn" id="cal-prev"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>
            <h2 id="cal-title"></h2>
            <button class="icon-btn" id="cal-next"><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>
            <button class="btn btn-secondary btn-sm" id="cal-today">Today</button>
          </div>
          <div style="display:flex; gap:10px; align-items:center;">
            <div class="view-switch">
              <button data-mode="month" class="${mode === 'month' ? 'is-active' : ''}">Month</button>
              <button data-mode="week" class="${mode === 'week' ? 'is-active' : ''}">Week</button>
              <button data-mode="day" class="${mode === 'day' ? 'is-active' : ''}">Day</button>
            </div>
            <button class="btn btn-primary btn-sm" id="cal-add-event"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Event</button>
          </div>
        </div>
        <div class="card" style="padding:20px;" id="cal-body"></div>
      </div>
    `;

    container.querySelector('#cal-prev').onclick = () => { step(-1); renderView(container); };
    container.querySelector('#cal-next').onclick = () => { step(1); renderView(container); };
    container.querySelector('#cal-today').onclick = () => { cursor = new Date(); renderView(container); };
    container.querySelector('#cal-add-event').onclick = () => openEventModal(null, Utils.dateKey(cursor));
    container.querySelectorAll('[data-mode]').forEach(btn => {
      btn.onclick = () => { mode = btn.dataset.mode; renderView(container); };
    });

    const title = container.querySelector('#cal-title');
    const body = container.querySelector('#cal-body');

    if (mode === 'month') {
      title.textContent = `${Utils.monthName(cursor)} ${cursor.getFullYear()}`;
      renderMonth(body, container);
    } else if (mode === 'week') {
      const start = Utils.startOfWeek(cursor, 1);
      const end = Utils.addDays(start, 6);
      title.textContent = `${Utils.formatDate(start, { month: 'short', day: 'numeric' })} – ${Utils.formatDate(end, { month: 'short', day: 'numeric' })}`;
      renderWeek(body, container);
    } else {
      title.textContent = Utils.formatDate(cursor, { weekday: 'long', month: 'short', day: 'numeric' });
      renderDay(body, container);
    }
  }

  function step(dir) {
    if (mode === 'month') cursor = new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1);
    else if (mode === 'week') cursor = Utils.addDays(cursor, dir * 7);
    else cursor = Utils.addDays(cursor, dir);
  }

  function renderMonth(body, container) {
    const first = Utils.startOfMonth(cursor);
    const gridStart = Utils.startOfWeek(first, 1);
    const days = Array.from({ length: 42 }, (_, i) => Utils.addDays(gridStart, i));
    const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    body.innerHTML = `
      <div class="month-grid">
        ${weekdayLabels.map(d => `<div class="month-weekday">${d}</div>`).join('')}
        ${days.map(d => {
          const key = Utils.dateKey(d);
          const evts = eventsOn(key);
          const isOther = d.getMonth() !== cursor.getMonth();
          const isToday = Utils.isSameDay(d, new Date());
          return `
          <div class="month-cell ${isOther ? 'is-other-month' : ''} ${isToday ? 'is-today' : ''}" data-date="${key}">
            <div class="month-cell-date">${d.getDate()}</div>
            <div class="month-cell-events">
              ${evts.slice(0, 3).map(e => `<div class="month-event-chip" style="background:${e.color}22; color:${e.color};">${Utils.escapeHtml(e.title)}</div>`).join('')}
              ${evts.length > 3 ? `<div class="month-more">+${evts.length - 3} more</div>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    `;
    body.querySelectorAll('.month-cell').forEach(cell => {
      cell.onclick = () => openEventModal(null, cell.dataset.date);
    });
  }

  function renderWeek(body, container) {
    const start = Utils.startOfWeek(cursor, 1);
    const days = Array.from({ length: 7 }, (_, i) => Utils.addDays(start, i));

    let html = `<div class="week-grid">`;
    html += `<div class="week-day-header"></div>`;
    days.forEach(d => {
      const isToday = Utils.isSameDay(d, new Date());
      html += `<div class="week-day-header ${isToday ? 'is-today' : ''}"><div class="dow">${Utils.weekdayName(d)}</div><div class="dom">${d.getDate()}</div></div>`;
    });

    HOURS.forEach(h => {
      html += `<div class="hour-label">${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? 'PM' : 'AM'}</div>`;
      days.forEach(d => {
        const key = Utils.dateKey(d);
        html += `<div class="hour-cell" data-date="${key}" data-hour="${h}">`;
        const evts = eventsOn(key).filter(e => e.startTime && parseInt(e.startTime.split(':')[0], 10) === h);
        evts.forEach(e => {
          html += `<div class="week-event" data-id="${e.id}" style="background:${e.color}33; color:${e.color}; top:2px;">${Utils.escapeHtml(e.title)}</div>`;
        });
        html += `</div>`;
      });
    });
    html += `</div>`;
    body.innerHTML = html;

    body.querySelectorAll('.hour-cell').forEach(cell => {
      cell.onclick = (e) => {
        if (e.target.closest('.week-event')) return;
        openEventModal(null, cell.dataset.date, `${String(cell.dataset.hour).padStart(2, '0')}:00`);
      };
    });
    body.querySelectorAll('.week-event').forEach(chip => {
      chip.onclick = (e) => {
        e.stopPropagation();
        const evt = State.get('events').find(x => x.id === chip.dataset.id);
        openEventModal(evt);
      };
    });
  }

  function renderDay(body, container) {
    const key = Utils.dateKey(cursor);
    const evts = eventsOn(key);
    if (!evts.length) {
      body.innerHTML = `<div class="empty-state"><div class="empty-icon">🗓️</div><h3>Nothing scheduled</h3><p>Add an event to plan your day.</p></div>`;
      return;
    }
    body.innerHTML = `<div class="day-view-list">${evts.map(e => `
      <div class="card day-event-row" data-id="${e.id}">
        <div class="day-event-time">${e.startTime ? Utils.formatTime12(e.startTime) : 'All day'}</div>
        <div class="day-event-bar" style="background:${e.color};"></div>
        <div class="day-event-title">${Utils.escapeHtml(e.title)}</div>
        <button class="icon-btn" data-edit><svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
      </div>`).join('')}</div>`;
    body.querySelectorAll('[data-edit]').forEach(btn => {
      btn.onclick = () => {
        const row = btn.closest('.day-event-row');
        const evt = State.get('events').find(x => x.id === row.dataset.id);
        openEventModal(evt);
      };
    });
  }

  /* ---------------- Event modal ---------------- */
  function openEventModal(existing = null, defaultDate = null, defaultTime = '') {
    const isEdit = !!existing;
    const e = existing || { title: '', date: defaultDate || Utils.todayKey(), startTime: defaultTime, endTime: '', color: 'var(--cat-5)', notes: '' };

    UI.openModal(`
      <div class="modal-header"><h2>${isEdit ? 'Edit Event' : 'New Event'}</h2>
        <button class="icon-btn" id="modal-close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <div class="field"><label>Title</label><input type="text" id="evt-title" value="${Utils.escapeHtml(e.title)}" placeholder="e.g. Team standup" /></div>
      <div class="field-row">
        <div class="field"><label>Date</label><input type="date" id="evt-date" value="${e.date}" /></div>
        <div class="field"><label>Start</label><input type="time" id="evt-start" value="${e.startTime || ''}" /></div>
        <div class="field"><label>End</label><input type="time" id="evt-end" value="${e.endTime || ''}" /></div>
      </div>
      <div class="field">
        <label>Color</label>
        <div class="color-swatches" id="evt-colors">
          ${Habits.COLORS.map(c => `<button type="button" class="color-swatch ${c === e.color ? 'is-selected' : ''}" data-color="${c}" style="background:${c};"></button>`).join('')}
        </div>
      </div>
      <div class="field"><label>Notes</label><textarea id="evt-notes" placeholder="Details…">${Utils.escapeHtml(e.notes || '')}</textarea></div>
      <div class="modal-footer">
        ${isEdit ? `<button class="btn btn-danger" id="evt-delete">Delete</button>` : ''}
        <button class="btn btn-secondary" id="evt-cancel">Cancel</button>
        <button class="btn btn-primary" id="evt-save">${isEdit ? 'Save Changes' : 'Create Event'}</button>
      </div>
    `, {
      width: '460px',
      onMount: (panel) => {
        let selectedColor = e.color;
        panel.querySelector('#modal-close').onclick = UI.closeModal;
        panel.querySelector('#evt-cancel').onclick = UI.closeModal;
        panel.querySelectorAll('[data-color]').forEach(btn => {
          btn.onclick = () => {
            panel.querySelectorAll('[data-color]').forEach(b => b.classList.remove('is-selected'));
            btn.classList.add('is-selected');
            selectedColor = btn.dataset.color;
          };
        });
        if (isEdit) {
          panel.querySelector('#evt-delete').onclick = async () => {
            const ok = await UI.confirmDialog(`Delete "${e.title}"?`, { title: 'Delete Event' });
            if (ok) {
              const events = State.get('events').filter(x => x.id !== e.id);
              State.get('events').length = 0;
              State.get('events').push(...events);
              State.save('events');
              UI.closeModal();
              UI.refreshCurrent();
              UI.toast('Event deleted', 'info');
            }
          };
        }
        panel.querySelector('#evt-save').onclick = () => {
          const title = panel.querySelector('#evt-title').value.trim();
          if (!title) { UI.toast('Give your event a title', 'warn'); return; }
          const payload = {
            title,
            date: panel.querySelector('#evt-date').value || Utils.todayKey(),
            startTime: panel.querySelector('#evt-start').value,
            endTime: panel.querySelector('#evt-end').value,
            color: selectedColor,
            notes: panel.querySelector('#evt-notes').value.trim(),
          };
          if (isEdit) {
            Object.assign(e, payload);
          } else {
            State.get('events').push({ id: Utils.uid('evt'), ...payload });
            State.logActivity(`Scheduled <b>${Utils.escapeHtml(title)}</b>`, 'calendar');
          }
          State.save('events');
          UI.closeModal();
          UI.refreshCurrent();
          UI.toast(isEdit ? 'Event updated' : 'Event created', 'success');
        };
      }
    });
  }

  function todaysEvents() {
    return eventsOn(Utils.todayKey());
  }

  return { renderView, openEventModal, todaysEvents, eventsOn };
})();
