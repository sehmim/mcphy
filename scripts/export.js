#!/usr/bin/env node

/**
 * MCPhy Export Script
 * Creates a standalone export of MCPhy with user configuration
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const { Command } = require('commander');
const program = new Command();

program
  .name('mcphy-export')
  .description('Export MCPhy as a standalone package with your configuration')
  .option('-o, --output <dir>', 'Output directory for export', 'mcphy-export')
  .option('-c, --config <file>', 'Path to .mcphy.json config file', '.mcphy.json')
  .option('--include-node-modules', 'Include node_modules in export', false)
  .action(async (options) => {
    try {
      console.log('🚀 Exporting MCPhy...');
      
      const outputDir = path.resolve(options.output);
      const configPath = path.resolve(options.config);
      
      // Check if config exists
      if (!await fs.pathExists(configPath)) {
        console.error(`❌ Config file not found: ${configPath}`);
        console.log('Run "mcphy init" first to create a configuration');
        process.exit(1);
      }
      
      // Load config
      const config = await fs.readJSON(configPath);
      console.log(`📋 Loaded config: ${config.name}`);
      
      // Create output directory
      await fs.ensureDir(outputDir);
      console.log(`📁 Created output directory: ${outputDir}`);
      
      // Copy essential files
      const filesToCopy = [
        'package.json',
        'tsconfig.json',
        'README.md',
        '.env.example'
      ];
      
      for (const file of filesToCopy) {
        if (await fs.pathExists(file)) {
          await fs.copy(file, path.join(outputDir, file));
          console.log(`📄 Copied ${file}`);
        }
      }
      
      // Copy source directory
      await fs.copy('src', path.join(outputDir, 'src'));
      console.log('📁 Copied src directory');
      
      // Copy dist directory if it exists
      if (await fs.pathExists('dist')) {
        await fs.copy('dist', path.join(outputDir, 'dist'));
        console.log('📁 Copied dist directory');
      }
      
      // Copy templates
      if (await fs.pathExists('templates')) {
        await fs.copy('templates', path.join(outputDir, 'templates'));
        console.log('📁 Copied templates directory');
      }
      
      // Copy examples
      if (await fs.pathExists('examples')) {
        await fs.copy('examples', path.join(outputDir, 'examples'));
        console.log('📁 Copied examples directory');
      }
      
      // Copy user's config and manifest
      await fs.copy(configPath, path.join(outputDir, '.mcphy.json'));
      console.log('📄 Copied .mcphy.json');
      
      if (config.manifestPath && await fs.pathExists(config.manifestPath)) {
        await fs.copy(config.manifestPath, path.join(outputDir, '.mcphy-manifest.json'));
        console.log('📄 Copied manifest');
      }
      
      // Copy API spec if it exists
      if (config.apiSpecPath && await fs.pathExists(config.apiSpecPath)) {
        const specDir = path.dirname(config.apiSpecPath);
        const specName = path.basename(config.apiSpecPath);
        await fs.ensureDir(path.join(outputDir, specDir));
        await fs.copy(config.apiSpecPath, path.join(outputDir, config.apiSpecPath));
        console.log(`📄 Copied API spec: ${config.apiSpecPath}`);
      }
      
      // Create package.json for export
      const packageJson = await fs.readJSON('package.json');
      const exportPackageJson = {
        ...packageJson,
        name: `${packageJson.name}-export`,
        description: `Exported MCPfy instance for ${config.name}`,
        scripts: {
          ...packageJson.scripts,
          start: 'node dist/cli.js serve',
          build: 'npm run build && npm run copy-ui',
          'copy-ui': 'node -e "require(\'fs-extra\').copySync(\'src/server/ui\', \'dist/server/ui\')"'
        },
        bin: {
          'mcpfy': './bin/mcpfy.js'
        }
      };
      
      await fs.writeJSON(path.join(outputDir, 'package.json'), exportPackageJson, { spaces: 2 });
      console.log('📄 Created export package.json');
      
      // Create startup script
      const startupScript = `#!/bin/bash
# MCPhy Export Startup Script
# Generated on ${new Date().toISOString()}

echo "🚀 Starting MCPhy Export for ${config.name}"
echo "📋 Description: ${config.description}"
echo "🌐 Port: ${config.port}"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build if dist doesn't exist
if [ ! -d "dist" ]; then
    echo "🔨 Building TypeScript..."
    npm run build
fi

# Start the server
echo "🚀 Starting MCP server..."
npm start
`;
      
      await fs.writeFile(path.join(outputDir, 'start.sh'), startupScript);
      await fs.chmod(path.join(outputDir, 'start.sh'), '755');
      console.log('📄 Created start.sh script');
      
      // Create Windows batch file
      const windowsScript = `@echo off
REM MCPhy Export Startup Script
REM Generated on ${new Date().toISOString()}

echo 🚀 Starting MCPhy Export for ${config.name}
echo 📋 Description: ${config.description}
echo 🌐 Port: ${config.port}
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Build if dist doesn't exist
if not exist "dist" (
    echo 🔨 Building TypeScript...
    npm run build
)

REM Start the server
echo 🚀 Starting MCP server...
npm start
`;
      
      await fs.writeFile(path.join(outputDir, 'start.bat'), windowsScript);
      console.log('📄 Created start.bat script');
      
      // Create README for export
      const exportReadme = `# MCPhy Export - ${config.name}

This is an exported MCPhy instance for **${config.name}**.

## Quick Start

### Option 1: Using the startup script
\`\`\`bash
# Linux/Mac
./start.sh

# Windows
start.bat
\`\`\`

### Option 2: Manual setup
\`\`\`bash
# Install dependencies
npm install

# Build (if needed)
npm run build

# Start the server
npm start
\`\`\`

## Configuration

- **API Name**: ${config.name}
- **Description**: ${config.description}
- **Version**: ${config.version}
- **Port**: ${config.port}
- **API Spec**: ${config.apiSpecPath}

## OpenAI Integration

${config.openaiApiKey ? '✅ OpenAI API key is configured' : '⚠️  OpenAI API key not configured - using fallback matching'}

${config.openaiApiKey ? '' : 'To enable AI-powered query matching, add your OpenAI API key to the .mcpfy.json file or set the OPENAI_API_KEY environment variable.'}

## Usage

Once started, visit:
- **Web Interface**: http://localhost:${config.port}
- **API Endpoints**: http://localhost:${config.port}/api/endpoints
- **MCP Manifest**: http://localhost:${config.port}/.well-known/mcp/manifest.json

## Example Queries

Try these natural language queries:
- "Get all pets created after October 14, 2025"
- "Create a new user"
- "Update product with ID 123"
- "Delete the order with ID abc-123"

## Files

- \`.mcphy.json\` - Main configuration
- \`.mcphy-manifest.json\` - MCP manifest
- \`${config.apiSpecPath}\` - API specification
- \`src/\` - Source code
- \`dist/\` - Compiled JavaScript

---
Generated by MCPhy Export on ${new Date().toISOString()}
`;
      
      await fs.writeFile(path.join(outputDir, 'README.md'), exportReadme);
      console.log('📄 Created export README.md');
      
      // Copy node_modules if requested
      if (options.includeNodeModules && await fs.pathExists('node_modules')) {
        console.log('📦 Copying node_modules (this may take a while)...');
        await fs.copy('node_modules', path.join(outputDir, 'node_modules'));
        console.log('📦 Copied node_modules');
      }
      
      console.log('');
      console.log('✅ Export completed successfully!');
      console.log('');
      console.log('📁 Export location:', outputDir);
      console.log('');
      console.log('🚀 To use the export:');
      console.log(`   cd ${outputDir}`);
      if (!options.includeNodeModules) {
        console.log('   npm install');
      }
      console.log('   ./start.sh  # or start.bat on Windows');
      console.log('');
      console.log('🌐 Then visit: http://localhost:' + config.port);
      
    } catch (error) {
      console.error('❌ Export failed:', error.message);
      process.exit(1);
    }
  });

program.parse();
