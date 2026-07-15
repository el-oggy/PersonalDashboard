/**
 * FLOWOS V2 - STORAGE SYSTEM
 * localStorage wrapper for persisting tasks, progress, and settings
 * Replaces the old IndexedDB approach for simplicity
 */

const FlowOSStorage = {
    /**
     * Initialize storage - migrate from old db.js if exists
     */
    init() {
        // Check for existing data and migrate
        this.migrateOldData();

        // Initialize default data if empty
        if (!this.get('tasks')) {
            this.set('tasks', this.getDefaultTasks());
        }
        if (!this.get('progress')) {
            this.set('progress', {});
        }
        if (!this.get('settings')) {
            this.set('settings', this.getDefaultSettings());
        }
    },

    /**
     * Migrate data from old IndexedDB-based storage
     */
    migrateOldData() {
        try {
            // Check if old localStorage data exists
            const oldData = localStorage.getItem('flowos-data');
            if (oldData) {
                const parsed = JSON.parse(oldData);

                // Migrate tasks
                if (parsed.tasks && !this.get('tasks')) {
                    this.set('tasks', parsed.tasks.map((task, idx) => ({
                        id: task.id || `task-${Date.now()}-${idx}`,
                        name: task.name,
                        icon: task.icon || this.getTaskIcon(task.name),
                        category: task.category || '',
                        favorite: task.favorite || false,
                        order: idx,
                        createdAt: task.createdAt || new Date().toISOString()
                    })));
                }

                // Migrate progress
                if (parsed.progress && !this.get('progress')) {
                    this.set('progress', parsed.progress);
                }

                // Migrate settings
                if (parsed.settings && !this.get('settings')) {
                    this.set('settings', parsed.settings);
                }

                // Clear old data after migration
                localStorage.removeItem('flowos-data');
                console.log('[FlowOS] Data migrated successfully');
            }
        } catch (error) {
            console.error('[FlowOS] Migration error:', error);
        }
    },

    /**
     * Get default initial tasks
     */
    getDefaultTasks() {
        return [
            { id: 'task-1', name: 'Morning stretch', icon: '🧘', category: 'health', favorite: true, order: 0, createdAt: new Date().toISOString() },
            { id: 'task-2', name: 'Read 30 mins', icon: '📚', category: 'learning', favorite: true, order: 1, createdAt: new Date().toISOString() },
            { id: 'task-3', name: 'Drink water', icon: '💧', category: 'health', favorite: false, order: 2, createdAt: new Date().toISOString() },
            { id: 'task-4', name: 'Work on project', icon: '💻', category: 'work', favorite: true, order: 3, createdAt: new Date().toISOString() },
            { id: 'task-5', name: 'Meditate', icon: '🧠', category: 'health', favorite: false, order: 4, createdAt: new Date().toISOString() }
        ];
    },

    /**
     * Get default settings
     */
    getDefaultSettings() {
        return {
            theme: 'dark',
            taskOrder: [],
            lastView: '',
            notificationsEnabled: true,
            streakReminder: true
        };
    },

    /**
     * Get suggested icon based on task name
     */
    getTaskIcon(name) {
        const icons = {
            'morning': '🌅',
            'stretch': '🧘',
            'meditate': '🧠',
            'read': '📚',
            'water': '💧',
            'drink': '💧',
            'work': '💻',
            'project': '📁',
            'exercise': '🏃',
            'run': '🏃',
            'jog': '🏃',
            'walk': '🚶',
            'gym': '💪',
            'cook': '🍳',
            '三餐': '🍽️',
            'sleep': '😴',
            'bed': '😴',
            'learn': '🎓',
            'study': '📖',
            'write': '✍️',
            'draw': '🎨',
            'create': '🎨',
            'music': '🎵',
            'call': '📞',
            'family': '👨‍👩‍👧',
            'friends': '👫'
        };

        const lowerName = name.toLowerCase();
        for (const [keyword, icon] of Object.entries(icons)) {
            if (lowerName.includes(keyword)) {
                return icon;
            }
        }
        return '✅';
    },

    /**
     * Set data in localStorage
     */
    set(key, value) {
        try {
            localStorage.setItem(`flowos-${key}`, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('[FlowOS] Storage set error:', error);
            return false;
        }
    },

    /**
     * Get data from localStorage
     */
    get(key) {
        try {
            const item = localStorage.getItem(`flowos-${key}`);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('[FlowOS] Storage get error:', error);
            return null;
        }
    },

    /**
     * Remove data from localStorage
     */
    remove(key) {
        try {
            localStorage.removeItem(`flowos-${key}`);
            return true;
        } catch (error) {
            console.error('[FlowOS] Storage remove error:', error);
            return false;
        }
    },

    // ========================================
    // TASKS API
    // ========================================

    /**
     * Get all tasks
     */
    getTasks() {
        const tasks = this.get('tasks') || [];
        return tasks.sort((a, b) => a.order - b.order);
    },

    /**
     * Get a single task by ID
     */
    getTask(id) {
        const tasks = this.getTasks();
        return tasks.find(task => task.id === id);
    },

    /**
     * Add a new task
     */
    addTask(taskData) {
        const tasks = this.getTasks();
        const newTask = {
            id: `task-${Date.now()}`,
            name: taskData.name,
            icon: taskData.icon || this.getTaskIcon(taskData.name),
            category: taskData.category || '',
            favorite: taskData.favorite || false,
            order: tasks.length,
            createdAt: new Date().toISOString()
        };

        tasks.push(newTask);
        this.set('tasks', tasks);
        return newTask;
    },

    /**
     * Update a task
     */
    updateTask(id, updates) {
        const tasks = this.getTasks();
        const index = tasks.findIndex(task => task.id === id);

        if (index === -1) return null;

        tasks[index] = { ...tasks[index], ...updates };
        this.set('tasks', tasks);
        return tasks[index];
    },

    /**
     * Delete a task
     */
    deleteTask(id) {
        const tasks = this.getTasks();
        const filtered = tasks.filter(task => task.id !== id);
        this.set('tasks', filtered);

        // Also clean up progress for this task
        const progress = this.get('progress') || {};
        delete progress[id];
        this.set('progress', progress);
    },

    /**
     * Reorder tasks
     */
    reorderTasks(taskIds) {
        const tasks = this.getTasks();
        const newTasks = taskIds.map((id, index) => {
            const task = tasks.find(t => t.id === id);
            return task ? { ...task, order: index } : null;
        }).filter(Boolean);

        this.set('tasks', newTasks);
    },

    // ========================================
    // PROGRESS API
    // ========================================

    /**
     * Get all progress data
     */
    getProgress() {
        return this.get('progress') || {};
    },

    /**
     * Get progress for a specific task
     */
    getTaskProgress(taskId) {
        const progress = this.getProgress();
        return progress[taskId] || {};
    },

    /**
     * Get progress for a specific date
     */
    getDayProgress(date) {
        const progress = this.getProgress();
        const dayData = {};

        for (const taskId in progress) {
            if (progress[taskId][date]) {
                dayData[taskId] = progress[taskId][date];
            }
        }

        return dayData;
    },

    /**
     * Mark a task as completed for a date
     */
    markTaskCompleted(taskId, date, data = {}) {
        const progress = this.getProgress() || {};

        if (!progress[taskId]) {
            progress[taskId] = {};
        }

        progress[taskId][date] = {
            completed: true,
            notes: data.notes || '',
            mood: data.mood || 3,
            completedAt: new Date().toISOString()
        };

        this.set('progress', progress);
    },

    /**
     * Unmark a task completion for a date
     */
    unmarkTaskCompletion(taskId, date) {
        const progress = this.getProgress() || {};

        if (progress[taskId]) {
            delete progress[taskId][date];
            this.set('progress', progress);
        }
    },

    /**
     * Update day notes/mood for a date
     */
    updateDayData(date, updates) {
        const progress = this.getProgress() || {};
        const tasks = this.getTasks();

        for (const task of tasks) {
            if (progress[task.id] && progress[task.id][date]) {
                progress[task.id][date] = {
                    ...progress[task.id][date],
                    ...updates
                };
            }
        }

        this.set('progress', progress);
    },

    // ========================================
    // SETTINGS API
    // ========================================

    /**
     * Get all settings
     */
    getSettings() {
        return this.get('settings') || this.getDefaultSettings();
    },

    /**
     * Get a single setting
     */
    getSetting(key) {
        const settings = this.getSettings();
        return settings[key];
    },

    /**
     * Update a setting
     */
    updateSetting(key, value) {
        const settings = this.getSettings();
        settings[key] = value;
        this.set('settings', settings);
    },

    /**
     * Toggle theme
     */
    toggleTheme() {
        const current = this.getSetting('theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';
        this.updateSetting('theme', newTheme);
        return newTheme;
    },

    // ========================================
    // STATS & ANALYTICS HELPERS
    // ========================================

    /**
     * Get completion rate for a date range
     */
    getCompletionRate(taskId, startDate, endDate) {
        const progress = this.getTaskProgress(taskId);
        let total = 0;
        let completed = 0;

        const start = new Date(startDate);
        const end = new Date(endDate);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateKey = this.formatDateKey(d);
            total++;
            if (progress[dateKey]?.completed) {
                completed++;
            }
        }

        return total > 0 ? Math.round((completed / total) * 100) : 0;
    },

    /**
     * Get current streak for a task
     */
    getCurrentStreak(taskId) {
        const progress = this.getTaskProgress(taskId);
        let streak = 0;
        const today = new Date();

        // Check yesterday first, then work backwards
        for (let i = 1; i <= 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const dateKey = this.formatDateKey(checkDate);

            if (progress[dateKey]?.completed) {
                streak++;
            } else if (i === 1 && progress[this.formatDateKey(today)]?.completed) {
                // Today is complete, continue checking
                continue;
            } else {
                break;
            }
        }

        // Check if today is complete
        if (progress[this.formatDateKey(today)]?.completed) {
            streak++;
        }

        return streak;
    },

    /**
     * Get longest streak for a task
     */
    getLongestStreak(taskId) {
        const progress = this.getTaskProgress(taskId);
        let longest = 0;
        let current = 0;
        const dates = Object.keys(progress).sort();

        for (const date of dates) {
            if (progress[date]?.completed) {
                current++;
                longest = Math.max(longest, current);
            } else {
                current = 0;
            }
        }

        return longest;
    },

    /**
     * Get today's completion percentage
     */
    getTodayCompletionRate() {
        const tasks = this.getTasks();
        const progress = this.getProgress();
        const today = this.formatDateKey(new Date());

        let completed = 0;
        let total = tasks.length;

        for (const task of tasks) {
            if (progress[task.id]?.[today]?.completed) {
                completed++;
            }
        }

        return total > 0 ? Math.round((completed / total) * 100) : 0;
    },

    /**
     * Get month completion rate
     */
    getMonthCompletionRate(year, month) {
        const tasks = this.getTasks();
        const progress = this.getProgress();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let totalDays = 0;
        let completed = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateKey = this.formatDateKey(date);

            let dayCompleted = 0;
            for (const task of tasks) {
                if (progress[task.id]?.[dateKey]?.completed) {
                    dayCompleted++;
                }
            }

            if (dayCompleted === tasks.length && tasks.length > 0) {
                completed++;
            }
            totalDays++;
        }

        return totalDays > 0 ? Math.round((completed / totalDays) * 100) : 0;
    },

    // ========================================
    // UTILITIES
    // ========================================

    /**
     * Format date as YYYY-MM-DD
     */
    formatDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Format date as YYYY-MM-DD HH:MM
     */
    formatDateTimeKey(date) {
        return this.formatDateKey(date) + ' ' + date.toLocaleTimeString();
    },

    /**
     * Get formatted date string for display
     */
    formatDateDisplay(date) {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    /**
     * Get short date string
     */
    formatShortDate(date) {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    },

    /**
     * Export all data
     */
    exportData() {
        return {
            tasks: this.get('tasks'),
            progress: this.get('progress'),
            settings: this.get('settings'),
            exportDate: new Date().toISOString(),
            version: '2.0'
        };
    },

    /**
     * Import data
     */
    importData(data) {
        try {
            if (data.tasks) this.set('tasks', data.tasks);
            if (data.progress) this.set('progress', data.progress);
            if (data.settings) this.set('settings', data.settings);
            return true;
        } catch (error) {
            console.error('[FlowOS] Import error:', error);
            return false;
        }
    },

    /**
     * Clear all data
     */
    clearAll() {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('flowos-'));
        keys.forEach(key => localStorage.removeItem(key));
        this.init();
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize on load
FlowOSStorage.init();

// Export for use in other modules
window.FlowOSStorage = FlowOSStorage;