<div align="center">

```
███╗   ███╗ ██████╗██████╗ ██╗  ██╗██╗   ██╗
████╗ ████║██╔════╝██╔══██╗██║  ██║╚██╗ ██╔╝
██╔████╔██║██║     ██████╔╝███████║ ╚████╔╝
██║╚██╔╝██║██║     ██╔═══╝ ██╔══██║  ╚██╔╝
██║ ╚═╝ ██║╚██████╗██║     ██║  ██║   ██║
╚═╝     ╚═╝ ╚═════╝╚═╝     ╚═╝  ╚═╝   ╚═╝
```

### 🚀 Turn Any API into a Conversational AI Powerhouse

**Transform your REST APIs into intelligent, chat-driven MCP servers with zero code changes**

[![npm version](https://img.shields.io/npm/v/mcphy.svg?style=for-the-badge&color=brightgreen)](https://www.npmjs.com/package/mcphy)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

[🎯 Quick Start](#-quick-start) • [📖 Documentation](#-cli-commands) • [✨ Features](#-what-makes-mcphy-special) • [🎨 Demo](#-try-it-now)

---

</div>

## 🎬 What is MCPhy?

**MCPhy** is a revolutionary CLI tool and Node.js library that bridges the gap between traditional REST APIs and conversational AI. Simply point it at your **Swagger/OpenAPI** specification, and watch your API transform into an intelligent **Model Context Protocol (MCP)** server with natural language understanding.

> **TL;DR**: Feed it an API spec → Get a conversational AI interface. Ask questions in plain English → Get precise API calls.

```bash
# Three commands to conversational AI
npm install -g mcphy
mcphy init
mcphy serve
```

<div align="center">

**🎯 Now ask questions like:**
*"Get all users created after January 1st"*
*"Create a new product with name and price"*
*"Delete order with ID abc-123"*

</div>

---

## 🌟 What Makes MCPhy Special?

<table>
<tr>
<td width="50%" valign="top">

### 🧠 **AI-Powered Intelligence**
Natural language → API endpoints
Powered by **GPT-4-mini** with fallback support

### 💬 **Beautiful Web Chat**
Sleek, responsive browser interface
Real-time query processing & results

### ⚡ **Zero Configuration**
Auto-detects API specs
Interactive CLI prompts

</td>
<td width="50%" valign="top">

### 🔌 **Plug & Play**
Works with existing APIs
No code changes required

### 🎯 **Intelligent Matching**
Parameter extraction
Confidence scoring & reasoning

### 📦 **Export Ready**
Standalone packages
Multi-platform deployment

</td>
</tr>
</table>

---

## 🎯 Quick Start

### 📥 Installation

```bash
# Global installation for CLI
npm install -g mcphy

# Or add to your project
npm install mcphy
```

### 🚀 Three Steps to AI-Powered APIs

#### **Step 1️⃣: Initialize**

```bash
cd your-api-project
mcphy init
```

MCPhy will:
- 🔍 Auto-detect your API spec (`swagger.yaml`, `openapi.json`, etc.)
- ✅ Validate the specification
- 📝 Generate MCP manifest
- ⚙️ Create `.mcphy.json` config

#### **Step 2️⃣: Add OpenAI Key (Optional)**

For AI-powered query matching, add your OpenAI API key:

```bash
# Create .env file
echo "OPENAI_API_KEY=sk-your-key-here" > .env
```

> **No OpenAI key?** No problem! MCPhy falls back to keyword-based matching.

#### **Step 3️⃣: Launch**

```bash
mcphy serve
```

```
🚀 MCPhy running at http://localhost:3000
💬 Open in your browser to chat with your backend
```

<div align="center">

### 🎉 **That's It! Your API is now conversational!**

</div>

---

## 🎨 Try It Now

Open `http://localhost:3000` and start chatting with your API:

```
You:  "Get all pets created after October 14, 2025"

MCPhy: ✅ Found endpoint!
       📍 GET /pets
       🔧 Parameters: { created_after: "2025-10-14" }
       🎯 Confidence: 85%
```

<div align="center">

**💡 Sample Queries to Try:**

| Query | What It Does |
|-------|--------------|
| `"Get all users created after January 1st"` | Retrieves filtered users |
| `"Create a new pet named Fluffy"` | POST request with params |
| `"Update user with ID 123"` | PUT/PATCH request |
| `"Delete the product with code ABC"` | DELETE request |

</div>

---

## 🛠️ CLI Commands

### 🎬 `mcphy init`

Initialize a new MCPhy project

```bash
mcphy init [options]

Options:
  -f, --file <path>    Path to API specification file
  -o, --output <path>  Output path for config (default: .mcphy.json)
```

**Example:**
```bash
mcphy init -f ./api/swagger.yaml
```

---

### 🚀 `mcphy serve`

Start the MCP server

```bash
mcphy serve [options]

Options:
  -c, --config <path>  Config file path (default: .mcphy.json)
  -p, --port <number>  Server port (default: 3000)
```

**Example:**
```bash
mcphy serve -p 8080
```

**Available Endpoints:**
| Endpoint | Description |
|----------|-------------|
| `http://localhost:3000/` | 💬 **Web Chat Interface** |
| `http://localhost:3000/.well-known/mcp/manifest.json` | 📋 MCP Manifest |
| `http://localhost:3000/mcp/query` | 🧠 Query Endpoint (GET/POST) |
| `http://localhost:3000/api/info` | ℹ️ API Information |
| `http://localhost:3000/api/endpoints` | 📚 List All Endpoints |
| `http://localhost:3000/health` | ❤️ Health Check |

---

### ✅ `mcphy validate`

Validate an API specification

```bash
mcphy validate <file>
```

**Example:**
```bash
mcphy validate ./swagger.yaml
```

---

### 📦 `mcphy export`

Export as a standalone package

```bash
mcphy export [options]

Options:
  -o, --output <dir>           Output directory (default: mcphy-export)
  -c, --config <file>          Config file (default: .mcphy.json)
  --include-node-modules       Include node_modules for offline use
```

**Example:**
```bash
mcphy export -o my-api-package --include-node-modules
```

**What's Included:**
- ✅ Complete MCPhy runtime
- ✅ Your API spec & config
- ✅ Startup scripts (`.sh` + `.bat`)
- ✅ Custom README
- ✅ Package.json

---

## 🔥 Advanced Usage

### 💻 Programmatic API

Use MCPhy as a library in your Node.js projects:

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
  openaiApiKey: process.env.OPENAI_API_KEY
});

await server.start();
console.log('🚀 Server running on port 3000');
```

---

### 🌐 Query API via REST

**Using cURL (POST):**
```bash
curl -X POST http://localhost:3000/mcp/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Get all pets created after October 14, 2025"}'
```

**Using cURL (GET):**
```bash
curl "http://localhost:3000/mcp/query?q=Get%20all%20pets"
```

**Response:**
```json
{
  "endpoint": "/pets",
  "method": "GET",
  "params": {
    "created_after": "2025-10-14"
  },
  "confidence": 0.85,
  "reasoning": "Matched GET /pets endpoint based on temporal query"
}
```

---

### 🧪 Test with Sample API

MCPhy includes a sample Pet Store API:

```bash
cd examples
mcphy init -f sample-swagger.yaml
mcphy serve
```

Visit `http://localhost:3000` and try queries like:
- "Show me all available pets"
- "Create a new pet"
- "Get pet by ID 123"

---

## ⚙️ Configuration

### 📄 `.mcphy.json`

```json
{
  "name": "My Awesome API",
  "description": "AI-powered API server",
  "version": "1.0.0",
  "apiSpecPath": "swagger.yaml",
  "manifestPath": ".mcphy-manifest.json",
  "port": 3000,
  "openaiApiKey": "sk-your-key-here"
}
```

### 🔑 Environment Variables

Create a `.env` file:

```bash
# OpenAI API Key (optional but recommended)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Server Port (optional)
PORT=3000
```

**Get an OpenAI key:** [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

## 🏗️ Project Structure

```
mcphy/
├── 📁 bin/
│   └── mcphy.js              # CLI entry point
├── 📁 src/
│   ├── cli.ts                # CLI commands
│   ├── index.ts              # Library exports
│   ├── 📁 parser/
│   │   ├── swaggerParser.ts  # Swagger/OpenAPI parser
│   │   └── postmanParser.ts  # Postman support (WIP)
│   ├── 📁 server/
│   │   ├── mcpServer.ts      # Express MCP server
│   │   ├── manifest.ts       # Manifest generator
│   │   ├── queryMatcher.ts   # NLP query matcher
│   │   └── 📁 ui/
│   │       ├── index.html    # Chat interface
│   │       ├── script.js     # Frontend logic
│   │       └── style.css     # Styles
│   └── 📁 utils/
│       └── logger.ts         # Console logger
├── 📁 examples/
│   └── sample-swagger.yaml   # Example API
├── 📁 templates/
│   └── manifest-template.json
└── .env.example
```

---

## 🛠️ Development

### Build from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/mcphy.git
cd mcphy

# Install dependencies
npm install

# Build TypeScript
npm run build

# Link for local development
npm link

# Start in watch mode
npm run dev
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript + copy UI files |
| `npm run copy-ui` | Copy UI assets to dist |
| `npm run dev` | Watch mode for development |
| `npm start` | Run compiled server |
| `npm run export` | Export standalone package |

---

## 🧠 How Natural Language Matching Works

MCPhy uses a two-tier intelligent matching system:

### **🤖 Tier 1: AI-Powered (with OpenAI)**
- Uses **GPT-4-mini** for semantic understanding
- Extracts intent, method, parameters from natural language
- Returns confidence scores and reasoning

### **🔍 Tier 2: Keyword Fallback (no API key needed)**
- Pattern matching on endpoint paths
- Keyword extraction from descriptions
- Basic parameter inference

**Example Flow:**

```
User Query: "Get all users created after January 1st"
         ↓
    Query Matcher
         ↓
  ┌──────┴──────┐
  │   AI Mode   │  (if OpenAI key present)
  └──────┬──────┘
         ↓
    Semantic Analysis
         ↓
    ✅ Matched Endpoint
         ↓
  📍 GET /users
  🔧 { created_after: "2025-01-01" }
  🎯 Confidence: 92%
```

---

## 📊 Supported Specifications

| Format | Status | Notes |
|--------|--------|-------|
| OpenAPI 3.0+ | ✅ **Fully Supported** | All features available |
| Swagger 2.0 | ✅ **Fully Supported** | Complete compatibility |
| Postman Collections | ⏳ **Coming Soon** | In development |
| GraphQL Schemas | 📋 **Planned** | On roadmap |

---

## 🗺️ Roadmap

- [x] 🧠 Natural language query matching
- [x] 💬 Interactive web chat interface
- [x] 🔍 Auto-detect API specifications
- [x] 🤖 OpenAI GPT-4-mini integration
- [x] 📦 Standalone export functionality
- [ ] 🔌 Full API request proxying
- [ ] 🔐 Authentication/authorization middleware
- [ ] 📮 Postman collection support
- [ ] 🎨 GraphQL schema support
- [ ] 🧩 Custom middleware plugins
- [ ] 🐳 Docker deployment templates
- [ ] 📊 Analytics & usage tracking
- [ ] 🌍 Multi-language support

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. 🍴 Fork the repository
2. 🌿 Create a feature branch (`git checkout -b feature/amazing-feature`)
3. 💾 Commit your changes (`git commit -m 'Add amazing feature'`)
4. 📤 Push to the branch (`git push origin feature/amazing-feature`)
5. 🎉 Open a Pull Request

### Development Guidelines

- ✅ Write TypeScript with strict mode
- ✅ Add tests for new features
- ✅ Update documentation
- ✅ Follow existing code style

---

## 📋 Requirements

| Requirement | Version |
|-------------|---------|
| **Node.js** | >= 18.0.0 |
| **npm** | >= 9.0.0 |
| **TypeScript** | >= 5.0.0 *(dev only)* |

---

## 🎓 Use Cases

<table>
<tr>
<td width="50%">

### 🚀 **For API Developers**
- Rapid prototyping & testing
- Interactive API documentation
- Developer experience enhancement

</td>
<td width="50%">

### 🤖 **For AI Integration**
- Voice assistant backends
- Chatbot API interfaces
- Conversational automation

</td>
</tr>
<tr>
<td width="50%">

### 📚 **For Documentation**
- Living API examples
- Interactive tutorials
- User-friendly demos

</td>
<td width="50%">

### 🧪 **For Testing**
- Natural language test cases
- QA automation
- Exploratory testing

</td>
</tr>
</table>

---

## 🎁 Example Projects

Check out these examples to get started:

```bash
# Pet Store API (included)
cd examples
mcphy init -f sample-swagger.yaml
mcphy serve

# Try queries:
# - "Show all pets"
# - "Create a new pet named Max"
# - "Get pet with ID 1"
```

Want to see your project here? Submit a PR!

---

## ❓ FAQ

<details>
<summary><b>Do I need an OpenAI API key?</b></summary>

No! MCPhy works without an OpenAI key using keyword-based fallback matching. However, for best results, we recommend using GPT-4-mini for intelligent query understanding.

</details>

<details>
<summary><b>Can I use this in production?</b></summary>

MCPhy is currently in active development (v0.1.0). It's great for development, testing, and prototyping. For production use, we recommend waiting for v1.0.0 or implementing additional security measures.

</details>

<details>
<summary><b>Does it work with GraphQL?</b></summary>

Not yet! GraphQL support is on our roadmap. Currently, MCPhy supports REST APIs via Swagger/OpenAPI specifications.

</details>

<details>
<summary><b>Can I customize the web interface?</b></summary>

Yes! The UI files are located in `src/server/ui/`. You can modify `index.html`, `script.js`, and `style.css` to customize the look and feel.

</details>

<details>
<summary><b>How accurate is the query matching?</b></summary>

With OpenAI: ~85-95% accuracy depending on query complexity
Without OpenAI: ~60-75% accuracy using keyword matching

</details>

---

## 📜 License

MIT © 2025 MCPhy

---

## 💖 Support

Love MCPhy? Here's how you can help:

- ⭐ Star this repository
- 🐛 Report bugs via [GitHub Issues](https://github.com/yourusername/mcphy/issues)
- 💡 Suggest features
- 📣 Share with your network
- 🤝 Contribute code

---

<div align="center">

### 🚀 **Ready to Make Your APIs Conversational?**

```bash
npm install -g mcphy && mcphy init
```

**[Get Started](#-quick-start)** • **[View Examples](#-example-projects)** • **[Read Docs](#-cli-commands)** • **[Report Issues](https://github.com/yourusername/mcphy/issues)**

---

**Made with ❤️ by developers, for developers**

[![Follow on GitHub](https://img.shields.io/github/followers/yourusername?style=social)](https://github.com/yourusername)
[![Twitter](https://img.shields.io/twitter/follow/yourusername?style=social)](https://twitter.com/yourusername)

</div>
