/* ==========================================================================
   FlowOS — achievements.js
   XP, leveling, and badge unlock logic. Gamifies every completion event.
   ========================================================================== */

const Achievements = (() => {

  const BADGES = [
    { id: 'first-habit', emoji: '🌱', name: 'First Steps', desc: 'Create your first habit', check: () => Habits.getHabits().length >= 1 },
    { id: 'five-habits', emoji: '🗂️', name: 'Systems Builder', desc: 'Track 5 habits at once', check: () => Habits.getHabits().length >= 5 },
    { id: 'week-streak', emoji: '🔥', name: '7-Day Streak', desc: 'Keep a habit streak for a week', check: () => Habits.getHabits().some(h => Habits.computeBestStreak(h.id) >= 7) },
    { id: 'month-streak', emoji: '🏔️', name: '30-Day Streak', desc: 'Keep a habit streak for a month', check: () => Habits.getHabits().some(h => Habits.computeBestStreak(h.id) >= 30) },
    { id: 'hundred-streak', emoji: '💎', name: 'Century Streak', desc: 'Reach a 100-day streak', check: () => Habits.getHabits().some(h => Habits.computeBestStreak(h.id) >= 100) },
    { id: 'perfect-day', emoji: '⭐', name: 'Perfect Day', desc: 'Complete every habit in a single day', check: () => {
      const habits = Habits.getHabits().filter(h => h.active !== false);
      return habits.length > 0 && habits.every(h => Habits.isDone(h.id, Utils.todayKey()));
    }},
    { id: 'project-starter', emoji: '📋', name: 'Project Starter', desc: 'Create your first project', check: () => Projects.getProjects().length >= 1 },
    { id: 'ten-tasks', emoji: '✅', name: 'Task Crusher', desc: 'Complete 10 tasks', check: () => Projects.stats().doneCards >= 10 },
    { id: 'goal-setter', emoji: '🎯', name: 'Goal Setter', desc: 'Create your first long-term goal', check: () => Goals.getGoals().length >= 1 },
    { id: 'goal-achiever', emoji: '🏆', name: 'Goal Achiever', desc: 'Complete every milestone in a goal', check: () => Goals.getGoals().some(g => g.milestones.length && g.milestones.every(m => m.done)) },
    { id: 'note-taker', emoji: '📝', name: 'Note Taker', desc: 'Write 5 notes', check: () => Notes.count() >= 5 },
    { id: 'level-5', emoji: '🚀', name: 'Rising Star', desc: 'Reach Level 5', check: () => UI.levelFromXP(State.get('xp').total).level >= 5 },
    { id: 'level-10', emoji: '👑', name: 'FlowOS Master', desc: 'Reach Level 10', check: () => UI.levelFromXP(State.get('xp').total).level >= 10 },
  ];

  function unlocked() {
    return State.get('achievements').unlocked;
  }

  function unlockBadge(id) {
    const list = unlocked();
    if (list.includes(id)) return;
    list.push(id);
    State.save('achievements');
    const badge = BADGES.find(b => b.id === id);
    if (badge) {
      UI.toast(`Achievement unlocked: ${badge.name}`, 'success', 4200);
      State.logActivity(`Unlocked achievement <b>${Utils.escapeHtml(badge.name)}</b>`, 'achievement');
    }
  }

  function checkAll() {
    BADGES.forEach(b => {
      if (!unlocked().includes(b.id) && b.check()) unlockBadge(b.id);
    });
  }

  // Named wrappers kept for readability at call sites elsewhere in the app.
  function checkHabitAchievements() { checkAll(); }
  function checkGoalAchievements() { checkAll(); }
  function checkProjectAchievements() { checkAll(); }
  function checkNoteAchievements() { checkAll(); }

  function awardXP(amount, reason) {
    const xp = State.get('xp');
    const before = UI.levelFromXP(xp.total).level;
    xp.total += amount;
    State.save('xp');
    UI.updateSidebarLevel();
    const after = UI.levelFromXP(xp.total).level;
    if (after > before) {
      UI.toast(`Level up! You're now Level ${after} 🎉`, 'success', 4500);
      State.logActivity(`Reached <b>Level ${after}</b>`, 'level');
      UI.confetti();
    }
    checkAll();
  }

  function renderView(container) {
    const xp = State.get('xp').total;
    const { level, into, need } = UI.levelFromXP(xp);
    const pct = Utils.clamp((into / need) * 100, 0, 100);

    container.innerHTML = `
      <div class="view">
        <div class="card xp-hero">
          <div class="xp-hero-ring">${Charts.ringSVG({ size: 96, stroke: 9, percent: pct, color: 'var(--accent-violet)' })}</div>
          <div class="xp-hero-info">
            <div class="xp-hero-level">Level ${level}</div>
            <div class="xp-hero-sub">${into} / ${need} XP to next level · ${xp} total XP earned</div>
            <div class="xp-bar-track"><div class="xp-bar-fill" style="width:${pct}%;"></div></div>
          </div>
        </div>

        <div class="section-heading"><h2 style="font-family:var(--font-display); font-size:19px;">Badges</h2><span class="hint">${unlocked().length} / ${BADGES.length} unlocked</span></div>
        <div class="badge-grid">
          ${BADGES.map(b => {
            const isUnlocked = unlocked().includes(b.id);
            return `
            <div class="card badge-card ${isUnlocked ? '' : 'is-locked'}">
              <div class="badge-emoji">${b.emoji}</div>
              <div class="badge-name">${Utils.escapeHtml(b.name)}</div>
              <div class="badge-desc">${Utils.escapeHtml(b.desc)}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  return { BADGES, unlocked, unlockBadge, checkAll, awardXP, renderView, checkHabitAchievements, checkGoalAchievements, checkProjectAchievements, checkNoteAchievements };
})();
