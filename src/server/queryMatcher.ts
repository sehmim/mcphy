/**
 * Natural Language Query Matcher
 * Maps natural language queries to API endpoints using AI
 */

import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { Logger } from '../utils/logger';
import { MCPManifest, MCPEndpoint } from './manifest';

// Load environment variables
dotenv.config();

export interface QueryMatchResult {
  endpoint: string;
  method: string;
  params?: Record<string, any>;
  confidence?: number;
  reasoning?: string;
}

export class QueryMatcher {
  private openai: OpenAI | null = null;
  private manifest: MCPManifest;

  constructor(manifest: MCPManifest, openaiApiKey?: string | null) {
    this.manifest = manifest;

    // Initialize OpenAI client if API key is available
    const apiKey = openaiApiKey || process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
      Logger.info('OpenAI client initialized for AI-powered query matching');
    } else {
      Logger.warn('OpenAI API key not found in config or environment variables');
      Logger.info('Query matching will use fallback logic instead of AI');
    }
  }

  /**
   * Match a natural language query to an API endpoint
   */
  async matchQuery(query: string): Promise<QueryMatchResult> {
    try {
      Logger.info(`Matching query: "${query}"`);

      // Use OpenAI if available, otherwise use fallback
      if (this.openai) {
        return await this.matchWithOpenAI(query);
      } else {
        return this.matchWithFallback(query);
      }
    } catch (error) {
      Logger.error('Failed to match query', error as Error);
      throw error;
    }
  }

  /**
   * Match query using OpenAI GPT-4-mini
   * TODO: Implement OpenAI API call
   */
  private async matchWithOpenAI(query: string): Promise<QueryMatchResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    // Build context from manifest endpoints
    const endpointsContext = this.buildEndpointsContext();

    // TODO: Implement OpenAI API call
    // Example structure:
    // const completion = await this.openai.chat.completions.create({
    //   model: 'gpt-4-mini',
    //   messages: [
    //     {
    //       role: 'system',
    //       content: `You are an API endpoint matcher. Given a natural language query and a list of available API endpoints, identify the best matching endpoint and extract parameters.
    //
    //       Available endpoints:
    //       ${endpointsContext}
    //
    //       Return a JSON object with: endpoint (path), method (HTTP method), params (extracted parameters), confidence (0-1), reasoning (why this endpoint matches).`
    //     },
    //     {
    //       role: 'user',
    //       content: query
    //     }
    //   ],
    //   response_format: { type: 'json_object' },
    //   temperature: 0.3,
    // });

    // For now, return a stub response
    Logger.warn('OpenAI matching not yet implemented, using fallback');
    return this.matchWithFallback(query);
  }

  /**
   * Simple fallback matching without AI
   * Uses keyword matching and basic heuristics
   */
  private matchWithFallback(query: string): QueryMatchResult {
    Logger.info('Using fallback keyword matching');

    const queryLower = query.toLowerCase();

    // Extract potential HTTP method from query
    const methodKeywords: Record<string, string[]> = {
      GET: ['get', 'fetch', 'retrieve', 'list', 'show', 'find', 'search'],
      POST: ['create', 'add', 'post', 'new', 'insert'],
      PUT: ['update', 'modify', 'edit', 'change', 'replace'],
      DELETE: ['delete', 'remove', 'destroy'],
      PATCH: ['patch', 'partial update'],
    };

    let matchedMethod = 'GET'; // Default
    for (const [method, keywords] of Object.entries(methodKeywords)) {
      if (keywords.some((keyword) => queryLower.includes(keyword))) {
        matchedMethod = method;
        break;
      }
    }

    // Try to match endpoint based on keywords in path/description
    let bestMatch: MCPEndpoint | null = null;
    let maxScore = 0;

    for (const endpoint of this.manifest.endpoints) {
      let score = 0;

      // Match method
      if (endpoint.method === matchedMethod) {
        score += 5;
      }

      // Match path keywords
      const pathKeywords = endpoint.path
        .split('/')
        .filter((part) => part && !part.startsWith('{'));

      for (const keyword of pathKeywords) {
        if (queryLower.includes(keyword.toLowerCase())) {
          score += 3;
        }
      }

      // Match description
      if (endpoint.description) {
        const descWords = endpoint.description.toLowerCase().split(/\s+/);
        for (const word of descWords) {
          if (queryLower.includes(word) && word.length > 3) {
            score += 1;
          }
        }
      }

      if (score > maxScore) {
        maxScore = score;
        bestMatch = endpoint;
      }
    }

    // Extract potential parameters from query
    const params = this.extractParametersFromQuery(query, bestMatch);

    if (!bestMatch) {
      // No good match found, return first endpoint as fallback
      bestMatch = this.manifest.endpoints[0];
      Logger.warn('No strong match found, returning first endpoint');
    }

    return {
      endpoint: bestMatch.path,
      method: bestMatch.method,
      params,
      confidence: maxScore / 10, // Normalize to 0-1
      reasoning: `Matched based on keywords (score: ${maxScore})`,
    };
  }

  /**
   * Extract parameters from natural language query
   */
  private extractParametersFromQuery(
    query: string,
    endpoint: MCPEndpoint | null
  ): Record<string, any> {
    const params: Record<string, any> = {};

    if (!endpoint || !endpoint.parameters) {
      return params;
    }

    // Simple extraction for common parameter patterns
    for (const param of endpoint.parameters) {
      // Look for patterns like "limit 10", "offset 5", etc.
      const pattern = new RegExp(`${param.name}[:\\s]+([\\w-]+)`, 'i');
      const match = query.match(pattern);

      if (match) {
        const value = match[1];
        params[param.name] = param.type === 'integer' ? parseInt(value, 10) : value;
      }

      // Look for date patterns
      if (param.type === 'string' && param.name.includes('date')) {
        const datePattern = /(\d{4}-\d{2}-\d{2})/;
        const dateMatch = query.match(datePattern);
        if (dateMatch) {
          params[param.name] = dateMatch[1];
        }
      }
    }

    return params;
  }

  /**
   * Build context string from endpoints for AI prompt
   */
  private buildEndpointsContext(): string {
    return this.manifest.endpoints
      .map((endpoint, idx) => {
        const params =
          endpoint.parameters
            ?.map((p) => `${p.name} (${p.type}, ${p.required ? 'required' : 'optional'})`)
            .join(', ') || 'none';

        return `${idx + 1}. ${endpoint.method} ${endpoint.path}
   Description: ${endpoint.description || 'N/A'}
   Parameters: ${params}`;
      })
      .join('\n\n');
  }

  /**
   * Get all available endpoints
   */
  getEndpoints(): MCPEndpoint[] {
    return this.manifest.endpoints;
  }
}
