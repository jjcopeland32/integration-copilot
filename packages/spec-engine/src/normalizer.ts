import { OpenAPIV3 } from 'openapi-types';
import axios from 'axios';
import {
  NormalizedSpec,
  NormalizedEndpoint,
  NormalizedParameter,
  SecurityRequirement,
} from './types';

export class SpecNormalizer {
  async normalizeFromURL(url: string): Promise<NormalizedSpec> {
    const response = await axios.get(url);
    const api = response.data as OpenAPIV3.Document;
    return this.normalize(api);
  }

  async normalizeFromObject(spec: any): Promise<NormalizedSpec> {
    const api = spec as OpenAPIV3.Document;
    return this.normalize(api);
  }

  private normalize(api: OpenAPIV3.Document): NormalizedSpec {
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

    return {
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
}

export function createNormalizer(): SpecNormalizer {
  return new SpecNormalizer();
}
