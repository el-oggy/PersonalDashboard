/**
 * CALENDAR GRID - Monthly habit tracker view
 * Displays tasks as rows with day checkboxes
 */

const CalendarGrid = {
    currentDate: new Date(),
    selectedDate: null,
    tasks: [],

    /**
     * Initialize calendar grid
     */
    init() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.tasks = FlowOSStorage.getTasks();

        this.bindEvents();
        this.render();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Navigation buttons
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');
        const todayBtn = document.getElementById('today-btn');

        if (prevBtn) prevBtn.addEventListener('click', () => this.changeMonth(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.changeMonth(1));
        if (todayBtn) todayBtn.addEventListener('click', () => this.goToToday());

        // Month/Year select
        const monthSelect = document.getElementById('month-select');
        const yearSelect = document.getElementById('year-select');

        if (monthSelect) {
            monthSelect.addEventListener('change', (e) => {
                this.currentDate.setMonth(parseInt(e.target.value));
                this.render();
            });
        }

        if (yearSelect) {
            yearSelect.addEventListener('change', (e) => {
                this.currentDate.setYear(parseInt(e.target.value));
                this.render();
            });
        }
    },

    /**
     * Render the calendar grid
     */
    render() {
        this.updateMonthHeader();
        this.renderGrid();
        this.updateMonthSelect();
        this.updateStats();
    },

    /**
     * Update the month header display
     */
    updateMonthHeader() {
        const header = document.getElementById('current-month');
        if (header) {
            const options = { year: 'numeric', month: 'long' };
            header.textContent = this.currentDate.toLocaleDateString('en-US', options);
        }
    },

    /**
     * Render the calendar grid body
     */
    renderGrid() {
        const gridBody = document.getElementById('calendar-grid-body');
        if (!gridBody) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // Get the first day of the month and total days
        const firstDay = new Date(year, month, 1).getDay();
        const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // Monday = 0
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Get days from previous month to show
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        // Today's date for highlighting
        const today = new Date();
        const todayKey = FlowOSStorage.formatDateKey(today);

        // Progress data
        const progress = FlowOSStorage.getProgress();

        // Build task rows
        const monthData = {
            daysArray: Array.from({ length: daysInMonth }, (_, i) => i + 1),
            daysInPrevMonth,
            adjustedFirstDay
        };

        if (this.tasks.length === 0) {
            gridBody.innerHTML = `
                <div class="empty-state" style="padding: 60px 24px; text-align: center; color: var(--color-text-tertiary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">📅</div>
                    <p style="font-size: 16px; margin-bottom: 8px;">No tasks to track</p>
                    <p style="font-size: 13px;">Add tasks from the sidebar to start tracking</p>
                </div>
            `;
            return;
        }

        gridBody.innerHTML = this.tasks.map((task, taskIndex) => this.renderTaskRow(task, monthData, todayKey, progress, taskIndex)).join('');

        // Bind checkbox and day click events
        this.bindGridEvents();
    },

    /**
     * Render a single task row
     */
    renderTaskRow(task, monthData, todayKey, progress, taskIndex) {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        let html = `
            <div class="task-row stagger-list" style="animation-delay: ${taskIndex * 0.05}s">
                <div class="task-row-info">
                    <span class="task-row-icon">${task.icon}</span>
                    <span class="task-row-name">${FlowOSStorage.escapeHtml(task.name)}</span>
                </div>
                <div class="task-row-days">
        `;

        // Previous month days (disabled)
        for (let i = 0; i < monthData.adjustedFirstDay; i++) {
            const day = monthData.daysInPrevMonth - monthData.adjustedFirstDay + i + 1;
            html += `<div class="day-cell other-month disabled"><span class="day-number">${day}</span></div>`;
        }

        // Current month days
        for (let day = 1; day <= monthData.daysArray.length; day++) {
            const date = new Date(year, month, day);
            const dateKey = FlowOSStorage.formatDateKey(date);
            const isToday = dateKey === todayKey;
            const isCompleted = progress[task.id]?.[dateKey]?.completed;
            const dayData = progress[task.id]?.[dateKey];

            html += `
                <div class="day-cell ${isToday ? 'today' : ''}" data-date="${dateKey}" data-task-id="${task.id}">
                    <div class="checkbox ${isCompleted ? 'checked' : ''}" data-date="${dateKey}" data-task-id="${task.id}">
                        ${isCompleted ? `
                            <svg class="checkbox-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width: 14px; height: 14px;">
                                <polyline class="check-path" points="20 6 9 17 4 12"/>
                            </svg>
                        ` : `<span class="day-number">${day}</span>`}
                    </div>
                </div>
            `;
        }

        html += `</div></div>`;
        return html;
    },

    /**
     * Bind events to grid elements
     */
    bindGridEvents() {
        // Checkbox clicks
        document.querySelectorAll('.day-cell .checkbox').forEach(checkbox => {
            checkbox.addEventListener('click', (e) => {
                const taskId = checkbox.dataset.taskId;
                const date = checkbox.dataset.date;
                this.toggleTaskCompletion(taskId, date);
            });
        });

        // Day cell clicks (to open drawer)
        document.querySelectorAll('.day-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                if (e.target.classList.contains('checkbox')) return;

                const date = cell.dataset.date;
                if (date) {
                    this.selectDate(date);
                }
            });
        });
    },

    /**
     * Toggle task completion for a date
     */
    toggleTaskCompletion(taskId, date) {
        const progress = FlowOSStorage.getProgress();
        const isCompleted = progress[taskId]?.[date]?.completed;

        if (isCompleted) {
            FlowOSStorage.unmarkTaskCompletion(taskId, date);
            Toast.show('Task unchecked', 'info');
        } else {
            const dayData = progress[taskId]?.[date] || {};
            FlowOSStorage.markTaskCompleted(taskId, date, {
                mood: dayData.mood || 3,
                notes: dayData.notes || ''
            });
            Toast.show('Task completed!', 'success');
        }

        // Re-render grid
        this.render();

        // Update stats if drawer is open
        if (DayDrawer.isOpen && DayDrawer.currentDate === date) {
            DayDrawer.refresh();
        }

        // Update sidebar stats
        SidebarTasks.updateQuickStats();
    },

    /**
     * Select a date and open the drawer
     */
    selectDate(date) {
        this.selectedDate = new Date(date);
        DayDrawer.open(date);
    },

    /**
     * Change month by offset
     */
    changeMonth(offset) {
        const gridBody = document.getElementById('calendar-grid-body');

        // Fade out animation
        if (gridBody) {
            gridBody.classList.add('fade-out');

            setTimeout(() => {
                this.currentDate.setMonth(this.currentDate.getMonth() + offset);
                this.render();

                gridBody.classList.remove('fade-out');
                gridBody.classList.add('fade-in');

                setTimeout(() => {
                    gridBody.classList.remove('fade-in');
                }, 300);
            }, 200);
        } else {
            this.currentDate.setMonth(this.currentDate.getMonth() + offset);
            this.render();
        }
    },

    /**
     * Go to current date
     */
    goToToday() {
        this.currentDate = new Date();
        this.render();
    },

    /**
     * Update month/year select dropdowns
     */
    updateMonthSelect() {
        const monthSelect = document.getElementById('month-select');
        const yearSelect = document.getElementById('year-select');

        if (monthSelect) {
            monthSelect.value = this.currentDate.getMonth();
        }

        if (yearSelect) {
            yearSelect.value = this.currentDate.getFullYear();
        }
    },

    /**
     * Update stats bar
     */
    updateStats() {
        const completionEl = document.getElementById('month-completion');
        const streakEl = document.getElementById('longest-streak');
        const tasksCountEl = document.getElementById('tasks-count');

        if (completionEl) {
            const rate = FlowOSStorage.getMonthCompletionRate(
                this.currentDate.getFullYear(),
                this.currentDate.getMonth()
            );
            completionEl.textContent = `${rate}%`;
        }

        if (streakEl) {
            // Get average longest streak across tasks
            const avgStreak = Math.round(this.tasks.reduce((sum, task) => {
                return sum + FlowOSStorage.getLongestStreak(task.id);
            }, 0) / (this.tasks.length || 1));
            streakEl.textContent = avgStreak;
        }

        if (tasksCountEl) {
            tasksCountEl.textContent = this.tasks.length;
        }
    },

    /**
     * Refresh the grid (call after data changes)
     */
    refresh() {
        this.tasks = FlowOSStorage.getTasks();
        this.render();
    }
};

// Export
window.CalendarGrid = CalendarGrid;