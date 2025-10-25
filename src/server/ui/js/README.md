# MCPhy UI - Modular Architecture

This directory contains the refactored, modular JavaScript code for the MCPhy UI.

## Architecture Overview

The application follows a component-based architecture with clear separation of concerns:

```
js/
├── main.js                 # Main application orchestrator
├── services/
│   └── apiService.js      # Handles all API calls
├── state/
│   └── appState.js        # State management with observable pattern
├── components/
│   ├── messageRenderer.js # Renders chat messages
│   ├── endpointRenderer.js # Renders endpoint information
│   └── formHandler.js     # Handles form input
└── utils/
    └── helpers.js         # Utility functions
```

## Components

### Main App (`main.js`)
The main orchestrator that:
- Initializes all components
- Manages application flow
- Handles query submission
- Coordinates communication between components

### API Service (`services/apiService.js`)
Centralized API communication layer that handles:
- Fetching available endpoints
- Sending queries to the backend
- Making proxied API calls

### State Management (`state/appState.js`)
Observable state management that:
- Maintains application state
- Provides subscription mechanism for state changes
- Manages available and called endpoints
- Tracks loading state

### Message Renderer (`components/messageRenderer.js`)
Renders all chat messages including:
- Simple text messages (user, system, error)
- Endpoint match messages with parameters
- API response messages
- Missing information warnings

### Endpoint Renderer (`components/endpointRenderer.js`)
Manages the sidebar display:
- Available endpoints list
- Called endpoints history with confidence scores
- Loading and error states

### Form Handler (`components/formHandler.js`)
Manages the input form:
- Form submission
- Auto-resize textarea
- Loading states
- Keyboard shortcuts

### Utilities (`utils/helpers.js`)
Shared utility functions:
- HTTP method color mapping
- Confidence level color mapping
- Timestamp formatting
- Scroll utilities
- Safe JSON parsing

## Benefits of This Architecture

1. **Separation of Concerns**: Each module has a single, well-defined responsibility
2. **Reusability**: Components can be easily reused or extended
3. **Testability**: Isolated modules are easier to unit test
4. **Maintainability**: Changes to one component don't affect others
5. **Scalability**: New features can be added as new modules
6. **Type Safety**: Clear interfaces make it easier to add TypeScript later
7. **State Management**: Observable pattern prevents prop drilling and tight coupling

## Usage

The application is loaded as an ES6 module:

```html
<script type="module" src="js/main.js"></script>
```

All modules use ES6 import/export syntax and are loaded by the browser's native module system.

## Future Improvements

Potential enhancements:
- Add TypeScript for type safety
- Implement more sophisticated state management (e.g., Redux)
- Add unit tests for each component
- Implement virtual scrolling for large message lists
- Add WebSocket support for real-time updates
- Implement offline support with Service Workers
