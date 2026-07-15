/**
 * DAY DRAWER - Slide-out panel for day details
 * Shows task checklist, notes, mood, and journal for selected date
 */

const DayDrawer = {
    currentDate: null,
    isOpen: false,
    tasks: [],

    /**
     * Initialize drawer
     */
    init() {
        this.bindEvents();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        const closeBtn = document.getElementById('drawer-close');
        const markAllBtn = document.getElementById('mark-all-done');
        const clearAllBtn = document.getElementById('clear-all');
        const saveBtn = document.getElementById('save-day');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        if (markAllBtn) {
            markAllBtn.addEventListener('click', () => this.markAllDone());
        }

        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAll());
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveDayData());
        }

        // Mood buttons
        document.getElementById('mood-options')?.addEventListener('click', (e) => {
            const moodBtn = e.target.closest('.mood-btn');
            if (moodBtn) {
                this.setMood(parseInt(moodBtn.dataset.mood));
            }
        });

        // Auto-save on notes change
        const notesInput = document.getElementById('daily-notes');
        const journalInput = document.getElementById('journal-entry');

        if (notesInput) {
            notesInput.addEventListener('blur', () => this.saveDayData());
        }

        if (journalInput) {
            journalInput.addEventListener('blur', () => this.saveDayData());
        }

        // ESC to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    },

    /**
     * Open the drawer for a specific date
     */
    open(date) {
        this.currentDate = typeof date === 'string' ? date : FlowOSStorage.formatDateKey(date);
        this.tasks = FlowOSStorage.getTasks();

        const drawer = document.getElementById('day-drawer');
        if (!drawer) return;

        // Update header
        this.updateHeader();

        // Render content
        this.renderChecklist();
        this.loadDayData();

        // Show drawer with animation
        drawer.setAttribute('aria-hidden', 'false');
        drawer.classList.add('open');
        this.isOpen = true;

        // Add stagger animation to content
        const content = drawer.querySelector('.drawer-content');
        content.classList.add('stagger-list');
    },

    /**
     * Close the drawer
     */
    close() {
        const drawer = document.getElementById('day-drawer');
        if (!drawer) return;

        this.saveDayData(); // Auto-save on close
        drawer.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
        this.isOpen = false;
    },

    /**
     * Update drawer header date display
     */
    updateHeader() {
        const dateDisplay = document.getElementById('drawer-date');
        const dayName = document.getElementById('drawer-dayname');

        if (dateDisplay && dayName) {
            const date = new Date(this.currentDate + 'T00:00:00');
            dateDisplay.textContent = date.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });

            dayName.textContent = date.toLocaleDateString('en-US', {
                weekday: 'long'
            });
        }
    },

    /**
     * Render the task checklist
     */
    renderChecklist() {
        const container = document.getElementById('task-checklist');
        if (!container) return;

        const progress = FlowOSStorage.getProgress();

        if (this.tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 24px; text-align: center; color: var(--color-text-tertiary);">
                    <p style="font-size: 14px;">No tasks for this day</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.tasks.map(task => {
            const isCompleted = progress[task.id]?.[this.currentDate]?.completed;
            return `
                <div class="checklist-item ${isCompleted ? 'completed' : ''}">
                    <input type="checkbox"
                           class="checklist-checkbox checkbox"
                           data-task-id="${task.id}"
                           ${isCompleted ? 'checked' : ''}>
                    <span class="checklist-label">${FlowOSStorage.escapeHtml(task.name)}</span>
                </div>
            `;
        }).join('');

        // Bind checkbox changes
        container.querySelectorAll('.checklist-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const taskId = e.target.dataset.taskId;
                const isChecked = e.target.checked;

                if (isChecked) {
                    FlowOSStorage.markTaskCompleted(taskId, this.currentDate, {
                        mood: this.currentMood || 3,
                        notes: this.currentNotes || ''
                    });
                    e.target.closest('.checklist-item').classList.add('completed');
                    Toast.show('Task completed!', 'success');
                } else {
                    FlowOSStorage.unmarkTaskCompletion(taskId, this.currentDate);
                    e.target.closest('.checklist-item').classList.remove('completed');
                }

                this.updateProgress();
            });
        });
    },

    /**
     * Load saved day data (mood, notes, journal)
     */
    loadDayData() {
        const progress = FlowOSStorage.getProgress();
        const dayData = {};

        // Collect data from all tasks for this date
        for (const task of this.tasks) {
            if (progress[task.id]?.[this.currentDate]) {
                const data = progress[task.id][this.currentDate];
                dayData.mood = data.mood;
                dayData.notes = data.notes;
                dayData.journal = data.journal;
            }
        }

        this.currentMood = dayData.mood || null;
        this.currentNotes = dayData.notes || '';
        this.currentJournal = dayData.journal || '';

        // Update mood display
        this.updateMoodDisplay(this.currentMood);

        // Update text areas
        const notesInput = document.getElementById('daily-notes');
        const journalInput = document.getElementById('journal-entry');

        if (notesInput) notesInput.value = this.currentNotes || '';
        if (journalInput) journalInput.value = this.currentJournal || '';

        // Update progress bar
        this.updateProgress();
    },

    /**
     * Update the daily progress bar
     */
    updateProgress() {
        const progress = FlowOSStorage.getProgress();
        let completed = 0;

        for (const task of this.tasks) {
            if (progress[task.id]?.[this.currentDate]?.completed) {
                completed++;
            }
        }

        const percentage = this.tasks.length > 0
            ? Math.round((completed / this.tasks.length) * 100)
            : 0;

        const percentEl = document.getElementById('day-progress-percent');
        const fillEl = document.getElementById('day-progress-fill');

        if (percentEl) percentEl.textContent = `${percentage}%`;
        if (fillEl) fillEl.style.width = `${percentage}%`;

        // Check for completion celebration
        if (percentage === 100 && completed > 0) {
            percentEl.style.color = 'var(--color-success)';
            this.celebrateCompletion();
        } else {
            percentEl.style.color = '';
        }
    },

    /**
     * Set mood for the day
     */
    setMood(mood) {
        this.currentMood = mood;
        this.updateMoodDisplay(mood);
    },

    /**
     * Update mood UI
     */
    updateMoodDisplay(mood) {
        const options = document.querySelectorAll('.mood-btn');
        const selectedEl = document.getElementById('mood-selected');

        options.forEach(btn => {
            const isSelected = parseInt(btn.dataset.mood) === mood;
            btn.classList.toggle('selected', isSelected);
        });

        if (selectedEl && mood) {
            const moodEmojis = ['', '😫', '😕', '😐', '🙂', '😄'];
            selectedEl.textContent = `Mood: ${moodEmojis[mood]}`;
        }
    },

    /**
     * Mark all tasks as done
     */
    markAllDone() {
        for (const task of this.tasks) {
            if (!FlowOSStorage.getProgress()[task.id]?.[this.currentDate]?.completed) {
                FlowOSStorage.markTaskCompleted(task.id, this.currentDate, {
                    mood: this.currentMood || 3,
                    notes: this.currentNotes || ''
                });
            }
        }

        this.renderChecklist();
        this.updateProgress();
        Toast.show('All tasks completed! 🎉', 'success');
    },

    /**
     * Clear all task completions for the day
     */
    clearAll() {
        if (!confirm('Clear all completions for this day?')) return;

        for (const task of this.tasks) {
            FlowOSStorage.unmarkTaskCompletion(task.id, this.currentDate);
        }

        this.renderChecklist();
        this.updateProgress();
        Toast.show('All cleared', 'info');
    },

    /**
     * Save day data (notes, journal, mood)
     */
    saveDayData() {
        const notes = document.getElementById('daily-notes')?.value || '';
        const journal = document.getElementById('journal-entry')?.value || '';

        if (this.currentMood || notes !== this.currentNotes || journal !== this.currentJournal) {
            FlowOSStorage.updateDayData(this.currentDate, {
                mood: this.currentMood || 3,
                notes,
                journal
            });

            this.currentNotes = notes;
            this.currentJournal = journal;

            // Show subtle save indicator
            this.showSavedIndicator();
        }

        // Update sidebar and calendar stats
        SidebarTasks.updateQuickStats();
        CalendarGrid.refresh();
    },

    /**
     * Show saved indicator animation
     */
    showSavedIndicator() {
        const saveBtn = document.getElementById('save-day');
        if (saveBtn) {
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Saved!</span>
            `;

            setTimeout(() => {
                saveBtn.innerHTML = originalText;
            }, 1500);
        }
    },

    /**
     * Celebrate daily completion
     */
    celebrateCompletion() {
        // Subtle confetti or celebration effect
        console.log('🎉 Day completed!');
    },

    /**
     * Refresh drawer content
     */
    refresh() {
        if (this.isOpen) {
            this.renderChecklist();
            this.updateProgress();
        }
    },

    /**
     * Toggle drawer open/closed
     */
    toggle(date) {
        if (this.isOpen) {
            this.close();
        } else if (date) {
            this.open(date);
        }
    }
};

// Export
window.DayDrawer = DayDrawer;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    DayDrawer.init();
});