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
     * @param {string} endpoint - The endpoint path (may contain {param} placeholders)
     * @param {string} method - The HTTP method
     * @param {Object} params - The parameters to send
     * @param {Array} parameterDetails - Optional parameter details with location info
     * @returns {Promise<Object>} API response
     * @throws {Error} If the request fails
     */
    static async makeApiCall(endpoint, method, params = {}, parameterDetails = null) {
        try {
            // Separate parameters by location
            const pathParams = {};
            const queryParams = {};
            const bodyParams = {};

            // If we have parameter details, use them to categorize
            if (parameterDetails && Array.isArray(parameterDetails)) {
                parameterDetails.forEach(detail => {
                    const value = params[detail.name];
                    if (value !== undefined) {
                        if (detail.location === 'path') {
                            pathParams[detail.name] = value;
                        } else if (detail.location === 'query') {
                            queryParams[detail.name] = value;
                        } else if (detail.location === 'body') {
                            bodyParams[detail.name] = value;
                        }
                    }
                });

                // Any params not in parameterDetails go to body for POST/PUT/PATCH, query for GET
                Object.keys(params).forEach(key => {
                    if (!parameterDetails.some(d => d.name === key)) {
                        if (method === 'GET') {
                            queryParams[key] = params[key];
                        } else {
                            bodyParams[key] = params[key];
                        }
                    }
                });
            } else {
                // Fallback: no parameter details, use simple logic
                Object.keys(params).forEach(key => {
                    // Check if this is a path parameter
                    if (endpoint.includes(`{${key}}`)) {
                        pathParams[key] = params[key];
                    } else if (method === 'GET') {
                        queryParams[key] = params[key];
                    } else {
                        bodyParams[key] = params[key];
                    }
                });
            }

            // Replace path parameters in the endpoint
            let finalEndpoint = endpoint;
            Object.keys(pathParams).forEach(key => {
                finalEndpoint = finalEndpoint.replace(`{${key}}`, pathParams[key]);
            });

            // Build the proxy URL
            let finalUrl = `/api/proxy${finalEndpoint}`;

            // Add query parameters to URL
            if (Object.keys(queryParams).length > 0) {
                const queryString = new URLSearchParams(queryParams).toString();
                finalUrl += `?${queryString}`;
            }

            // Prepare request options
            const requestOptions = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            // Add body for non-GET requests
            if (method !== 'GET' && Object.keys(bodyParams).length > 0) {
                requestOptions.body = JSON.stringify(bodyParams);
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
