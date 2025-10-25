/**
 * Component for rendering endpoint information in the sidebar
 */

import { getMethodColor, getConfidenceColor } from '../utils/helpers.js';

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
            this.availableContainer.innerHTML = '<div class="text-sm text-gray-500">No endpoints available</div>';
            return;
        }

        const endpointsHtml = endpoints.map(endpoint => {
            const methodColor = getMethodColor(endpoint.method);
            return `
                <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-mono px-2 py-1 rounded ${methodColor} text-white">${endpoint.method}</span>
                        <span class="text-xs text-gray-500">${endpoint.path}</span>
                    </div>
                    <p class="text-xs text-gray-600">${endpoint.description || 'No description'}</p>
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
            this.calledContainer.innerHTML = '<div class="text-sm text-gray-500">No endpoints called yet</div>';
            return;
        }

        const endpointsHtml = endpoints.map(endpoint => {
            const methodColor = getMethodColor(endpoint.method);
            const confidenceColor = getConfidenceColor(endpoint.confidence);

            return `
                <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-xs font-mono px-2 py-1 rounded ${methodColor} text-white">${endpoint.method}</span>
                        <span class="text-xs text-gray-400">${endpoint.timestamp}</span>
                    </div>
                    <div class="text-xs font-mono text-gray-700 mb-1">${endpoint.endpoint}</div>
                    <div class="flex items-center justify-between">
                        <span class="text-xs ${confidenceColor}">Confidence: ${Math.round(endpoint.confidence * 100)}%</span>
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
        this.availableContainer.innerHTML = '<div class="text-sm text-gray-500">Loading endpoints...</div>';
    }

    /**
     * Show error state for available endpoints
     * @param {string} message - Error message to display
     */
    showAvailableError(message = 'Failed to load endpoints') {
        this.availableContainer.innerHTML = `<div class="text-sm text-red-500">${message}</div>`;
    }

    /**
     * Clear all called endpoints
     */
    clearCalledEndpoints() {
        this.calledContainer.innerHTML = '<div class="text-sm text-gray-500">No endpoints called yet</div>';
    }
}
