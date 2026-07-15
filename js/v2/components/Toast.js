/**
 * TOAST COMPONENT - Notification system
 */

const Toast = {
    queue: [],
    activeToast: null,

    /**
     * Show a toast notification
     */
    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');

        document.body.appendChild(toast);

        // Remove after duration
        setTimeout(() => {
            this.hide(toast);
        }, duration);
    },

    /**
     * Hide a toast
     */
    hide(toast) {
        toast.classList.add('fade-out');

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 200);
    },

    /**
     * Success toast
     */
    success(message) {
        this.show(message, 'success');
    },

    /**
     * Error toast
     */
    error(message) {
        this.show(message, 'error');
    },

    /**
     * Info toast
     */
    info(message) {
        this.show(message, 'info');
    }
};

window.Toast = Toast;