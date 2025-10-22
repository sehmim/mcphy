# API Reference

Programmatic usage of MCPhy in your Node.js projects.

## Installation

```bash
npm install mcphy
```

## Basic Usage

```typescript
import { MCPServer, SwaggerAPIParser, ManifestGenerator } from 'mcphy';

// Parse API specification
const apiSpec = await SwaggerAPIParser.parse('./swagger.yaml');

// Generate MCP manifest
const manifest = await ManifestGenerator.generateFromSwagger(apiSpec);

// Create and start server
const server = new MCPServer({
  port: 3000,
  manifest,
  openaiApiKey: process.env.OPENAI_API_KEY,
  apiBaseUrl: 'http://localhost:8000'
});

await server.start();
console.log('🚀 Server running on port 3000');
```

## Query API

```typescript
import { QueryMatcher } from 'mcphy';

const matcher = new QueryMatcher(manifest, openaiApiKey);
const result = await matcher.matchQuery('get all users');

console.log(result);
// {
//   endpoint: '/users',
//   method: 'GET',
//   params: {},
//   confidence: 0.9,
//   reasoning: 'Matched based on keywords'
// }
```

## REST Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp/query` | POST | Natural language query matching |
| `/api/proxy/*` | ALL | Proxy requests to your API |
| `/api/endpoints` | GET | List all available endpoints |
| `/health` | GET | Health check |

## Examples

### Express Integration

```typescript
import express from 'express';
import { MCPServer } from 'mcphy';

const app = express();
const mcpServer = new MCPServer({
  port: 3001,
  manifest: myManifest,
  apiBaseUrl: 'https://api.example.com'
});

// Add custom middleware
app.use('/api', mcpServer.getApp());

app.listen(3000);
```

### Custom Query Processing

```typescript
import { QueryMatcher } from 'mcphy';

const matcher = new QueryMatcher(manifest);

// Process multiple queries
const queries = [
  'get all users',
  'create new product',
  'delete order 123'
];

for (const query of queries) {
  const result = await matcher.matchQuery(query);
  console.log(`${query} → ${result.method} ${result.endpoint}`);
}
```
