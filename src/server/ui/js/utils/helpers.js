/**
 * Utility functions for the MCPhy UI
 */

/**
 * Get the appropriate color class for an HTTP method
 * @param {string} method - The HTTP method (GET, POST, PUT, PATCH, DELETE)
 * @returns {string} The Tailwind CSS background color class
 */
export function getMethodColor(method) {
    const colors = {
        'GET': 'bg-green-500',
        'POST': 'bg-blue-500',
        'PUT': 'bg-yellow-500',
        'PATCH': 'bg-orange-500',
        'DELETE': 'bg-red-500'
    };
    return colors[method] || 'bg-gray-500';
}

/**
 * Get the appropriate color class for confidence level
 * @param {number} confidence - The confidence value (0-1)
 * @returns {string} The Tailwind CSS text color class
 */
export function getConfidenceColor(confidence) {
    if (confidence > 0.8) return 'text-green-600';
    if (confidence > 0.6) return 'text-yellow-600';
    return 'text-red-600';
}

/**
 * Format a timestamp to locale time string
 * @param {Date|number} timestamp - The timestamp to format
 * @returns {string} Formatted time string
 */
export function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleTimeString();
}

/**
 * Scroll a container to the bottom
 * @param {HTMLElement} container - The container element to scroll
 */
export function scrollToBottom(container) {
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

/**
 * Safely parse JSON or return null
 * @param {string} jsonString - The JSON string to parse
 * @returns {Object|null} Parsed object or null if parsing fails
 */
export function safeJSONParse(jsonString) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('Failed to parse JSON:', error);
        return null;
    }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} html - The HTML string to escape
 * @returns {string} Escaped HTML string
 */
export function escapeHtml(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}
