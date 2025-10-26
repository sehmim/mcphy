/**
 * Component for rendering endpoint information in the sidebar
 */

export class EndpointRenderer {
    constructor(availableContainer, calledContainer) {
        this.availableContainer = availableContainer;
        this.calledContainer = calledContainer;
    }

    /**
     * Render available endpoints
     * @param {Array} endpoints - List of available endpoints
     */
    renderAvailableEndpoints(endpoints) {
        if (!endpoints || endpoints.length === 0) {
            this.availableContainer.innerHTML = '<div class="text-sm text-gray-400">No endpoints available</div>';
            return;
        }

        const endpointsHtml = endpoints.map(endpoint => {
            return `
                <div class="bg-white rounded-md p-3 border border-gray-200 hover:border-gray-300 transition-colors">
                    <div class="flex items-center space-x-2 mb-1">
                        <span class="text-xs font-mono px-2 py-0.5 rounded bg-gray-800 text-white">${endpoint.method}</span>
                    </div>
                    <p class="text-xs font-mono text-gray-600 mb-1">${endpoint.path}</p>
                    <p class="text-xs text-gray-500">${endpoint.description || 'No description'}</p>
                </div>
            `;
        }).join('');

        this.availableContainer.innerHTML = endpointsHtml;
    }

    /**
     * Render called endpoints
     * @param {Array} endpoints - List of called endpoints
     */
    renderCalledEndpoints(endpoints) {
        if (!endpoints || endpoints.length === 0) {
            this.calledContainer.innerHTML = '<div class="text-sm text-gray-400">No endpoints called yet</div>';
            return;
        }

        const endpointsHtml = endpoints.map(endpoint => {
            return `
                <div class="bg-white rounded-md p-3 border border-gray-200">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-mono px-2 py-0.5 rounded bg-gray-800 text-white">${endpoint.method}</span>
                        <span class="text-xs text-gray-400">${endpoint.timestamp}</span>
                    </div>
                    <div class="text-xs font-mono text-gray-700 mb-2">${endpoint.endpoint}</div>
                    <div class="flex items-center justify-between">
                        <span class="text-xs text-gray-500">${Math.round(endpoint.confidence * 100)}%</span>
                        ${endpoint.params && Object.keys(endpoint.params).length > 0 ?
                            `<span class="text-xs text-gray-500">${Object.keys(endpoint.params).length} params</span>` :
                            ''
                        }
                    </div>
                </div>
            `;
        }).join('');

        this.calledContainer.innerHTML = endpointsHtml;
    }

    /**
     * Show loading state for available endpoints
     */
    showAvailableLoading() {
        this.availableContainer.innerHTML = '<div class="text-sm text-gray-400">Loading endpoints...</div>';
    }

    /**
     * Show error state for available endpoints
     * @param {string} message - Error message to display
     */
    showAvailableError(message = 'Failed to load endpoints') {
        this.availableContainer.innerHTML = `<div class="text-sm text-red-600">${message}</div>`;
    }

    /**
     * Clear all called endpoints
     */
    clearCalledEndpoints() {
        this.calledContainer.innerHTML = '<div class="text-sm text-gray-500">No endpoints called yet</div>';
    }
}
