# Postman Collection Support Guide

MCPhy now fully supports Postman collections with intelligent LLM-powered parsing! This guide will help you use Postman collections with MCPhy.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [LLM Enhancement](#llm-enhancement)
- [Supported Features](#supported-features)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

Postman collections are a popular way to document and test APIs. MCPhy can now parse Postman Collection v2.x format and convert it into an MCP-enabled conversational server.

### Why Use Postman Collections?

- ✅ Many teams already have Postman collections
- ✅ Easy to export from Postman
- ✅ Includes real request examples
- ✅ Contains authentication and variable information
- ✅ No need to create separate OpenAPI documentation

### LLM-Powered Parsing

Unlike OpenAPI/Swagger which has a strict schema, Postman collections are more flexible. MCPhy uses GPT-4 to:
- 🤖 Understand endpoint purposes from names and descriptions
- 📝 Generate better documentation
- 🔍 Infer parameter types and requirements
- 🏷️ Organize endpoints by patterns

---

## Quick Start

### 1. Export Your Postman Collection

In Postman:
1. Click on your collection
2. Click the three dots (...) → Export
3. Choose **Collection v2.1** (recommended)
4. Save as `postman_collection.json`

### 2. Initialize MCPhy

```bash
# Navigate to your project directory
cd your-project

# Initialize with Postman collection
mcphy init -f postman_collection.json

# When prompted, enter your OpenAI API key (highly recommended)
```

### 3. Start the Server

```bash
mcphy serve
```

### 4. Test It!

Open `http://localhost:3000` and try natural language queries:
- "Show me all users"
- "Create a new booking"
- "Get order with ID 123"

---

## How It Works

MCPhy processes your Postman collection in several steps:

### Step 1: Detection

MCPhy automatically detects Postman collections by:
- Looking for files named `postman_collection.json`, `collection.json`, or `postman.json`
- Checking JSON files for Postman collection structure
- Validating the `info` and `item` fields

### Step 2: Basic Parsing

**Extracts:**
- Collection name and description
- All requests (including nested folders)
- Request methods (GET, POST, PUT, DELETE, etc.)
- URLs and path variables
- Query parameters
- Headers
- Request bodies
- Collection variables

**Converts:**
- `{{variables}}` → `{variables}` (OpenAPI path params)
- `:params` → `{params}` (OpenAPI path params)
- Request bodies → OpenAPI schema definitions
- Folders → OpenAPI tags

### Step 3: LLM Enhancement (if OpenAI key provided)

GPT-4 analyzes your collection and adds:
- Enhanced endpoint descriptions
- Better parameter documentation
- Inferred types and validations
- API usage patterns
- Common workflows

### Step 4: Manifest Generation

Creates an MCP manifest with:
- All endpoints mapped and documented
- Parameters and their locations (query, path, body, header)
- Request/response schemas
- Tags for organization

---

## LLM Enhancement

### Why Use LLM Enhancement?

Postman collections often have:
- ❌ Minimal descriptions (just endpoint names)
- ❌ No parameter documentation
- ❌ Missing type information
- ❌ No relationship between endpoints

**With LLM enhancement:**
- ✅ Rich, contextual descriptions
- ✅ Parameter purposes explained
- ✅ Inferred types and validations
- ✅ Better organization

### Setting Up OpenAI API Key

**Option 1: During init**
```bash
mcphy init -f postman_collection.json
# Enter key when prompted
```

**Option 2: Environment variable**
```bash
export OPENAI_API_KEY=sk-your-key-here
mcphy init -f postman_collection.json
```

**Option 3: Add to config later**
Edit `.mcphy.json`:
```json
{
  "openaiApiKey": "sk-your-key-here",
  ...
}
```

### What LLM Enhancement Does

**Example transformation:**

**Before (basic parsing):**
```json
{
  "path": "/api/users/{id}",
  "method": "GET",
  "summary": "Get User By Id",
  "parameters": [
    {
      "name": "id",
      "in": "path",
      "required": true
    }
  ]
}
```

**After (LLM enhancement):**
```json
{
  "path": "/api/users/{id}",
  "method": "GET",
  "summary": "Retrieve a specific user by their unique identifier",
  "description": "Fetches detailed information about a user including profile data, contact information, and account status. Returns 404 if user not found.",
  "parameters": [
    {
      "name": "id",
      "in": "path",
      "required": true,
      "description": "The unique identifier of the user to retrieve. Must be a valid user ID.",
      "schema": { "type": "string" }
    }
  ]
}
```

---

## Supported Features

### ✅ Fully Supported

| Feature | Description |
|---------|-------------|
| **Folders** | Nested folders converted to tags |
| **HTTP Methods** | GET, POST, PUT, PATCH, DELETE |
| **Path Variables** | `{{var}}` and `:var` formats |
| **Query Parameters** | Including descriptions |
| **Headers** | Custom headers parsed |
| **Request Bodies** | JSON, form-data, urlencoded |
| **Collection Variables** | Extracted and used |
| **Base URL** | Auto-detected from variables or requests |
| **Descriptions** | Request and folder descriptions |

### ⚠️ Partially Supported

| Feature | Status |
|---------|--------|
| **Pre-request Scripts** | Not executed (documentation only) |
| **Tests** | Not executed (documentation only) |
| **Authentication** | Documented but not enforced |
| **GraphQL** | Basic support |

### ❌ Not Supported

| Feature | Alternative |
|---------|-------------|
| **Environments** | Use collection variables |
| **Dynamic Variables** | Replace with actual values |
| **Newman CLI options** | N/A |

---

## Best Practices

### 1. Organize Your Collection

**Use folders** to group related endpoints:
```
My API Collection
├── Users
│   ├── Get All Users
│   ├── Get User By ID
│   └── Create User
├── Orders
│   ├── List Orders
│   └── Create Order
└── Auth
    ├── Login
    └── Logout
```

These folders become tags in MCPhy, making queries easier:
- "Show me all user endpoints"
- "Create a new order"

### 2. Add Descriptions

Add descriptions to:
- **Collection**: Overall API purpose
- **Folders**: What this group of endpoints does
- **Requests**: What this specific endpoint does

MCPhy uses these descriptions (and LLM enhances them) to better understand your API.

### 3. Use Meaningful Names

Instead of:
- ❌ "Request 1"
- ❌ "API Call"
- ❌ "Test"

Use:
- ✅ "Get User By ID"
- ✅ "Create New Order"
- ✅ "Update Customer Profile"

### 4. Include Examples

Include realistic request bodies:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30
}
```

MCPhy infers schemas from these examples.

### 5. Set Collection Variables

Define base URL and common values:
```json
{
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://api.example.com"
    },
    {
      "key": "apiVersion",
      "value": "v1"
    }
  ]
}
```

### 6. Use Path Variables Consistently

Choose one format and stick with it:
- ✅ `{{userId}}` (Postman style)
- ✅ `:userId` (Express style)
- ❌ Mix of both

---

## Examples

### Example 1: Simple REST API

```bash
# Export your Postman collection
# File: my-api.postman_collection.json

# Initialize
mcphy init -f my-api.postman_collection.json

# Enter OpenAI key when prompted (recommended)

# Start server
mcphy serve
```

### Example 2: API with Authentication

Your Postman collection might have auth headers:
```json
{
  "header": [
    {
      "key": "Authorization",
      "value": "Bearer {{token}}"
    }
  ]
}
```

MCPhy will:
1. Document the auth requirement
2. Extract the token variable
3. Note in endpoint docs that auth is needed

### Example 3: Complex Request Body

Postman request:
```json
{
  "mode": "raw",
  "raw": {
    "user": {
      "name": "John",
      "email": "john@example.com",
      "preferences": {
        "newsletter": true,
        "notifications": false
      }
    }
  }
}
```

MCPhy converts to OpenAPI schema:
```json
{
  "type": "object",
  "properties": {
    "user": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string" },
        "preferences": {
          "type": "object",
          "properties": {
            "newsletter": { "type": "boolean" },
            "notifications": { "type": "boolean" }
          }
        }
      }
    }
  }
}
```

---

## Troubleshooting

### ❌ "Invalid Postman collection format"

**Cause:** File is not a valid Postman collection

**Solutions:**
1. Ensure you exported Collection v2.x format
2. Check JSON is valid: `cat file.json | jq`
3. Verify file has `info` and `item` fields
4. Re-export from Postman

### ❌ "No endpoints found"

**Cause:** Collection has folders but no actual requests

**Solutions:**
1. Check collection has actual requests, not just folders
2. Ensure requests have method and URL defined
3. Try adding at least one request to test

### ❌ "Base URL not found"

**Cause:** MCPhy couldn't determine your API base URL

**Solution:**
You'll be prompted to enter it manually. You can:
1. Add a collection variable named `baseUrl`
2. Enter it when prompted during init
3. Edit `.mcphy.json` later

### ❌ "LLM enhancement failed"

**Cause:** OpenAI API issue (rate limit, invalid key, network)

**Solution:**
- MCPhy continues with basic parsing
- Check OpenAI API key is valid
- Check API quota and billing
- Try again later if rate limited
- Basic parsing still works fine!

### ⚠️ "Using basic parsing (no OpenAI key)"

**Not an error!** But you'll get better results with OpenAI.

**To add key:**
```bash
# Edit .mcphy.json
{
  "openaiApiKey": "sk-your-key-here",
  ...
}

# Re-initialize to re-parse with enhancement
mcphy init -f postman_collection.json
```

### Missing Parameters

**Issue:** Some parameters not detected

**Cause:**
- Parameters in URL string not properly formatted
- Dynamic parameters without examples

**Solution:**
1. Use Postman path variables: `{{paramName}}`
2. Or Express format: `:paramName`
3. Avoid manual string interpolation

### Wrong Parameter Types

**Issue:** All parameters are `string` type

**Cause:** Basic parsing doesn't infer types well

**Solution:**
- Use OpenAI API key for better type inference
- Or edit `.mcphy-manifest.json` manually to set correct types

---

## Comparison: Postman vs OpenAPI

| Aspect | Postman Collection | OpenAPI/Swagger |
|--------|-------------------|-----------------|
| **Structure** | Flexible, nested | Strict schema |
| **Examples** | Built-in | Optional |
| **Documentation** | Often minimal | Usually comprehensive |
| **Types** | Inferred | Explicitly defined |
| **Variables** | Native support | Not standard |
| **Scripts** | Executable | Not applicable |
| **LLM Benefit** | 🟢 High | 🟡 Low |

**When to use Postman with MCPhy:**
- ✅ You already have Postman collections
- ✅ You want to quickly test without writing specs
- ✅ Your API is still in development
- ✅ You have OpenAI API access

**When to use OpenAPI:**
- ✅ You need strict type definitions
- ✅ You want comprehensive documentation
- ✅ You're following API-first design
- ✅ You don't want LLM dependency

---

## Advanced Usage

### Programmatic Parsing

```typescript
import { PostmanParser } from 'mcphy';

// Parse Postman collection
const apiSpec = await PostmanParser.parse(
  'collection.json',
  'sk-your-openai-key' // optional
);

// Get summary
const summary = PostmanParser.getAPISummary(apiSpec);
console.log(summary);

// Access parsed data
console.log(apiSpec.paths);
console.log(apiSpec.variables);
console.log(apiSpec.baseUrl);
```

### Custom LLM Model

Currently uses GPT-4. To use a different model, modify the PostmanParser source:

```typescript
// In postmanParser.ts, line ~462
const response = await this.openai.chat.completions.create({
  model: 'gpt-3.5-turbo', // or 'gpt-4-turbo'
  // ...
});
```

---

## FAQ

**Q: Do I need an OpenAI API key?**  
A: No, but it's highly recommended for Postman collections. Basic parsing works without it, but LLM enhancement provides much better results.

**Q: How much does LLM enhancement cost?**  
A: Typically $0.01-0.10 per collection depending on size. MCPhy uses GPT-4 efficiently, only calling the API once during initialization.

**Q: Can I use Postman environments?**  
A: Use collection variables instead. Export your environment and merge with collection variables.

**Q: What about Postman Collection v1?**  
A: Export as v2.1 from Postman. v1 is not supported.

**Q: Can I edit the parsed result?**  
A: Yes! Edit `.mcphy-manifest.json` after initialization to fine-tune.

**Q: Does it execute pre-request scripts?**  
A: No, scripts are for documentation only. MCPhy doesn't execute JavaScript.

**Q: Can I use multiple Postman collections?**  
A: Not directly. Merge collections in Postman first, or run multiple MCPhy instances.

---

## Next Steps

- 📖 [Troubleshooting Guide](./troubleshooting.md) - Fix common issues
- 🚀 [Quick Start Guide](./quick-start.md) - General MCPhy usage
- 🎨 [Examples](./EXAMPLES.md) - Real-world examples
- 💬 [GitHub Discussions](https://github.com/sehmim/mcphy/discussions) - Ask questions

---

**🎉 Enjoy using Postman collections with MCPhy!**

Found this guide helpful? [⭐ Star us on GitHub](https://github.com/sehmim/mcphy)

