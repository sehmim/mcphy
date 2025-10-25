/**
 * State management for the MCPhy application
 * Uses a simple observable pattern for state changes
 */

export class AppState {
    constructor() {
        this.state = {
            availableEndpoints: [],
            calledEndpoints: [],
            isLoading: false,
        };
        this.listeners = new Map();
    }

    /**
     * Get the current state
     * @returns {Object} Current application state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Subscribe to state changes for a specific key
     * @param {string} key - The state key to listen to
     * @param {Function} callback - Function to call when the state changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);

        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(key);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        };
    }

    /**
     * Update a specific state value
     * @param {string} key - The state key to update
     * @param {*} value - The new value
     */
    setState(key, value) {
        this.state[key] = value;
        this.notify(key, value);
    }

    /**
     * Notify all listeners for a specific key
     * @param {string} key - The state key that changed
     * @param {*} value - The new value
     */
    notify(key, value) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(callback => callback(value));
        }
    }

    /**
     * Set available endpoints
     * @param {Array} endpoints - List of available endpoints
     */
    setAvailableEndpoints(endpoints) {
        this.setState('availableEndpoints', endpoints);
    }

    /**
     * Get available endpoints
     * @returns {Array} List of available endpoints
     */
    getAvailableEndpoints() {
        return this.state.availableEndpoints;
    }

    /**
     * Add a called endpoint to the history
     * @param {Object} endpointData - The endpoint call data
     */
    addCalledEndpoint(endpointData) {
        const calledEndpoint = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            ...endpointData
        };

        const updatedEndpoints = [calledEndpoint, ...this.state.calledEndpoints];
        this.setState('calledEndpoints', updatedEndpoints);
    }

    /**
     * Get called endpoints
     * @returns {Array} List of called endpoints
     */
    getCalledEndpoints() {
        return this.state.calledEndpoints;
    }

    /**
     * Set loading state
     * @param {boolean} loading - Whether the app is loading
     */
    setLoading(loading) {
        this.setState('isLoading', loading);
    }

    /**
     * Get loading state
     * @returns {boolean} Whether the app is loading
     */
    isLoading() {
        return this.state.isLoading;
    }

    /**
     * Clear all called endpoints
     */
    clearCalledEndpoints() {
        this.setState('calledEndpoints', []);
    }

    /**
     * Reset the entire state
     */
    reset() {
        this.state = {
            availableEndpoints: [],
            calledEndpoints: [],
            isLoading: false,
        };
        this.listeners.clear();
    }
}
