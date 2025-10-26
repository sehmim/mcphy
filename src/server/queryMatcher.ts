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

export interface ParameterDetail {
  name: string;
  value: any;
  description?: string;
  type?: string;
  required?: boolean;
  location?: string;
  source: 'extracted' | 'default' | 'missing' | 'optional';
}

export interface QueryMatchResult {
  endpoint: string;
  method: string;
  params?: Record<string, any>;
  confidence?: number;
  reasoning?: string;
  
  // Enhanced fields for UI
  summary: string;
  endpointDescription?: string;
  parameterDetails?: ParameterDetail[];
  expectedResponse?: string;
  apiName?: string;
  
  missingInfo?: {
    requiredParams: string[];
    suggestions: string[];
    exampleQuery: string;
    requestBodyFields?: string[];
  };
  guidance?: string;
}

export class QueryMatcher {
  private openai: OpenAI | null = null;
  private manifest: MCPManifest;
  private modelName: string;

  constructor(manifest: MCPManifest, openaiApiKey?: string | null, modelName?: string) {
    this.manifest = manifest;
    this.modelName = modelName || 'gpt-4o-mini';

    // Initialize OpenAI client if API key is available
    const apiKey = openaiApiKey || process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
      Logger.info(`OpenAI client initialized for AI-powered query matching (model: ${this.modelName})`);
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
   * Match query using OpenAI with flexible model support
   */
  private async matchWithOpenAI(query: string): Promise<QueryMatchResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      // Build rich context from manifest with full documentation
      const endpointsContext = this.buildRichEndpointsContext();
      const apiContext = this.buildAPIContext();

      const systemPrompt = `You are an expert API assistant for ${this.manifest.name}.

${apiContext}

Available Endpoints:
${endpointsContext}

CRITICAL INSTRUCTIONS:

1. **EXTRACT ALL PARAMETER VALUES** from the user's query, whether they use:
   - Natural language: "create booking for John Doe"
   - Structured format: 'customer_name="John Doe"'
   - Key-value pairs: "customer_name: John Doe"
   - Any combination of the above

2. **TYPE HANDLING - EXTREMELY IMPORTANT**:
   Each parameter has a specific type shown in the documentation above. You MUST return the correct JSON type:

   - **Integer fields** (e.g., garage_id: integer):
     Extract as NUMBER, NOT string
     Example: {"garage_id": 123} ✓  NOT {"garage_id": "123"} ✗

   - **Number/Float fields** (e.g., price: number):
     Extract as DECIMAL NUMBER, NOT string
     Example: {"price": 99.99} ✓  NOT {"price": "99.99"} ✗

   - **Boolean fields** (e.g., is_confirmed: boolean):
     Extract as true/false, NOT "true"/"false"
     Example: {"is_confirmed": true} ✓  NOT {"is_confirmed": "true"} ✗

   - **String fields** (e.g., customer_name: string):
     Extract as string
     Example: {"customer_name": "John Doe"} ✓

   - **Date fields** (e.g., appointment_date: string with date format):
     Extract as string in YYYY-MM-DD format
     Convert from any format: "Jan 15" → "2025-01-15"
     Example: {"appointment_date": "2025-12-12"} ✓

   - **Time fields** (e.g., appointment_time_slot: string with time format):
     Extract as string in HH:MM format
     Example: {"appointment_time_slot": "14:30"} ✓

3. **PARAMETER EXTRACTION RULES**:
   - Look for exact parameter names in the query
   - Look for values in quotes: "value" or 'value'
   - Look for key=value or key="value" patterns
   - Look for natural language equivalents (e.g., "for John" → customer_name: "John")
   - Extract dates in any format and convert to YYYY-MM-DD
   - Extract numbers and parse them as integers or floats based on the type

4. **RETURN JSON RESPONSE** with:
   - endpoint: The matching API path
   - method: HTTP method (uppercase)
   - params: Object with ALL extracted parameters WITH CORRECT TYPES
   - confidence: Match confidence (0-1)
   - reasoning: Why this endpoint matches
   - summary: A clear, user-friendly summary
   - expectedResponse: What the user should expect back
   - missingInfo: ONLY if required parameters are missing:
     - requiredParams: Array of missing parameter names
     - suggestions: Helpful suggestions for each missing param
     - exampleQuery: Complete example with all required info

**TYPE-AWARE EXTRACTION EXAMPLES**:

Query: 'create booking garage_id=123 customer_name="John" price=99.99 appointment_date="2025-01-15"'
Extract: {
  "garage_id": 123,           ← INTEGER (not "123")
  "customer_name": "John",    ← STRING
  "price": 99.99,             ← NUMBER (not "99.99")
  "appointment_date": "2025-01-15"  ← STRING (date format)
}

Query: "book for garage 456 on Jan 20th at 2:30pm"
Extract: {
  "garage_id": 456,           ← INTEGER from "456"
  "appointment_date": "2025-01-20",  ← DATE from "Jan 20th"
  "appointment_time_slot": "14:30"   ← TIME from "2:30pm"
}

Query: "create user with premium account"
Extract: {
  "is_premium": true          ← BOOLEAN from "premium"
}

Be extremely thorough in extraction and **ALWAYS USE CORRECT JSON TYPES** based on the parameter type in the documentation.`;


      Logger.info(`Calling ${this.modelName} for query matching...`);

      const response = await this.openai.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Enrich result with manifest data
      return this.enrichResult(result, query);
    } catch (error) {
      Logger.error('LLM matching failed, falling back to keyword matching', error as Error);
      return this.matchWithFallback(query);
    }
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

    // For POST/PUT/PATCH requests, also extract request body fields
    if (['POST', 'PUT', 'PATCH'].includes(bestMatch.method)) {
      const bodyFields = this.extractRequestBodyFields(query, bestMatch);
      // Merge body fields into params for POST requests
      Object.assign(params, bodyFields);
    }

    // Check for missing required information
    const missingInfo = this.analyzeMissingInformation(query, bestMatch, params);

    // Build rich response even for fallback
    const summary = this.generateFallbackSummary(
      { endpoint: bestMatch.path, method: bestMatch.method },
      query
    );

    return {
      endpoint: bestMatch.path,
      method: bestMatch.method,
      params,
      confidence: maxScore / 10, // Normalize to 0-1
      reasoning: `Matched based on keywords (score: ${maxScore})`,
      summary,
      apiName: this.manifest.name,
      endpointDescription: bestMatch.description,
      parameterDetails: this.buildParameterDetails(params, bestMatch),
      expectedResponse: 'API response will be returned after execution',
      missingInfo,
      guidance: missingInfo ? this.generateGuidance(missingInfo, bestMatch) : undefined,
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
   * Build API-level context for LLM
   */
  private buildAPIContext(): string {
    return `API Name: ${this.manifest.name}
Description: ${this.manifest.description}
Version: ${this.manifest.version}`;
  }

  /**
   * Build rich endpoints context with full documentation and type information
   */
  private buildRichEndpointsContext(): string {
    return this.manifest.endpoints
      .map((endpoint, idx) => {
        const params =
          endpoint.parameters
            ?.map(
              (p) =>
                `  - ${p.name} (${p.type}, ${p.required ? 'required' : 'optional'}, in: ${p.location})${
                  p.description ? `\n    Description: ${p.description}` : ''
                }${this._getTypeExample(p.type, p.name)}`
            )
            .join('\n') || '  No parameters';

        // Add request body schema info with type examples
        let requestBodyInfo = '';
        if (endpoint.requestBody && endpoint.requestBody.properties) {
          const bodyProps = Object.keys(endpoint.requestBody.properties)
            .map((propName) => {
              const prop = endpoint.requestBody!.properties![propName];
              const isRequired = endpoint.requestBody!.requiredFields?.includes(propName);
              return `  - ${propName} (${prop.type}, ${isRequired ? 'required' : 'optional'})${
                prop.description ? `\n    Description: ${prop.description}` : ''
              }${this._getTypeExample(prop.type, propName)}`;
            })
            .join('\n');

          requestBodyInfo = `\n   Request Body Fields:\n${bodyProps}`;
        }

        return `${idx + 1}. ${endpoint.method} ${endpoint.path}
   Description: ${endpoint.description || 'No description available'}
   Parameters:
${params}${requestBodyInfo}${endpoint.response ? `\n   Expected Response: ${JSON.stringify(endpoint.response)}` : ''}`;
      })
      .join('\n\n');
  }

  /**
   * Get type example and format hints for a parameter
   */
  private _getTypeExample(type: string, name: string): string {
    const typeLower = (type || 'string').toLowerCase();
    const nameLower = name.toLowerCase();

    if (typeLower === 'integer' || typeLower === 'int') {
      return `\n    Type: integer (return as number, NOT string)\n    Example: 123`;
    }

    if (typeLower === 'number' || typeLower === 'float' || typeLower === 'double') {
      return `\n    Type: number (return as decimal, NOT string)\n    Example: 99.99`;
    }

    if (typeLower === 'boolean' || typeLower === 'bool') {
      return `\n    Type: boolean (return true/false, NOT "true"/"false")\n    Example: true`;
    }

    if (typeLower === 'array') {
      return `\n    Type: array\n    Example: ["item1", "item2"]`;
    }

    if (typeLower === 'object') {
      return `\n    Type: object\n    Example: {"key": "value"}`;
    }

    // Date/time specific handling
    if (nameLower.includes('date') && !nameLower.includes('time')) {
      return `\n    Type: string (date format: YYYY-MM-DD)\n    Example: "2025-12-12"`;
    }

    if (nameLower.includes('time') || nameLower.includes('slot')) {
      return `\n    Type: string (time format: HH:MM)\n    Example: "14:30"`;
    }

    if (nameLower.includes('datetime')) {
      return `\n    Type: string (datetime format: YYYY-MM-DDTHH:MM:SS)\n    Example: "2025-12-12T14:30:00"`;
    }

    if (nameLower.includes('email')) {
      return `\n    Type: string (email format)\n    Example: "user@example.com"`;
    }

    if (nameLower.includes('phone') || nameLower.includes('tel')) {
      return `\n    Type: string (phone format)\n    Example: "+1234567890"`;
    }

    // Default string
    return `\n    Type: string\n    Example: "sample text"`;
  }

  /**
   * Enrich LLM result with manifest data
   */
  private enrichResult(llmResult: any, originalQuery: string): QueryMatchResult {
    const matchedEndpoint = this.manifest.endpoints.find(
      (ep) => ep.path === llmResult.endpoint && ep.method === llmResult.method
    );

    return {
      ...llmResult,
      apiName: this.manifest.name,
      endpointDescription: matchedEndpoint?.description,
      summary: llmResult.summary || this.generateFallbackSummary(llmResult, originalQuery),
      parameterDetails: this.buildParameterDetails(llmResult.params || {}, matchedEndpoint),
      expectedResponse: llmResult.expectedResponse || 'API response will be returned after execution',
    };
  }

  /**
   * Build detailed parameter information
   */
  private buildParameterDetails(
    extractedParams: Record<string, any>,
    endpoint?: MCPEndpoint
  ): ParameterDetail[] {
    if (!endpoint?.parameters) return [];

    return endpoint.parameters.map((param) => {
      const hasValue = param.name in extractedParams;

      // For parameters without explicit location, infer based on method
      let location = param.location;
      if (!location) {
        if (endpoint.path.includes(`{${param.name}}`)) {
          location = 'path';
        } else if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
          location = 'body';
        } else {
          location = 'query';
        }
      }

      return {
        name: param.name,
        value: hasValue ? extractedParams[param.name] : undefined,
        description: param.description,
        type: param.type,
        required: param.required,
        location: location,
        source: hasValue ? 'extracted' : param.required ? 'missing' : 'optional',
      };
    });
  }

  /**
   * Generate fallback summary if LLM doesn't provide one
   */
  private generateFallbackSummary(result: any, query: string): string {
    const action =
      result.method === 'GET'
        ? 'Retrieving'
        : result.method === 'POST'
        ? 'Creating'
        : result.method === 'PUT'
        ? 'Updating'
        : result.method === 'DELETE'
        ? 'Deleting'
        : 'Processing';

    const resource =
      result.endpoint?.split('/').filter((p: string) => p && !p.startsWith('{'))?.pop() || 'resource';
    return `${action} ${resource} based on your request`;
  }

  /**
   * Analyze missing required information for an endpoint
   */
  private analyzeMissingInformation(
    query: string,
    endpoint: MCPEndpoint,
    extractedParams: Record<string, any>
  ): { requiredParams: string[]; suggestions: string[]; exampleQuery: string; requestBodyFields?: string[] } | undefined {
    const missingInfo: string[] = [];
    const suggestions: string[] = [];
    let requestBodyFields: string[] | undefined;

    // Check path parameters
    if (endpoint.parameters) {
      const requiredParams = endpoint.parameters
        .filter(param => param.required)
        .map(param => param.name);

      const missingRequired = requiredParams.filter(param => !(param in extractedParams));
      missingInfo.push(...missingRequired);
      suggestions.push(...this.generateParameterSuggestions(missingRequired, endpoint));
    }

    // For POST/PUT/PATCH requests, check for missing request body fields
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      const bodyFields = this.extractRequestBodyFields(query, endpoint);
      const missingBodyFields = this.analyzeMissingRequestBodyFields(endpoint, bodyFields);
      
      if (missingBodyFields.length > 0) {
        missingInfo.push(...missingBodyFields);
        suggestions.push(...this.generateRequestBodySuggestions(missingBodyFields, endpoint));
        requestBodyFields = missingBodyFields;
      }
    }

    if (missingInfo.length === 0) {
      return undefined;
    }

    // Generate example query
    const exampleQuery = this.generateExampleQuery(endpoint, missingInfo);

    return {
      requiredParams: missingInfo,
      suggestions,
      exampleQuery,
      requestBodyFields,
    };
  }

  /**
   * Generate helpful suggestions for missing parameters
   */
  private generateParameterSuggestions(
    missingParams: string[],
    endpoint: MCPEndpoint
  ): string[] {
    const suggestions: string[] = [];

    for (const paramName of missingParams) {
      const param = endpoint.parameters?.find(p => p.name === paramName);
      if (!param) continue;

      // Generate contextual suggestions based on parameter type and name
      if (paramName.toLowerCase().includes('id')) {
        suggestions.push(`Please provide a ${paramName} (e.g., "with ID 123")`);
      } else if (paramName.toLowerCase().includes('email')) {
        suggestions.push(`Please provide an email address (e.g., "for user@example.com")`);
      } else if (paramName.toLowerCase().includes('name')) {
        suggestions.push(`Please provide a name (e.g., "for John Doe")`);
      } else if (paramName.toLowerCase().includes('date')) {
        suggestions.push(`Please provide a date (e.g., "for 2025-01-15")`);
      } else if (param.type === 'integer') {
        suggestions.push(`Please provide a number for ${paramName} (e.g., "limit 10")`);
      } else if (param.type === 'string') {
        suggestions.push(`Please provide a value for ${paramName}`);
      } else {
        suggestions.push(`Please provide a value for ${paramName}`);
      }
    }

    return suggestions;
  }

  /**
   * Generate an example query with missing parameters
   */
  private generateExampleQuery(
    endpoint: MCPEndpoint,
    missingParams: string[]
  ): string {
    const baseQuery = this.getBaseQueryForEndpoint(endpoint);
    const paramExamples = missingParams.map(paramName => {
      const param = endpoint.parameters?.find(p => p.name === paramName);
      if (paramName.toLowerCase().includes('id')) return `with ID 123`;
      if (paramName.toLowerCase().includes('email')) return `for user@example.com`;
      if (paramName.toLowerCase().includes('name')) return `for John Doe`;
      if (paramName.toLowerCase().includes('date')) return `for 2025-01-15`;
      if (param?.type === 'integer') return `limit 10`;
      return `with ${paramName} value`;
    });

    return `${baseQuery} ${paramExamples.join(' ')}`;
  }

  /**
   * Get base query text for an endpoint
   */
  private getBaseQueryForEndpoint(endpoint: MCPEndpoint): string {
    const method = endpoint.method.toLowerCase();
    const pathParts = endpoint.path.split('/').filter(part => part && !part.startsWith('{'));
    
    if (method === 'get') {
      return `Get ${pathParts.join(' ')}`;
    } else if (method === 'post') {
      return `Create ${pathParts.join(' ')}`;
    } else if (method === 'put') {
      return `Update ${pathParts.join(' ')}`;
    } else if (method === 'delete') {
      return `Delete ${pathParts.join(' ')}`;
    } else {
      return `${method} ${pathParts.join(' ')}`;
    }
  }

  /**
   * Extract request body fields from natural language query
   */
  private extractRequestBodyFields(query: string, endpoint: MCPEndpoint): Record<string, any> {
    const bodyFields: Record<string, any> = {};

    // First, try to extract structured key="value" or key='value' patterns
    const structuredPattern = /(\w+)\s*=\s*["']([^"']+)["']/g;
    let match;
    while ((match = structuredPattern.exec(query)) !== null) {
      const [, key, value] = match;
      bodyFields[key] = value;
    }

    // Also try key=value without quotes
    const unquotedPattern = /(\w+)\s*=\s*([^\s,]+)/g;
    while ((match = unquotedPattern.exec(query)) !== null) {
      const [, key, value] = match;
      // Only add if not already captured with quotes
      if (!(key in bodyFields)) {
        bodyFields[key] = value;
      }
    }

    // If no structured patterns found, fall back to natural language patterns
    if (Object.keys(bodyFields).length === 0) {
      const queryLower = query.toLowerCase();
      const patterns = [
        // Name patterns
        { regex: /(?:name|customer)[:\s]+([^,\s]+)/i, field: 'customer_name' },
        { regex: /(?:email)[:\s]+([^\s]+@[^\s]+)/i, field: 'customer_email' },
        { regex: /(?:phone)[:\s]+([^\s]+)/i, field: 'customer_phone' },
        { regex: /(?:garage|shop)[:\s]+([^,\s]+)/i, field: 'garage_name' },
        { regex: /(?:service|type)[:\s]+([^,\s]+)/i, field: 'service_type' },
        { regex: /(?:date)[:\s]+(\d{4}-\d{2}-\d{2})/i, field: 'appointment_date' },
        { regex: /(?:time|slot)[:\s]+([^\s]+)/i, field: 'appointment_time_slot' },
        { regex: /(?:car|vehicle)[:\s]+([^,\s]+)/i, field: 'car_make' },
        { regex: /(?:model)[:\s]+([^,\s]+)/i, field: 'car_model' },
        { regex: /(?:year)[:\s]+(\d{4})/i, field: 'car_year' },
        { regex: /(?:notes?)[:\s]+([^,]+)/i, field: 'notes' },
      ];

      for (const pattern of patterns) {
        const match = query.match(pattern.regex);
        if (match) {
          bodyFields[pattern.field] = match[1];
        }
      }
    }

    return bodyFields;
  }

  /**
   * Analyze missing required request body fields
   */
  private analyzeMissingRequestBodyFields(
    endpoint: MCPEndpoint,
    extractedFields: Record<string, any>
  ): string[] {
    // Get required fields from the endpoint's request body schema
    if (!endpoint.requestBody?.requiredFields) {
      return [];
    }

    const requiredFields = endpoint.requestBody.requiredFields;
    return requiredFields.filter(field => !(field in extractedFields));
  }

  /**
   * Generate suggestions for missing request body fields
   */
  private generateRequestBodySuggestions(
    missingFields: string[],
    endpoint: MCPEndpoint
  ): string[] {
    const suggestions: string[] = [];

    for (const field of missingFields) {
      if (field === 'garage_id') {
        suggestions.push('Please specify the garage ID (e.g., "for garage way/123456")');
      } else if (field === 'customer_name') {
        suggestions.push('Please provide the customer name (e.g., "for John Doe")');
      } else if (field === 'service_type') {
        suggestions.push('Please specify the service type (e.g., "for oil change" or "for battery replacement")');
      } else if (field === 'appointment_date') {
        suggestions.push('Please provide the appointment date (e.g., "for 2025-01-15")');
      } else if (field === 'customer_email') {
        suggestions.push('Please provide the customer email (e.g., "for john@example.com")');
      } else if (field === 'customer_phone') {
        suggestions.push('Please provide the customer phone (e.g., "phone +1234567890")');
      } else {
        suggestions.push(`Please provide a value for ${field}`);
      }
    }

    return suggestions;
  }

  /**
   * Generate helpful guidance message
   */
  private generateGuidance(
    missingInfo: { requiredParams: string[]; suggestions: string[]; exampleQuery: string; requestBodyFields?: string[] },
    endpoint: MCPEndpoint
  ): string {
    const { requiredParams, suggestions, exampleQuery, requestBodyFields } = missingInfo;
    
    let guidance = `I found the right endpoint (${endpoint.method} ${endpoint.path}), but I need more information:\n\n`;
    
    if (requestBodyFields && requestBodyFields.length > 0) {
      guidance += `**Missing required fields for ${endpoint.method} request:**\n`;
      guidance += requestBodyFields.map(field => `• ${field}`).join('\n');
      guidance += `\n\n`;
    }
    
    if (requiredParams.length > 0) {
      guidance += `**Missing required parameters:**\n`;
      guidance += requiredParams.map(param => `• ${param}`).join('\n');
      guidance += `\n\n`;
    }
    
    guidance += `**Suggestions:**\n`;
    guidance += suggestions.map(suggestion => `• ${suggestion}`).join('\n');
    
    guidance += `\n\n**Example query:**\n"${exampleQuery}"`;
    
    return guidance;
  }

  /**
   * Get all available endpoints
   */
  getEndpoints(): MCPEndpoint[] {
    return this.manifest.endpoints;
  }
}
