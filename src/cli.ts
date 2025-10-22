#!/usr/bin/env node

/**
 * MCPHy CLI - Turn your API into a Conversational MCP Server
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import { execSync } from 'child_process';
import * as readline from 'readline';
import { Logger } from './utils/logger';
import { SwaggerAPIParser } from './parser/swaggerParser';
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
  .description('Initialize MCPHy project by detecting API specification')
  .option('-f, --file <path>', 'Path to API specification file')
  .option('-o, --output <path>', 'Output path for config file', '.mcphy.json')
  .action(async (options) => {
    try {
      Logger.info('Initializing MCPHy project...');

      let apiSpecPath: string;

      // Use provided file or detect
      if (options.file) {
        apiSpecPath = path.resolve(options.file);
        Logger.info(`Using API spec: ${apiSpecPath}`);
      } else {
        Logger.info('Detecting API specification files...');
        const detectedFiles = await SwaggerAPIParser.detectAPIFiles();

        if (detectedFiles.length === 0) {
          Logger.warn('No API specification files found in project root');

          // Prompt user for file path
          let filePath = '';
          while (!filePath) {
            filePath = await prompt('Enter the relative path to your API specification file: (e.g. api.yaml)');
            if (!filePath) {
              console.log('File path cannot be empty. Please try again.');
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
        process.exit(1);
      }

      // Parse the API specification
      const apiSpec = await SwaggerAPIParser.parse(apiSpecPath);

      // Display summary
      Logger.info('API Summary:');
      console.log(SwaggerAPIParser.getAPISummary(apiSpec));

      // Prompt for OpenAI API key
      const openaiApiKey = await prompt(`Enter your OpenAI API key (optional, for AI-powered query matching) [${process.env.OPENAI_API_KEY ? 'current key set' : 'none'}]: `);
      
      // Validate OpenAI API key if provided
      if (openaiApiKey && !openaiApiKey.startsWith('sk-')) {
        console.log('Warning: OpenAI API key should start with "sk-". Continuing without AI features.');
      }

      // Prompt for API base URL
      const apiBaseUrl = await prompt('Enter your API base URL (e.g., http://localhost:8000, https://api.example.com) [http://localhost:8000]: ');
      const finalApiBaseUrl = apiBaseUrl || 'http://localhost:8000';

      // Generate manifest
      const manifest = await ManifestGenerator.generateFromSwagger(apiSpec);
      const manifestPath = path.resolve('.mcphy-manifest.json');
      await ManifestGenerator.saveManifest(manifest, manifestPath);

      // Create config file
      const config = {
        name: apiSpec.info.title,
        description: apiSpec.info.description || '',
        version: apiSpec.info.version,
        apiSpecPath: path.relative(process.cwd(), apiSpecPath),
        manifestPath: path.relative(process.cwd(), manifestPath),
        port: 3000,
        openaiApiKey: openaiApiKey || process.env.OPENAI_API_KEY || null,
        apiBaseUrl: finalApiBaseUrl,
      };

      const configPath = path.resolve(options.output);
      await fs.writeJSON(configPath, config, { spaces: 2 });

      Logger.success(`Configuration saved to ${configPath}`);
      Logger.success('MCPHy initialized successfully!');
      Logger.info('Run "mcphy serve" to start the MCP server');
    } catch (error) {
      Logger.error('Failed to initialize MCPHy', error as Error);
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
        Logger.error(`Config file not found: ${configPath}`);
        Logger.info('Run "mcphy init" first to initialize the project');
        process.exit(1);
      }

      const port = parseInt(options.port, 10);

      Logger.info('Starting MCP server...');
      await startFromConfig(configPath, port);

      // Keep the process running
      process.on('SIGINT', () => {
        Logger.info('Shutting down MCP server...');
        process.exit(0);
      });
    } catch (error) {
      Logger.error('Failed to start MCP server', error as Error);
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

      Logger.info(`Validating ${filePath}...`);

      const isValid = await SwaggerAPIParser.isValidSpec(filePath);

      if (isValid) {
        const apiSpec = await SwaggerAPIParser.parse(filePath);
        Logger.success('API specification is valid!');
        console.log(SwaggerAPIParser.getAPISummary(apiSpec));
      } else {
        Logger.error('API specification is invalid');
        process.exit(1);
      }
    } catch (error) {
      Logger.error('Validation failed', error as Error);
      process.exit(1);
    }
  });

/**
 * mcphy export
 * Export MCPHy as a standalone package
 */
program
  .command('export')
  .description('Export MCPHy as a standalone package with your configuration')
  .option('-o, --output <dir>', 'Output directory for export', 'mcphy-export')
  .option('-c, --config <file>', 'Path to .mcphy.json config file', '.mcphy.json')
  .option('--include-node-modules', 'Include node_modules in export', false)
  .action(async (options) => {
    try {
      Logger.info('Exporting MCPHy...');
      
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
