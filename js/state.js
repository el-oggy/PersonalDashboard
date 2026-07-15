/* ==========================================================================
   FlowOS — state.js
   Central in-memory application state, backed by DB (IndexedDB/localStorage).
   Every mutation goes through State.save(collection) which persists (debounced)
   and triggers a re-render via State.onChange listeners.
   ========================================================================== */

const State = (() => {

  const collections = [
    'habits', 'habitLogs', 'projects', 'goals', 'notes',
    'events', 'settings', 'xp', 'achievements', 'activity'
  ];

  let data = {
    habits: [],
    habitLogs: {},      // { [habitId]: { [dateKey]: true } }
    projects: [],
    goals: [],
    notes: [],
    events: [],
    settings: { sidebarCollapsed: false, weekStartsOn: 0, theme: 'matte-black' },
    xp: { total: 0 },
    achievements: { unlocked: [] },
    activity: []
  };

  const listeners = {};

  function on(collection, cb) {
    (listeners[collection] = listeners[collection] || []).push(cb);
  }

  function emit(collection) {
    (listeners[collection] || []).forEach(cb => { try { cb(); } catch (e) { console.error(e); } });
    (listeners['*'] || []).forEach(cb => { try { cb(collection); } catch (e) { console.error(e); } });
  }

  const debouncedPersist = {};
  function save(collection) {
    emit(collection);
    if (!debouncedPersist[collection]) {
      debouncedPersist[collection] = Utils.debounce(() => {
        DB.set(collection, data[collection]);
      }, 220);
    }
    debouncedPersist[collection]();
  }

  function saveImmediate(collection) {
    emit(collection);
    DB.set(collection, data[collection]);
  }

  function get(collection) {
    return data[collection];
  }

  function logActivity(text, type = 'info') {
    data.activity.unshift({ id: Utils.uid('act'), text, type, ts: Date.now() });
    data.activity = data.activity.slice(0, 60);
    save('activity');
  }

  /* ---------------- Seed data (first run) ---------------- */
  function seed() {
    const now = Date.now();

    data.habits = [
      { id: Utils.uid('hab'), name: 'Morning Meditation', icon: '🧘', color: 'var(--cat-1)', category: 'Mindfulness', targetTime: '07:00', notes: '10 minutes, breath-focused.', order: 0, active: true, createdAt: now },
      { id: Utils.uid('hab'), name: 'Read 20 Pages', icon: '📖', color: 'var(--cat-2)', category: 'Learning', targetTime: '21:00', notes: '', order: 1, active: true, createdAt: now },
      { id: Utils.uid('hab'), name: 'Workout', icon: '💪', color: 'var(--cat-3)', category: 'Health', targetTime: '18:00', notes: 'Push/pull/legs rotation.', order: 2, active: true, createdAt: now },
      { id: Utils.uid('hab'), name: 'Drink 2L Water', icon: '💧', color: 'var(--cat-5)', category: 'Health', targetTime: '', notes: '', order: 3, active: true, createdAt: now },
      { id: Utils.uid('hab'), name: 'Deep Work Block', icon: '⚡', color: 'var(--cat-4)', category: 'Work', targetTime: '10:00', notes: '90 minutes, no notifications.', order: 4, active: true, createdAt: now },
    ];

    // Seed a few weeks of plausible history for the heatmap / streaks.
    data.habitLogs = {};
    data.habits.forEach((h, hi) => {
      data.habitLogs[h.id] = {};
      for (let i = 1; i <= 220; i++) {
        const d = Utils.addDays(new Date(), -i);
        const chance = 0.55 + (hi === 0 ? 0.2 : 0);
        if (Math.random() < chance) {
          data.habitLogs[h.id][Utils.dateKey(d)] = true;
        }
      }
    });
    // Mark yesterday done for first two habits to give a real streak.
    const y = Utils.dateKey(Utils.addDays(new Date(), -1));
    data.habitLogs[data.habits[0].id][y] = true;
    data.habitLogs[data.habits[1].id][y] = true;

    const col = (name) => ({ id: Utils.uid('col'), name });
    const projCols = [col('Backlog'), col('In Progress'), col('Review'), col('Done')];
    data.projects = [{
      id: Utils.uid('proj'),
      name: 'FlowOS Launch',
      color: 'var(--cat-1)',
      columns: projCols,
      cards: [
        { id: Utils.uid('card'), columnId: projCols[0].id, title: 'Design habit heatmap component', priority: 'med', due: '', order: 0 },
        { id: Utils.uid('card'), columnId: projCols[1].id, title: 'Build calendar week view', priority: 'high', due: Utils.dateKey(Utils.addDays(new Date(), 3)), order: 0 },
        { id: Utils.uid('card'), columnId: projCols[1].id, title: 'Wire up XP + leveling', priority: 'med', due: '', order: 1 },
        { id: Utils.uid('card'), columnId: projCols[2].id, title: 'Polish dashboard animations', priority: 'low', due: '', order: 0 },
        { id: Utils.uid('card'), columnId: projCols[3].id, title: 'Set up IndexedDB storage layer', priority: 'high', due: '', order: 0 },
      ],
      createdAt: now
    }];

    data.goals = [
      {
        id: Utils.uid('goal'), title: 'Ship FlowOS v1.0', icon: '🚀', color: 'var(--cat-1)',
        deadline: Utils.dateKey(Utils.addDays(new Date(), 30)),
        milestones: [
          { id: Utils.uid('ms'), text: 'Finish core architecture', done: true },
          { id: Utils.uid('ms'), text: 'Build all views', done: false },
          { id: Utils.uid('ms'), text: 'Polish animations', done: false },
          { id: Utils.uid('ms'), text: 'Write documentation', done: false },
        ],
        createdAt: now
      },
      {
        id: Utils.uid('goal'), title: 'Read 24 Books This Year', icon: '📚', color: 'var(--cat-2)',
        deadline: `${new Date().getFullYear()}-12-31`,
        milestones: [
          { id: Utils.uid('ms'), text: '6 books (Q1)', done: true },
          { id: Utils.uid('ms'), text: '12 books (Q2)', done: false },
          { id: Utils.uid('ms'), text: '18 books (Q3)', done: false },
          { id: Utils.uid('ms'), text: '24 books (Q4)', done: false },
        ],
        createdAt: now
      }
    ];

    data.notes = [
      { id: Utils.uid('note'), title: 'Welcome to FlowOS', body: 'This is your local-first productivity system. Everything you create here — habits, notes, projects, goals — is stored entirely on this device. Nothing is sent anywhere.\n\nUse the sidebar to move between Dashboard, Habits, Calendar, Projects, Goals, and Notes. Try checking off a habit on the Dashboard to earn XP.', tags: ['welcome'], createdAt: now, updatedAt: now },
      { id: Utils.uid('note'), title: 'Weekly Review Template', body: 'Wins this week:\n—\n\nWhat drained energy:\n—\n\nOne thing to change next week:\n—', tags: ['template', 'review'], createdAt: now, updatedAt: now },
    ];

    data.events = [
      { id: Utils.uid('evt'), title: 'Team Sync', date: Utils.todayKey(), startTime: '10:00', endTime: '10:30', color: 'var(--cat-5)', notes: '' },
      { id: Utils.uid('evt'), title: 'Deep Work', date: Utils.todayKey(), startTime: '14:00', endTime: '16:00', color: 'var(--cat-1)', notes: '' },
      { id: Utils.uid('evt'), title: 'Gym', date: Utils.dateKey(Utils.addDays(new Date(), 1)), startTime: '18:00', endTime: '19:00', color: 'var(--cat-3)', notes: '' },
      { id: Utils.uid('evt'), title: 'Product Review', date: Utils.dateKey(Utils.addDays(new Date(), 2)), startTime: '13:00', endTime: '14:00', color: 'var(--cat-4)', notes: '' },
    ];

    data.xp = { total: 340 };
    data.achievements = { unlocked: ['first-habit', 'week-streak'] };
    data.activity = [
      { id: Utils.uid('act'), text: 'Completed <b>Morning Meditation</b>', type: 'habit', ts: now - 1000 * 60 * 40 },
      { id: Utils.uid('act'), text: 'Created project <b>FlowOS Launch</b>', type: 'project', ts: now - 1000 * 60 * 60 * 5 },
      { id: Utils.uid('act'), text: 'Unlocked achievement <b>7-Day Streak</b>', type: 'achievement', ts: now - 1000 * 60 * 60 * 26 },
    ];
  }

  async function load() {
    await DB.init();
    const stored = {};
    for (const c of collections) {
      stored[c] = await DB.get(c);
    }
    const hasAnyData = collections.some(c => {
      const v = stored[c];
      if (v == null) return false;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === 'object') return Object.keys(v).length > 0;
      return true;
    });

    if (!hasAnyData) {
      seed();
      for (const c of collections) await DB.set(c, data[c]);
    } else {
      for (const c of collections) {
        if (stored[c] !== undefined) data[c] = stored[c];
      }
    }
  }

  async function exportBackup() {
    return DB.exportAll();
  }

  async function importBackup(obj) {
    await DB.importAll(obj);
    for (const c of collections) {
      const v = await DB.get(c);
      if (v !== undefined) data[c] = v;
    }
    collections.forEach(emit);
  }

  async function wipeAll() {
    seed();
    for (const c of collections) await DB.set(c, data[c]);
    collections.forEach(emit);
  }

  return {
    get, save, saveImmediate, on, logActivity,
    load, exportBackup, importBackup, wipeAll,
    collections
  };
})();
