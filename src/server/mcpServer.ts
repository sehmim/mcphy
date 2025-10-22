/**
 * Express server exposing MCP endpoints
 */

import express, { Express, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs-extra';
import { Logger } from '../utils/logger';
import { MCPManifest } from './manifest';
import { QueryMatcher } from './queryMatcher';

export interface MCPServerOptions {
  port: number;
  manifest: MCPManifest;
  configPath?: string;
  openaiApiKey?: string | null;
  apiBaseUrl?: string;
}

export class MCPServer {
  private app: Express;
  private port: number;
  private manifest: MCPManifest;
  private queryMatcher: QueryMatcher;
  private apiBaseUrl: string;

  constructor(options: MCPServerOptions) {
    this.app = express();
    this.port = options.port;
    this.manifest = options.manifest;
    this.queryMatcher = new QueryMatcher(options.manifest, options.openaiApiKey);
    this.apiBaseUrl = options.apiBaseUrl || 'http://localhost:8000';

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
        const targetUrl = this.getTargetUrl() + targetPath;
        
        Logger.info(`Proxying ${req.method} request to: ${targetUrl}`);
        
        // Prepare headers (exclude host and other problematic headers)
        const headers: Record<string, string> = {};
        Object.keys(req.headers).forEach(key => {
          if (!['host', 'content-length', 'connection'].includes(key.toLowerCase())) {
            headers[key] = req.headers[key] as string;
          }
        });
        
        // Make the actual API call
        const response = await fetch(targetUrl, {
          method: req.method,
          headers,
          body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
        });
        
        const responseData = await response.text();
        let jsonData;
        
        try {
          jsonData = JSON.parse(responseData);
        } catch {
          jsonData = responseData;
        }
        
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
        console.log('\n🚀 MCPHy running at http://localhost:' + this.port);
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
      apiBaseUrl: config.apiBaseUrl
    });
    await server.start();

    return server;
  } catch (error) {
    Logger.error('Failed to start server from config', error as Error);
    throw error;
  }
}
