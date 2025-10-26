/**
 * Express server exposing MCP endpoints
 */

import express, { Express, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as SwaggerParser from 'swagger-parser';
import { Logger } from '../utils/logger';
import { MCPManifest, ManifestGenerator } from './manifest';
import { ManifestEnhancer } from './manifestEnhancer';
import { QueryMatcher } from './queryMatcher';

export interface MCPServerOptions {
  port: number;
  manifest: MCPManifest;
  configPath?: string;
  openaiApiKey?: string | null;
  apiBaseUrl?: string;
  llmModel?: string;
  manifestEnhancement?: boolean;
}

export class MCPServer {
  private app: Express;
  private port: number;
  private manifest: MCPManifest;
  private queryMatcher: QueryMatcher;
  private apiBaseUrl: string;
  private openaiApiKey?: string | null;
  private llmModel?: string;
  private manifestEnhancement: boolean;

  constructor(options: MCPServerOptions) {
    this.app = express();
    this.port = options.port;
    this.manifest = options.manifest;
    this.queryMatcher = new QueryMatcher(options.manifest, options.openaiApiKey, options.llmModel);
    this.apiBaseUrl = options.apiBaseUrl || 'http://localhost:8000';
    this.openaiApiKey = options.openaiApiKey;
    this.llmModel = options.llmModel;
    this.manifestEnhancement = options.manifestEnhancement || false;

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Serve static files from UI folder
    const uiPath = path.join(__dirname, 'ui');
    this.app.use(express.static(uiPath));

    // Request logging
    this.app.use((req, _res, next) => {
      Logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup MCP routes
   */
  private setupRoutes(): void {
    // Serve main UI page
    this.app.get('/', (_req: Request, res: Response) => {
      const indexPath = path.join(__dirname, 'ui', 'index.html');
      res.sendFile(indexPath);
    });

    // Health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // MCP manifest endpoint (well-known path)
    this.app.get('/.well-known/mcp/manifest.json', (_req: Request, res: Response) => {
      res.json(this.manifest);
    });

    // API info endpoint
    this.app.get('/api/info', (_req: Request, res: Response) => {
      res.json({
        name: this.manifest.name,
        description: this.manifest.description,
        version: this.manifest.version,
        endpointCount: this.manifest.endpoints.length,
      });
    });

    // List all endpoints
    this.app.get('/api/endpoints', (_req: Request, res: Response) => {
      res.json(this.manifest.endpoints);
    });

    // Get current API spec info
    this.app.get('/api/spec-info', (_req: Request, res: Response) => {
      res.json({
        name: this.manifest.name,
        description: this.manifest.description,
        version: this.manifest.version,
        endpointCount: this.manifest.endpoints.length,
      });
    });

    // Update API specification
    this.app.post('/api/update-spec', async (req: Request, res: Response) => {
      try {
        const { specContent, specType } = req.body;

        if (!specContent) {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'specContent is required',
          });
        }

        Logger.info('Updating API specification...');

        // Parse the spec based on type
        let parsedSpec;
        let newManifest: MCPManifest;

        try {
          // Try to detect format if not specified
          const content = typeof specContent === 'string' ? JSON.parse(specContent) : specContent;

          if (specType === 'postman' || content.info?.schema?.includes('postman')) {
            Logger.info('Detected Postman collection format');
            // For Postman, we need to convert it to OpenAPI format first
            // For now, try to use it directly with the Postman generator
            newManifest = await ManifestGenerator.generateFromPostman(content);
          } else {
            Logger.info('Detected OpenAPI/Swagger format');
            // Validate the spec using swagger-parser
            parsedSpec = await (SwaggerParser as any).validate(content);
            newManifest = await ManifestGenerator.generateFromSwagger(parsedSpec);
          }
        } catch (parseError) {
          Logger.error('Failed to parse specification', parseError as Error);
          return res.status(400).json({
            error: 'Parse failed',
            message: parseError instanceof Error ? parseError.message : 'Could not parse specification',
          });
        }

        // Optionally enhance manifest with LLM
        if (this.manifestEnhancement && this.openaiApiKey) {
          try {
            Logger.info('Enhancing manifest with LLM...');
            const enhancer = new ManifestEnhancer({
              enabled: true,
              apiKey: this.openaiApiKey,
              model: this.llmModel,
            });

            newManifest = await enhancer.enhanceManifest(newManifest);
            Logger.success('Manifest enhanced successfully');
          } catch (enhanceError) {
            Logger.warn('LLM enhancement failed, using basic manifest');
            Logger.error('Enhancement error', enhanceError as Error);
            // Continue with unenhanced manifest
          }
        }

        // Update the server's manifest
        this.manifest = newManifest;

        // Recreate QueryMatcher with new manifest
        this.queryMatcher = new QueryMatcher(
          this.manifest,
          process.env.OPENAI_API_KEY,
          undefined
        );

        Logger.success('API specification updated successfully');

        res.json({
          success: true,
          message: 'API specification updated successfully',
          manifest: {
            name: this.manifest.name,
            description: this.manifest.description,
            version: this.manifest.version,
            endpointCount: this.manifest.endpoints.length,
          },
        });
      } catch (error) {
        Logger.error('Failed to update specification', error as Error);
        res.status(500).json({
          error: 'Update failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Natural language query endpoint (POST)
    this.app.post('/mcp/query', async (req: Request, res: Response) => {
      try {
        const { query } = req.body;

        if (!query || typeof query !== 'string') {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Request body must contain a "query" string field',
          });
        }

        Logger.info(`Processing natural language query: "${query}"`);

        // Match query to endpoint
        const result = await this.queryMatcher.matchQuery(query);

        res.json(result);
      } catch (error) {
        Logger.error('Query matching failed', error as Error);
        res.status(500).json({
          error: 'Query matching failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Natural language query endpoint (GET with query param)
    this.app.get('/mcp/query', async (req: Request, res: Response) => {
      try {
        const query = req.query.q as string;

        if (!query || typeof query !== 'string') {
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Query parameter "q" is required',
          });
        }

        Logger.info(`Processing natural language query: "${query}"`);

        // Match query to endpoint
        const result = await this.queryMatcher.matchQuery(query);

        res.json(result);
      } catch (error) {
        Logger.error('Query matching failed', error as Error);
        res.status(500).json({
          error: 'Query matching failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Proxy endpoint for actual API calls
    this.app.all('/api/proxy/*', async (req: Request, res: Response) => {
      try {
        const targetPath = req.path.replace('/api/proxy', '');

        // Build target URL with query string if present
        let targetUrl = this.getTargetUrl() + targetPath;
        if (req.url.includes('?')) {
          const queryString = req.url.split('?')[1];
          targetUrl += `?${queryString}`;
        }

        Logger.info(`Proxying ${req.method} request to: ${targetUrl}`);

        // Prepare headers (exclude host and other problematic headers)
        const headers: Record<string, string> = {};

        // Copy safe headers from the original request
        Object.keys(req.headers).forEach(key => {
          const lowerKey = key.toLowerCase();
          if (!['host', 'content-length', 'connection', 'content-type'].includes(lowerKey)) {
            const value = req.headers[key];
            if (typeof value === 'string') {
              headers[key] = value;
            }
          }
        });

        // Always set Content-Type to application/json for our API calls
        headers['Content-Type'] = 'application/json';

        // Make the actual API call
        const fetchOptions: any = {
          method: req.method,
          headers,
        };

        // Add body for non-GET/HEAD requests
        if (!['GET', 'HEAD'].includes(req.method) && req.body) {
          // Check if body is already a string (shouldn't happen with express.json(), but just in case)
          const bodyToSend = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
          fetchOptions.body = bodyToSend;

          Logger.info(`Request body type: ${typeof req.body}`);
          Logger.info(`Request body: ${JSON.stringify(req.body, null, 2)}`);
          Logger.info(`Sending body: ${bodyToSend}`);
        }

        const response = await fetch(targetUrl, fetchOptions);

        const responseData = await response.text();
        let jsonData;

        try {
          jsonData = JSON.parse(responseData);
        } catch {
          jsonData = responseData;
        }

        Logger.info(`Response status: ${response.status}`);

        // Forward the response
        res.status(response.status).json({
          success: response.ok,
          status: response.status,
          data: jsonData,
          headers: Object.fromEntries(response.headers.entries()),
        });

      } catch (error) {
        Logger.error('Proxy request failed', error as Error);
        res.status(500).json({
          success: false,
          error: 'Proxy request failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      res.status(404).json({ error: 'Not found' });
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        console.log('\n🚀 MCPhy running at http://localhost:' + this.port);
        console.log('💬 Open in your browser to chat with your backend\n');
        Logger.info(`Web UI: http://localhost:${this.port}/`);
        Logger.info(`Query Endpoint: http://localhost:${this.port}/mcp/query (GET/POST)`);
        Logger.info(`API Endpoints: http://localhost:${this.port}/api/endpoints`);
        Logger.info(`MCP Manifest: http://localhost:${this.port}/.well-known/mcp/manifest.json`);
        resolve();
      });
    });
  }

  /**
   * Get the Express app instance
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Get the target API base URL
   */
  private getTargetUrl(): string {
    return this.apiBaseUrl;
  }
}

/**
 * Create and start an MCP server from a config file
 */
export async function startFromConfig(configPath: string, port: number = 3000): Promise<MCPServer> {
  try {
    // Load config
    const config = await fs.readJSON(configPath);
    Logger.info(`Loaded configuration from ${configPath}`);

    // Load or generate manifest
    let manifest: MCPManifest;

    if (config.manifestPath && await fs.pathExists(config.manifestPath)) {
      manifest = await fs.readJSON(config.manifestPath);
      Logger.info(`Loaded manifest from ${config.manifestPath}`);
    } else {
      Logger.warn('No manifest found, using minimal manifest');
      manifest = {
        version: '1.0.0',
        name: config.name || 'MCP API Server',
        description: config.description || 'API exposed via MCP',
        endpoints: [],
      };
    }

    // Create and start server
    const server = new MCPServer({
      port,
      manifest,
      configPath,
      openaiApiKey: config.openaiApiKey,
      apiBaseUrl: config.apiBaseUrl,
      llmModel: config.llmModel,
      manifestEnhancement: config.manifestEnhancement || false
    });
    await server.start();

    return server;
  } catch (error) {
    Logger.error('Failed to start server from config', error as Error);
    throw error;
  }
}
