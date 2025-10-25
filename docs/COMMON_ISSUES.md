# Common Issues - Quick Reference

A quick cheat sheet for the most common MCPhy issues and their solutions.

## 🚨 Top 5 Initialization Issues

### 1. No API Spec Found ❌

**Error:**
```
No API specification files found in project root
```

**Quick Fix:**
```bash
mcphy init -f path/to/your/swagger.yaml
```

---

### 2. File Not Found ❌

**Error:**
```
File not found: /path/to/file
```

**Quick Fixes:**
```bash
# Check file exists
ls swagger.yaml

# Use current directory
mcphy init -f ./swagger.yaml

# Use absolute path
mcphy init -f /full/path/to/swagger.yaml
```

---

### 3. Invalid API Specification ❌

**Error:**
```
Failed to parse API specification
```

**Quick Fixes:**
```bash
# Step 1: Validate first
mcphy validate swagger.yaml

# Step 2: Check syntax
# YAML: https://www.yamllint.com/
# JSON: https://jsonlint.com/

# Step 3: Ensure it's OpenAPI/Swagger
# Check first line has: openapi: 3.0.0 or swagger: "2.0"
```

**Common Causes:**
- ❌ Wrong file format (GraphQL, RAML, etc.)
- ❌ YAML/JSON syntax errors
- ❌ Missing required fields (info, paths)
- ❌ Invalid $ref references
- ❌ Postman Collection v1 (use v2 instead)

---

### 4. Invalid OpenAI Key ⚠️

**Warning:**
```
Warning: OpenAI API key should start with "sk-"
```

**Quick Fix:**
```bash
# Option 1: Get valid key from
# https://platform.openai.com/api-keys

# Option 2: Skip it (press Enter)
# MCPhy works without it using basic pattern matching

# Option 3: Set environment variable
export OPENAI_API_KEY=sk-your-key-here
mcphy init
```

---

### 5. Config File Not Found ❌

**Error:**
```
Config file not found: .mcphy.json
```

**Quick Fix:**
```bash
# You need to initialize first!
mcphy init

# Then serve
mcphy serve
```

---

## 🆕 Postman Collection Issues

### 1. Invalid Postman Collection ❌

**Error:**
```
Invalid Postman collection format
```

**Quick Fixes:**
```bash
# Ensure you exported Collection v2.x
# In Postman: Collection → Export → v2.1

# Validate JSON
cat postman_collection.json | jq

# Check required fields (info, item)
```

---

### 2. LLM Enhancement Failed ⚠️

**Warning:**
```
LLM enhancement failed, using basic parsing
```

**Quick Fix:**
```bash
# Basic parsing still works! But for better results:

# Add OpenAI key
export OPENAI_API_KEY=sk-your-key-here

# Re-initialize
mcphy init -f postman_collection.json
```

**Note:** OpenAI key is HIGHLY RECOMMENDED for Postman collections.

---

### 3. No Base URL Detected ⚠️

**Issue:** Postman collection doesn't have base URL

**Quick Fixes:**
```bash
# Option 1: Add to Postman collection
# Variables → Add: baseUrl = https://api.example.com

# Option 2: Enter when prompted during init

# Option 3: Edit .mcphy.json later
{
  "apiBaseUrl": "https://api.example.com"
}
```

---

## 🚨 Top 3 Server Issues

### 1. Port Already in Use ❌

**Error:**
```
Error: listen EADDRINUSE :::3000
```

**Quick Fixes:**
```bash
# Option 1: Use different port
mcphy serve -p 3001

# Option 2: Kill process on port 3000
lsof -i :3000
kill -9 <PID>

# Option 3: Change default in config
# Edit .mcphy.json: "port": 3001
```

---

### 2. API Not Reachable 🌐

**Problem:** Server runs but can't reach your API

**Quick Fixes:**
```bash
# Check your API is running
curl http://localhost:8000

# Update base URL in .mcphy.json
{
  "apiBaseUrl": "http://localhost:8000"
}

# Or use correct URL
{
  "apiBaseUrl": "https://api.example.com"
}
```

---

### 3. Permission Denied ❌

**Error:**
```
EACCES: permission denied
```

**Quick Fixes:**
```bash
# For port < 1024, use higher port
mcphy serve -p 3000

# For file permissions
chmod u+w .mcphy.json

# Run from writable directory
cd ~/your-project
mcphy init
```

---

## 🔧 Quick Diagnostic Commands

```bash
# Check Node.js version (need >= 18)
node --version

# Check if mcphy is installed
mcphy --help

# Validate your spec before init
mcphy validate swagger.yaml

# Check current directory
pwd
ls -la *.yaml *.json

# Check if config exists
ls -la .mcphy.json

# Check port availability
lsof -i :3000

# Test API connectivity
curl http://localhost:8000
```

---

## 📋 Pre-flight Checklist

Before running `mcphy init`:

- [ ] Node.js >= 18 installed (`node --version`)
- [ ] API spec file exists (`ls swagger.yaml`)
- [ ] File is valid OpenAPI/Swagger (`mcphy validate swagger.yaml`)
- [ ] In correct directory (`pwd`)
- [ ] Have write permissions (`ls -la`)

Before running `mcphy serve`:

- [ ] Initialized successfully (`ls .mcphy.json`)
- [ ] Port is available (`lsof -i :3000`)
- [ ] API backend is running (if needed)

---

## 🎯 Quick Command Reference

```bash
# Validate spec
mcphy validate <file>

# Initialize with spec
mcphy init -f <file>

# Start server
mcphy serve

# Use different port
mcphy serve -p 3001

# Use different config
mcphy serve -c custom.json

# Export
mcphy export -o my-export
```

---

## 🆘 Still Stuck?

### Try These Steps in Order:

1. **Validate your spec:**
   ```bash
   mcphy validate swagger.yaml
   ```

2. **Check file path:**
   ```bash
   ls -la swagger.yaml
   ```

3. **Use absolute path:**
   ```bash
   mcphy init -f /full/path/to/swagger.yaml
   ```

4. **Check permissions:**
   ```bash
   ls -la
   chmod u+w .
   ```

5. **Test with example:**
   ```bash
   git clone https://github.com/sehmim/mcphy.git
   cd mcphy/examples
   mcphy init -f sample-swagger.yaml
   mcphy serve
   ```

### Get Help:

- 📖 [Full Troubleshooting Guide](./troubleshooting.md)
- 📚 [Quick Start Guide](./quick-start.md)
- 🐛 [GitHub Issues](https://github.com/sehmim/mcphy/issues)
- 💬 [Discussions](https://github.com/sehmim/mcphy/discussions)

---

## 💡 Pro Tips

1. **Always validate first:** `mcphy validate` before `mcphy init`
2. **Use absolute paths:** Avoid path resolution issues
3. **Check examples:** Test with `examples/sample-swagger.yaml`
4. **Read error messages:** They tell you exactly what's wrong
5. **Check logs:** MCPhy provides detailed logging

---

## 📊 Error Severity Guide

| Symbol | Severity | Action |
|--------|----------|--------|
| ❌ | Error | Must fix to proceed |
| ⚠️ | Warning | Can continue but may have issues |
| 💡 | Info | Helpful suggestion |
| ✅ | Success | All good! |

---

**Remember:** Most issues are quick to fix! Check the error message, follow the suggestions, and you'll be up and running in no time. 🚀

