/* ==========================================================================
   FlowOS — stats.js
   Analytics view: weekly/monthly trends, category breakdown, project stats.
   ========================================================================== */

const Stats = (() => {

  function last7DaysSeries() {
    const days = Array.from({ length: 7 }, (_, i) => Utils.addDays(new Date(), -(6 - i)));
    const habits = Habits.getHabits().filter(h => h.active !== false);
    return days.map(d => {
      const key = Utils.dateKey(d);
      const done = habits.filter(h => Habits.isDone(h.id, key)).length;
      return { label: Utils.weekdayName(d).slice(0, 2), value: done };
    });
  }

  function last6WeeksSeries() {
    const habits = Habits.getHabits().filter(h => h.active !== false);
    const weeks = [];
    for (let w = 5; w >= 0; w--) {
      const start = Utils.addDays(Utils.startOfWeek(new Date(), 1), -w * 7);
      let total = 0;
      for (let i = 0; i < 7; i++) {
        const key = Utils.dateKey(Utils.addDays(start, i));
        total += habits.filter(h => Habits.isDone(h.id, key)).length;
      }
      weeks.push({ label: `W${6 - w}`, value: total });
    }
    return weeks;
  }

  function categoryBreakdown() {
    const habits = Habits.getHabits();
    const map = {};
    habits.forEach(h => {
      const rate = Habits.completionRateLast(h.id, 30);
      map[h.category || 'Other'] = map[h.category || 'Other'] || { total: 0, count: 0 };
      map[h.category || 'Other'].total += rate;
      map[h.category || 'Other'].count += 1;
    });
    return Object.entries(map).map(([label, v]) => ({ label, value: Math.round((v.total / v.count) * 100) }));
  }

  function overallStats() {
    const habits = Habits.getHabits().filter(h => h.active !== false);
    const avg30 = habits.length ? habits.reduce((s, h) => s + Habits.completionRateLast(h.id, 30), 0) / habits.length : 0;
    const bestStreak = habits.reduce((max, h) => Math.max(max, Habits.computeBestStreak(h.id)), 0);
    const pStats = Projects.stats();
    return {
      avgCompletion30: Math.round(avg30 * 100),
      bestStreak,
      totalHabits: habits.length,
      notesCount: Notes.count(),
      tasksTotal: pStats.totalCards,
      tasksDone: pStats.doneCards,
    };
  }

  function renderView(container) {
    const s = overallStats();
    container.innerHTML = `
      <div class="view">
        <div class="dashboard-grid" style="grid-template-columns:repeat(4,1fr);">
          ${statCard('📈', s.avgCompletion30 + '%', '30-Day Avg Completion', 'var(--cat-1)')}
          ${statCard('🔥', s.bestStreak + 'd', 'Best Streak Ever', 'var(--cat-3)')}
          ${statCard('✅', `${s.tasksDone}/${s.tasksTotal}`, 'Tasks Completed', 'var(--cat-6)')}
          ${statCard('📝', s.notesCount, 'Total Notes', 'var(--cat-2)')}
        </div>

        <div class="dashboard-main-grid">
          <div class="card panel">
            <div class="section-heading"><h2>This Week</h2><span class="hint">Habits completed per day</span></div>
            ${Charts.barChartSVG(last7DaysSeries(), { color: 'var(--accent-violet)' })}
          </div>
          <div class="card panel">
            <div class="section-heading"><h2>6-Week Trend</h2><span class="hint">Total completions per week</span></div>
            ${Charts.lineChartSVG(last6WeeksSeries(), { color: 'var(--accent-teal)' })}
          </div>
        </div>

        <div class="card panel" style="margin-bottom:20px;">
          <div class="section-heading"><h2>Category Consistency</h2><span class="hint">30-day completion rate by category</span></div>
          ${categoryBreakdown().length ? Charts.barChartSVG(categoryBreakdown(), { color: 'var(--accent-amber)', height: 160 }) : '<p style="color:var(--text-tertiary); font-size:13px;">No habit data yet.</p>'}
        </div>

        <div class="card panel">
          <div class="section-heading"><h2>Full Activity Heatmap</h2><span class="hint">Every habit completion, past year</span></div>
          <div class="heatmap-full-wrap" id="stats-heatmap"></div>
        </div>
      </div>
    `;
    Charts.renderHeatmapGrid(container.querySelector('#stats-heatmap'), Habits.aggregateHeatmapData(), 52, 10);
  }

  function statCard(icon, value, label, color) {
    return `
    <div class="card stat-card">
      <div class="stat-card-top">
        <div class="stat-icon" style="background:${color}22;">${icon}</div>
      </div>
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </div>`;
  }

  return { renderView, overallStats, last7DaysSeries, last6WeeksSeries, categoryBreakdown };
})();
