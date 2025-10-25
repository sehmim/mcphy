/**
 * Parser for Swagger/OpenAPI specification files with LLM-powered enhancement
 */

import SwaggerParser from 'swagger-parser';
import * as fs from 'fs-extra';
import * as path from 'path';
import OpenAI from 'openai';
import { Logger } from '../utils/logger';

export interface ParsedAPI {
  info: {
    title: string;
    description?: string;
    version: string;
  };
  servers?: Array<{ url: string; description?: string }>;
  paths: any;
  components?: any;
}

export class SwaggerAPIParser {
  private static openai: OpenAI | null = null;

  /**
   * Initialize OpenAI client if API key is available
   */
  private static initOpenAI(apiKey?: string): void {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (key && key.startsWith('sk-')) {
      this.openai = new OpenAI({ apiKey: key });
      Logger.info('OpenAI enabled for enhanced API parsing');
    } else {
      this.openai = null;
      Logger.info('Using basic API parsing (no OpenAI key)');
    }
  }

  /**
   * Check if we can use LLM enhancement
   */
  private static canUseLLM(): boolean {
    return this.openai !== null;
  }

  /**
   * Parse a Swagger/OpenAPI file with optional LLM enhancement
   */
  static async parse(filePath: string, openaiApiKey?: string): Promise<ParsedAPI> {
    try {
      Logger.info(`Parsing API specification from ${filePath}`);

      // Initialize OpenAI if key provided
      this.initOpenAI(openaiApiKey);

      const api = await (SwaggerParser as any).validate(filePath);

      Logger.success(`Successfully parsed ${api.info?.title || 'API'} v${api.info?.version || 'unknown'}`);

      // Enhance with LLM if available, otherwise use basic enhancement
      if (this.canUseLLM()) {
        await this.enhanceWithLLM(api);
      } else {
        await this.enhanceWithBasicPatterns(api);
      }

      return api as ParsedAPI;
    } catch (error) {
      const err = error as Error;
      Logger.error('Failed to parse API specification', err);
      
      // Provide more helpful error context
      if (err.message.includes('YAML') || err.message.includes('JSON')) {
        console.log('\n💡 Syntax error detected. Check:');
        console.log('   • YAML: https://www.yamllint.com/');
        console.log('   • JSON: https://jsonlint.com/');
      } else if (err.message.includes('$ref')) {
        console.log('\n💡 Reference error. Ensure all $ref paths are valid.');
      } else if (err.message.includes('Missing required')) {
        console.log('\n💡 Missing required fields. Check OpenAPI spec structure.');
      }
      
      throw error;
    }
  }

  /**
   * Enhance parsed API with LLM understanding
   */
  private static async enhanceWithLLM(api: ParsedAPI): Promise<void> {
    if (!this.canUseLLM()) return;

    try {
      Logger.info('Enhancing API understanding with LLM...');

      const prompt = this.buildEnhancementPrompt(api);
      
      const response = await this.openai!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an API documentation expert. Analyze the OpenAPI/Swagger specification and provide enhanced descriptions, better parameter documentation, usage examples, and infer missing information. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2500,
      });

      const enhancement = JSON.parse(response.choices[0].message.content || '{}');
      this.applyEnhancements(api, enhancement);

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
  private static buildEnhancementPrompt(api: ParsedAPI): string {
    const endpointSample = Object.entries(api.paths || {}).slice(0, 3).map(([path, methods]) => {
      return {
        path,
        methods: Object.keys(methods as object).filter(m => ['get', 'post', 'put', 'delete', 'patch'].includes(m))
      };
    });

    return `Analyze this OpenAPI/Swagger specification and enhance it with better descriptions:

API Name: ${api.info.title}
Description: ${api.info.description || 'None provided'}
Version: ${api.info.version}

Total Endpoints: ${Object.keys(api.paths || {}).length}

Sample Endpoints:
${JSON.stringify(endpointSample, null, 2)}

Sample endpoint details:
${JSON.stringify(Object.entries(api.paths || {}).slice(0, 2).map(([path, methods]) => {
  const firstMethod = Object.keys(methods as object).find(m => ['get', 'post', 'put', 'delete', 'patch'].includes(m));
  return firstMethod ? { path, method: firstMethod, operation: (methods as any)[firstMethod] } : null;
}).filter(Boolean), null, 2)}

Please provide:
1. Enhanced API description that's more user-friendly
2. Better endpoint descriptions based on paths and operations
3. Improved parameter descriptions with context
4. Usage examples for key endpoints
5. Common workflows or patterns in the API

Return as JSON:
{
  "apiDescription": "Enhanced description...",
  "endpoints": {
    "/path": {
      "method": {
        "description": "Better description...",
        "summary": "Clear summary...",
        "usageExample": "How to use this endpoint...",
        "parameters": [{"name": "...", "description": "..."}]
      }
    }
  }
}`;
  }

  /**
   * Enhance API with basic pattern matching (no LLM required)
   */
  private static async enhanceWithBasicPatterns(api: ParsedAPI): Promise<void> {
    Logger.info('Applying basic pattern-based enhancements...');
    
    // Enhance API description if missing or too short
    if (!api.info.description || api.info.description.length < 50) {
      api.info.description = `A RESTful API service providing ${Object.keys(api.paths || {}).length} endpoints for ${api.info.title.toLowerCase()}.`;
    }

    // Enhance endpoint descriptions based on patterns
    for (const [path, methods] of Object.entries(api.paths || {})) {
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
   * Apply LLM enhancements to parsed API
   */
  private static applyEnhancements(api: ParsedAPI, enhancement: any): void {
    // Enhance API description
    if (enhancement.apiDescription && (!api.info.description || api.info.description.length < 50)) {
      api.info.description = enhancement.apiDescription;
    }

    // Enhance endpoints
    if (enhancement.endpoints) {
      for (const [path, methods] of Object.entries(enhancement.endpoints)) {
        if (api.paths[path]) {
          for (const [method, details] of Object.entries(methods as any)) {
            const detailsObj = details as any;
            if (api.paths[path][method]) {
              const operation = api.paths[path][method];
              
              // Enhance description if missing or too short
              if (detailsObj.description && (!operation.description || operation.description.length < 20)) {
                operation.description = detailsObj.description;
              }

              // Enhance summary
              if (detailsObj.summary && (!operation.summary || operation.summary.length < 10)) {
                operation.summary = detailsObj.summary;
              }

              // Add usage example as x-extension
              if (detailsObj.usageExample) {
                operation['x-usage-example'] = detailsObj.usageExample;
              }

              // Enhance parameter descriptions
              if (detailsObj.parameters && operation.parameters) {
                for (const enhancedParam of detailsObj.parameters) {
                  const param = operation.parameters.find((p: any) => p.name === enhancedParam.name);
                  if (param && enhancedParam.description && (!param.description || param.description.length < 10)) {
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
   * Detect Swagger/OpenAPI files in a directory
   */
  static async detectAPIFiles(directory: string = process.cwd()): Promise<string[]> {
    const possibleFiles = [
      'swagger.json',
      'swagger.yaml',
      'swagger.yml',
      'openapi.json',
      'openapi.yaml',
      'openapi.yml',
      'api.json',
      'api.yaml',
      'api.yml',
      'postman.json',
    ];

    const foundFiles: string[] = [];

    for (const file of possibleFiles) {
      const filePath = path.join(directory, file);
      if (await fs.pathExists(filePath)) {
        foundFiles.push(filePath);
      }
    }

    return foundFiles;
  }

  /**
   * Validate if a file is a valid OpenAPI spec
   */
  static async isValidSpec(filePath: string): Promise<boolean> {
    try {
      await (SwaggerParser as any).validate(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get API summary information
   */
  static getAPISummary(api: ParsedAPI): string {
    const endpointCount = Object.keys(api.paths || {}).length;
    const methods = new Set<string>();

    for (const pathItem of Object.values(api.paths || {})) {
      for (const method of Object.keys(pathItem as object)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          methods.add(method.toUpperCase());
        }
      }
    }

    return `
API: ${api.info.title}
Version: ${api.info.version}
Endpoints: ${endpointCount}
Methods: ${Array.from(methods).join(', ')}
    `.trim();
  }
}
