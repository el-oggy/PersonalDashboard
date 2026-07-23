/**
 * SIDEBAR TASKS - Task library management
 * Handles the permanent left sidebar with all tasks
 */

const SidebarTasks = {
    tasks: [],
    filteredTasks: [],
    searchQuery: '',

    /**
     * Initialize sidebar
     */
    init() {
        this.loadTasks();
        this.bindEvents();
        this.render();
        this.updateQuickStats();
    },

    /**
     * Load tasks from storage
     */
    loadTasks() {
        this.tasks = FlowOSStorage.getTasks();
        this.filterTasks();
    },

    /**
     * Filter tasks based on search query
     */
    filterTasks() {
        if (!this.searchQuery) {
            this.filteredTasks = [...this.tasks];
        } else {
            const query = this.searchQuery.toLowerCase();
            this.filteredTasks = this.tasks.filter(task =>
                task.name.toLowerCase().includes(query) ||
                task.category.toLowerCase().includes(query)
            );
        }
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Add task button
        const addBtn = document.getElementById('add-task-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.openTaskModal());
        }

        // Search input
        const searchInput = document.getElementById('task-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.filterTasks();
                this.render();
            });
        }
    },

    /**
     * Render the task list
     */
    render() {
        const list = document.getElementById('task-list');
        if (!list) return;

        if (this.filteredTasks.length === 0) {
            list.innerHTML = `
                <div class="empty-state" style="padding: 24px; text-align: center; color: var(--color-text-tertiary);">
                    <div style="font-size: 32px; margin-bottom: 8px;">📝</div>
                    <p style="font-size: 14px;">${this.searchQuery ? 'No tasks found' : 'No tasks yet'}</p>
                    <p style="font-size: 12px; margin-top: 8px;">Click "Add Task" to create one</p>
                </div>
            `;
            return;
        }

        list.innerHTML = this.filteredTasks.map(task => `
            <div class="task-item ${task.favorite ? 'is-favorite' : ''}" data-task-id="${task.id}" draggable="true">
                <span class="task-item-icon">${task.icon}</span>
                <span class="task-item-name">${this.escapeHtml(task.name)}</span>
                ${task.category ? `<span class="task-category">${task.category}</span>` : ''}
                <svg class="task-item-favorite" viewBox="0 0 24 24">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
            </div>
        `).join('');

        // Bind item clicks
        list.querySelectorAll('.task-item').forEach(item => {
            item.addEventListener('click', (e) => this.handleTaskClick(e, item.dataset.taskId));
            item.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                this.openTaskModal(item.dataset.taskId);
            });
            item.addEventListener('dragstart', (e) => this.handleDragStart(e, item.dataset.taskId));
            item.addEventListener('dragover', (e) => e.preventDefault());
            item.addEventListener('drop', (e) => this.handleDrop(e, item.dataset.taskId));
            item.addEventListener('dragend', (e) => this.handleDragEnd(e));
        });
    },

    /**
     * Handle task item click
     */
    handleTaskClick(e, taskId) {
        // Remove active class from all items
        document.querySelectorAll('.task-item').forEach(i => i.classList.remove('active'));

        // Add active class to clicked
        e.currentTarget.classList.add('active');

        // Navigate to task (can be extended for task detailing)
        console.log('Selected task:', taskId);
    },

    /**
     * Drag and drop handlers
     */
    handleDragStart(e, taskId) {
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.classList.add('dragging');
        this.draggedTaskId = taskId;
    },

    handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        document.querySelectorAll('.task-item').forEach(i => i.classList.remove('drag-over'));
    },

    handleDrop(e, targetTaskId) {
        e.preventDefault();

        if (this.draggedTaskId === targetTaskId) return;

        const tasks = this.tasks;
        const draggedIndex = tasks.findIndex(t => t.id === this.draggedTaskId);
        const targetIndex = tasks.findIndex(t => t.id === targetTaskId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        // Swap tasks
        const [draggedTask] = tasks.splice(draggedIndex, 1);
        tasks.splice(targetIndex, 0, draggedTask);

        // Update order
        tasks.forEach((task, index) => {
            task.order = index;
        });

        FlowOSStorage.set('tasks', tasks);
        this.loadTasks();
        this.render();
    },

    /**
     * Open task modal (create or edit)
     */
        openTaskModal(taskId = null) {
            const modalBackdrop = document.getElementById('task-modal-backdrop');
            const modalTitle = document.getElementById('modal-title');
            const form = document.getElementById('task-form');
            const taskIdInput = document.getElementById('task-id');
            const taskName = document.getElementById('task-name');
            const taskIcon = document.getElementById('task-icon');
            const taskCategory = document.getElementById('task-category');
            const taskFavorite = document.getElementById('task-favorite');
            const deleteBtn = document.getElementById('delete-task-btn');

            if (taskId) {
                // Edit mode
                const task = FlowOSStorage.getTask(taskId);
                modalTitle.textContent = 'Edit Task';
                taskIdInput.value = task.id;
                taskName.value = task.name;
                taskIcon.value = task.icon;
                taskCategory.value = task.category;
                taskFavorite.checked = task.favorite;
                if (deleteBtn) deleteBtn.style.display = 'block';
            } else {
                // Create mode
                modalTitle.textContent = 'Add New Task';
                form.reset();
                taskIdInput.value = '';
                if (deleteBtn) deleteBtn.style.display = 'none';
            }

            modalBackdrop.classList.add('open');

            // Focus on name input
            setTimeout(() => taskName.focus(), 100);
        },

    /**
     * Close task modal
     */
    closeTaskModal() {
        const modalBackdrop = document.getElementById('task-modal-backdrop');
        modalBackdrop.classList.remove('open');
    },

    /**
     * Handle form submission
     */
    handleFormSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const taskId = document.getElementById('task-id').value;
        const name = document.getElementById('task-name').value.trim();
        const icon = document.getElementById('task-icon').value.trim() || FlowOSStorage.getTaskIcon(name);
        const category = document.getElementById('task-category').value;
        const favorite = document.getElementById('task-favorite').checked;

        if (!name) return;

        if (taskId) {
            // Update existing
            FlowOSStorage.updateTask(taskId, { name, icon, category, favorite });
        } else {
            // Create new
            FlowOSStorage.addTask({ name, icon, category, favorite });
        }

        this.loadTasks();
        this.render();
        this.closeTaskModal();
        this.updateQuickStats();
    },

    /**
     * Delete a task
     */
    deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) return;

        FlowOSStorage.deleteTask(taskId);
        this.loadTasks();
        this.render();
        this.closeTaskModal();
        this.updateQuickStats();
    },

    /**
     * Update quick stats display
     */
    updateQuickStats() {
        const todayProgress = document.getElementById('today-progress');
        const currentStreak = document.getElementById('current-streak');

        if (todayProgress) {
            todayProgress.textContent = `${FlowOSStorage.getTodayCompletionRate()}%`;
        }

        // Get average streak across tasks
        const tasks = this.tasks;
        if (tasks.length > 0) {
            const avgStreak = Math.round(tasks.reduce((sum, task) => {
                return sum + FlowOSStorage.getCurrentStreak(task.id);
            }, 0) / tasks.length);
            if (currentStreak) {
                currentStreak.textContent = avgStreak;
            }
        }
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Refresh sidebar (call after data changes)
     */
    refresh() {
        this.loadTasks();
        this.render();
        this.updateQuickStats();
    }
};

// Bind modal events
document.addEventListener('DOMContentLoaded', () => {
    const modalBackdrop = document.getElementById('task-modal-backdrop');
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    const taskForm = document.getElementById('task-form');
    const deleteBtn = document.getElementById('delete-task-btn');

    if (modalClose) {
        modalClose.addEventListener('click', () => SidebarTasks.closeTaskModal());
    }

    if (modalCancel) {
        modalCancel.addEventListener('click', () => SidebarTasks.closeTaskModal());
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            const id = document.getElementById('task-id').value;
            if (id) {
                SidebarTasks.deleteTask(id);
            }
        });
    }

    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) {
                SidebarTasks.closeTaskModal();
            }
        });
    }

    if (taskForm) {
        taskForm.addEventListener('submit', (e) => SidebarTasks.handleFormSubmit(e));
    }

    // Initialize sidebar
    SidebarTasks.init();
});

// Export
window.SidebarTasks = SidebarTasks;