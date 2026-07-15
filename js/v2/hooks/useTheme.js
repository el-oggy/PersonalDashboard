/**
 * USE THEME - Custom hook for theme management
 */

function useTheme() {
    /**
     * Get current theme from storage
     */
    const getTheme = () => {
        return FlowOSStorage.getSetting('theme') || 'dark';
    };

    /**
     * Set theme on document
     */
    const setTheme = (theme) => {
        // Update storage
        FlowOSStorage.updateSetting('theme', theme);

        // Update document class
        document.body.classList.remove('theme-dark', 'theme-light');
        document.body.classList.add(`theme-${theme}`);

        // Update meta theme-color
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#ffffff');
        }

        // Announce to screen readers
        announceThemeChange(theme);
    };

    /**
     * Toggle between dark and light
     */
    const toggleTheme = () => {
        const current = getTheme();
        const newTheme = current === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        return newTheme;
    };

    /**
     * Initialize theme on page load
     */
    const initTheme = () => {
        const savedTheme = getTheme();
        setTheme(savedTheme);

        // Set up theme toggle button
        setupThemeToggle();
    };

    /**
     * Set up theme toggle button listener
     */
    const setupThemeToggle = () => {
        const toggleBtn = document.getElementById('theme-toggle');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                toggleTheme();
            });
        }
    };

    /**
     * Announce theme change for accessibility
     */
    const announceThemeChange = (theme) => {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = `Theme changed to ${theme} mode`;
        document.body.appendChild(announcement);

        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    };

    // Initialize on module load
    initTheme();

    return {
        getTheme,
        setTheme,
        toggleTheme
    };
}

// Export
window.useTheme = useTheme;