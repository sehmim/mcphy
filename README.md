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

**🚀 Ready to try?** `npm install -g mcphy` • [🎯 Quick Start](#-quick-start) • [📖 API Docs](./docs/API.md) • [🎨 Examples](./docs/EXAMPLES.md) • [⭐ Star](https://github.com/sehmim/mcphy)

---

</div>

## Requirements

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- An API specification file (Swagger/OpenAPI)

## Installation

```bash
# Option 1: Install globally
npm install -g mcphy

# Option 2: Try without installing
npx mcphy --help
```

## Quick Start

```bash
# 1. Initialize with your API spec
mcphy init

# 2. Start the conversational server
mcphy serve

# 3. Open your browser
open http://localhost:3000
```

**That's it!** Start chatting with your API in plain English.

## Try It Now

Want to test MCPhy immediately? Use our included example:

```bash
# Clone and test with example API
git clone https://github.com/sehmim/mcphy.git
cd mcphy
npm install
npm run build
npm link

# Test with example
cd examples
mcphy init -f sample-swagger.yaml
mcphy serve
```

Then open `http://localhost:3000` and try:
- "Show me all pets"
- "Create a new pet named Max"
- "Get pet with ID 1"

## What It Does

- **🧠 Natural Language Processing** - Ask questions in plain English
- **🔌 Real API Calls** - Actually makes requests to your backend
- **⚠️ Smart Guidance** - Helps when information is missing
- **💬 Web Interface** - Beautiful chat UI with real-time responses
- **📦 Export Ready** - Create standalone packages

## Example

```
You: "create booking for John Doe for oil change for 2025-01-15"

MCPhy: ✅ Matched POST /bookings
       📤 Making API call...
       📋 Response: {"id": "booking-123", "status": "created"}
```

## Why Developers Love This

- **Zero Code Changes** - Works with existing APIs
- **Natural Language** - No need to remember endpoint names  
- **Real Responses** - Actually calls your backend
- **Smart Guidance** - Helps when information is missing
- **Beautiful UI** - Professional chat interface
- **Easy Export** - Create standalone packages

## Commands

| Command | Description |
|---------|-------------|
| `mcphy init` | Initialize project with API spec |
| `mcphy serve` | Start the MCP server |
| `mcphy validate <file>` | Validate API specification |
| `mcphy export` | Create standalone package |

## Supported Formats

- ✅ OpenAPI 3.0+
- ✅ Swagger 2.0
- ⏳ Postman Collections (coming soon)

## Documentation

- [📖 API Reference](./docs/API.md) - Programmatic usage
- [🎨 Examples](./docs/EXAMPLES.md) - Real-world examples

## Development

```bash
git clone https://github.com/sehmim/mcphy.git
cd mcphy
npm install
npm run build
npm link
```

## License

MIT © 2025 MCPhy

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

<div align="center">

**Made with ❤️ by developers, for developers**

[GitHub](https://github.com/sehmim/mcphy) • [Issues](https://github.com/sehmim/mcphy/issues) • [NPM](https://www.npmjs.com/package/mcphy)

</div>