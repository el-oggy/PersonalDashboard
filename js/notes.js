/* ==========================================================================
   FlowOS — notes.js
   Notes list + editor pane. Autosaves on input with a short debounce.
   ========================================================================== */

const Notes = (() => {
  let activeNoteId = null;
  const debouncedSave = Utils.debounce(() => { State.saveImmediate('notes'); }, 500);

  function getNotes() {
    return [...State.get('notes')].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  function activeNote() {
    const notes = getNotes();
    if (!notes.length) return null;
    if (!activeNoteId || !notes.find(n => n.id === activeNoteId)) {
      activeNoteId = notes[0].id;
    }
    return State.get('notes').find(n => n.id === activeNoteId);
  }

  function createAndOpen() {
    const note = { id: Utils.uid('note'), title: '', body: '', tags: [], createdAt: Date.now(), updatedAt: Date.now() };
    State.get('notes').unshift(note);
    State.save('notes');
    activeNoteId = note.id;
    UI.navigate('notes');
    State.logActivity('Created a new note', 'note');
  }

  function renderView(container) {
    const notes = getNotes();
    const note = activeNote();

    container.innerHTML = `
      <div class="view">
        <div class="section-heading">
          <h2 style="font-family:var(--font-display); font-size:19px;">Notes</h2>
          <button class="btn btn-primary btn-sm" id="add-note-btn"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>New Note</button>
        </div>
        <div class="notes-layout">
          <div class="notes-sidebar" id="notes-sidebar">
            ${notes.length ? notes.map(n => noteItemHTML(n, note)).join('') : `<div class="empty-state"><p>No notes yet.</p></div>`}
          </div>
          <div class="card note-editor" id="note-editor">
            ${note ? '' : `<div class="empty-state"><div class="empty-icon">📝</div><h3>Select or create a note</h3></div>`}
          </div>
        </div>
      </div>
    `;

    container.querySelector('#add-note-btn').onclick = () => createAndOpen();
    container.querySelectorAll('.note-item').forEach(item => {
      item.onclick = () => { activeNoteId = item.dataset.id; renderView(container); };
    });

    if (note) renderEditor(container.querySelector('#note-editor'), note, container);
  }

  function noteItemHTML(n, active) {
    const preview = (n.body || '').replace(/\n/g, ' ').slice(0, 70);
    return `
    <div class="note-item ${active && n.id === active.id ? 'is-active' : ''}" data-id="${n.id}">
      <div class="note-item-title">${Utils.escapeHtml(n.title || 'Untitled')}</div>
      <div class="note-item-preview">${Utils.escapeHtml(preview) || 'No content yet'}</div>
      <div class="note-item-meta"><span>${Utils.relativeTime(n.updatedAt)}</span></div>
      ${(n.tags || []).map(t => `<span class="note-tag">${Utils.escapeHtml(t)}</span>`).join('')}
    </div>`;
  }

  function renderEditor(el, note, container) {
    el.innerHTML = `
      <input type="text" class="note-editor-title" id="note-title" placeholder="Untitled" value="${Utils.escapeHtml(note.title)}" />
      <div class="note-editor-meta">
        <div class="note-tags-input" id="note-tags"></div>
        <button class="icon-btn" id="note-delete" title="Delete note"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg></button>
      </div>
      <textarea class="note-editor-body" id="note-body" placeholder="Start writing…">${Utils.escapeHtml(note.body)}</textarea>
    `;

    renderTags(el, note);

    el.querySelector('#note-title').oninput = (e) => {
      note.title = e.target.value;
      note.updatedAt = Date.now();
      debouncedSave();
      const sidebarItem = container.querySelector(`.note-item[data-id="${note.id}"] .note-item-title`);
      if (sidebarItem) sidebarItem.textContent = note.title || 'Untitled';
    };
    el.querySelector('#note-body').oninput = (e) => {
      note.body = e.target.value;
      note.updatedAt = Date.now();
      debouncedSave();
      const sidebarPreview = container.querySelector(`.note-item[data-id="${note.id}"] .note-item-preview`);
      if (sidebarPreview) sidebarPreview.textContent = note.body.replace(/\n/g, ' ').slice(0, 70) || 'No content yet';
    };
    el.querySelector('#note-delete').onclick = async () => {
      const ok = await UI.confirmDialog('Delete this note? This cannot be undone.', { title: 'Delete Note' });
      if (ok) {
        const remaining = State.get('notes').filter(n => n.id !== note.id);
        State.get('notes').length = 0;
        State.get('notes').push(...remaining);
        State.save('notes');
        activeNoteId = null;
        UI.refreshCurrent();
        UI.toast('Note deleted', 'info');
      }
    };
  }

  function renderTags(el, note) {
    const wrap = el.querySelector('#note-tags');
    wrap.innerHTML = (note.tags || []).map(t => `<span class="badge" data-tag="${Utils.escapeHtml(t)}">${Utils.escapeHtml(t)} <span style="cursor:pointer;">×</span></span>`).join('')
      + `<input type="text" id="tag-input" placeholder="+ tag" style="width:70px; font-size:11px; background:var(--surface-2); border-radius:var(--radius-round); padding:3px 10px;" />`;
    wrap.querySelectorAll('[data-tag]').forEach(chip => {
      chip.querySelector('span').onclick = () => {
        note.tags = note.tags.filter(t => t !== chip.dataset.tag);
        State.save('notes');
        renderTags(el, note);
      };
    });
    const input = wrap.querySelector('#tag-input');
    input.onkeydown = (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        note.tags = note.tags || [];
        note.tags.push(input.value.trim());
        State.save('notes');
        renderTags(el, note);
      }
    };
  }

  function count() {
    return State.get('notes').length;
  }

  function setActive(id) {
    activeNoteId = id;
  }

  return { renderView, createAndOpen, getNotes, count, setActive };
})();
