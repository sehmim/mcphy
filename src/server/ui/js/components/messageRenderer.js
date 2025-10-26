/**
 * Component for rendering chat messages
 */

import { scrollToBottom } from '../utils/helpers.js';

export class MessageRenderer {
    constructor(messagesContainer) {
        this.messagesContainer = messagesContainer;
        this.onFormSubmitCallback = null;
    }

    /**
     * Register callback for inline form submission
     * @param {Function} callback - The callback function
     */
    onFormSubmit(callback) {
        this.onFormSubmitCallback = callback;
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
        messageContent.className = `max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
            type === 'user'
                ? 'bg-gray-800 text-white shadow-sm'
                : type === 'error'
                ? 'bg-white border border-red-300 text-red-800 shadow-sm'
                : 'bg-white border border-gray-200 text-gray-700 shadow-sm'
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

        // Check if there's missing information
        const hasMissingInfo = result.missingInfo && result.missingInfo.requiredParams.length > 0;

        messageDiv.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                ${result.summary ? `
                    <div class="mb-4">
                        <p class="text-base text-gray-800 font-medium">${result.summary}</p>
                    </div>
                ` : ''}

                <div class="flex items-center space-x-3 mb-4 pb-4 border-b border-gray-100">
                    <span class="text-xs font-mono px-2 py-1 rounded bg-gray-800 text-white">${result.method}</span>
                    <span class="text-sm font-mono text-gray-600">${result.endpoint}</span>
                    <span class="text-xs text-gray-400 ml-auto">${Math.round(result.confidence * 100)}%</span>
                </div>

                ${this._renderCompactParameters(result.parameterDetails, result.params)}
                ${hasMissingInfo ? this._renderInlineForm(result.missingInfo, result.parameterDetails, result.params, result) : ''}
            </div>
        `;

        this.messagesContainer.appendChild(messageDiv);

        // Attach form submit handler if form exists
        if (hasMissingInfo) {
            this._attachFormHandler(messageDiv, result);
        }

        scrollToBottom(this.messagesContainer);
    }

    /**
     * Render compact parameter display (minimal design)
     * @param {Array} paramDetails - The parameter details array
     * @param {Object} params - The extracted parameters
     * @returns {string} HTML string
     */
    _renderCompactParameters(paramDetails, params) {
        if ((!paramDetails || paramDetails.length === 0) && (!params || Object.keys(params).length === 0)) {
            return '';
        }

        // Show parameters that have values
        const filledParams = paramDetails?.filter(p => p.value !== undefined) || [];
        if (filledParams.length === 0 && (!params || Object.keys(params).length === 0)) {
            return '';
        }

        return `
            <div class="mb-4">
                <h4 class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Parameters</h4>
                <div class="space-y-1">
                    ${filledParams.map(param => `
                        <div class="flex items-center justify-between text-sm py-1">
                            <span class="font-mono text-gray-700">${param.name}</span>
                            <span class="text-gray-900 font-medium">${JSON.stringify(param.value)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render inline form for missing parameters
     * @param {Object} missingInfo - Missing information details
     * @param {Array} paramDetails - The parameter details array
     * @param {Object} extractedParams - Already extracted parameters
     * @param {Object} result - Full query result
     * @returns {string} HTML string
     */
    _renderInlineForm(missingInfo, paramDetails, extractedParams, result) {
        const missingParams = missingInfo.requiredParams;

        return `
            <div class="mt-4 pt-4 border-t border-gray-200">
                <div class="mb-3">
                    <h4 class="text-sm font-medium text-gray-800 mb-1">Complete Required Information</h4>
                    <p class="text-xs text-gray-500">Fill in the missing fields to proceed with the API call</p>
                </div>

                <form class="inline-param-form space-y-3" data-endpoint="${result.endpoint}" data-method="${result.method}">
                    ${missingParams.map(paramName => {
                        const param = paramDetails?.find(p => p.name === paramName) || { name: paramName, type: 'string' };
                        const currentValue = extractedParams?.[paramName] || '';

                        // Determine HTML input type and attributes based on parameter type
                        const inputConfig = this._getInputConfig(param);

                        return `
                            <div>
                                <label class="block text-xs font-medium text-gray-700 mb-1">
                                    ${param.name}
                                    <span class="text-red-500">*</span>
                                    ${param.type ? `<span class="text-gray-400 font-normal ml-1">(${param.type})</span>` : ''}
                                </label>
                                ${param.description ? `<p class="text-xs text-gray-500 mb-1">${param.description}</p>` : ''}
                                <input
                                    type="${inputConfig.type}"
                                    name="${param.name}"
                                    value="${currentValue}"
                                    placeholder="${inputConfig.placeholder}"
                                    ${inputConfig.pattern ? `pattern="${inputConfig.pattern}"` : ''}
                                    ${inputConfig.step ? `step="${inputConfig.step}"` : ''}
                                    ${inputConfig.min !== undefined ? `min="${inputConfig.min}"` : ''}
                                    ${inputConfig.max !== undefined ? `max="${inputConfig.max}"` : ''}
                                    data-type="${param.type || 'string'}"
                                    required
                                    class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                                />
                            </div>
                        `;
                    }).join('')}

                    <div class="flex items-center space-x-2 pt-2">
                        <button
                            type="submit"
                            class="px-4 py-2 bg-gray-800 text-white text-sm rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                        >
                            Submit Request
                        </button>
                        <button
                            type="button"
                            class="cancel-form px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    /**
     * Get input configuration based on parameter type
     * @param {Object} param - Parameter details
     * @returns {Object} Input configuration
     */
    _getInputConfig(param) {
        const type = (param.type || 'string').toLowerCase();
        const name = (param.name || '').toLowerCase();

        // Map parameter types to HTML input types
        if (type === 'integer' || type === 'int') {
            return {
                type: 'number',
                step: '1',
                placeholder: 'Enter number (e.g., 123)',
            };
        }

        if (type === 'number' || type === 'float' || type === 'double') {
            return {
                type: 'number',
                step: 'any',
                placeholder: 'Enter number (e.g., 123.45)',
            };
        }

        if (type === 'boolean' || type === 'bool') {
            return {
                type: 'checkbox',
                placeholder: '',
            };
        }

        if (type === 'date' || name.includes('date')) {
            return {
                type: 'date',
                placeholder: 'YYYY-MM-DD',
            };
        }

        if (type === 'datetime' || type === 'date-time' || name.includes('datetime')) {
            return {
                type: 'datetime-local',
                placeholder: 'YYYY-MM-DD HH:MM',
            };
        }

        if (type === 'time' || name.includes('time') || name.includes('slot')) {
            return {
                type: 'time',
                placeholder: 'HH:MM',
            };
        }

        if (name.includes('email')) {
            return {
                type: 'email',
                placeholder: 'example@email.com',
            };
        }

        if (name.includes('url') || name.includes('website')) {
            return {
                type: 'url',
                placeholder: 'https://example.com',
            };
        }

        if (name.includes('phone') || name.includes('tel')) {
            return {
                type: 'tel',
                placeholder: '+1234567890',
            };
        }

        // Default to text
        return {
            type: 'text',
            placeholder: `Enter ${param.name}`,
        };
    }

    /**
     * Attach form submission handler
     * @param {HTMLElement} messageDiv - The message container
     * @param {Object} result - The query result
     */
    _attachFormHandler(messageDiv, result) {
        const form = messageDiv.querySelector('.inline-param-form');
        const cancelBtn = messageDiv.querySelector('.cancel-form');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();

                // Collect form data with type conversion
                const newParams = {};
                const inputs = form.querySelectorAll('input[name]');

                inputs.forEach(input => {
                    const name = input.name;
                    const dataType = input.getAttribute('data-type');
                    const value = input.value;

                    // Convert value based on data type
                    newParams[name] = this._convertToType(value, dataType, input.type);
                });

                // Merge with existing params (existing params should already be correctly typed from LLM)
                const allParams = { ...result.params, ...newParams };

                console.log('Form submitted with typed params:', allParams);

                // Call the callback with complete parameters
                if (this.onFormSubmitCallback) {
                    this.onFormSubmitCallback({
                        endpoint: result.endpoint,
                        method: result.method,
                        params: allParams,
                        result: result
                    });
                }

                // Disable form to prevent double submission
                form.querySelectorAll('input, button').forEach(el => el.disabled = true);
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                // Just hide the form or remove the message
                messageDiv.style.opacity = '0.5';
                form.style.display = 'none';
            });
        }
    }

    /**
     * Convert string value to appropriate type
     * @param {string} value - The string value from input
     * @param {string} dataType - The expected data type
     * @param {string} inputType - The HTML input type
     * @returns {*} Converted value
     */
    _convertToType(value, dataType, inputType) {
        if (!value && value !== 0 && value !== false) {
            return value;
        }

        const type = (dataType || 'string').toLowerCase();

        // Handle checkbox (boolean)
        if (inputType === 'checkbox') {
            return value === 'on' || value === true || value === 'true';
        }

        // Handle integer
        if (type === 'integer' || type === 'int') {
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? value : parsed;
        }

        // Handle number/float
        if (type === 'number' || type === 'float' || type === 'double') {
            const parsed = parseFloat(value);
            return isNaN(parsed) ? value : parsed;
        }

        // Handle boolean
        if (type === 'boolean' || type === 'bool') {
            if (value === 'true' || value === '1' || value === 'yes') return true;
            if (value === 'false' || value === '0' || value === 'no') return false;
            return Boolean(value);
        }

        // Handle array (JSON array as string)
        if (type === 'array') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [value];
            } catch {
                return [value];
            }
        }

        // Handle object (JSON object as string)
        if (type === 'object') {
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        }

        // Default: return as string
        return value;
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
        const borderColor = isSuccess ? 'border-gray-200' : 'border-red-300';

        // Detect if this might be an API spec issue
        const isSpecIssue = this._detectSpecIssue(apiResult);

        messageDiv.innerHTML = `
            <div class="bg-white border ${borderColor} rounded-lg p-5 shadow-sm">
                <div class="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                    <div class="flex items-center space-x-3">
                        <span class="text-sm font-medium text-gray-800">Response</span>
                        <span class="text-xs font-mono px-2 py-1 rounded ${isSuccess ? 'bg-gray-800' : 'bg-red-500'} text-white">
                            ${apiResult.status}
                        </span>
                    </div>
                    <span class="text-xs ${isSuccess ? 'text-gray-500' : 'text-red-600'}">
                        ${isSuccess ? 'Success' : 'Error'}
                    </span>
                </div>

                <div>
                    <h4 class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Data</h4>
                    <div class="bg-gray-50 rounded-md p-3 border border-gray-200 max-h-64 overflow-y-auto">
                        <pre class="text-xs text-gray-700 whitespace-pre-wrap font-mono">${JSON.stringify(apiResult.data, null, 2)}</pre>
                    </div>
                </div>

                ${!isSuccess && apiResult.error ? `
                    <div class="mt-3 pt-3 border-t border-gray-100">
                        <p class="text-xs text-red-600">
                            <strong>Error:</strong> ${apiResult.error}
                            ${apiResult.message ? `<br><strong>Message:</strong> ${apiResult.message}` : ''}
                        </p>
                    </div>
                ` : ''}

                ${isSpecIssue ? this._renderSpecIssueWarning(apiResult) : ''}
            </div>
        `;

        this.messagesContainer.appendChild(messageDiv);
        scrollToBottom(this.messagesContainer);
    }

    /**
     * Detect if error is likely due to API spec issues
     * @param {Object} apiResult - The API response
     * @returns {boolean}
     */
    _detectSpecIssue(apiResult) {
        // Status 422 = Unprocessable Entity (validation error)
        // Status 400 = Bad Request
        if (apiResult.status === 422 || apiResult.status === 400) {
            // Check if response mentions missing/required fields
            const dataStr = JSON.stringify(apiResult.data).toLowerCase();
            return dataStr.includes('required') ||
                   dataStr.includes('missing') ||
                   dataStr.includes('field') ||
                   dataStr.includes('validation');
        }
        return false;
    }

    /**
     * Render warning about potential spec issues
     * @param {Object} apiResult - The API response
     * @returns {string}
     */
    _renderSpecIssueWarning(apiResult) {
        // Extract missing fields if available
        let missingFields = [];
        try {
            if (apiResult.data?.detail && Array.isArray(apiResult.data.detail)) {
                missingFields = apiResult.data.detail
                    .filter(err => err.type === 'missing')
                    .map(err => err.loc?.slice(1).join('.') || 'unknown')
                    .filter(f => f !== 'unknown');
            }
        } catch (e) {
            // Ignore parsing errors
        }

        return `
            <div class="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div class="flex items-start space-x-2">
                    <svg class="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                    <div class="flex-1">
                        <h4 class="text-sm font-medium text-yellow-800 mb-1">Possible API Specification Issue</h4>
                        <p class="text-xs text-yellow-700 mb-2">
                            The API expects fields that may not be in your specification.
                            ${missingFields.length > 0 ? `Missing: <strong>${missingFields.join(', ')}</strong>` : ''}
                        </p>
                        <button
                            onclick="document.getElementById('updateSpecBtn').click()"
                            class="text-xs px-3 py-1.5 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
                        >
                            Update API Specification
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Clear all messages from the container
     */
    clear() {
        this.messagesContainer.innerHTML = '';
    }
}
