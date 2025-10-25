#!/usr/bin/env node

/**
 * MCPhy CLI - Turn your API into a Conversational MCP Server
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import { execSync } from 'child_process';
import * as readline from 'readline';
import { Logger } from './utils/logger';
import { SwaggerAPIParser } from './parser/swaggerParser';
import { PostmanParser } from './parser/postmanParser';
import { ManifestGenerator } from './server/manifest';
import { startFromConfig } from './server/mcpServer';

const program = new Command();

// Read package.json for version
const packageJson = require('../package.json');

/**
 * Simple prompt function using readline
 */
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

program
  .name('mcphy')
  .description('Turn your API into a Conversational MCP Server')
  .version(packageJson.version);

/**
 * mcphy init
 * Detects API specification and creates .mcphy.json config
 */
program
  .command('init')
  .description('Initialize MCPhy project by detecting API specification')
  .option('-f, --file <path>', 'Path to API specification file')
  .option('-o, --output <path>', 'Output path for config file', '.mcphy.json')
  .action(async (options) => {
    try {
      Logger.info('Initializing MCPhy project...');

      let apiSpecPath: string;

      // Use provided file or detect
      if (options.file) {
        apiSpecPath = path.resolve(options.file);
        Logger.info(`Using API spec: ${apiSpecPath}`);
      } else {
        Logger.info('Detecting API specification files...');
        const swaggerFiles = await SwaggerAPIParser.detectAPIFiles();
        const postmanFiles = await PostmanParser.detectCollectionFiles();
        const detectedFiles = [...swaggerFiles, ...postmanFiles];

        if (detectedFiles.length === 0) {
          Logger.warn('No API specification files found in project root');
          console.log('\n💡 Quick fixes:');
          console.log('   1. Specify file: mcphy init -f path/to/your/api.yaml');
          console.log('   2. Rename your file to: swagger.yaml, openapi.yaml, api.yaml, or postman_collection.json');
          console.log('   3. Place file in current directory\n');

          // Prompt user for file path
          let filePath = '';
          while (!filePath) {
            filePath = await prompt('Enter the path to your API specification file (or Ctrl+C to exit): ');
            if (!filePath) {
              console.log('❌ File path cannot be empty. Please try again.');
            }
          }

          apiSpecPath = path.resolve(filePath);
        } else {
          apiSpecPath = detectedFiles[0];
          Logger.info(`Found API spec: ${apiSpecPath}`);

          if (detectedFiles.length > 1) {
            Logger.warn(`Multiple files found, using: ${apiSpecPath}`);
          }
        }
      }

      // Validate file exists
      if (!await fs.pathExists(apiSpecPath)) {
        Logger.error(`File not found: ${apiSpecPath}`);
        console.log('\n💡 Troubleshooting:');
        console.log('   • Check the file path is correct (case-sensitive)');
        console.log('   • Verify the file exists: ls -la ' + apiSpecPath);
        console.log('   • Try using absolute path: mcphy init -f /full/path/to/file');
        console.log('   • See: https://github.com/sehmim/mcphy/blob/main/docs/troubleshooting.md#-file-not-found-error\n');
        process.exit(1);
      }

      // Detect format and parse accordingly
      let apiSpec: any;
      let isPostman = false;
      
      // Check if it's a Postman collection
      if (apiSpecPath.endsWith('.json') && await PostmanParser.isValidCollection(apiSpecPath)) {
        Logger.info('Detected Postman collection format');
        isPostman = true;
        // Will parse with OpenAI key later
      } else {
        Logger.info('Detected OpenAPI/Swagger format');
        // Will parse with OpenAI key after prompt
      }

      // Prompt for OpenAI API key (optional but recommended)
      console.log('\n🤖 OpenAI API Key (Optional but Recommended)');
      console.log('   MCPhy can intelligently understand your API with GPT-4');
      console.log('   Without it, you\'ll get basic parsing (still works great!)');
      console.log('   Get your key at: https://platform.openai.com/api-keys\n');
      
      let openaiApiKey = '';
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!openaiApiKey && attempts < maxAttempts) {
        openaiApiKey = await prompt(`Enter your OpenAI API key (or press Enter to skip) [${process.env.OPENAI_API_KEY ? 'current key set' : 'none'}]: `);
        
        if (!openaiApiKey) {
          console.log('📝 Continuing with basic parsing (no AI enhancement)');
          break;
        } else if (!openaiApiKey.startsWith('sk-')) {
          attempts++;
          console.log(`❌ Invalid API key format. Must start with "sk-" (attempt ${attempts}/${maxAttempts})`);
          if (attempts < maxAttempts) {
            console.log('   Get your key at: https://platform.openai.com/api-keys\n');
            openaiApiKey = '';
          } else {
            console.log('   Skipping AI enhancement due to invalid key format\n');
            openaiApiKey = '';
          }
        }
      }
      
      const finalOpenAIKey = openaiApiKey || process.env.OPENAI_API_KEY;

      // Prompt for LLM model selection if OpenAI key is available
      let llmModel = 'gpt-4o-mini'; // Default
      if (finalOpenAIKey) {
        console.log('\n🤖 LLM Model Selection');
        console.log('   Choose which model to use for query matching:');
        console.log('   1. gpt-4o-mini (fast, cost-effective) - Recommended');
        console.log('   2. gpt-4o (most capable)');
        console.log('   3. gpt-3.5-turbo (fastest, cheapest)');
        console.log('   4. Custom model\n');
        
        const modelChoice = await prompt('Select model [1-4] or press Enter for default [1]: ') || '1';
        
        const modelMap: Record<string, string> = {
          '1': 'gpt-4o-mini',
          '2': 'gpt-4o',
          '3': 'gpt-3.5-turbo',
        };
        
        if (modelChoice === '4') {
          const customModel = await prompt('Enter custom model name: ');
          llmModel = customModel || 'gpt-4o-mini';
        } else {
          llmModel = modelMap[modelChoice] || 'gpt-4o-mini';
        }
        
        console.log(`✅ Selected model: ${llmModel}\n`);
      }

      // Parse with OpenAI key
      console.log('📡 Parsing API specification...');
      
      if (isPostman) {
        apiSpec = await PostmanParser.parse(apiSpecPath, finalOpenAIKey || undefined);
      } else {
        apiSpec = await SwaggerAPIParser.parse(apiSpecPath, finalOpenAIKey || undefined);
      }
      
      // Display beautiful summary
      console.log('\n✨ API Successfully Parsed!');
      console.log('┌─────────────────────────────────────────────────────────┐');
      console.log(`│ 📋 ${apiSpec.info.title.padEnd(47)} │`);
      console.log(`│ 🏷️  Version: ${apiSpec.info.version.padEnd(40)} │`);
      console.log(`│ 🔗 Endpoints: ${Object.keys(apiSpec.paths || {}).length.toString().padEnd(37)} │`);
      console.log(`│ 🚀 Methods: ${Object.values(apiSpec.paths || {}).flatMap(path => 
        Object.keys(path as object).filter(m => ['get', 'post', 'put', 'delete', 'patch'].includes(m))
      ).join(', ').padEnd(38)} │`);
      console.log('└─────────────────────────────────────────────────────────┘');

      // Prompt for API base URL
      console.log('\n🌐 API Configuration');
      const suggestedBaseUrl = isPostman && apiSpec.baseUrl ? apiSpec.baseUrl : 'http://localhost:8000';
      const apiBaseUrl = await prompt(`Enter your API base URL [${suggestedBaseUrl}]: `);
      const finalApiBaseUrl = apiBaseUrl || suggestedBaseUrl;

      // Generate manifest
      console.log('\n⚙️  Generating MCP manifest...');
      const manifest = isPostman 
        ? await ManifestGenerator.generateFromPostman(apiSpec)
        : await ManifestGenerator.generateFromSwagger(apiSpec);
      const manifestPath = path.resolve('.mcphy-manifest.json');
      await ManifestGenerator.saveManifest(manifest, manifestPath);

      // Create config file
      const config = {
        name: apiSpec.info.title,
        description: apiSpec.info.description || '',
        version: apiSpec.info.version,
        apiSpecPath: path.relative(process.cwd(), apiSpecPath),
        apiSpecFormat: isPostman ? 'postman' : 'openapi',
        manifestPath: path.relative(process.cwd(), manifestPath),
        port: 3000,
        openaiApiKey: finalOpenAIKey,
        apiBaseUrl: finalApiBaseUrl,
        llmModel: llmModel,
      };

      const configPath = path.resolve(options.output);
      await fs.writeJSON(configPath, config, { spaces: 2 });

      // Beautiful success message
      console.log('\n🎉 MCPhy Initialized Successfully!');
      console.log('┌─────────────────────────────────────────────────────────┐');
      console.log('│ ✅ Configuration saved to .mcphy.json                  │');
      console.log('│ ✅ MCP manifest generated                              │');
      console.log('│ ✅ Ready to start your conversational API server!      │');
      console.log('└─────────────────────────────────────────────────────────┘');
      console.log('\n🚀 Next steps:');
      console.log('   1. Run: mcphy serve');
      console.log('   2. Open: http://localhost:3000');
      console.log('   3. Start chatting with your API!');
      console.log('\n💡 Try queries like:');
      console.log('   • "Show me all available endpoints"');
      console.log('   • "How do I create a new booking?"');
      console.log('   • "What parameters does the GET /bookings endpoint need?"');
    } catch (error) {
      const err = error as Error;
      
      console.log('\n❌ Initialization Failed!');
      console.log('┌─────────────────────────────────────────────────────────┐');
      console.log('│ 🚨 Error Details:                                      │');
      console.log(`│ ${err.message.padEnd(55)} │`);
      console.log('└─────────────────────────────────────────────────────────┘');
      
      console.log('\n🔧 Quick Fixes:');
      
      if (err.message.includes('404') && err.message.includes('gpt-4')) {
        console.log('   • OpenAI API key issue: Check your key has GPT-4 access');
        console.log('   • Try: https://platform.openai.com/api-keys');
        console.log('   • Ensure billing is set up for GPT-4');
      } else if (err.message.includes('YAML') || err.message.includes('JSON')) {
        console.log('   • Syntax error: Check your API spec file');
        console.log('   • YAML: https://www.yamllint.com/');
        console.log('   • JSON: https://jsonlint.com/');
      } else if (err.message.includes('File not found')) {
        console.log('   • File not found: Check the path is correct');
        console.log('   • Use absolute path: /full/path/to/file.yaml');
      } else if (err.message.includes('Permission')) {
        console.log('   • Permission error: Check write permissions');
        console.log('   • Try: chmod u+w .');
      } else {
        console.log('   • Invalid API spec? Run: mcphy validate <your-file>');
        console.log('   • Wrong file format? Ensure it\'s OpenAPI/Swagger or Postman');
        console.log('   • Check file exists and is readable');
      }
      
      console.log('\n📖 Full troubleshooting guide:');
      console.log('   https://github.com/sehmim/mcphy/blob/main/docs/troubleshooting.md\n');
      process.exit(1);
    }
  });

/**
 * mcphy serve
 * Starts the MCP Express server
 */
program
  .command('serve')
  .description('Start the MCP server')
  .option('-c, --config <path>', 'Path to config file', '.mcphy.json')
  .option('-p, --port <number>', 'Port to run server on', '3000')
  .action(async (options) => {
    try {
      const configPath = path.resolve(options.config);

      // Check if config exists
      if (!await fs.pathExists(configPath)) {
        console.log('\n❌ Configuration Not Found!');
        console.log('┌─────────────────────────────────────────────────────────┐');
        console.log('│ 🚨 Config file not found: .mcphy.json                  │');
        console.log('└─────────────────────────────────────────────────────────┘');
        console.log('\n🔧 Quick Fix:');
        console.log('   1. Run: mcphy init');
        console.log('   2. Then: mcphy serve');
        console.log('\n   Or if config is elsewhere:');
        console.log('   mcphy serve -c path/to/.mcphy.json\n');
        process.exit(1);
      }

      const port = parseInt(options.port, 10);

      console.log('\n🚀 Starting MCPhy Server...');
      console.log('┌─────────────────────────────────────────────────────────┐');
      console.log(`│ 🌐 Server starting on port ${port}...                    │`);
      console.log('└─────────────────────────────────────────────────────────┘');
      
      await startFromConfig(configPath, port);
      
      console.log('\n✨ MCPhy Server is Running!');
      console.log('┌─────────────────────────────────────────────────────────┐');
      console.log(`│ 🎯 Web Interface: http://localhost:${port}                │`);
      console.log('│ 💬 Start chatting with your API!                       │');
      console.log('│ ⌨️  Press Ctrl+C to stop the server                     │');
      console.log('└─────────────────────────────────────────────────────────┘');

      // Keep the process running
      process.on('SIGINT', () => {
        console.log('\n\n👋 Shutting down MCPhy server...');
        console.log('   Thanks for using MCPhy! 🚀\n');
        process.exit(0);
      });
    } catch (error) {
      const err = error as Error;
      const errorMsg = err.message || '';
      
      console.log('\n❌ Server Start Failed!');
      console.log('┌─────────────────────────────────────────────────────────┐');
      console.log('│ 🚨 Error Details:                                      │');
      console.log(`│ ${errorMsg.padEnd(55)} │`);
      console.log('└─────────────────────────────────────────────────────────┘');
      
      console.log('\n🔧 Quick Fixes:');
      if (errorMsg.includes('EADDRINUSE')) {
        console.log('   • Port already in use: mcphy serve -p 3001');
        console.log('   • Or kill process: lsof -i :3000');
      } else if (errorMsg.includes('EACCES')) {
        console.log('   • Permission denied: mcphy serve -p 8080');
      } else {
        console.log('   • Check .mcphy.json is valid JSON');
        console.log('   • Verify API base URL is correct');
        console.log('   • Ensure manifest file exists');
      }
      console.log('\n📖 Full troubleshooting: https://github.com/sehmim/mcphy/blob/main/docs/troubleshooting.md\n');
      process.exit(1);
    }
  });

/**
 * mcphy validate
 * Validates an API specification file
 */
program
  .command('validate')
  .description('Validate an API specification file')
  .argument('<file>', 'Path to API specification file')
  .action(async (file) => {
    try {
      const filePath = path.resolve(file);

      console.log('\n🔍 Validating API specification...');
      console.log(`   File: ${filePath}`);

      // Check if it's Postman or OpenAPI/Swagger
      const isPostman = filePath.endsWith('.json') && await PostmanParser.isValidCollection(filePath);
      
      if (isPostman) {
        console.log('   Format: Postman Collection');
        const isValid = await PostmanParser.isValidCollection(filePath);
        
        if (isValid) {
          const apiSpec = await PostmanParser.parse(filePath);
          
          console.log('\n✅ Validation Successful!');
          console.log('┌─────────────────────────────────────────────────────────┐');
          console.log('│ 🎉 Postman collection is valid!                       │');
          console.log('└─────────────────────────────────────────────────────────┘');
          
          console.log('\n📊 Collection Summary:');
          console.log('┌─────────────────────────────────────────────────────────┐');
          console.log(`│ 📋 ${apiSpec.info.title.padEnd(47)} │`);
          console.log(`│ 🏷️  Version: ${apiSpec.info.version.padEnd(40)} │`);
          console.log(`│ 🔗 Endpoints: ${Object.keys(apiSpec.paths || {}).length.toString().padEnd(37)} │`);
          console.log('└─────────────────────────────────────────────────────────┘');
          
          console.log('\n🚀 Next steps:');
          console.log('   • Run: mcphy init -f ' + file);
          console.log('   • Use OpenAI API key for enhanced parsing');
        } else {
          console.log('\n❌ Validation Failed!');
          console.log('┌─────────────────────────────────────────────────────────┐');
          console.log('│ 🚨 Postman collection is invalid                       │');
          console.log('└─────────────────────────────────────────────────────────┘');
          console.log('\n🔧 Common issues:');
          console.log('   • Check JSON syntax is correct');
          console.log('   • Ensure it has info and item fields');
          console.log('   • Verify it\'s a valid Postman Collection v2.x format');
          console.log('\n📖 See: https://github.com/sehmim/mcphy/blob/main/docs/troubleshooting.md\n');
          process.exit(1);
        }
      } else {
        console.log('   Format: OpenAPI/Swagger');
        const isValid = await SwaggerAPIParser.isValidSpec(filePath);

        if (isValid) {
          const apiSpec = await SwaggerAPIParser.parse(filePath);
          
          console.log('\n✅ Validation Successful!');
          console.log('┌─────────────────────────────────────────────────────────┐');
          console.log('│ 🎉 API specification is valid!                        │');
          console.log('└─────────────────────────────────────────────────────────┘');
          
          console.log('\n📊 API Summary:');
          console.log('┌─────────────────────────────────────────────────────────┐');
          console.log(`│ 📋 ${apiSpec.info.title.padEnd(47)} │`);
          console.log(`│ 🏷️  Version: ${apiSpec.info.version.padEnd(40)} │`);
          console.log(`│ 🔗 Endpoints: ${Object.keys(apiSpec.paths || {}).length.toString().padEnd(37)} │`);
          console.log('└─────────────────────────────────────────────────────────┘');
          
          console.log('\n🚀 Next steps:');
          console.log('   • Run: mcphy init -f ' + file);
          console.log('   • Use OpenAI API key for enhanced parsing');
        } else {
          console.log('\n❌ Validation Failed!');
          console.log('┌─────────────────────────────────────────────────────────┐');
          console.log('│ 🚨 API specification is invalid                        │');
          console.log('└─────────────────────────────────────────────────────────┘');
          console.log('\n🔧 Common issues:');
          console.log('   • Check YAML/JSON syntax is correct');
          console.log('   • Ensure it\'s OpenAPI/Swagger format');
          console.log('   • Verify all $ref references exist');
          console.log('   • Check required fields: info, paths, openapi/swagger version');
          console.log('\n📖 See: https://github.com/sehmim/mcphy/blob/main/docs/troubleshooting.md\n');
          process.exit(1);
        }
      }
    } catch (error) {
      const err = error as Error;
      
      console.log('\n❌ Validation Error!');
      console.log('┌─────────────────────────────────────────────────────────┐');
      console.log('│ 🚨 Error Details:                                      │');
      console.log(`│ ${err.message.padEnd(55)} │`);
      console.log('└─────────────────────────────────────────────────────────┘');
      
      console.log('\n🔧 Quick Fixes:');
      console.log('   • Verify file exists: ls -la ' + file);
      console.log('   • Check YAML syntax: https://www.yamllint.com/');
      console.log('   • Validate OpenAPI spec: https://editor.swagger.io/');
      console.log('\n📖 Full guide: https://github.com/sehmim/mcphy/blob/main/docs/troubleshooting.md\n');
      process.exit(1);
    }
  });

/**
 * mcphy export
 * Export MCPhy as a standalone package
 */
program
  .command('export')
  .description('Export MCPhy as a standalone package with your configuration')
  .option('-o, --output <dir>', 'Output directory for export', 'mcphy-export')
  .option('-c, --config <file>', 'Path to .mcphy.json config file', '.mcphy.json')
  .option('--include-node-modules', 'Include node_modules in export', false)
  .action(async (options) => {
    try {
      Logger.info('Exporting MCPhy...');
      
      // Run the export script
      const exportScript = path.join(__dirname, '..', 'scripts', 'export.js');
      const command = `node "${exportScript}" -o "${options.output}" -c "${options.config}"${options.includeNodeModules ? ' --include-node-modules' : ''}`;
      
      execSync(command, { stdio: 'inherit' });
      
      Logger.success('Export completed successfully!');
    } catch (error) {
      Logger.error('Export failed', error as Error);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();
