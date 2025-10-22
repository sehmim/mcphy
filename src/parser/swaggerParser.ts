/**
 * Parser for Swagger/OpenAPI specification files
 */

import SwaggerParser from 'swagger-parser';
import * as fs from 'fs-extra';
import * as path from 'path';
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
  /**
   * Parse a Swagger/OpenAPI file
   */
  static async parse(filePath: string): Promise<ParsedAPI> {
    try {
      Logger.info(`Parsing API specification from ${filePath}`);

      const api = await (SwaggerParser as any).validate(filePath);

      Logger.success(`Successfully parsed ${api.info?.title || 'API'} v${api.info?.version || 'unknown'}`);

      return api as ParsedAPI;
    } catch (error) {
      Logger.error('Failed to parse API specification', error as Error);
      throw error;
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
