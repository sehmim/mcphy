# Quick Start Guide

Get MCPhy up and running in minutes!

## Prerequisites Checklist

Before you begin, ensure you have:

- [ ] **Node.js >= 18.0.0** - Check with `node --version`
- [ ] **npm >= 9.0.0** - Check with `npm --version`
- [ ] **An API specification file** - OpenAPI/Swagger YAML or JSON

## Installation

```bash
# Install globally
npm install -g mcphy

# Or use without installing
npx mcphy --help
```

## Usage Steps

### Step 1: Initialize

**Option A: Auto-detect your API spec** (if in project root)
```bash
mcphy init
```

**Option B: Specify your API spec file**
```bash
mcphy init -f path/to/swagger.yaml
```

**Option C: Use absolute path**
```bash
mcphy init -f /full/path/to/openapi.json
```

#### What Happens During Init?

1. MCPhy detects or uses your specified API spec
2. Validates the specification
3. Shows API summary (endpoints, methods)
4. Asks for OpenAI API key (optional - press Enter to skip)
5. Asks for API base URL (default: http://localhost:8000)
6. Creates `.mcphy.json` config file
7. Creates `.mcphy-manifest.json` manifest file

### Step 2: Start the Server

```bash
mcphy serve
```

The server starts on `http://localhost:3000` by default.

**Use a different port:**
```bash
mcphy serve -p 8080
```

### Step 3: Test It

Open your browser: `http://localhost:3000`

Try these example queries:
- "Show me all users"
- "Get user with id 123"
- "Create a new booking for tomorrow"
- "Update pet with id 5"

## Common Scenarios

### Scenario 1: First Time User

```bash
# 1. Navigate to your project
cd my-api-project

# 2. Make sure your spec file is there
ls swagger.yaml

# 3. Initialize
mcphy init -f swagger.yaml

# 4. Start server
mcphy serve

# 5. Open browser
open http://localhost:3000
```

### Scenario 2: Spec in Different Directory

```bash
# If your spec is in docs/
mcphy init -f docs/api-spec.yaml

# If your spec is in parent directory
mcphy init -f ../swagger.yaml

# If your spec is elsewhere (use absolute path)
mcphy init -f /Users/john/projects/api/openapi.yaml
```

### Scenario 3: Multiple API Specs

```bash
# MCPhy will use the first one found
# To choose a specific one:
mcphy init -f openapi-v2.yaml
```

### Scenario 4: Testing Different APIs

```bash
# For API 1
cd project1
mcphy init -f swagger.yaml
mcphy serve -p 3000

# For API 2 (in another terminal)
cd ../project2
mcphy init -f api.yaml
mcphy serve -p 3001
```

## Validation First (Recommended)

Before initializing, validate your spec to catch issues early:

```bash
# Validate your API spec
mcphy validate swagger.yaml

# If valid, you'll see:
# ✅ API specification is valid!
# API: Your API Name
# Version: 1.0.0
# Endpoints: 15
# Methods: GET, POST, PUT, DELETE
```

## Configuration Files

After initialization, you'll have:

### `.mcphy.json` - Main Configuration
```json
{
  "name": "Your API",
  "description": "API description",
  "version": "1.0.0",
  "apiSpecPath": "swagger.yaml",
  "manifestPath": ".mcphy-manifest.json",
  "port": 3000,
  "openaiApiKey": null,
  "apiBaseUrl": "http://localhost:8000"
}
```

### `.mcphy-manifest.json` - Auto-generated Manifest
Contains parsed endpoints, parameters, and schemas from your API spec.

## Troubleshooting Quick Fixes

### ❌ "No API specification files found"

**Solution:**
```bash
mcphy init -f path/to/your/api.yaml
```

### ❌ "File not found"

**Solution:**
```bash
# Check file exists
ls path/to/api.yaml

# Use absolute path
mcphy init -f /full/path/to/api.yaml
```

### ❌ "Failed to parse API specification"

**Solution:**
```bash
# Validate first to see specific errors
mcphy validate your-api.yaml
```

### ❌ "Config file not found" (when running serve)

**Solution:**
```bash
# Initialize first
mcphy init

# Then serve
mcphy serve
```

### ❌ "Port already in use"

**Solution:**
```bash
# Use different port
mcphy serve -p 3001
```

## Configuration Options

### Init Options

```bash
mcphy init [options]

Options:
  -f, --file <path>    Path to API specification file
  -o, --output <path>  Output path for config file (default: .mcphy.json)
```

### Serve Options

```bash
mcphy serve [options]

Options:
  -c, --config <path>  Path to config file (default: .mcphy.json)
  -p, --port <number>  Port to run server on (default: 3000)
```

### Validate Options

```bash
mcphy validate <file>

Arguments:
  <file>  Path to API specification file
```

## Environment Variables

You can use environment variables for sensitive data:

```bash
# Set OpenAI API key
export OPENAI_API_KEY=sk-your-key-here

# Set API base URL
export API_BASE_URL=https://api.example.com

# Then initialize
mcphy init
```

## Next Steps

Once your server is running:

1. **Explore the UI** - Open http://localhost:3000
2. **Try natural language queries** - Ask in plain English
3. **Test your endpoints** - See real API responses
4. **Check the docs** - Read [API Reference](./API.md) and [Examples](./EXAMPLES.md)
5. **Export your setup** - Create standalone package with `mcphy export`

## Need More Help?

- 📖 [Full Troubleshooting Guide](./troubleshooting.md)
- 🎨 [Examples and Use Cases](./EXAMPLES.md)
- 📚 [API Documentation](./API.md)
- 🐛 [Report Issues](https://github.com/sehmim/mcphy/issues)

---

**Pro Tip:** Use `mcphy validate` before `mcphy init` to catch issues early and save time! ✨

