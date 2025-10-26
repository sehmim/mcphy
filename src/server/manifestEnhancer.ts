/**
 * LLM-Enhanced Manifest Generator
 * Uses AI to fill gaps and improve API documentation
 */

import OpenAI from 'openai';
import { Logger } from '../utils/logger';
import { MCPManifest, MCPEndpoint, MCPParameter, MCPRequestBody } from './manifest';

export interface EnhancementOptions {
  enabled: boolean;
  model?: string;
  apiKey?: string;
}

export interface ParameterEnhancement {
  name: string;
  inferredType?: string;
  reasoning?: string;
  example?: any;
  enhancedDescription?: string;
  shouldBeRequired?: boolean;
}

export interface EndpointEnhancement {
  parameters: ParameterEnhancement[];
  requestBodyFields?: ParameterEnhancement[];
  usageExample?: string;
  relatedEndpoints?: string[];
}

export class ManifestEnhancer {
  private openai: OpenAI | null = null;
  private model: string = 'gpt-4o-mini';

  constructor(options: EnhancementOptions) {
    if (options.enabled && options.apiKey) {
      this.openai = new OpenAI({ apiKey: options.apiKey });
      this.model = options.model || 'gpt-4o-mini';
      Logger.info('LLM manifest enhancement enabled');
    } else {
      Logger.info('LLM manifest enhancement disabled');
    }
  }

  /**
   * Enhance entire manifest with LLM
   */
  async enhanceManifest(manifest: MCPManifest): Promise<MCPManifest> {
    if (!this.openai) {
      Logger.warn('Cannot enhance manifest: LLM not initialized');
      return manifest;
    }

    Logger.info('Enhancing manifest with AI...');
    let enhancedCount = 0;

    const enhancedEndpoints = await Promise.all(
      manifest.endpoints.map(async (endpoint) => {
        const enhanced = await this.enhanceEndpoint(endpoint, manifest);
        if (enhanced) enhancedCount++;
        return enhanced || endpoint;
      })
    );

    if (enhancedCount > 0) {
      Logger.success(`Enhanced ${enhancedCount} endpoints with AI`);
    }

    return {
      ...manifest,
      endpoints: enhancedEndpoints,
    };
  }

  /**
   * Enhance a single endpoint with LLM
   */
  private async enhanceEndpoint(
    endpoint: MCPEndpoint,
    manifest: MCPManifest
  ): Promise<MCPEndpoint | null> {
    if (!this.openai) return null;

    try {
      // Identify fields that need enhancement
      const missingTypes = this.findMissingTypes(endpoint);
      if (missingTypes.length === 0) {
        // No enhancement needed
        return null;
      }

      Logger.info(`Enhancing ${endpoint.method} ${endpoint.path} (${missingTypes.length} fields)`);

      // Build context for LLM
      const context = this.buildEnhancementContext(endpoint, manifest, missingTypes);

      // Call LLM
      const enhancement = await this.callLLMForEnhancement(context);

      // Apply enhancements with validation
      return this.applyEnhancements(endpoint, enhancement);
    } catch (error) {
      Logger.error(`Failed to enhance ${endpoint.path}`, error as Error);
      return null;
    }
  }

  /**
   * Find parameters/fields with missing or uncertain types
   */
  private findMissingTypes(endpoint: MCPEndpoint): string[] {
    const missing: string[] = [];

    // Check path/query parameters
    endpoint.parameters?.forEach((param) => {
      // If type is defaulted to 'string', it might need enhancement
      if (!param.type || param.type === 'string') {
        missing.push(param.name);
      }
    });

    // Check request body fields
    if (endpoint.requestBody?.properties) {
      Object.entries(endpoint.requestBody.properties).forEach(([name, prop]) => {
        if (!prop.type || prop.type === 'string') {
          missing.push(name);
        }
      });
    }

    return missing;
  }

  /**
   * Build context for LLM enhancement
   */
  private buildEnhancementContext(
    endpoint: MCPEndpoint,
    manifest: MCPManifest,
    fieldsToEnhance: string[]
  ): string {
    const fields: Array<{
      name: string;
      currentType: string;
      description: string;
      location: string;
    }> = [];

    // Gather info about fields to enhance
    endpoint.parameters?.forEach((param) => {
      if (fieldsToEnhance.includes(param.name)) {
        fields.push({
          name: param.name,
          currentType: param.type || 'unknown',
          description: param.description || '',
          location: param.location,
        });
      }
    });

    if (endpoint.requestBody?.properties) {
      Object.entries(endpoint.requestBody.properties).forEach(([name, prop]) => {
        if (fieldsToEnhance.includes(name)) {
          fields.push({
            name: name,
            currentType: prop.type || 'unknown',
            description: prop.description || '',
            location: 'body',
          });
        }
      });
    }

    return JSON.stringify({
      apiName: manifest.name,
      apiDescription: manifest.description,
      endpoint: `${endpoint.method} ${endpoint.path}`,
      endpointDescription: endpoint.description,
      fieldsToAnalyze: fields,
    }, null, 2);
  }

  /**
   * Call LLM to get enhancement suggestions
   */
  private async callLLMForEnhancement(context: string): Promise<EndpointEnhancement> {
    if (!this.openai) throw new Error('OpenAI not initialized');

    const systemPrompt = `You are an API documentation expert. Your task is to analyze API endpoint parameters and infer their correct types.

RULES FOR TYPE INFERENCE:
1. Use JSON primitive types: "string", "integer", "number", "boolean", "array", "object"
2. Base your inference on:
   - Field names (e.g., "user_id" → integer, "price" → number)
   - Descriptions
   - Context of the API
   - Location (path params are often IDs → integers)
3. Be conservative - only infer if confident
4. Provide reasoning for each inference

COMMON PATTERNS:
- *_id, id, *_ID → integer
- price, cost, amount, rate → number
- is_*, has_*, can_* → boolean
- *_date, *_time → string (but note the format)
- email, name, description → string
- *_count, quantity → integer

Return JSON with:
{
  "parameters": [
    {
      "name": "field_name",
      "inferredType": "integer" | "number" | "string" | "boolean" | "array" | "object",
      "reasoning": "why you chose this type",
      "example": <example value>,
      "enhancedDescription": "improved description (optional)"
    }
  ]
}`;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze these API fields:\n\n${context}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result;
  }

  /**
   * Apply LLM enhancements to endpoint with validation
   */
  private applyEnhancements(
    endpoint: MCPEndpoint,
    enhancement: EndpointEnhancement
  ): MCPEndpoint {
    const enhancedEndpoint = { ...endpoint };

    if (!enhancement.parameters) return enhancedEndpoint;

    // Apply to path/query parameters
    if (enhancedEndpoint.parameters) {
      enhancedEndpoint.parameters = enhancedEndpoint.parameters.map((param) => {
        const enhanced = enhancement.parameters.find((e) => e.name === param.name);
        if (enhanced && this.isValidType(enhanced.inferredType)) {
          Logger.info(
            `  ✓ ${param.name}: ${param.type || 'unknown'} → ${enhanced.inferredType} (${enhanced.reasoning})`
          );
          return {
            ...param,
            type: enhanced.inferredType!,
            description: enhanced.enhancedDescription || param.description,
          };
        }
        return param;
      });
    }

    // Apply to request body fields
    if (enhancedEndpoint.requestBody?.properties) {
      const newProperties = { ...enhancedEndpoint.requestBody.properties };

      Object.keys(newProperties).forEach((name) => {
        const enhanced = enhancement.parameters.find((e) => e.name === name);
        if (enhanced && this.isValidType(enhanced.inferredType)) {
          Logger.info(
            `  ✓ ${name}: ${newProperties[name].type || 'unknown'} → ${enhanced.inferredType} (${enhanced.reasoning})`
          );
          newProperties[name] = {
            ...newProperties[name],
            type: enhanced.inferredType!,
            description: enhanced.enhancedDescription || newProperties[name].description,
          };
        }
      });

      enhancedEndpoint.requestBody = {
        ...enhancedEndpoint.requestBody,
        properties: newProperties,
      };
    }

    return enhancedEndpoint;
  }

  /**
   * Validate that inferred type is a valid JSON type
   */
  private isValidType(type: string | undefined): boolean {
    const validTypes = ['string', 'integer', 'number', 'boolean', 'array', 'object'];
    return type !== undefined && validTypes.includes(type);
  }
}
