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
  requestBody?: MCPRequestBody;
  response?: any;
}

export interface MCPRequestBody {
  required?: boolean;
  schema?: any;
  properties?: Record<string, MCPRequestBodyProperty>;
  requiredFields?: string[];
}

export interface MCPRequestBodyProperty {
  type: string;
  description?: string;
  required?: boolean;
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
      endpoint.parameters = operation.parameters.map((param: any) => {
        // Infer type if missing from spec
        const inferredType = param.schema?.type || this.inferTypeFromName(param.name, param);

        return {
          name: param.name,
          type: inferredType,
          required: param.required || false,
          description: param.description,
          location: param.in as 'query' | 'path' | 'body' | 'header',
        };
      });
    }

    // Parse request body schema (OpenAPI 3.x)
    if (operation.requestBody) {
      const requestBody = operation.requestBody;
      const content = requestBody.content?.['application/json'] || requestBody.content?.['*/*'];

      if (content?.schema) {
        const schema = content.schema;
        const properties: Record<string, MCPRequestBodyProperty> = {};

        // Extract properties from schema
        if (schema.properties) {
          Object.keys(schema.properties).forEach(propName => {
            const prop = schema.properties[propName];

            // Infer type from field name if not specified in spec
            const inferredType = prop.type || this.inferTypeFromName(propName, prop);

            properties[propName] = {
              type: inferredType,
              description: prop.description,
              required: schema.required?.includes(propName) || false,
            };
          });
        }

        endpoint.requestBody = {
          required: requestBody.required || false,
          schema: schema,
          properties: properties,
          requiredFields: schema.required || [],
        };
      }
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

  /**
   * Infer type from field name when type is missing from API spec
   * This is a smart fallback for incomplete documentation
   */
  private static inferTypeFromName(fieldName: string, prop: any): string {
    const nameLower = fieldName.toLowerCase();

    // Check for common ID patterns (usually integers)
    if (nameLower.endsWith('_id') || nameLower === 'id' || nameLower.startsWith('id_')) {
      Logger.warn(`Type missing for "${fieldName}", inferring as integer (ID field)`);
      return 'integer';
    }

    // Check for count/quantity patterns (integers)
    if (nameLower.includes('count') || nameLower.includes('quantity') ||
        nameLower.includes('number') || nameLower.includes('amount')) {
      Logger.warn(`Type missing for "${fieldName}", inferring as integer (count/quantity)`);
      return 'integer';
    }

    // Check for price/cost patterns (numbers/floats)
    if (nameLower.includes('price') || nameLower.includes('cost') ||
        nameLower.includes('rate') || nameLower.includes('fee')) {
      Logger.warn(`Type missing for "${fieldName}", inferring as number (price/cost)`);
      return 'number';
    }

    // Check for boolean patterns
    if (nameLower.startsWith('is_') || nameLower.startsWith('has_') ||
        nameLower.startsWith('can_') || nameLower.startsWith('should_') ||
        nameLower.includes('enabled') || nameLower.includes('active')) {
      Logger.warn(`Type missing for "${fieldName}", inferring as boolean (is_/has_ prefix)`);
      return 'boolean';
    }

    // Check for date patterns
    if (nameLower.includes('date') && !nameLower.includes('update') && !nameLower.includes('time')) {
      Logger.warn(`Type missing for "${fieldName}", inferring as string (date field)`);
      return 'string'; // Date fields are strings in JSON
    }

    // Check for timestamp/datetime patterns
    if (nameLower.includes('timestamp') || nameLower.includes('datetime') ||
        (nameLower.includes('created') && nameLower.includes('at')) ||
        (nameLower.includes('updated') && nameLower.includes('at'))) {
      Logger.warn(`Type missing for "${fieldName}", inferring as string (timestamp field)`);
      return 'string';
    }

    // Check for email patterns
    if (nameLower.includes('email')) {
      Logger.warn(`Type missing for "${fieldName}", inferring as string (email field)`);
      return 'string';
    }

    // Check for array patterns
    if (nameLower.endsWith('s') || nameLower.includes('list') || nameLower.includes('array')) {
      // Check if description mentions array
      if (prop.description?.toLowerCase().includes('array') ||
          prop.description?.toLowerCase().includes('list')) {
        Logger.warn(`Type missing for "${fieldName}", inferring as array`);
        return 'array';
      }
    }

    // Default to string with warning
    Logger.warn(`Type missing for "${fieldName}", defaulting to string. Consider updating your API spec for better accuracy.`);
    return 'string';
  }
}
