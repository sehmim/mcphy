// MCPHy UI Script with Tailwind CSS
class MCPHyUI {
    constructor() {
        this.queryForm = document.getElementById('queryForm');
        this.queryInput = document.getElementById('queryInput');
        this.sendButton = document.getElementById('sendButton');
        this.sendText = document.getElementById('sendText');
        this.loadingText = document.getElementById('loadingText');
        this.messagesContainer = document.getElementById('messages');
        this.availableEndpointsContainer = document.getElementById('availableEndpoints');
        this.calledEndpointsContainer = document.getElementById('calledEndpoints');
        
        this.calledEndpoints = [];
        this.availableEndpoints = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadAvailableEndpoints();
    }

    setupEventListeners() {
        this.queryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Auto-resize textarea
        this.queryInput.addEventListener('input', () => {
            this.queryInput.style.height = 'auto';
            this.queryInput.style.height = this.queryInput.scrollHeight + 'px';
        });
    }

    async loadAvailableEndpoints() {
        try {
            const response = await fetch('/api/endpoints');
            const endpoints = await response.json();
            this.availableEndpoints = endpoints;
            this.renderAvailableEndpoints();
        } catch (error) {
            console.error('Failed to load endpoints:', error);
            this.availableEndpointsContainer.innerHTML = '<div class="text-sm text-red-500">Failed to load endpoints</div>';
        }
    }

    renderAvailableEndpoints() {
        if (this.availableEndpoints.length === 0) {
            this.availableEndpointsContainer.innerHTML = '<div class="text-sm text-gray-500">No endpoints available</div>';
            return;
        }

        const endpointsHtml = this.availableEndpoints.map(endpoint => {
            const methodColor = this.getMethodColor(endpoint.method);
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

        this.availableEndpointsContainer.innerHTML = endpointsHtml;
    }

    getMethodColor(method) {
        const colors = {
            'GET': 'bg-green-500',
            'POST': 'bg-blue-500',
            'PUT': 'bg-yellow-500',
            'PATCH': 'bg-orange-500',
            'DELETE': 'bg-red-500'
        };
        return colors[method] || 'bg-gray-500';
    }

    addCalledEndpoint(endpoint, method, params, confidence) {
        const calledEndpoint = {
            id: Date.now(),
            endpoint,
            method,
            params,
            confidence,
            timestamp: new Date().toLocaleTimeString()
        };
        
        this.calledEndpoints.unshift(calledEndpoint);
        this.renderCalledEndpoints();
    }

    renderCalledEndpoints() {
        if (this.calledEndpoints.length === 0) {
            this.calledEndpointsContainer.innerHTML = '<div class="text-sm text-gray-500">No endpoints called yet</div>';
            return;
        }

        const endpointsHtml = this.calledEndpoints.map(endpoint => {
            const methodColor = this.getMethodColor(endpoint.method);
            const confidenceColor = endpoint.confidence > 0.8 ? 'text-green-600' : 
                                  endpoint.confidence > 0.6 ? 'text-yellow-600' : 'text-red-600';
            
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

        this.calledEndpointsContainer.innerHTML = endpointsHtml;
    }

    async handleSubmit() {
        const query = this.queryInput.value.trim();
        if (!query) return;

        // Add user message
        this.addMessage(query, 'user');
        this.queryInput.value = '';
        this.setLoading(true);

        try {
            // First, get the endpoint match
            const queryResponse = await fetch('/mcp/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query }),
            });

            const queryResult = await queryResponse.json();
            
            // Add called endpoint to sidebar
            this.addCalledEndpoint(queryResult.endpoint, queryResult.method, queryResult.params, queryResult.confidence);
            
            // Add endpoint match message
            this.addEndpointMatchMessage(queryResult);

            // Now make the actual API call
            await this.makeApiCall(queryResult);

        } catch (error) {
            console.error('Error:', error);
            this.addMessage('Sorry, there was an error processing your request.', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async makeApiCall(queryResult) {
        try {
            const { endpoint, method, params } = queryResult;
            
            // Build the proxy URL
            const proxyUrl = `/api/proxy${endpoint}`;
            
            // Prepare request options
            const requestOptions = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            // Add body for non-GET requests
            if (method !== 'GET' && params && Object.keys(params).length > 0) {
                requestOptions.body = JSON.stringify(params);
            }

            // Add query parameters for GET requests
            let finalUrl = proxyUrl;
            if (method === 'GET' && params && Object.keys(params).length > 0) {
                const queryString = new URLSearchParams(params).toString();
                finalUrl += `?${queryString}`;
            }

            this.addMessage(`Making ${method} request to ${endpoint}...`, 'system');

            // Make the API call
            const apiResponse = await fetch(finalUrl, requestOptions);
            const apiResult = await apiResponse.json();

            // Display the API response
            this.addApiResponseMessage(apiResult, queryResult);

        } catch (error) {
            console.error('API call failed:', error);
            this.addMessage(`API call failed: ${error.message}`, 'error');
        }
    }

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
        this.scrollToBottom();
    }

    addEndpointMatchMessage(result) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'mb-4';
        
        const methodColor = this.getMethodColor(result.method);
        const confidenceColor = result.confidence > 0.8 ? 'text-green-600' : 
                              result.confidence > 0.6 ? 'text-yellow-600' : 'text-red-600';
        
        messageDiv.innerHTML = `
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center space-x-2">
                        <span class="text-xs font-mono px-2 py-1 rounded ${methodColor} text-white">${result.method}</span>
                        <span class="text-sm font-mono text-gray-700">${result.endpoint}</span>
                    </div>
                    <span class="text-xs ${confidenceColor}">${Math.round(result.confidence * 100)}% confidence</span>
                </div>
                
                <div class="text-sm text-blue-800 mb-2">
                    <strong>Matched endpoint:</strong> ${result.method} ${result.endpoint}
                </div>
                
                ${result.params && Object.keys(result.params).length > 0 ? `
                    <div class="mb-3">
                        <h4 class="text-xs font-semibold text-blue-700 mb-2">Extracted Parameters:</h4>
                        <div class="bg-blue-100 rounded p-2">
                            <pre class="text-xs text-blue-600">${JSON.stringify(result.params, null, 2)}</pre>
                        </div>
                    </div>
                ` : ''}
                
                ${result.reasoning ? `
                    <div class="text-xs text-blue-600">
                        <strong>Reasoning:</strong> ${result.reasoning}
                    </div>
                ` : ''}
            </div>
        `;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

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
                
                ${apiResult.headers && Object.keys(apiResult.headers).length > 0 ? `
                    <div class="mb-3">
                        <h4 class="text-xs font-semibold ${textColor} mb-2">Response Headers:</h4>
                        <div class="bg-white rounded p-2 border">
                            <pre class="text-xs text-gray-600">${JSON.stringify(apiResult.headers, null, 2)}</pre>
                        </div>
                    </div>
                ` : ''}
                
                ${!isSuccess && apiResult.error ? `
                    <div class="text-xs ${textColor}">
                        <strong>Error:</strong> ${apiResult.error}
                        ${apiResult.message ? `<br><strong>Message:</strong> ${apiResult.message}` : ''}
                    </div>
                ` : ''}
            </div>
        `;
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    setLoading(loading) {
        this.sendButton.disabled = loading;
        this.sendText.classList.toggle('hidden', loading);
        this.loadingText.classList.toggle('hidden', !loading);
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
}

// Initialize the UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MCPHyUI();
});