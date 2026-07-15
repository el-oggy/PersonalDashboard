/**
 * FLOWOS V2 - MAIN APPLICATION
 * Entry point and orchestrator
 */

(function() {
    'use strict';

    const App = {
        initialized: false,

        /**
         * Initialize FlowOS v2
         */
        async init() {
            if (this.initialized) return;

            console.log('🌊 FlowOS v2 initializing...');

            try {
                // Wait for DOM to be ready
                if (document.readyState === 'loading') {
                    await this.waitForDOM();
                }

                // Initialize storage (should already be initialized, but ensure)
                FlowOSStorage.init();

                // Initialize theme
                const useThemeHook = useTheme();

                // Initialize components
                console.log('Initializing components...');
                SidebarTasks.init();
                CalendarGrid.init();
                DayDrawer.init();

                // Set up view all stats button
                this.setupStatsButton();

                // Mark as initialized
                this.initialized = true;

                console.log('✅ FlowOS v2 ready!');

                // Welcome message for first-time users
                this.showWelcomeIfFirstTime();

            } catch (error) {
                console.error('❌ FlowOS v2 initialization error:', error);
                Toast.error('Failed to initialize FlowOS. Please refresh the page.');
            }
        },

        /**
         * Wait for DOM to be ready
         */
        waitForDOM() {
            return new Promise((resolve) => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        },

        /**
         * Set up the view all stats button
         */
        setupStatsButton() {
            const btn = document.getElementById('view-all-stats');
            if (btn) {
                btn.addEventListener('click', () => {
                    // For now, show a toast - can be expanded to a full stats page
                    Toast.success('Full statistics page coming soon!');
                });
            }
        },

        /**
         * Show welcome message for first-time users
         */
        showWelcomeIfFirstTime() {
            const tasks = FlowOSStorage.getTasks();

            // If tasks were just created (default tasks), show welcome
            if (tasks.length === 5 && !localStorage.getItem('flowos-welcome-shown')) {
                console.log('Welcome first-time user!');
                localStorage.setItem('flowos-welcome-shown', 'true');

                setTimeout(() => {
                    Toast.success('Welcome to FlowOS! Start by completing your tasks 🌊');
                }, 1000);
            }
        },

        /**
         * Export all data
         */
        exportData() {
            const data = FlowOSStorage.exportData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `flowos-backup-${FlowOSStorage.formatDateKey(new Date())}.json`;
            a.click();

            URL.revokeObjectURL(url);
            Toast.success('Data exported successfully!');
        },

        /**
         * Import data from file
         */
        importData(file) {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    FlowOSStorage.importData(data);

                    // Reload everything
                    location.reload();
                } catch (error) {
                    console.error('Import error:', error);
                    Toast.error('Failed to import data. Invalid file format.');
                }
            };

            reader.readAsText(file);
        },

        /**
         * Reset all data
         */
        resetAll() {
            if (confirm('This will delete all your data. Are you sure?')) {
                if (confirm('Are you REALLY sure? This cannot be undone!')) {
                    FlowOSStorage.clearAll();
                    Toast.success('FlowOS has been reset. Reloading...');
                    setTimeout(() => location.reload(), 1500);
                }
            }
        }
    };

    // Initialize when script loads
    App.init();

    // Export for debugging
    window.FlowOS = App;
})();