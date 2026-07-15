/**
 * USE STORAGE - Custom hook for storage operations
 */

function useStorage(key) {
    /**
     * Get current value
     */
    const get = () => {
        const data = FlowOSStorage.get(key);
        return data;
    };

    /**
     * Set value
     */
    const set = (value) => {
        FlowOSStorage.set(key, value);
        return value;
    };

    /**
     * Remove value
     */
    const remove = () => {
        FlowOSStorage.remove(key);
    };

    /**
     * Update value with function
     */
    const update = (updater) => {
        const current = get();
        const newValue = typeof updater === 'function' ? updater(current) : updater;
        return set(newValue);
    };

    return {
        get,
        set,
        remove,
        update
    };
}

window.useStorage = useStorage;