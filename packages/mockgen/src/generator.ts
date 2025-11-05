import { NormalizedSpec, NormalizedEndpoint } from '@integration-copilot/spec-engine';

export interface MockConfig {
  baseUrl: string;
  enableLatency?: boolean;
  latencyMs?: number;
  enableRateLimit?: boolean;
  rateLimit?: number;
}

export interface MockRoute {
  path: string;
  method: string;
  handler: string; // Function body as string
  response: any;
  statusCode: number;
}

export class MockGenerator {
  generate(spec: NormalizedSpec, config: MockConfig): {
    routes: MockRoute[];
    postmanCollection: any;
  } {
    const routes = spec.endpoints.map((endpoint) =>
      this.generateRoute(endpoint)
    );

    const postmanCollection = this.generatePostmanCollection(
      spec,
      config.baseUrl
    );

    return { routes, postmanCollection };
  }

  private generateRoute(endpoint: NormalizedEndpoint): MockRoute {
    const response = this.generateMockResponse(endpoint);
    const statusCode = this.getSuccessStatusCode(endpoint);

    return {
      path: this.convertPathToExpress(endpoint.path),
      method: endpoint.method.toLowerCase(),
      handler: this.generateHandlerCode(endpoint, response, statusCode),
      response,
      statusCode,
    };
  }

  private convertPathToExpress(path: string): string {
    // Convert OpenAPI path params {id} to Express :id
    return path.replace(/\{([^}]+)\}/g, ':$1');
  }

  private generateHandlerCode(
    endpoint: NormalizedEndpoint,
    response: any,
    statusCode: number
  ): string {
    return `
      // ${endpoint.summary || endpoint.operationId || 'Handler'}
      const idempotencyKey = req.headers['idempotency-key'];
      
      // Simulate latency if configured
      if (config.enableLatency) {
        await new Promise(resolve => setTimeout(resolve, config.latencyMs || 100));
      }

      // Return deterministic response
      res.status(${statusCode}).json(${JSON.stringify(response, null, 2)});
    `;
  }

  private generateMockResponse(endpoint: NormalizedEndpoint): any {
    const successResponse = endpoint.responses['200'] || endpoint.responses['201'];
    
    if (!successResponse?.content?.['application/json']?.schema) {
      return { success: true, message: 'OK' };
    }

    const schema = successResponse.content['application/json'].schema;
    return this.generateFromSchema(schema);
  }

  private generateFromSchema(schema: any): any {
    if (schema.example) {
      return schema.example;
    }

    if (schema.type === 'object' && schema.properties) {
      const obj: any = {};
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        obj[key] = this.generateFromSchema(propSchema);
      }
      return obj;
    }

    if (schema.type === 'array' && schema.items) {
      return [this.generateFromSchema(schema.items)];
    }

    // Default values by type
    switch (schema.type) {
      case 'string':
        if (schema.format === 'date-time') return new Date().toISOString();
        if (schema.format === 'email') return 'test@example.com';
        if (schema.format === 'uuid') return '123e4567-e89b-12d3-a456-426614174000';
        return 'string_value';
      case 'number':
      case 'integer':
        return 0;
      case 'boolean':
        return true;
      default:
        return null;
    }
  }

  private getSuccessStatusCode(endpoint: NormalizedEndpoint): number {
    if (endpoint.responses['200']) return 200;
    if (endpoint.responses['201']) return 201;
    if (endpoint.responses['204']) return 204;
    return 200;
  }

  private generatePostmanCollection(
    spec: NormalizedSpec,
    baseUrl: string
  ): any {
    const collection = {
      info: {
        name: `${spec.title} - Mock Collection`,
        description: spec.description,
        schema:
          'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      auth: this.generatePostmanAuth(spec),
      item: [] as any[],
    };

    for (const endpoint of spec.endpoints) {
      collection.item.push(this.generatePostmanItem(endpoint, baseUrl));
    }

    return collection;
  }

  private generatePostmanAuth(spec: NormalizedSpec): any {
    if (spec.security.length === 0) return undefined;

    const auth = spec.security[0];
    
    if (auth.type === 'http' && auth.scheme === 'bearer') {
      return {
        type: 'bearer',
        bearer: [{ key: 'token', value: '{{bearerToken}}', type: 'string' }],
      };
    }

    if (auth.type === 'apiKey') {
      return {
        type: 'apikey',
        apikey: [
          { key: 'key', value: auth.name || 'api_key', type: 'string' },
          { key: 'value', value: '{{apiKey}}', type: 'string' },
          { key: 'in', value: auth.in || 'header', type: 'string' },
        ],
      };
    }

    return undefined;
  }

  private generatePostmanItem(endpoint: NormalizedEndpoint, baseUrl: string): any {
    const url = {
      raw: `${baseUrl}${endpoint.path}`,
      host: [baseUrl.replace(/^https?:\/\//, '')],
      path: endpoint.path.split('/').filter(Boolean),
      query: endpoint.parameters
        .filter((p) => p.in === 'query')
        .map((p) => ({
          key: p.name,
          value: '{{' + p.name + '}}',
          disabled: !p.required,
        })),
    };

    const item: any = {
      name: endpoint.summary || endpoint.operationId || `${endpoint.method} ${endpoint.path}`,
      request: {
        method: endpoint.method,
        header: endpoint.parameters
          .filter((p) => p.in === 'header')
          .map((p) => ({
            key: p.name,
            value: '{{' + p.name + '}}',
          })),
        url,
      },
    };

    if (endpoint.requestBody) {
      item.request.body = {
        mode: 'raw',
        raw: JSON.stringify(
          this.generateFromSchema(
            endpoint.requestBody.content['application/json']?.schema || {}
          ),
          null,
          2
        ),
        options: {
          raw: {
            language: 'json',
          },
        },
      };
    }

    return item;
  }
}

export function createMockGenerator(): MockGenerator {
  return new MockGenerator();
}
