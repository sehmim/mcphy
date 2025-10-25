/**
 * Generates MCP manifest from API specification
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { Logger } from '../utils/logger';

export interface MCPManifest {
  version: string;
  name: string;
  description: string;
  endpoints: MCPEndpoint[];
}

export interface MCPEndpoint {
  path: string;
  method: string;
  description?: string;
  parameters?: MCPParameter[];
  response?: any;
}

export interface MCPParameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  location: 'query' | 'path' | 'body' | 'header';
}

export class ManifestGenerator {
  /**
   * Generate MCP manifest from parsed API specification
   */
  static async generateFromSwagger(apiSpec: any): Promise<MCPManifest> {
    const manifest: MCPManifest = {
      version: '1.0.0',
      name: apiSpec.info?.title || 'API Server',
      description: apiSpec.info?.description || 'MCP-enabled API Server',
      endpoints: [],
    };

    // Parse paths from OpenAPI/Swagger spec
    if (apiSpec.paths) {
      for (const [pathName, pathItem] of Object.entries(apiSpec.paths)) {
        for (const [method, operation] of Object.entries(pathItem as any)) {
          if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
            manifest.endpoints.push(this.parseEndpoint(pathName, method, operation));
          }
        }
      }
    }

    return manifest;
  }

  /**
   * Generate MCP manifest from parsed Postman collection
   */
  static async generateFromPostman(apiSpec: any): Promise<MCPManifest> {
    const manifest: MCPManifest = {
      version: '1.0.0',
      name: apiSpec.info?.title || 'API Server',
      description: apiSpec.info?.description || 'MCP-enabled API Server',
      endpoints: [],
    };

    // Parse paths from Postman collection (same structure as OpenAPI after parsing)
    if (apiSpec.paths) {
      for (const [pathName, pathItem] of Object.entries(apiSpec.paths)) {
        for (const [method, operation] of Object.entries(pathItem as any)) {
          if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
            manifest.endpoints.push(this.parseEndpoint(pathName, method, operation));
          }
        }
      }
    }

    return manifest;
  }

  /**
   * Parse individual endpoint from OpenAPI operation
   */
  private static parseEndpoint(path: string, method: string, operation: any): MCPEndpoint {
    const endpoint: MCPEndpoint = {
      path,
      method: method.toUpperCase(),
      description: operation.summary || operation.description,
      parameters: [],
    };

    // Parse parameters
    if (operation.parameters) {
      endpoint.parameters = operation.parameters.map((param: any) => ({
        name: param.name,
        type: param.schema?.type || 'string',
        required: param.required || false,
        description: param.description,
        location: param.in as 'query' | 'path' | 'body' | 'header',
      }));
    }

    return endpoint;
  }

  /**
   * Save manifest to file
   */
  static async saveManifest(manifest: MCPManifest, outputPath: string): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeJSON(outputPath, manifest, { spaces: 2 });
      Logger.success(`Manifest saved to ${outputPath}`);
    } catch (error) {
      Logger.error('Failed to save manifest', error as Error);
      throw error;
    }
  }

  /**
   * Load manifest template
   */
  static async loadTemplate(templatePath: string): Promise<any> {
    try {
      return await fs.readJSON(templatePath);
    } catch (error) {
      Logger.warn(`Could not load template from ${templatePath}, using default`);
      return null;
    }
  }
}
