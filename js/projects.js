/* ==========================================================================
   FlowOS — projects.js
   Kanban-style project boards. Columns are fixed per project ("Backlog",
   "In Progress", "Review", "Done" by default) and cards can be dragged
   between them.
   ========================================================================== */

const Projects = (() => {
  let activeProjectId = null;

  function getProjects() {
    return State.get('projects');
  }

  function activeProject() {
    const projects = getProjects();
    if (!projects.length) return null;
    if (!activeProjectId || !projects.find(p => p.id === activeProjectId)) {
      activeProjectId = projects[0].id;
    }
    return projects.find(p => p.id === activeProjectId);
  }

  function projectProgress(project) {
    if (!project.cards.length) return 0;
    const doneCol = project.columns[project.columns.length - 1];
    const done = project.cards.filter(c => c.columnId === doneCol.id).length;
    return Math.round((done / project.cards.length) * 100);
  }

  function renderView(container) {
    const projects = getProjects();
    if (!projects.length) {
      container.innerHTML = `<div class="view"><div class="empty-state"><div class="empty-icon">📋</div><h3>No projects yet</h3><p>Create a project to start organizing work into a Kanban board.</p><button class="btn btn-primary" id="empty-add-proj" style="margin-top:8px;">New Project</button></div></div>`;
      container.querySelector('#empty-add-proj').onclick = () => openProjectModal();
      return;
    }
    const project = activeProject();

    container.innerHTML = `
      <div class="view">
        <div class="projects-toolbar">
          <div class="project-tabs" id="project-tabs">
            ${projects.map(p => `
              <button class="project-tab ${p.id === project.id ? 'is-active' : ''}" data-id="${p.id}">
                <span class="dot" style="background:${p.color};"></span>${Utils.escapeHtml(p.name)}
              </button>`).join('')}
          </div>
          <div style="display:flex; gap:8px;">
            <button class="icon-btn" id="proj-edit" title="Edit project"><svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg></button>
            <button class="btn btn-primary btn-sm" id="proj-new"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Project</button>
          </div>
        </div>
        <div class="project-progress-bar"><div class="project-progress-fill" style="width:${projectProgress(project)}%;"></div></div>
        <div class="kanban-board" id="kanban-board"></div>
      </div>
    `;

    renderBoard(container.querySelector('#kanban-board'), project);

    container.querySelectorAll('[data-id]').forEach(tab => {
      tab.onclick = () => { activeProjectId = tab.dataset.id; renderView(container); };
    });
    container.querySelector('#proj-new').onclick = () => openProjectModal();
    container.querySelector('#proj-edit').onclick = () => openProjectModal(project);
  }

  function renderBoard(boardEl, project) {
    boardEl.innerHTML = project.columns.map(col => {
      const cards = project.cards.filter(c => c.columnId === col.id).sort((a, b) => a.order - b.order);
      return `
      <div class="kanban-col" data-col="${col.id}">
        <div class="kanban-col-header">
          <span class="kanban-col-title">${Utils.escapeHtml(col.name)} <span class="kanban-col-count">${cards.length}</span></span>
        </div>
        <div class="kanban-cards" data-col-cards="${col.id}">
          ${cards.map(c => cardHTML(c, project)).join('')}
        </div>
        <button class="add-card-btn" data-add-to="${col.id}"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>Add card</button>
      </div>`;
    }).join('');

    const isTouch = window.innerWidth <= 768;

    boardEl.querySelectorAll('.kanban-card').forEach(card => {
      card.setAttribute('draggable', 'true');
      card.addEventListener('dragstart', () => card.classList.add('is-dragging'));
      card.addEventListener('dragend', () => card.classList.remove('is-dragging'));

      // Show move buttons on touch devices
      if (isTouch) {
        const moveDiv = card.querySelector('.kanban-card-move');
        if (moveDiv) moveDiv.style.display = 'block';
        // Wire move button clicks
        card.querySelectorAll('[data-move-to]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetColId = btn.dataset.moveTo;
            const c = project.cards.find(x => x.id === card.dataset.id);
            if (!c) return;
            const wasDone = isDoneColumn(project, c.columnId);
            c.columnId = targetColId;
            c.order = project.cards.filter(x => x.columnId === targetColId).length;
            State.save('projects');
            const nowDone = isDoneColumn(project, targetColId);
            if (!wasDone && nowDone) {
              Achievements.awardXP(15, `Completed task <b>${Utils.escapeHtml(c.title)}</b>`);
              State.logActivity(`Moved <b>${Utils.escapeHtml(c.title)}</b> to Done`, 'project');
              UI.confetti();
            }
            UI.refreshCurrent();
            UI.updateSidebarLevel();
          });
        });
      }

      // Tap card to edit (touch also works)
      card.addEventListener('click', (e) => {
        // Don't open modal if a move button was clicked
        if (e.target.closest('[data-move-to]')) return;
        const c = project.cards.find(x => x.id === card.dataset.id);
        openCardModal(c, project);
      });
    });

    boardEl.querySelectorAll('.kanban-col').forEach(col => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drop-target'); });
      col.addEventListener('dragleave', () => col.classList.remove('drop-target'));
      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drop-target');
        const draggingEl = boardEl.querySelector('.is-dragging');
        if (!draggingEl) return;
        const card = project.cards.find(x => x.id === draggingEl.dataset.id);
        const targetColId = col.dataset.col;
        const wasDone = isDoneColumn(project, card.columnId);
        card.columnId = targetColId;
        card.order = project.cards.filter(x => x.columnId === targetColId).length;
        State.save('projects');
        const nowDone = isDoneColumn(project, targetColId);
        if (!wasDone && nowDone) {
          Achievements.awardXP(15, `Completed task <b>${Utils.escapeHtml(card.title)}</b>`);
          State.logActivity(`Moved <b>${Utils.escapeHtml(card.title)}</b> to Done`, 'project');
          UI.confetti();
        }
        UI.refreshCurrent();
        UI.updateSidebarLevel();
      });
    });

    boardEl.querySelectorAll('[data-add-to]').forEach(btn => {
      btn.onclick = () => openCardModal({ columnId: btn.dataset.addTo }, project);
    });
  }

  function isDoneColumn(project, colId) {
    return project.columns[project.columns.length - 1].id === colId;
  }

  function cardHTML(c, project) {
    const pClass = c.priority === 'high' ? 'priority-high' : c.priority === 'low' ? 'priority-low' : 'priority-med';
    const currentColName = (project.columns.find(col => col.id === c.columnId) || {}).name || '';
    const otherCols = project.columns.filter(col => col.id !== c.columnId);
    return `
    <div class="kanban-card" data-id="${c.id}">
      <div class="kanban-card-title">${Utils.escapeHtml(c.title)}</div>
      <div class="kanban-card-footer">
        <span class="kanban-card-priority ${pClass}">${c.priority || 'med'}</span>
        ${c.due ? `<span class="kanban-card-due">${Utils.formatDate(Utils.keyToDate(c.due), { month: 'short', day: 'numeric' })}</span>` : '<span></span>'}
      </div>
      <div class="kanban-card-move" style="display:none;">
        <span style="font-size:10px; color:var(--text-tertiary);">Move to:</span>
        <div class="kanban-move-col">
          ${otherCols.map(col => `<button class="kanban-move-btn" data-move-to="${col.id}">${Utils.escapeHtml(col.name)}</button>`).join('')}
        </div>
      </div>
    </div>`;
  }

  /* ---------------- Card modal ---------------- */
  function openCardModal(existing, project) {
    project = project || activeProject();
    if (!project) { UI.toast('Create a project first', 'warn'); return; }
    const isEdit = !!existing.id;
    const c = existing.id ? existing : { title: '', columnId: existing.columnId || project.columns[0].id, priority: 'med', due: '' };

    UI.openModal(`
      <div class="modal-header"><h2>${isEdit ? 'Edit Task' : 'New Task'}</h2>
        <button class="icon-btn" id="modal-close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <div class="field"><label>Title</label><input type="text" id="card-title" value="${Utils.escapeHtml(c.title)}" placeholder="What needs doing?" /></div>
      <div class="field-row">
        <div class="field">
          <label>Column</label>
          <select id="card-col">${project.columns.map(col => `<option value="${col.id}" ${col.id === c.columnId ? 'selected' : ''}>${Utils.escapeHtml(col.name)}</option>`).join('')}</select>
        </div>
        <div class="field">
          <label>Priority</label>
          <select id="card-priority">
            <option value="low" ${c.priority === 'low' ? 'selected' : ''}>Low</option>
            <option value="med" ${c.priority === 'med' ? 'selected' : ''}>Medium</option>
            <option value="high" ${c.priority === 'high' ? 'selected' : ''}>High</option>
          </select>
        </div>
      </div>
      <div class="field"><label>Due Date</label><input type="date" id="card-due" value="${c.due || ''}" /></div>
      <div class="modal-footer">
        ${isEdit ? `<button class="btn btn-danger" id="card-delete">Delete</button>` : ''}
        <button class="btn btn-secondary" id="card-cancel">Cancel</button>
        <button class="btn btn-primary" id="card-save">${isEdit ? 'Save Changes' : 'Create Task'}</button>
      </div>
    `, {
      width: '440px',
      onMount: (panel) => {
        panel.querySelector('#modal-close').onclick = UI.closeModal;
        panel.querySelector('#card-cancel').onclick = UI.closeModal;
        if (isEdit) {
          panel.querySelector('#card-delete').onclick = async () => {
            const ok = await UI.confirmDialog(`Delete "${c.title}"?`, { title: 'Delete Task' });
            if (ok) {
              project.cards = project.cards.filter(x => x.id !== c.id);
              State.save('projects');
              UI.closeModal();
              UI.refreshCurrent();
              UI.toast('Task deleted', 'info');
            }
          };
        }
        panel.querySelector('#card-save').onclick = () => {
          const title = panel.querySelector('#card-title').value.trim();
          if (!title) { UI.toast('Give your task a title', 'warn'); return; }
          const payload = {
            title,
            columnId: panel.querySelector('#card-col').value,
            priority: panel.querySelector('#card-priority').value,
            due: panel.querySelector('#card-due').value,
          };
          if (isEdit) {
            Object.assign(c, payload);
          } else {
            project.cards.push({ id: Utils.uid('card'), order: project.cards.filter(x => x.columnId === payload.columnId).length, ...payload });
            State.logActivity(`Added task <b>${Utils.escapeHtml(title)}</b>`, 'project');
          }
          State.save('projects');
          UI.closeModal();
          UI.refreshCurrent();
          UI.toast(isEdit ? 'Task updated' : 'Task created', 'success');
        };
      }
    });
  }

  /* ---------------- Project modal ---------------- */
  function openProjectModal(existing = null) {
    const isEdit = !!existing;
    const p = existing || { name: '', color: Habits.COLORS[0] };

    UI.openModal(`
      <div class="modal-header"><h2>${isEdit ? 'Edit Project' : 'New Project'}</h2>
        <button class="icon-btn" id="modal-close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <div class="field"><label>Name</label><input type="text" id="proj-name" value="${Utils.escapeHtml(p.name)}" placeholder="e.g. Website Redesign" /></div>
      <div class="field">
        <label>Color</label>
        <div class="color-swatches" id="proj-colors">
          ${Habits.COLORS.map(cc => `<button type="button" class="color-swatch ${cc === p.color ? 'is-selected' : ''}" data-color="${cc}" style="background:${cc};"></button>`).join('')}
        </div>
      </div>
      <div class="modal-footer">
        ${isEdit ? `<button class="btn btn-danger" id="proj-delete">Delete</button>` : ''}
        <button class="btn btn-secondary" id="proj-cancel">Cancel</button>
        <button class="btn btn-primary" id="proj-save">${isEdit ? 'Save Changes' : 'Create Project'}</button>
      </div>
    `, {
      width: '420px',
      onMount: (panel) => {
        let selectedColor = p.color;
        panel.querySelector('#modal-close').onclick = UI.closeModal;
        panel.querySelector('#proj-cancel').onclick = UI.closeModal;
        panel.querySelectorAll('[data-color]').forEach(btn => {
          btn.onclick = () => {
            panel.querySelectorAll('[data-color]').forEach(b => b.classList.remove('is-selected'));
            btn.classList.add('is-selected');
            selectedColor = btn.dataset.color;
          };
        });
        if (isEdit) {
          panel.querySelector('#proj-delete').onclick = async () => {
            const ok = await UI.confirmDialog(`Delete project "${p.name}" and all its tasks?`, { title: 'Delete Project' });
            if (ok) {
              const remaining = getProjects().filter(x => x.id !== p.id);
              State.get('projects').length = 0;
              State.get('projects').push(...remaining);
              State.save('projects');
              activeProjectId = null;
              UI.closeModal();
              UI.refreshCurrent();
              UI.toast('Project deleted', 'info');
            }
          };
        }
        panel.querySelector('#proj-save').onclick = () => {
          const name = panel.querySelector('#proj-name').value.trim();
          if (!name) { UI.toast('Give your project a name', 'warn'); return; }
          if (isEdit) {
            p.name = name; p.color = selectedColor;
          } else {
            const col = (n) => ({ id: Utils.uid('col'), name: n });
            const cols = [col('Backlog'), col('In Progress'), col('Review'), col('Done')];
            const np = { id: Utils.uid('proj'), name, color: selectedColor, columns: cols, cards: [], createdAt: Date.now() };
            State.get('projects').push(np);
            activeProjectId = np.id;
            State.logActivity(`Created project <b>${Utils.escapeHtml(name)}</b>`, 'project');
          }
          State.save('projects');
          UI.closeModal();
          UI.refreshCurrent();
          UI.toast(isEdit ? 'Project updated' : 'Project created', 'success');
        };
      }
    });
  }

  function stats() {
    const projects = getProjects();
    let totalCards = 0, doneCards = 0;
    projects.forEach(p => {
      totalCards += p.cards.length;
      const doneCol = p.columns[p.columns.length - 1];
      doneCards += p.cards.filter(c => c.columnId === doneCol.id).length;
    });
    return { totalCards, doneCards, totalProjects: projects.length };
  }

  return { renderView, openProjectModal, openCardModal, getProjects, projectProgress, stats };
})();
