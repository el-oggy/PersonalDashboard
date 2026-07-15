/* ==========================================================================
   FlowOS — goals.js
   Long-term goals with milestone checklists and progress bars.
   ========================================================================== */

const Goals = (() => {

  function getGoals() {
    return State.get('goals');
  }

  function goalProgress(goal) {
    if (!goal.milestones.length) return 0;
    const done = goal.milestones.filter(m => m.done).length;
    return Math.round((done / goal.milestones.length) * 100);
  }

  function daysLeft(goal) {
    if (!goal.deadline) return null;
    return Utils.daysBetween(new Date(), Utils.keyToDate(goal.deadline));
  }

  function renderView(container) {
    const goals = getGoals();
    container.innerHTML = `
      <div class="view">
        <div class="section-heading">
          <h2 style="font-family:var(--font-display); font-size:19px;">Long-Term Goals</h2>
          <button class="btn btn-primary btn-sm" id="add-goal-btn"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>New Goal</button>
        </div>
        <div class="goals-grid" id="goals-grid">
          ${goals.length ? goals.map(g => goalCardHTML(g)).join('') : `<div class="empty-state"><div class="empty-icon">🎯</div><h3>No goals yet</h3><p>Set a long-term goal and break it into milestones.</p></div>`}
        </div>
      </div>
    `;
    container.querySelector('#add-goal-btn').onclick = () => openGoalModal();

    container.querySelectorAll('.goal-card').forEach(card => {
      const goal = goals.find(g => g.id === card.dataset.id);
      card.querySelectorAll('[data-ms]').forEach(row => {
        row.onclick = () => {
          const ms = goal.milestones.find(m => m.id === row.dataset.ms);
          ms.done = !ms.done;
          if (ms.done) {
            Achievements.awardXP(20, `Completed milestone <b>${Utils.escapeHtml(ms.text)}</b>`);
            State.logActivity(`Completed milestone <b>${Utils.escapeHtml(ms.text)}</b> in <b>${Utils.escapeHtml(goal.title)}</b>`, 'goal');
            UI.confetti();
          }
          State.save('goals');
          renderView(container);
          UI.updateSidebarLevel();
        };
      });
      card.querySelector('[data-edit]').onclick = () => openGoalModal(goal);
    });
  }

  function goalCardHTML(g) {
    const pct = goalProgress(g);
    const dl = daysLeft(g);
    return `
    <div class="card goal-card" data-id="${g.id}">
      <div class="goal-card-top">
        <div style="display:flex; gap:12px; align-items:flex-start;">
          <div class="goal-icon" style="background:${g.color}22;">${g.icon}</div>
          <div>
            <div class="goal-title">${Utils.escapeHtml(g.title)}</div>
            <div class="goal-deadline">${dl !== null ? (dl >= 0 ? `${dl} days left` : `${Math.abs(dl)} days overdue`) : 'No deadline'}</div>
          </div>
        </div>
        <button class="icon-btn" data-edit><svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
      </div>
      <div>
        <div class="goal-progress-track"><div class="goal-progress-fill" style="width:${pct}%; background:${g.color};"></div></div>
        <div class="goal-progress-label"><span>${pct}% complete</span><span>${g.milestones.filter(m => m.done).length}/${g.milestones.length} milestones</span></div>
      </div>
      <div class="milestone-list">
        ${g.milestones.map(m => `
          <div class="milestone-row" data-ms="${m.id}">
            <div class="milestone-check ${m.done ? 'is-done' : ''}"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg></div>
            <span class="milestone-text ${m.done ? 'is-done' : ''}">${Utils.escapeHtml(m.text)}</span>
          </div>`).join('')}
      </div>
    </div>`;
  }

  function openGoalModal(existing = null) {
    const isEdit = !!existing;
    const g = existing || { title: '', icon: '🎯', color: Habits.COLORS[0], deadline: '', milestones: [] };
    let milestones = g.milestones.map(m => ({ ...m }));

    function renderMilestoneInputs(panel) {
      const wrap = panel.querySelector('#ms-list');
      wrap.innerHTML = milestones.map((m, i) => `
        <div class="field-row" data-ms-row="${i}" style="align-items:center; margin-bottom:8px;">
          <input type="text" class="ms-text-input" data-idx="${i}" value="${Utils.escapeHtml(m.text)}" placeholder="Milestone description" style="flex:1; background:var(--surface-2); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); padding:9px 11px; font-size:13px;" />
          <button type="button" class="icon-btn" data-remove-ms="${i}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        </div>
      `).join('');
      wrap.querySelectorAll('.ms-text-input').forEach(input => {
        input.oninput = () => { milestones[input.dataset.idx].text = input.value; };
      });
      wrap.querySelectorAll('[data-remove-ms]').forEach(btn => {
        btn.onclick = () => { milestones.splice(Number(btn.dataset.removeMs), 1); renderMilestoneInputs(panel); };
      });
    }

    UI.openModal(`
      <div class="modal-header"><h2>${isEdit ? 'Edit Goal' : 'New Goal'}</h2>
        <button class="icon-btn" id="modal-close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <div class="field"><label>Title</label><input type="text" id="goal-title" value="${Utils.escapeHtml(g.title)}" placeholder="e.g. Run a marathon" /></div>
      <div class="field">
        <label>Icon</label>
        <div class="icon-picker" id="goal-icons">
          ${['🎯','🚀','📚','💪','🏆','🌟','💰','🧘','✈️','🎓','🏠','🎨'].map(i => `<button type="button" class="icon-pick ${i === g.icon ? 'is-selected' : ''}" data-icon="${i}">${i}</button>`).join('')}
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Color</label>
          <div class="color-swatches" id="goal-colors">
            ${Habits.COLORS.map(c => `<button type="button" class="color-swatch ${c === g.color ? 'is-selected' : ''}" data-color="${c}" style="background:${c};"></button>`).join('')}
          </div>
        </div>
        <div class="field"><label>Deadline</label><input type="date" id="goal-deadline" value="${g.deadline || ''}" /></div>
      </div>
      <div class="field">
        <label>Milestones</label>
        <div id="ms-list"></div>
        <button type="button" class="btn btn-secondary btn-sm" id="ms-add" style="align-self:flex-start;">+ Add Milestone</button>
      </div>
      <div class="modal-footer">
        ${isEdit ? `<button class="btn btn-danger" id="goal-delete">Delete</button>` : ''}
        <button class="btn btn-secondary" id="goal-cancel">Cancel</button>
        <button class="btn btn-primary" id="goal-save">${isEdit ? 'Save Changes' : 'Create Goal'}</button>
      </div>
    `, {
      width: '480px',
      onMount: (panel) => {
        let selectedIcon = g.icon, selectedColor = g.color;
        renderMilestoneInputs(panel);
        panel.querySelector('#modal-close').onclick = UI.closeModal;
        panel.querySelector('#goal-cancel').onclick = UI.closeModal;
        panel.querySelector('#ms-add').onclick = () => { milestones.push({ id: Utils.uid('ms'), text: '', done: false }); renderMilestoneInputs(panel); };
        panel.querySelectorAll('[data-icon]').forEach(btn => {
          btn.onclick = () => { panel.querySelectorAll('[data-icon]').forEach(b => b.classList.remove('is-selected')); btn.classList.add('is-selected'); selectedIcon = btn.dataset.icon; };
        });
        panel.querySelectorAll('[data-color]').forEach(btn => {
          btn.onclick = () => { panel.querySelectorAll('[data-color]').forEach(b => b.classList.remove('is-selected')); btn.classList.add('is-selected'); selectedColor = btn.dataset.color; };
        });
        if (isEdit) {
          panel.querySelector('#goal-delete').onclick = async () => {
            const ok = await UI.confirmDialog(`Delete goal "${g.title}"?`, { title: 'Delete Goal' });
            if (ok) {
              const remaining = getGoals().filter(x => x.id !== g.id);
              State.get('goals').length = 0;
              State.get('goals').push(...remaining);
              State.save('goals');
              UI.closeModal();
              UI.refreshCurrent();
              UI.toast('Goal deleted', 'info');
            }
          };
        }
        panel.querySelector('#goal-save').onclick = () => {
          const title = panel.querySelector('#goal-title').value.trim();
          if (!title) { UI.toast('Give your goal a title', 'warn'); return; }
          const cleanMilestones = milestones.filter(m => m.text.trim()).map(m => ({ id: m.id || Utils.uid('ms'), text: m.text.trim(), done: !!m.done }));
          const payload = { title, icon: selectedIcon, color: selectedColor, deadline: panel.querySelector('#goal-deadline').value, milestones: cleanMilestones };
          if (isEdit) {
            Object.assign(g, payload);
          } else {
            State.get('goals').push({ id: Utils.uid('goal'), createdAt: Date.now(), ...payload });
            State.logActivity(`Created goal <b>${Utils.escapeHtml(title)}</b>`, 'goal');
          }
          State.save('goals');
          UI.closeModal();
          UI.refreshCurrent();
          UI.toast(isEdit ? 'Goal updated' : 'Goal created', 'success');
        };
      }
    });
  }

  return { renderView, openGoalModal, getGoals, goalProgress };
})();
