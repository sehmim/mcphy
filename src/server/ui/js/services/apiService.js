/**
 * API Service for handling all HTTP requests to the backend
 */

export class ApiService {
    /**
     * Fetch available endpoints from the API
     * @returns {Promise<Array>} List of available endpoints
     * @throws {Error} If the request fails
     */
    static async fetchEndpoints() {
        try {
            const response = await fetch('/api/endpoints');
            if (!response.ok) {
                throw new Error(`Failed to fetch endpoints: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching endpoints:', error);
            throw error;
        }
    }

    /**
     * Send a query to the MCP query endpoint
     * @param {string} query - The user's natural language query
     * @returns {Promise<Object>} Query result with endpoint match information
     * @throws {Error} If the request fails
     */
    static async sendQuery(query) {
        try {
            const response = await fetch('/mcp/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query }),
            });

            if (!response.ok) {
                throw new Error(`Query failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error sending query:', error);
            throw error;
        }
    }

    /**
     * Make an API call through the proxy
     * @param {string} endpoint - The endpoint path
     * @param {string} method - The HTTP method
     * @param {Object} params - The parameters to send
     * @returns {Promise<Object>} API response
     * @throws {Error} If the request fails
     */
    static async makeApiCall(endpoint, method, params = {}) {
        try {
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

            // Make the API call
            const response = await fetch(finalUrl, requestOptions);
            const result = await response.json();

            return result;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }
}
