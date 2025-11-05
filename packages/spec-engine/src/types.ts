export interface NormalizedEndpoint {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  description?: string;
  parameters: NormalizedParameter[];
  requestBody?: NormalizedRequestBody;
  responses: Record<string, NormalizedResponse>;
  security?: SecurityRequirement[];
  tags?: string[];
}

export interface NormalizedParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  required: boolean;
  schema: any;
  description?: string;
}

export interface NormalizedRequestBody {
  required: boolean;
  content: Record<string, { schema: any }>;
}

export interface NormalizedResponse {
  description: string;
  content?: Record<string, { schema: any }>;
}

export interface SecurityRequirement {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect';
  scheme?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
}

export interface NormalizedSpec {
  title: string;
  version: string;
  description?: string;
  servers: Array<{ url: string; description?: string }>;
  endpoints: NormalizedEndpoint[];
  security: SecurityRequirement[];
  webhooks?: Record<string, NormalizedEndpoint>;
  schemas: Record<string, any>;
}

export interface BlueprintConfig {
  customerScope?: {
    includedEndpoints?: string[];
    excludedEndpoints?: string[];
    includedFields?: Record<string, string[]>;
  };
  auth?: {
    type: string;
    instructions?: string;
  };
  webhooks?: {
    enabled: boolean;
    endpoints?: string[];
  };
}

export interface Blueprint {
  version: string;
  spec: NormalizedSpec;
  config: BlueprintConfig;
  endpoints: NormalizedEndpoint[];
  auth: {
    type: string;
    instructions: string;
  };
  webhooks: Array<{
    event: string;
    endpoint: NormalizedEndpoint;
    payload: any;
  }>;
  rules: Array<{
    type: string;
    description: string;
    validation: any;
  }>;
  markdown: string;
}
