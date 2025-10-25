/**
 * Component for rendering chat messages
 */

import { getMethodColor, getConfidenceColor, scrollToBottom } from '../utils/helpers.js';

export class MessageRenderer {
    constructor(messagesContainer) {
        this.messagesContainer = messagesContainer;
    }

    /**
     * Add a simple text message to the chat
     * @param {string} content - The message content
     * @param {string} type - The message type (user, system, error)
     */
    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `mb-4 ${type === 'user' ? 'flex justify-end' : ''}`;

        const messageContent = document.createElement('div');
        messageContent.className = `max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            type === 'user'
                ? 'bg-primary text-white'
                : type === 'error'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-white border border-gray-200 text-gray-800'
        }`;

        messageContent.textContent = content;
        messageDiv.appendChild(messageContent);
        this.messagesContainer.appendChild(messageDiv);
        scrollToBottom(this.messagesContainer);
    }

    /**
     * Add an endpoint match message
     * @param {Object} result - The query result
     */
    addEndpointMatchMessage(result) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'mb-4';

        const methodColor = getMethodColor(result.method);
        const confidenceColor = getConfidenceColor(result.confidence);

        // Check if there's missing information
        const hasMissingInfo = result.missingInfo && result.missingInfo.requiredParams.length > 0;
        const bgColor = hasMissingInfo ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200';
        const textColor = hasMissingInfo ? 'text-yellow-800' : 'text-blue-800';
        const accentColor = hasMissingInfo ? 'text-yellow-700' : 'text-blue-700';

        messageDiv.innerHTML = `
            <div class="${bgColor} border rounded-lg p-4">
                ${result.summary ? `
                    <div class="mb-3 p-3 bg-white rounded border shadow-sm">
                        <h4 class="text-sm font-semibold text-gray-700 mb-1">📋 Summary</h4>
                        <p class="text-sm text-gray-600">${result.summary}</p>
                    </div>
                ` : ''}
                
                ${result.apiName ? `
                    <div class="text-xs text-gray-500 mb-2">
                        <span class="font-semibold">API:</span> ${result.apiName}
                    </div>
                ` : ''}
                
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center space-x-2">
                        <span class="text-xs font-mono px-2 py-1 rounded ${methodColor} text-white">${result.method}</span>
                        <span class="text-sm font-mono text-gray-700">${result.endpoint}</span>
                        ${hasMissingInfo ? '<span class="text-xs px-2 py-1 rounded bg-yellow-200 text-yellow-800">⚠️ Missing Info</span>' : ''}
                    </div>
                    <span class="text-xs ${confidenceColor}">${Math.round(result.confidence * 100)}% confidence</span>
                </div>

                ${result.endpointDescription ? `
                    <div class="text-sm ${textColor} mb-3 p-2 bg-white rounded border">
                        <strong>Description:</strong> ${result.endpointDescription}
                    </div>
                ` : ''}

                ${this._renderParameterDetails(result.parameterDetails, accentColor)}
                ${this._renderParameters(result.params, accentColor)}
                ${result.expectedResponse ? `
                    <div class="text-xs text-gray-600 mb-2 p-2 bg-white rounded border">
                        <strong>Expected Response:</strong> ${result.expectedResponse}
                    </div>
                ` : ''}
                ${this._renderMissingInfo(result.missingInfo)}
                ${this._renderGuidance(result.guidance)}
                ${this._renderReasoning(result.reasoning, accentColor)}
            </div>
        `;

        this.messagesContainer.appendChild(messageDiv);
        scrollToBottom(this.messagesContainer);
    }

    /**
     * Render detailed parameter information
     * @param {Array} paramDetails - The parameter details array
     * @param {string} accentColor - The accent color class
     * @returns {string} HTML string
     */
    _renderParameterDetails(paramDetails, accentColor) {
        if (!paramDetails || paramDetails.length === 0) return '';

        return `
            <div class="mb-3">
                <h4 class="text-xs font-semibold ${accentColor} mb-2">Parameters:</h4>
                <div class="space-y-1">
                    ${paramDetails.map(param => `
                        <div class="p-2 bg-white rounded border">
                            <div class="flex items-center justify-between text-xs">
                                <div class="flex items-center space-x-2">
                                    <span class="font-mono font-semibold text-gray-700">${param.name}</span>
                                    ${param.required ? '<span class="text-red-500 font-bold">*</span>' : ''}
                                    ${param.value !== undefined ? 
                                        `<span class="text-green-600 font-semibold">= ${JSON.stringify(param.value)}</span>` : 
                                        '<span class="text-gray-400 italic">not provided</span>'
                                    }
                                </div>
                                <div class="flex items-center space-x-2">
                                    <span class="text-gray-500 text-xs">${param.type || 'any'}</span>
                                    ${param.location ? `<span class="text-xs px-1 py-0.5 rounded bg-gray-100 text-gray-600">${param.location}</span>` : ''}
                                </div>
                            </div>
                            ${param.description ? `
                                <div class="text-xs text-gray-500 mt-1 ml-1">${param.description}</div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render parameters section
     * @param {Object} params - The parameters
     * @param {string} accentColor - The accent color class
     * @returns {string} HTML string
     */
    _renderParameters(params, accentColor) {
        if (!params || Object.keys(params).length === 0) return '';

        return `
            <div class="mb-3">
                <h4 class="text-xs font-semibold ${accentColor} mb-2">Extracted Parameters:</h4>
                <div class="bg-white rounded p-2 border">
                    <pre class="text-xs text-gray-600">${JSON.stringify(params, null, 2)}</pre>
                </div>
            </div>
        `;
    }

    /**
     * Render missing info section
     * @param {Object} missingInfo - Missing information details
     * @returns {string} HTML string
     */
    _renderMissingInfo(missingInfo) {
        if (!missingInfo || missingInfo.requiredParams.length === 0) return '';

        return `
            <div class="mb-3 p-3 bg-yellow-100 rounded border border-yellow-200">
                <h4 class="text-sm font-semibold text-yellow-800 mb-2">⚠️ Missing Required Information</h4>

                ${missingInfo.requestBodyFields && missingInfo.requestBodyFields.length > 0 ? `
                    <div class="text-xs text-yellow-700 mb-2">
                        <strong>Missing required fields for ${missingInfo.method || 'the'} request:</strong>
                        <div class="mt-1 flex flex-wrap gap-1">
                            ${missingInfo.requestBodyFields.map(field =>
                                `<span class="px-2 py-1 bg-yellow-200 rounded text-yellow-800 font-mono text-xs">${field}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="text-xs text-yellow-700 mb-2">
                    <strong>Missing parameters:</strong> ${missingInfo.requiredParams.join(', ')}
                </div>

                <div class="text-xs text-yellow-700 mb-2">
                    <strong>Suggestions:</strong>
                    <ul class="mt-1 ml-4 list-disc">
                        ${missingInfo.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                    </ul>
                </div>

                <div class="text-xs text-yellow-700">
                    <strong>Example query:</strong> "${missingInfo.exampleQuery}"
                </div>
            </div>
        `;
    }

    /**
     * Render guidance section
     * @param {string} guidance - Guidance text
     * @returns {string} HTML string
     */
    _renderGuidance(guidance) {
        if (!guidance) return '';

        return `
            <div class="mb-3 p-3 bg-gray-100 rounded border">
                <h4 class="text-xs font-semibold text-gray-700 mb-2">💡 Guidance</h4>
                <div class="text-xs text-gray-600 whitespace-pre-line">${guidance}</div>
            </div>
        `;
    }

    /**
     * Render reasoning section
     * @param {string} reasoning - Reasoning text
     * @param {string} accentColor - The accent color class
     * @returns {string} HTML string
     */
    _renderReasoning(reasoning, accentColor) {
        if (!reasoning) return '';

        return `
            <div class="text-xs ${accentColor}">
                <strong>Reasoning:</strong> ${reasoning}
            </div>
        `;
    }

    /**
     * Add an API response message
     * @param {Object} apiResult - The API response
     * @param {Object} queryResult - The original query result
     */
    addApiResponseMessage(apiResult, queryResult) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'mb-4';

        const isSuccess = apiResult.success;
        const statusColor = isSuccess ? 'text-green-600' : 'text-red-600';
        const bgColor = isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
        const textColor = isSuccess ? 'text-green-800' : 'text-red-800';

        messageDiv.innerHTML = `
            <div class="${bgColor} border rounded-lg p-4">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center space-x-2">
                        <span class="text-sm font-semibold ${textColor}">API Response</span>
                        <span class="text-xs font-mono px-2 py-1 rounded ${isSuccess ? 'bg-green-500' : 'bg-red-500'} text-white">
                            ${apiResult.status}
                        </span>
                    </div>
                    <span class="text-xs ${statusColor}">
                        ${isSuccess ? 'Success' : 'Error'}
                    </span>
                </div>

                <div class="mb-3">
                    <h4 class="text-xs font-semibold ${textColor} mb-2">Response Data:</h4>
                    <div class="bg-white rounded p-3 border max-h-64 overflow-y-auto">
                        <pre class="text-xs text-gray-600 whitespace-pre-wrap">${JSON.stringify(apiResult.data, null, 2)}</pre>
                    </div>
                </div>

                ${!isSuccess && apiResult.error ? `
                    <div class="text-xs ${textColor}">
                        <strong>Error:</strong> ${apiResult.error}
                        ${apiResult.message ? `<br><strong>Message:</strong> ${apiResult.message}` : ''}
                    </div>
                ` : ''}
            </div>
        `;

        this.messagesContainer.appendChild(messageDiv);
        scrollToBottom(this.messagesContainer);
    }

    /**
     * Clear all messages from the container
     */
    clear() {
        this.messagesContainer.innerHTML = '';
    }
}
