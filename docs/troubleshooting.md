# Troubleshooting Guide

This guide helps you resolve common issues when using MCPhy, especially during initialization.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Initialization Issues](#initialization-issues)
- [Server Issues](#server-issues)
- [API Specification Issues](#api-specification-issues)
- [General Tips](#general-tips)

---

## Installation Issues

### Node.js Version Mismatch

**Problem:** MCPhy requires Node.js >= 18.0.0

**Solution:**
```bash
# Check your Node.js version
node --version

# If version is less than 18, update Node.js:
# Using nvm (recommended):
nvm install 18
nvm use 18

# Or download from: https://nodejs.org/
```

### Permission Errors During Global Install

**Problem:** `EACCES` or permission denied errors when installing globally

**Solution:**
```bash
# Option 1: Use npx (no installation needed)
npx mcphy init

# Option 2: Install globally with correct permissions
npm install -g mcphy

# Option 3: Fix npm permissions
# See: https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally
```

---

## Initialization Issues

### ❌ No API Specification File Found

**Error Message:**
```
No API specification files found in project root
```

**What This Means:**
MCPhy couldn't automatically detect your API specification file in the current directory.

**Solutions:**

1. **Specify the file path explicitly:**
   ```bash
   mcphy init -f path/to/your/api.yaml
   # or
   mcphy init -f path/to/your/swagger.json
   ```

2. **Rename your file to a standard name** (so MCPhy can auto-detect it):
   - `swagger.json` or `swagger.yaml`
   - `openapi.json` or `openapi.yaml`
   - `api.json` or `api.yaml`

3. **Place the file in your project root** where you're running `mcphy init`

4. **Check file location:**
   ```bash
   # Make sure you're in the right directory
   pwd
   ls -la *.yaml *.json
   ```

**Example:**
```bash
# If your spec is in a subdirectory:
mcphy init -f docs/api-spec.yaml

# If your spec is in parent directory:
mcphy init -f ../swagger.yaml
```

---

### ❌ File Not Found Error

**Error Message:**
```
File not found: /path/to/file
```

**What This Means:**
The file path you provided doesn't exist or is incorrect.

**Solutions:**

1. **Verify the file exists:**
   ```bash
   ls -la path/to/your/api.yaml
   ```

2. **Use absolute path instead of relative path:**
   ```bash
   # Find absolute path
   cd path/to/directory
   pwd  # Copy this path
   
   # Use it with mcphy
   mcphy init -f /absolute/path/to/api.yaml
   ```

3. **Check for typos** in the filename (case-sensitive on Unix systems)

4. **Check file permissions:**
   ```bash
   # Make sure the file is readable
   chmod 644 path/to/api.yaml
   ```

---

### ❌ Invalid API Specification

**Error Message:**
```
Failed to parse API specification
Validation failed
```

**What This Means:**
Your API specification file is not a valid OpenAPI/Swagger document.

**Common Causes & Solutions:**

#### 1. **YAML/JSON Syntax Error**

**Solution:**
```bash
# For YAML files, check syntax:
# Use online validator: https://www.yamllint.com/

# For JSON files:
# Use online validator: https://jsonlint.com/

# Or use command line:
node -e "console.log(JSON.parse(require('fs').readFileSync('api.json')))"
```

#### 2. **Wrong File Format**

**Solution:**
Make sure your file is actually an OpenAPI/Swagger specification, not:
- A Postman collection (not yet supported)
- An RAML file
- A GraphQL schema
- Generic JSON/YAML data

**Validate your spec:**
```bash
# Use the validate command first
mcphy validate path/to/api.yaml
```

#### 3. **Unsupported OpenAPI Version**

**Supported versions:**
- ✅ OpenAPI 3.0+
- ✅ Swagger 2.0
- ✅ Postman Collection v2.x
- ❌ OpenAPI 3.1 (partial support)
- ❌ Postman Collection v1 (export as v2)

**Solution:**
Check the first few lines of your spec:
```yaml
# Should have one of these:
openapi: 3.0.0  # ✅ Supported
swagger: "2.0"  # ✅ Supported
```

#### 4. **Missing Required Fields**

**Solution:**
Your spec must have these required fields:
```yaml
openapi: 3.0.0
info:
  title: Your API Name
  version: 1.0.0
paths:
  /some-endpoint:
    get:
      # endpoint details
```

**Validate structure:**
```bash
mcphy validate your-spec.yaml
```

This will show you exactly what's missing or invalid.

---

### ❌ OpenAI API Key Warning

**Warning Message:**
```
Warning: OpenAI API key should start with "sk-". Continuing without AI features.
```

**What This Means:**
You entered an invalid OpenAI API key format.

**Solutions:**

1. **Get a valid API key:**
   - Go to: https://platform.openai.com/api-keys
   - Create a new API key (starts with `sk-`)

2. **Skip the OpenAI key (Optional):**
   - Just press Enter when prompted
   - MCPhy will work with basic pattern matching
   - You can add it later by editing `.mcphy.json`

3. **Use environment variable:**
   ```bash
   # Set in your shell
   export OPENAI_API_KEY=sk-your-key-here
   
   # Then run init
   mcphy init
   ```

4. **Add key later:**
   Edit `.mcphy.json` after initialization:
   ```json
   {
     "name": "Your API",
     "openaiApiKey": "sk-your-actual-key-here",
     ...
   }
   ```

**Note:** OpenAI API key is optional. MCPhy works without it using basic pattern matching.

---

### ❌ Cannot Write Config File

**Error Message:**
```
EACCES: permission denied, open '.mcphy.json'
```

**What This Means:**
MCPhy doesn't have permission to write the configuration file.

**Solutions:**

1. **Check directory permissions:**
   ```bash
   # Make sure you have write permissions
   ls -la
   chmod u+w .
   ```

2. **Run from a writable directory:**
   ```bash
   # Don't run from system directories
   cd ~/your-project
   mcphy init
   ```

3. **Specify custom output location:**
   ```bash
   mcphy init -o ~/Documents/my-config.json
   ```

---

## Server Issues

### ❌ Config File Not Found

**Error Message:**
```
Config file not found: .mcphy.json
Run "mcphy init" first to initialize the project
```

**What This Means:**
You're trying to run `mcphy serve` without initializing first.

**Solution:**
```bash
# Initialize first
mcphy init

# Then serve
mcphy serve
```

**If you already initialized:**
```bash
# Check if config exists
ls -la .mcphy.json

# Specify config location
mcphy serve -c path/to/.mcphy.json
```

---

### ❌ Port Already in Use

**Error Message:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**What This Means:**
Another process is using port 3000.

**Solutions:**

1. **Use a different port:**
   ```bash
   mcphy serve -p 3001
   ```

2. **Kill the process using port 3000:**
   ```bash
   # Find process using port 3000
   lsof -i :3000
   
   # Kill it (use PID from above)
   kill -9 <PID>
   ```

3. **Change default port in config:**
   Edit `.mcphy.json`:
   ```json
   {
     "port": 3001,
     ...
   }
   ```

---

### ❌ API Base URL Not Reachable

**Problem:** Server starts but can't reach your actual API

**Solutions:**

1. **Verify API is running:**
   ```bash
   # Test with curl
   curl http://localhost:8000
   ```

2. **Update API base URL:**
   Edit `.mcphy.json`:
   ```json
   {
     "apiBaseUrl": "http://localhost:8000",
     ...
   }
   ```

3. **Check CORS settings** on your API if getting CORS errors

4. **Check network connectivity** if using remote API

---

## Postman Collection Issues

### ❌ Invalid Postman Collection

**Error:**
```
Invalid Postman collection format: missing info or item fields
```

**Solutions:**

1. **Ensure you exported the correct format:**
   - Open Postman
   - Right-click collection → Export
   - Select **Collection v2.1**
   - Save and try again

2. **Validate JSON syntax:**
   ```bash
   cat postman_collection.json | jq
   ```

3. **Check required fields:**
   Your collection must have:
   ```json
   {
     "info": {
       "name": "...",
       "schema": "..."
     },
     "item": [ ... ]
   }
   ```

### ⚠️ Basic Parsing Without LLM

**Warning:**
```
Using basic Postman parsing (no OpenAI key)
```

**What this means:**
- Your collection will be parsed
- But without enhanced descriptions
- Parameters may have minimal documentation

**To enable LLM enhancement:**
```bash
export OPENAI_API_KEY=sk-your-key-here
mcphy init -f postman_collection.json
```

### ❌ No Endpoints Found in Collection

**Cause:** Collection has folders but no actual requests

**Solutions:**
1. Make sure collection has actual HTTP requests
2. Check requests have method and URL defined
3. Try exporting just one folder to test

### ❌ Base URL Not Detected

**Cause:** Collection doesn't have base URL variable

**Solutions:**

1. **Add to collection variables:**
   In Postman:
   - Edit collection
   - Variables tab
   - Add variable: `baseUrl` = `https://api.example.com`

2. **Enter when prompted:**
   MCPhy will ask for base URL during init

3. **Edit config later:**
   Edit `.mcphy.json`:
   ```json
   {
     "apiBaseUrl": "https://api.example.com"
   }
   ```

### ⚠️ LLM Enhancement Failed

**Error:**
```
LLM enhancement failed, using basic parsing
```

**Common causes:**
- Invalid OpenAI API key
- Rate limit reached
- Network issues
- OpenAI service down

**Solutions:**
1. **Check API key:** Must start with `sk-`
2. **Check billing:** Ensure you have credits
3. **Try again later:** May be temporary
4. **Use basic parsing:** It still works!

**Note:** MCPhy automatically falls back to basic parsing, so initialization will still succeed.

### 🔍 Postman-Specific Tips

**For better results:**

1. **Add descriptions** to requests and folders
2. **Use meaningful names** like "Get User By ID" instead of "Request 1"
3. **Include example bodies** with realistic data
4. **Set collection variables** for base URL and common values
5. **Use consistent path param format** (either `{{param}}` or `:param`)

**See:** [Complete Postman Guide](./POSTMAN_GUIDE.md)

---

## API Specification Issues

### How to Validate Your Spec

**Before running `mcphy init`, validate your spec:**

```bash
# Use mcphy validate
mcphy validate path/to/api.yaml

# This will show:
# ✅ Valid spec with endpoint summary
# ❌ Specific validation errors
```

### Common Spec Problems

#### 1. **Empty or Missing Paths**

**Problem:**
```yaml
paths: {}  # No endpoints defined
```

**Solution:**
Add at least one endpoint:
```yaml
paths:
  /users:
    get:
      summary: Get users
      responses:
        '200':
          description: Success
```

#### 2. **Missing Response Definitions**

**Problem:**
```yaml
paths:
  /users:
    get:
      summary: Get users
      # Missing responses section
```

**Solution:**
```yaml
paths:
  /users:
    get:
      summary: Get users
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: array
```

#### 3. **Invalid References**

**Problem:**
```yaml
$ref: '#/components/schemas/UserThatDoesntExist'
```

**Solution:**
Make sure all `$ref` references point to existing definitions:
```yaml
components:
  schemas:
    User:  # This must exist
      type: object
      properties:
        id:
          type: integer
```

---

## General Tips

### Enable Verbose Logging

MCPhy logs are helpful for debugging:

```bash
# Check what's happening during init
mcphy init -f api.yaml

# The output shows:
# - File detection
# - Parsing progress
# - Validation results
# - Config creation
```

### Test Your Setup Step by Step

```bash
# 1. Validate your spec first
mcphy validate api.yaml

# 2. If valid, initialize
mcphy init -f api.yaml

# 3. Check config was created
cat .mcphy.json

# 4. Start server
mcphy serve

# 5. Test in browser
open http://localhost:3000
```

### Common File Issues Checklist

- [ ] File exists and path is correct
- [ ] File has correct extension (.yaml, .yml, or .json)
- [ ] File has valid YAML/JSON syntax
- [ ] File is an OpenAPI/Swagger spec (not Postman, etc.)
- [ ] File has required fields (info, paths)
- [ ] You have read permissions on the file
- [ ] You have write permissions in current directory

### Getting Help

If you're still stuck:

1. **Check the error message carefully** - it usually tells you what's wrong
2. **Run validate command** - `mcphy validate your-spec.yaml`
3. **Check file permissions** - `ls -la`
4. **Verify Node.js version** - `node --version`
5. **Try with example spec** - Use `examples/sample-swagger.yaml` to test if MCPhy works
6. **Open an issue** with:
   - The exact command you ran
   - The complete error message
   - Your Node.js version
   - Your operating system

---

## Quick Reference

### Initialization Command Options

```bash
# Auto-detect API spec in current directory
mcphy init

# Specify API spec file
mcphy init -f path/to/api.yaml

# Specify custom output file
mcphy init -o custom-config.json

# Combine options
mcphy init -f docs/swagger.yaml -o .config/mcphy.json
```

### Serve Command Options

```bash
# Use default config (.mcphy.json)
mcphy serve

# Use custom config
mcphy serve -c path/to/config.json

# Use different port
mcphy serve -p 8080

# Combine options
mcphy serve -c custom.json -p 8080
```

### Validate Command

```bash
# Validate a spec file
mcphy validate api.yaml
mcphy validate swagger.json
mcphy validate path/to/openapi.yaml
```

---

## Still Having Issues?

Open an issue on GitHub: https://github.com/sehmim/mcphy/issues

**Please include:**
- The exact command you ran
- The complete error message (copy/paste, not screenshot)
- Output of `node --version`
- Output of `npm --version`
- Your operating system
- Your API spec file (if not sensitive)

We're here to help! 🚀

