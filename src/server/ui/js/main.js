/**
 * MCPhy UI - Main Application
 * Orchestrates all components and manages application flow
 */

import { ApiService } from './services/apiService.js';
import { AppState } from './state/appState.js';
import { MessageRenderer } from './components/messageRenderer.js';
import { EndpointRenderer } from './components/endpointRenderer.js';
import { FormHandler } from './components/formHandler.js';
import { SpecUploadHandler } from './components/specUploadHandler.js';

class MCPhyApp {
    constructor() {
        // Initialize state
        this.state = new AppState();

        // Initialize components
        this.messageRenderer = new MessageRenderer(
            document.getElementById('messages')
        );

        this.endpointRenderer = new EndpointRenderer(
            document.getElementById('availableEndpoints'),
            document.getElementById('calledEndpoints')
        );

        this.formHandler = new FormHandler(
            document.getElementById('queryForm'),
            document.getElementById('queryInput'),
            document.getElementById('sendButton')
        );

        this.specUploadHandler = new SpecUploadHandler();

        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        // Setup form handler
        this.formHandler.init();
        this.formHandler.onSubmit((query) => this.handleQuery(query));

        // Subscribe to state changes
        this.subscribeToStateChanges();

        // Load available endpoints
        await this.loadAvailableEndpoints();

        // Focus input field
        this.formHandler.focus();
    }

    /**
     * Subscribe to state changes
     */
    subscribeToStateChanges() {
        // Update available endpoints when state changes
        this.state.subscribe('availableEndpoints', (endpoints) => {
            this.endpointRenderer.renderAvailableEndpoints(endpoints);
        });

        // Update called endpoints when state changes
        this.state.subscribe('calledEndpoints', (endpoints) => {
            this.endpointRenderer.renderCalledEndpoints(endpoints);
        });

        // Update loading state when state changes
        this.state.subscribe('isLoading', (loading) => {
            this.formHandler.setLoading(loading);
        });

        // Register inline form submission handler
        this.messageRenderer.onFormSubmit((formData) => {
            this.handleInlineFormSubmit(formData);
        });
    }

    /**
     * Load available endpoints from the API
     */
    async loadAvailableEndpoints() {
        try {
            this.endpointRenderer.showAvailableLoading();
            const endpoints = await ApiService.fetchEndpoints();
            this.state.setAvailableEndpoints(endpoints);
        } catch (error) {
            console.error('Failed to load endpoints:', error);
            this.endpointRenderer.showAvailableError();
        }
    }

    /**
     * Handle query submission
     * @param {string} query - The user's query
     */
    async handleQuery(query) {
        // Add user message
        this.messageRenderer.addMessage(query, 'user');

        // Clear input
        this.formHandler.clear();

        // Set loading state
        this.state.setLoading(true);

        try {
            // Send query to backend
            const queryResult = await ApiService.sendQuery(query);

            // Add called endpoint to sidebar
            this.state.addCalledEndpoint({
                endpoint: queryResult.endpoint,
                method: queryResult.method,
                params: queryResult.params,
                confidence: queryResult.confidence
            });

            // Add endpoint match message (with inline form if needed)
            this.messageRenderer.addEndpointMatchMessage(queryResult);

            // Check if we can make the API call
            const hasMissingInfo = queryResult.missingInfo &&
                                  queryResult.missingInfo.requiredParams.length > 0;

            if (!hasMissingInfo) {
                // Make the actual API call immediately
                await this.makeApiCall(queryResult);
            }
            // If missing info, the inline form will be shown and user can fill it

        } catch (error) {
            console.error('Error processing query:', error);
            this.messageRenderer.addMessage(
                'Sorry, there was an error processing your request.',
                'error'
            );
        } finally {
            this.state.setLoading(false);
            this.formHandler.focus();
        }
    }

    /**
     * Handle inline form submission with completed parameters
     * @param {Object} formData - The form submission data
     */
    async handleInlineFormSubmit(formData) {
        const { endpoint, method, params, result } = formData;

        // Set loading state
        this.state.setLoading(true);

        try {
            // Make the API call with completed parameters
            await this.makeApiCall({
                endpoint,
                method,
                params,
                parameterDetails: result.parameterDetails
            });
        } catch (error) {
            console.error('Error processing inline form:', error);
            this.messageRenderer.addMessage(
                'Sorry, there was an error processing your request.',
                'error'
            );
        } finally {
            this.state.setLoading(false);
            this.formHandler.focus();
        }
    }

    /**
     * Make an API call through the proxy
     * @param {Object} queryResult - The query result with endpoint information
     */
    async makeApiCall(queryResult) {
        try {
            const { endpoint, method, params, parameterDetails } = queryResult;

            // Show system message
            this.messageRenderer.addMessage(
                `Making ${method} request to ${endpoint}...`,
                'system'
            );

            // Make the API call with parameter details for proper routing
            const apiResult = await ApiService.makeApiCall(
                endpoint,
                method,
                params,
                parameterDetails
            );

            // Display the API response
            this.messageRenderer.addApiResponseMessage(apiResult, queryResult);

        } catch (error) {
            console.error('API call failed:', error);
            this.messageRenderer.addMessage(
                `API call failed: ${error.message}`,
                'error'
            );
        }
    }

    /**
     * Clear all chat messages
     */
    clearMessages() {
        this.messageRenderer.clear();
    }

    /**
     * Clear called endpoints history
     */
    clearHistory() {
        this.state.clearCalledEndpoints();
    }

    /**
     * Reset the entire application
     */
    reset() {
        this.clearMessages();
        this.clearHistory();
        this.formHandler.clear();
        this.formHandler.focus();
    }
}

// Initialize the app when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.mcphyApp = new MCPhyApp();
});

// Export for potential testing
export default MCPhyApp;
