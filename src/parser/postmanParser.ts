/**
 * Parser for Postman collections with LLM-powered understanding
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import OpenAI from 'openai';
import { Logger } from '../utils/logger';

export interface PostmanCollection {
  info: {
    name: string;
    description?: string;
    schema: string;
  };
  item: PostmanItem[];
  variable?: PostmanVariable[];
}

export interface PostmanItem {
  name: string;
  request?: PostmanRequest;
  item?: PostmanItem[]; // For folders
  description?: string;
}

export interface PostmanRequest {
  method: string;
  header?: Array<{ key: string; value: string; type?: string }>;
  url: PostmanUrl | string;
  body?: PostmanBody;
  description?: string;
}

export interface PostmanUrl {
  raw?: string;
  protocol?: string;
  host?: string[];
  path?: string[];
  query?: Array<{ key: string; value: string; description?: string }>;
  variable?: Array<{ key: string; value: string; description?: string }>;
}

export interface PostmanBody {
  mode?: 'raw' | 'urlencoded' | 'formdata' | 'file' | 'graphql';
  raw?: string;
  urlencoded?: Array<{ key: string; value: string; type?: string }>;
  formdata?: Array<{ key: string; value: string; type?: string }>;
}

export interface PostmanVariable {
  key: string;
  value: string;
  type?: string;
}

export interface ParsedPostmanAPI {
  info: {
    title: string;
    description?: string;
    version: string;
  };
  baseUrl?: string;
  variables?: Record<string, string>;
  paths: Record<string, any>;
  components?: any;
}

export class PostmanParser {
  private static openai: OpenAI | null = null;

  /**
   * Initialize OpenAI client if API key is available
   */
  private static initOpenAI(apiKey?: string): void {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (key && key.startsWith('sk-')) {
      this.openai = new OpenAI({ apiKey: key });
      Logger.info('OpenAI enabled for enhanced Postman parsing');
    } else {
      this.openai = null;
      Logger.info('Using basic Postman parsing (no OpenAI key)');
    }
  }

  /**
   * Check if we can use LLM enhancement
   */
  private static canUseLLM(): boolean {
    return this.openai !== null;
  }

  /**
   * Parse a Postman collection file
   */
  static async parse(filePath: string, openaiApiKey?: string): Promise<ParsedPostmanAPI> {
    try {
      Logger.info(`Parsing Postman collection from ${filePath}`);

      // Initialize OpenAI if key provided
      this.initOpenAI(openaiApiKey);

      // Read and validate collection
      const collection = await this.readCollection(filePath);
      
      // Extract base information
      const parsedAPI: ParsedPostmanAPI = {
        info: {
          title: collection.info.name || 'Postman API',
          description: collection.info.description || '',
          version: '1.0.0',
        },
        variables: this.extractVariables(collection),
        paths: {},
      };

      // Extract base URL
      parsedAPI.baseUrl = await this.extractBaseUrl(collection);

      // Parse all requests
      await this.parseItems(collection.item, parsedAPI, []);

      // Enhance with LLM if available, otherwise use basic enhancement
      if (this.canUseLLM()) {
        await this.enhanceWithLLM(parsedAPI, collection);
      } else {
        await this.enhanceWithBasicPatterns(parsedAPI);
      }

      Logger.success(`Successfully parsed Postman collection: ${parsedAPI.info.title}`);
      return parsedAPI;
    } catch (error) {
      Logger.error('Failed to parse Postman collection', error as Error);
      throw error;
    }
  }

  /**
   * Read and validate Postman collection file
   */
  private static async readCollection(filePath: string): Promise<PostmanCollection> {
    const content = await fs.readFile(filePath, 'utf-8');
    const collection = JSON.parse(content);

    // Validate it's a Postman collection
    if (!collection.info || !collection.item) {
      throw new Error('Invalid Postman collection format: missing info or item fields');
    }

    return collection;
  }

  /**
   * Extract variables from collection
   */
  private static extractVariables(collection: PostmanCollection): Record<string, string> {
    const variables: Record<string, string> = {};
    
    if (collection.variable) {
      for (const variable of collection.variable) {
        variables[variable.key] = variable.value;
      }
    }

    return variables;
  }

  /**
   * Extract base URL from collection
   */
  private static async extractBaseUrl(collection: PostmanCollection): Promise<string | undefined> {
    // Check collection variables first
    if (collection.variable) {
      const baseUrlVar = collection.variable.find(v => 
        v.key.toLowerCase().includes('baseurl') || 
        v.key.toLowerCase().includes('base_url') ||
        v.key.toLowerCase().includes('url')
      );
      if (baseUrlVar) {
        return baseUrlVar.value;
      }
    }

    // Try to extract from first request
    const firstRequest = this.findFirstRequest(collection.item);
    if (firstRequest?.request?.url) {
      const url = typeof firstRequest.request.url === 'string' 
        ? firstRequest.request.url 
        : firstRequest.request.url.raw || '';
      
      try {
        const urlObj = new URL(url.replace(/{{.*?}}/g, 'localhost'));
        return `${urlObj.protocol}//${urlObj.host}`;
      } catch {
        // Invalid URL, will return undefined
      }
    }

    return undefined;
  }

  /**
   * Find first request in collection (recursively)
   */
  private static findFirstRequest(items: PostmanItem[]): PostmanItem | null {
    for (const item of items) {
      if (item.request) {
        return item;
      }
      if (item.item) {
        const found = this.findFirstRequest(item.item);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Parse collection items recursively
   */
  private static async parseItems(
    items: PostmanItem[], 
    parsedAPI: ParsedPostmanAPI, 
    pathPrefix: string[]
  ): Promise<void> {
    for (const item of items) {
      if (item.request) {
        // It's a request
        await this.parseRequest(item, parsedAPI, pathPrefix);
      } else if (item.item) {
        // It's a folder, recurse
        await this.parseItems(item.item, parsedAPI, [...pathPrefix, item.name]);
      }
    }
  }

  /**
   * Parse individual request
   */
  private static async parseRequest(
    item: PostmanItem,
    parsedAPI: ParsedPostmanAPI,
    pathPrefix: string[]
  ): Promise<void> {
    const request = item.request!;
    const method = request.method.toLowerCase();
    
    // Parse URL
    const urlInfo = this.parseUrl(request.url);
    const path = urlInfo.path;

    // Initialize path in paths object
    if (!parsedAPI.paths[path]) {
      parsedAPI.paths[path] = {};
    }

    // Build operation object
    const operation: any = {
      summary: item.name,
      description: item.description || request.description || '',
      tags: pathPrefix.length > 0 ? pathPrefix : undefined,
      parameters: [],
    };

    // Parse query parameters
    if (urlInfo.query) {
      for (const param of urlInfo.query) {
        operation.parameters.push({
          name: param.key,
          in: 'query',
          required: false,
          description: param.description || '',
          schema: { type: this.inferType(param.value) },
        });
      }
    }

    // Parse path parameters
    if (urlInfo.pathParams) {
      for (const param of urlInfo.pathParams) {
        operation.parameters.push({
          name: param,
          in: 'path',
          required: true,
          schema: { type: 'string' },
        });
      }
    }

    // Parse headers
    if (request.header) {
      for (const header of request.header) {
        if (!['authorization', 'content-type'].includes(header.key.toLowerCase())) {
          operation.parameters.push({
            name: header.key,
            in: 'header',
            required: false,
            schema: { type: 'string' },
          });
        }
      }
    }

    // Parse body
    if (request.body && ['post', 'put', 'patch'].includes(method)) {
      operation.requestBody = this.parseBody(request.body);
    }

    // Add response placeholder
    operation.responses = {
      '200': {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: { type: 'object' }
          }
        }
      }
    };

    parsedAPI.paths[path][method] = operation;
  }

  /**
   * Parse URL from Postman format
   */
  private static parseUrl(url: PostmanUrl | string): {
    path: string;
    query?: Array<{ key: string; value: string; description?: string }>;
    pathParams?: string[];
  } {
    let rawUrl = '';
    let query: Array<{ key: string; value: string; description?: string }> | undefined;
    
    if (typeof url === 'string') {
      rawUrl = url;
    } else {
      rawUrl = url.raw || '';
      query = url.query;
      
      // Build path from segments
      if (url.path) {
        rawUrl = '/' + url.path.join('/');
      }
    }

    // Extract path (remove base URL and query string)
    let path = rawUrl.split('?')[0];
    
    // Remove protocol and host
    path = path.replace(/^https?:\/\/[^\/]+/, '');
    
    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    // Replace {{variables}} with {variables} for OpenAPI format
    const pathParams: string[] = [];
    path = path.replace(/{{([^}]+)}}/g, (match, param) => {
      pathParams.push(param);
      return `{${param}}`;
    });

    // Also handle :param format
    path = path.replace(/:([a-zA-Z0-9_]+)/g, (match, param) => {
      pathParams.push(param);
      return `{${param}}`;
    });

    return { path, query, pathParams: pathParams.length > 0 ? pathParams : undefined };
  }

  /**
   * Parse request body
   */
  private static parseBody(body: PostmanBody): any {
    const requestBody: any = {
      required: true,
      content: {},
    };

    if (body.mode === 'raw' && body.raw) {
      // Try to parse as JSON
      try {
        const jsonBody = JSON.parse(body.raw);
        requestBody.content['application/json'] = {
          schema: this.inferSchemaFromObject(jsonBody),
        };
      } catch {
        // Not JSON, treat as text
        requestBody.content['text/plain'] = {
          schema: { type: 'string' },
        };
      }
    } else if (body.mode === 'urlencoded' && body.urlencoded) {
      requestBody.content['application/x-www-form-urlencoded'] = {
        schema: {
          type: 'object',
          properties: body.urlencoded.reduce((acc, param) => {
            acc[param.key] = { type: this.inferType(param.value) };
            return acc;
          }, {} as any),
        },
      };
    } else if (body.mode === 'formdata' && body.formdata) {
      requestBody.content['multipart/form-data'] = {
        schema: {
          type: 'object',
          properties: body.formdata.reduce((acc, param) => {
            acc[param.key] = { type: this.inferType(param.value) };
            return acc;
          }, {} as any),
        },
      };
    }

    return requestBody;
  }

  /**
   * Infer type from value
   */
  private static inferType(value: any): string {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value !== null) return 'object';
    return 'string';
  }

  /**
   * Infer schema from object
   */
  private static inferSchemaFromObject(obj: any): any {
    if (Array.isArray(obj)) {
      return {
        type: 'array',
        items: obj.length > 0 ? this.inferSchemaFromObject(obj[0]) : { type: 'object' },
      };
    }

    if (typeof obj === 'object' && obj !== null) {
      const properties: any = {};
      for (const [key, value] of Object.entries(obj)) {
        properties[key] = this.inferSchemaFromObject(value);
      }
      return {
        type: 'object',
        properties,
      };
    }

    return { type: this.inferType(obj) };
  }

  /**
   * Enhance API with basic pattern matching (no LLM required)
   */
  private static async enhanceWithBasicPatterns(parsedAPI: ParsedPostmanAPI): Promise<void> {
    Logger.info('Applying basic pattern-based enhancements...');
    
    // Enhance API description if missing or too short
    if (!parsedAPI.info.description || parsedAPI.info.description.length < 50) {
      const endpointCount = Object.keys(parsedAPI.paths || {}).length;
      parsedAPI.info.description = `A RESTful API service providing ${endpointCount} endpoints for ${parsedAPI.info.title.toLowerCase()}.`;
    }

    // Enhance endpoint descriptions based on patterns
    for (const [path, methods] of Object.entries(parsedAPI.paths || {})) {
      for (const [method, operation] of Object.entries(methods as any)) {
        if (operation && typeof operation === 'object') {
          const op = operation as any;
          // Enhance summary if missing or too short
          if (!op.summary || op.summary.length < 10) {
            op.summary = this.generateSummaryFromPath(path, method);
          }

          // Enhance description if missing or too short
          if (!op.description || op.description.length < 20) {
            op.description = this.generateDescriptionFromPath(path, method, op.summary);
          }

          // Add usage example
          if (!op['x-usage-example']) {
            op['x-usage-example'] = this.generateUsageExample(path, method);
          }

          // Enhance parameter descriptions
          if (op.parameters) {
            op.parameters.forEach((param: any) => {
              if (!param.description || param.description.length < 10) {
                param.description = this.generateParameterDescription(param.name, param.in, path);
              }
            });
          }
        }
      }
    }

    Logger.success('Basic pattern enhancement completed');
  }

  /**
   * Generate summary from path and method
   */
  private static generateSummaryFromPath(path: string, method: string): string {
    const methodUpper = method.toUpperCase();
    const pathParts = path.split('/').filter(p => p && !p.startsWith('{'));
    const resource = pathParts[pathParts.length - 1] || 'resource';
    
    const actionMap: Record<string, string> = {
      'GET': `Get ${resource}`,
      'POST': `Create ${resource}`,
      'PUT': `Update ${resource}`,
      'PATCH': `Modify ${resource}`,
      'DELETE': `Delete ${resource}`
    };

    return actionMap[methodUpper] || `${methodUpper} ${resource}`;
  }

  /**
   * Generate description from path and method
   */
  private static generateDescriptionFromPath(path: string, method: string, summary: string): string {
    const methodUpper = method.toUpperCase();
    const pathParts = path.split('/').filter(p => p && !p.startsWith('{'));
    const resource = pathParts[pathParts.length - 1] || 'resource';
    
    const descriptions: Record<string, string> = {
      'GET': `Retrieve ${resource} information. ${path.includes('{') ? 'Requires a valid ID parameter.' : 'Returns a list of items.'}`,
      'POST': `Create a new ${resource}. Provide the required data in the request body.`,
      'PUT': `Update an existing ${resource}. Provide the complete updated data in the request body.`,
      'PATCH': `Partially update an existing ${resource}. Provide only the fields you want to change.`,
      'DELETE': `Remove an existing ${resource}. This action cannot be undone.`
    };

    return descriptions[methodUpper] || `Perform ${methodUpper} operation on ${resource}.`;
  }

  /**
   * Generate usage example
   */
  private static generateUsageExample(path: string, method: string): string {
    const methodUpper = method.toUpperCase();
    const pathParts = path.split('/').filter(p => p && !p.startsWith('{'));
    const resource = pathParts[pathParts.length - 1] || 'resource';
    
    if (methodUpper === 'GET') {
      return `Use this endpoint to retrieve ${resource} data. ${path.includes('{') ? 'Include the ID in the URL path.' : 'Add query parameters to filter results.'}`;
    } else if (['POST', 'PUT', 'PATCH'].includes(methodUpper)) {
      return `Send a ${methodUpper} request with the ${resource} data in the request body.`;
    } else if (methodUpper === 'DELETE') {
      return `Send a DELETE request to remove the ${resource}. Include the ID in the URL path.`;
    }
    
    return `Use this endpoint to interact with ${resource} data.`;
  }

  /**
   * Generate parameter description
   */
  private static generateParameterDescription(name: string, location: string, path: string): string {
    const locationMap: Record<string, string> = {
      'path': `The ${name} parameter in the URL path`,
      'query': `Query parameter: ${name}`,
      'header': `Header parameter: ${name}`,
      'body': `Request body field: ${name}`
    };

    return locationMap[location] || `Parameter: ${name}`;
  }

  /**
   * Enhance parsed API with LLM understanding
   */
  private static async enhanceWithLLM(
    parsedAPI: ParsedPostmanAPI,
    collection: PostmanCollection
  ): Promise<void> {
    if (!this.canUseLLM()) return;

    try {
      Logger.info('Enhancing API understanding with LLM...');

      const prompt = this.buildEnhancementPrompt(parsedAPI, collection);
      
      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an API documentation expert. Analyze the Postman collection and provide enhanced descriptions, parameter details, and infer missing information. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const enhancement = JSON.parse(response.choices[0].message.content || '{}');
      this.applyEnhancements(parsedAPI, enhancement);

      Logger.success('LLM enhancement completed');
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('404') && err.message.includes('gpt-4')) {
        console.log('\n⚠️  LLM Enhancement Failed!');
        console.log('┌─────────────────────────────────────────────────────────┐');
        console.log('│ 🚨 OpenAI API Error: Model access issue                │');
        console.log('│ 💡 Check your API key has access to gpt-4o-mini        │');
        console.log('│ 🔧 Check: https://platform.openai.com/api-keys         │');
        console.log('│ 💳 Ensure billing is set up properly                   │');
        console.log('└─────────────────────────────────────────────────────────┘');
        console.log('\n📝 Continuing with basic parsing (no enhancement)...\n');
      } else {
        console.log('\n⚠️  LLM Enhancement Failed!');
        console.log('┌─────────────────────────────────────────────────────────┐');
        console.log('│ 🚨 Error: ' + err.message.padEnd(44) + ' │');
        console.log('└─────────────────────────────────────────────────────────┘');
        console.log('\n📝 Continuing with basic parsing (no enhancement)...\n');
      }
    }
  }

  /**
   * Build prompt for LLM enhancement
   */
  private static buildEnhancementPrompt(
    parsedAPI: ParsedPostmanAPI,
    collection: PostmanCollection
  ): string {
    return `Analyze this Postman collection and enhance it with better descriptions and inferred information:

Collection Name: ${collection.info.name}
Description: ${collection.info.description || 'None'}

Endpoints: ${Object.keys(parsedAPI.paths).length}
Paths: ${JSON.stringify(Object.keys(parsedAPI.paths), null, 2)}

Sample endpoint details:
${JSON.stringify(Object.entries(parsedAPI.paths).slice(0, 3), null, 2)}

Please provide:
1. Enhanced API description
2. Better endpoint descriptions based on their names and paths
3. Inferred parameter types and descriptions
4. Common patterns or groupings in the API

Return as JSON:
{
  "apiDescription": "...",
  "endpoints": {
    "/path": {
      "method": {
        "description": "...",
        "parameters": [{"name": "...", "description": "..."}]
      }
    }
  }
}`;
  }

  /**
   * Apply LLM enhancements to parsed API
   */
  private static applyEnhancements(parsedAPI: ParsedPostmanAPI, enhancement: any): void {
    if (enhancement.apiDescription) {
      parsedAPI.info.description = enhancement.apiDescription;
    }

    if (enhancement.endpoints) {
      for (const [path, methods] of Object.entries(enhancement.endpoints)) {
        if (parsedAPI.paths[path]) {
          for (const [method, details] of Object.entries(methods as any)) {
            const detailsObj = details as any;
            if (parsedAPI.paths[path][method]) {
              const operation = parsedAPI.paths[path][method];
              
              if (detailsObj.description) {
                operation.description = detailsObj.description;
              }

              if (detailsObj.parameters && operation.parameters) {
                // Enhance parameter descriptions
                for (const enhancedParam of detailsObj.parameters) {
                  const param = operation.parameters.find((p: any) => p.name === enhancedParam.name);
                  if (param && enhancedParam.description) {
                    param.description = enhancedParam.description;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Detect Postman collection files in a directory
   */
  static async detectCollectionFiles(directory: string = process.cwd()): Promise<string[]> {
    const possibleFiles = [
      'postman_collection.json',
      'collection.json',
      'postman.json',
    ];

    const foundFiles: string[] = [];

    // Check specific filenames
    for (const file of possibleFiles) {
      const filePath = path.join(directory, file);
      if (await fs.pathExists(filePath)) {
        foundFiles.push(filePath);
      }
    }

    // Also check for any .json files that might be Postman collections
    try {
      const files = await fs.readdir(directory);
      for (const file of files) {
        if (file.endsWith('.json') && !possibleFiles.includes(file)) {
          const filePath = path.join(directory, file);
          if (await this.isPostmanCollection(filePath)) {
            foundFiles.push(filePath);
          }
        }
      }
    } catch (error) {
      // Directory read error, skip
    }

    return foundFiles;
  }

  /**
   * Check if a file is a Postman collection
   */
  private static async isPostmanCollection(filePath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const json = JSON.parse(content);
      
      // Check for Postman collection structure
      return (
        json.info &&
        json.item &&
        (json.info.schema?.includes('postman') || json.info._postman_id)
      );
    } catch {
      return false;
    }
  }

  /**
   * Get API summary
   */
  static getAPISummary(api: ParsedPostmanAPI): string {
    const endpointCount = Object.keys(api.paths || {}).length;
    const methods = new Set<string>();

    for (const pathItem of Object.values(api.paths || {})) {
      for (const method of Object.keys(pathItem as object)) {
        methods.add(method.toUpperCase());
      }
    }

    return `
API: ${api.info.title}
Version: ${api.info.version}
Base URL: ${api.baseUrl || 'Not specified'}
Endpoints: ${endpointCount}
Methods: ${Array.from(methods).join(', ')}
    `.trim();
  }

  /**
   * Validate if a file is a valid Postman collection
   */
  static async isValidCollection(filePath: string): Promise<boolean> {
    try {
      await this.readCollection(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
