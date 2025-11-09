import { OpenAPIV3 } from 'openapi-types';
import axios from 'axios';
import { createHash } from 'crypto';
import {
  NormalizedSpec,
  NormalizedEndpoint,
  NormalizedParameter,
  SecurityRequirement,
} from './types';

interface CacheEntry {
  value: NormalizedSpec;
  expiresAt: number;
}

export interface SpecNormalizerOptions {
  cacheSize?: number;
  ttlMs?: number;
}

export class SpecNormalizer {
  private cache = new Map<string, CacheEntry>();
  private cacheSize: number;
  private ttlMs: number;

  constructor(options: SpecNormalizerOptions = {}) {
    this.cacheSize = Math.max(1, options.cacheSize ?? 8);
    this.ttlMs = options.ttlMs ?? 5 * 60 * 1000;
  }

  async normalizeFromURL(url: string): Promise<NormalizedSpec> {
    const response = await axios.get(url);
    const api = response.data as OpenAPIV3.Document;
    return this.normalizeWithCache(`url:${url}`, api);
  }

  async normalizeFromObject(spec: any): Promise<NormalizedSpec> {
    const api = spec as OpenAPIV3.Document;
    return this.normalizeWithCache(`object:${this.hashSpec(spec)}`, api);
  }

  private normalizeWithCache(seed: string, api: OpenAPIV3.Document): NormalizedSpec {
    const cacheKey = this.createCacheKey(seed, api);
    const cached = this.readFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    const normalized = this.normalizeDocument(api);
    this.writeToCache(cacheKey, normalized);
    return normalized;
  }

  private normalizeDocument(api: OpenAPIV3.Document): NormalizedSpec {
    const endpoints: NormalizedEndpoint[] = [];
    const webhooks: Record<string, NormalizedEndpoint> = {};

    // Normalize paths
    if (api.paths) {
      for (const [path, pathItem] of Object.entries(api.paths)) {
        if (!pathItem) continue;

        const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
        for (const method of methods) {
          const operation = pathItem[method] as OpenAPIV3.OperationObject;
          if (operation) {
            endpoints.push(this.normalizeOperation(path, method, operation));
          }
        }
      }
    }

    // Normalize webhooks (OpenAPI 3.1)
    if ('webhooks' in api && api.webhooks) {
      for (const [name, pathItem] of Object.entries(api.webhooks)) {
        if (!pathItem) continue;
        const methods = ['post'] as const;
        for (const method of methods) {
          const operation = (pathItem as any)[method];
          if (operation) {
            webhooks[name] = this.normalizeOperation(
              name,
              method,
              operation
            );
          }
        }
      }
    }

    const normalized: NormalizedSpec = {
      title: api.info.title,
      version: api.info.version,
      description: api.info.description,
      servers: (api.servers || []).map((s) => ({
        url: s.url,
        description: s.description,
      })),
      endpoints,
      security: this.normalizeSecurity(api.security, api.components?.securitySchemes),
      webhooks: Object.keys(webhooks).length > 0 ? webhooks : undefined,
      schemas: api.components?.schemas || {},
    };
    return normalized;
  }

  private normalizeOperation(
    path: string,
    method: string,
    operation: OpenAPIV3.OperationObject
  ): NormalizedEndpoint {
    return {
      path,
      method: method.toUpperCase(),
      operationId: operation.operationId,
      summary: operation.summary,
      description: operation.description,
      parameters: this.normalizeParameters(operation.parameters || []),
      requestBody: operation.requestBody
        ? this.normalizeRequestBody(operation.requestBody as OpenAPIV3.RequestBodyObject)
        : undefined,
      responses: this.normalizeResponses(operation.responses),
      security: operation.security
        ? this.normalizeSecurity(operation.security, {})
        : undefined,
      tags: operation.tags,
    };
  }

  private normalizeParameters(
    parameters: (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[]
  ): NormalizedParameter[] {
    return parameters
      .filter((p): p is OpenAPIV3.ParameterObject => !('$ref' in p))
      .map((p) => ({
        name: p.name,
        in: p.in as any,
        required: p.required || false,
        schema: p.schema,
        description: p.description,
      }));
  }

  private normalizeRequestBody(
    body: OpenAPIV3.RequestBodyObject
  ): { required: boolean; content: Record<string, { schema: any }> } {
    return {
      required: body.required || false,
      content: body.content as any,
    };
  }

  private normalizeResponses(
    responses: OpenAPIV3.ResponsesObject
  ): Record<string, { description: string; content?: Record<string, { schema: any }> }> {
    const normalized: Record<string, any> = {};
    for (const [code, response] of Object.entries(responses)) {
      if ('$ref' in response) continue;
      normalized[code] = {
        description: response.description,
        content: response.content,
      };
    }
    return normalized;
  }

  private normalizeSecurity(
    security: OpenAPIV3.SecurityRequirementObject[] | undefined,
    schemes: any
  ): SecurityRequirement[] {
    if (!security || !schemes) return [];
    
    const requirements: SecurityRequirement[] = [];
    for (const req of security) {
      for (const [name, scopes] of Object.entries(req)) {
        const scheme = schemes[name];
        if (!scheme) continue;
        
        requirements.push({
          type: scheme.type as any,
          scheme: 'scheme' in scheme ? scheme.scheme : undefined,
          name: 'name' in scheme ? scheme.name : undefined,
          in: 'in' in scheme ? (scheme.in as any) : undefined,
        });
      }
    }
    return requirements;
  }

  private createCacheKey(seed: string, api: OpenAPIV3.Document): string {
    return createHash('sha256')
      .update(seed)
      .update(JSON.stringify(api))
      .digest('hex');
  }

  private readFromCache(key: string): NormalizedSpec | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    // refresh LRU ordering
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  private writeToCache(key: string, value: NormalizedSpec) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
    if (this.cache.size > this.cacheSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) {
        this.cache.delete(oldest);
      }
    }
  }

  private hashSpec(spec: unknown): string {
    if (typeof spec === 'string') return spec;
    try {
      return JSON.stringify(spec);
    } catch {
      return Math.random().toString(36);
    }
  }
}

export function createNormalizer(options?: SpecNormalizerOptions): SpecNormalizer {
  return new SpecNormalizer(options);
}
