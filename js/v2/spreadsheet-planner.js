/**
 * SPREADSHEET PLANNER - Excel style daily dashboard logic
 */

const SpreadsheetPlanner = {
    currentDate: null,
    data: null,
    categories: ['work', 'health', 'learning', 'personal', 'finance', 'other'],

    /**
     * Initialize the spreadsheet planner
     */
    init() {
        this.currentDate = FlowOSStorage.formatDateKey(new Date());
        
        // Sync with DayDrawer date if open
        if (DayDrawer && DayDrawer.currentDate) {
            this.currentDate = DayDrawer.currentDate;
        }

        this.loadData();
        this.bindEvents();
        this.render();
    },

    /**
     * Load data for currentDate from storage
     */
    loadData() {
        const key = `spreadsheet-${this.currentDate}`;
        let saved = FlowOSStorage.get(key);

        if (!saved) {
            saved = this.getDefaultData();
            FlowOSStorage.set(key, saved);
        }

        this.data = saved;
    },

    /**
     * Get default template data
     */
    getDefaultData() {
        return {
            priorities: Array.from({ length: 5 }, () => ({ completed: false, category: 'work', text: '' })),
            tasks: Array.from({ length: 6 }, () => ({ completed: false, category: 'personal', text: '' })),
            schedule: {
                "05:00": "", "05:30": "",
                "06:00": "", "06:30": "",
                "07:00": "", "07:30": "",
                "08:00": "", "08:30": "",
                "09:00": "", "09:30": "",
                "10:00": "", "10:30": "",
                "11:00": "", "11:30": "",
                "12:00": "", "12:30": "",
                "13:00": "", "13:30": "",
                "14:00": "", "14:30": "",
                "15:00": "", "15:30": "",
                "16:00": "", "16:30": "",
                "17:00": "", "17:30": "",
                "18:00": "", "18:30": "",
                "19:00": "", "19:30": "",
                "20:00": "", "20:30": "",
                "21:00": "", "21:30": "",
                "22:00": ""
            }
        };
    },

    /**
     * Save current data to storage
     */
    save() {
        const key = `spreadsheet-${this.currentDate}`;
        FlowOSStorage.set(key, this.data);
        this.updateKPIs();
        this.renderChart();

        // If statistics exist, refresh stats panel too
        if (window.SidebarTasks) {
            window.SidebarTasks.updateQuickStats();
        }
    },

    /**
     * Bind input and control listeners
     */
    bindEvents() {
        // Handle changes in table inputs and dropdowns via event delegation
        const view = document.getElementById('sheet-view-planner');
        if (!view) return;

        // Date selection synchronization
        const prevBtn = document.getElementById('prev-month'); // Or reuse date pickers
        
        // Listen to custom date select events if calendar or DayDrawer changes the date
        document.addEventListener('daySelected', (e) => {
            if (e.detail && e.detail.date) {
                this.currentDate = e.detail.date;
                this.loadData();
                this.render();
            }
        });
    },

    /**
     * Render tables and cells
     */
    render() {
        this.renderPriorities();
        this.renderTasks();
        this.renderSchedule();
        this.updateKPIs();
        this.renderChart();
    },

    /**
     * Render the Top Priorities spreadsheet grid
     */
    renderPriorities() {
        const body = document.getElementById('priorities-grid-body');
        if (!body) return;

        body.innerHTML = this.data.priorities.map((item, index) => {
            const rowNumber = index + 1;
            return `
                <div class="grid-row" data-index="${index}">
                    <div class="grid-row-index">${rowNumber}</div>
                    <!-- Column A: Checkbox -->
                    <div class="grid-cell" style="flex: 0 0 60px;">
                        <div class="grid-cell-checkbox">
                            <input type="checkbox" class="priority-check" ${item.completed ? 'checked' : ''}>
                        </div>
                    </div>
                    <!-- Column B: Category -->
                    <div class="grid-cell" style="flex: 0 0 130px;">
                        <select class="grid-cell-select priority-category">
                            ${this.categories.map(cat => `<option value="${cat}" ${item.category === cat ? 'selected' : ''}>${cat.toUpperCase()}</option>`).join('')}
                        </select>
                    </div>
                    <!-- Column C: Task Name -->
                    <div class="grid-cell">
                        <input type="text" class="grid-cell-input priority-text" value="${FlowOSStorage.escapeHtml(item.text)}" placeholder="Type priority here...">
                    </div>
                </div>
            `;
        }).join('');

        // Bind events inside priorities grid
        body.querySelectorAll('.priority-check').forEach((chk, idx) => {
            chk.addEventListener('change', (e) => {
                this.data.priorities[idx].completed = e.target.checked;
                this.save();
            });
        });

        body.querySelectorAll('.priority-category').forEach((sel, idx) => {
            sel.addEventListener('change', (e) => {
                this.data.priorities[idx].category = e.target.value;
                this.save();
            });
        });

        body.querySelectorAll('.priority-text').forEach((inp, idx) => {
            inp.addEventListener('blur', (e) => {
                this.data.priorities[idx].text = e.target.value.trim();
                this.save();
            });
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') inp.blur();
            });
        });
    },

    /**
     * Render the Daily Tasks spreadsheet grid
     */
    renderTasks() {
        const body = document.getElementById('tasks-grid-body');
        if (!body) return;

        body.innerHTML = this.data.tasks.map((item, index) => {
            const rowNumber = index + 6; // starts at row 6
            return `
                <div class="grid-row" data-index="${index}">
                    <div class="grid-row-index">${rowNumber}</div>
                    <!-- Column A: Checkbox -->
                    <div class="grid-cell" style="flex: 0 0 60px;">
                        <div class="grid-cell-checkbox">
                            <input type="checkbox" class="task-check" ${item.completed ? 'checked' : ''}>
                        </div>
                    </div>
                    <!-- Column B: Category -->
                    <div class="grid-cell" style="flex: 0 0 130px;">
                        <select class="grid-cell-select task-category">
                            ${this.categories.map(cat => `<option value="${cat}" ${item.category === cat ? 'selected' : ''}>${cat.toUpperCase()}</option>`).join('')}
                        </select>
                    </div>
                    <!-- Column C: Description -->
                    <div class="grid-cell">
                        <input type="text" class="grid-cell-input task-text" value="${FlowOSStorage.escapeHtml(item.text)}" placeholder="Type task description...">
                    </div>
                </div>
            `;
        }).join('');

        // Bind events inside tasks grid
        body.querySelectorAll('.task-check').forEach((chk, idx) => {
            chk.addEventListener('change', (e) => {
                this.data.tasks[idx].completed = e.target.checked;
                this.save();
            });
        });

        body.querySelectorAll('.task-category').forEach((sel, idx) => {
            sel.addEventListener('change', (e) => {
                this.data.tasks[idx].category = e.target.value;
                this.save();
            });
        });

        body.querySelectorAll('.task-text').forEach((inp, idx) => {
            inp.addEventListener('blur', (e) => {
                this.data.tasks[idx].text = e.target.value.trim();
                this.save();
            });
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') inp.blur();
            });
        });
    },

    /**
     * Render the Daily Schedule layout
     */
    renderSchedule() {
        const body = document.getElementById('schedule-grid-body');
        if (!body) return;

        const times = Object.keys(this.data.schedule).sort();
        body.innerHTML = times.map(time => {
            const value = this.data.schedule[time] || '';
            return `
                <div class="schedule-row">
                    <div class="schedule-time-cell">${time}</div>
                    <div class="schedule-input-cell">
                        <input type="text" class="schedule-text" data-time="${time}" value="${FlowOSStorage.escapeHtml(value)}" placeholder="...">
                    </div>
                </div>
            `;
        }).join('');

        // Bind events for schedule
        body.querySelectorAll('.schedule-text').forEach(inp => {
            const time = inp.dataset.time;
            inp.addEventListener('blur', (e) => {
                this.data.schedule[time] = e.target.value.trim();
                this.save();
            });
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') inp.blur();
            });
        });
    },

    /**
     * Update spreadsheet summary statistics cells
     */
    updateKPIs() {
        // Count filled-in tasks
        const validPriorities = this.data.priorities.filter(p => p.text !== '');
        const validTasks = this.data.tasks.filter(t => t.text !== '');
        
        const totalCount = validPriorities.length + validTasks.length;
        const doneCount = validPriorities.filter(p => p.completed).length + validTasks.filter(t => t.completed).length;
        const pendingCount = totalCount - doneCount;

        const totalCell = document.getElementById('sheet-kpi-total');
        const doneCell = document.getElementById('sheet-kpi-done');
        const pendingCell = document.getElementById('sheet-kpi-pending');

        if (totalCell) totalCell.textContent = totalCount;
        if (doneCell) doneCell.textContent = doneCount;
        if (pendingCell) pendingCell.textContent = pendingCount;
    },

    /**
     * Render SVG chart showing progress by category
     */
    renderChart() {
        const container = document.getElementById('spreadsheet-chart');
        if (!container) return;

        // Accumulate statistics per category
        const catStats = {};
        this.categories.forEach(cat => {
            catStats[cat] = { total: 0, completed: 0 };
        });

        // Loop priorities
        this.data.priorities.forEach(item => {
            if (item.text !== '') {
                catStats[item.category].total++;
                if (item.completed) catStats[item.category].completed++;
            }
        });

        // Loop tasks
        this.data.tasks.forEach(item => {
            if (item.text !== '') {
                catStats[item.category].total++;
                if (item.completed) catStats[item.category].completed++;
            }
        });

        // Determine maximum scale
        let maxTasks = 1;
        this.categories.forEach(cat => {
            maxTasks = Math.max(maxTasks, catStats[cat].total);
        });

        // Render horizontal bars dynamically via SVG
        const chartHeight = 180;
        const padding = 10;
        const rowHeight = (chartHeight - padding * 2) / this.categories.length;
        const barMaxWidth = 200; // max length in pixels for a 100% full bar
        
        let svgContent = `<svg width="100%" height="${chartHeight}" viewBox="0 0 400 ${chartHeight}" xmlns="http://www.w3.org/2000/svg">`;

        // Draw grid lines
        for (let i = 1; i <= 4; i++) {
            const x = 120 + (barMaxWidth / 4) * i;
            svgContent += `<line x1="${x}" y1="10" x2="${x}" y2="${chartHeight - 20}" stroke="var(--color-border)" stroke-dasharray="3 3" />`;
        }

        this.categories.forEach((cat, index) => {
            const stats = catStats[cat];
            const y = padding + index * rowHeight;
            const textY = y + rowHeight / 2 + 4;
            
            // Background bar width
            const bgWidth = stats.total > 0 ? (stats.total / maxTasks) * barMaxWidth : 0;
            const fillWidth = stats.total > 0 ? (stats.completed / maxTasks) * barMaxWidth : 0;

            // Accent color variable mapping
            let color = 'var(--color-accent)';
            if (cat === 'health') color = 'var(--color-success)';
            if (cat === 'learning') color = '#3498db';
            if (cat === 'personal') color = '#9b59b6';
            if (cat === 'finance') color = '#f1c40f';
            
            svgContent += `
                <!-- Category Name Label -->
                <text x="10" y="${textY}" fill="var(--color-text-secondary)" font-size="11px" font-weight="600" font-family="monospace">${cat.toUpperCase()}</text>
                
                <!-- Background Bar (Total) -->
                ${stats.total > 0 ? `<rect x="120" y="${y + 4}" width="${bgWidth}" height="14" rx="4" fill="var(--color-checkbox-bg)" stroke="var(--color-border)" />` : ''}
                
                <!-- Fill Bar (Completed) -->
                ${stats.completed > 0 ? `<rect x="120" y="${y + 4}" width="${fillWidth}" height="14" rx="4" fill="${color}">
                    <animate attributeName="width" from="0" to="${fillWidth}" dur="0.4s" fill="freeze" />
                </rect>` : ''}
                
                <!-- Numbers Label -->
                <text x="${120 + Math.max(bgWidth + 10, 10)}" y="${textY}" fill="var(--color-text-tertiary)" font-size="10px" font-family="'JetBrains Mono', monospace">
                    ${stats.total > 0 ? `${stats.completed}/${stats.total}` : ''}
                </text>
            `;
        });

        svgContent += `</svg>`;
        container.innerHTML = svgContent;
    }
};

window.SpreadsheetPlanner = SpreadsheetPlanner;
