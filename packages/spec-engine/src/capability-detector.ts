import { NormalizedSpec, NormalizedEndpoint, SecurityRequirement } from './types';

/**
 * Detected capabilities from an OpenAPI spec
 */
export interface DetectedCapabilities {
  /** Whether any operation uses Idempotency-Key header */
  hasIdempotency: boolean;
  /** Whether any operation has pagination parameters (page, limit, offset, cursor) */
  hasPagination: boolean;
  /** Whether the spec defines webhooks or callbacks */
  hasWebhooks: boolean;
  /** Whether there are any write operations (POST, PUT, PATCH, DELETE) */
  hasWriteOperations: boolean;
  /** Whether any operation defines rate limiting (x-ratelimit headers or 429 responses) */
  hasRateLimiting: boolean;
  /** Whether the spec has security schemes defined */
  hasAuth: boolean;
  /** List of supported auth types from security schemes */
  supportedAuthTypes: string[];
  /** Grouped endpoints by first path segment (e.g., /payments/* → "payments") */
  apiGroups: string[];
  /** Primary API group (most common path prefix) */
  primaryApiGroup: string;
  /** Total number of endpoints */
  endpointCount: number;
  /** Breakdown of HTTP methods */
  methodCounts: Record<string, number>;
}

const PAGINATION_PARAMS = ['page', 'limit', 'offset', 'cursor', 'per_page', 'page_size', 'pageSize', 'pageToken'];
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Detect capabilities from a normalized OpenAPI spec
 */
export function detectCapabilities(spec: NormalizedSpec): DetectedCapabilities {
  const capabilities: DetectedCapabilities = {
    hasIdempotency: false,
    hasPagination: false,
    hasWebhooks: false,
    hasWriteOperations: false,
    hasRateLimiting: false,
    hasAuth: false,
    supportedAuthTypes: [],
    apiGroups: [],
    primaryApiGroup: '',
    endpointCount: spec.endpoints.length,
    methodCounts: {},
  };

  // Track API groups
  const apiGroupCounts: Record<string, number> = {};

  // Analyze each endpoint
  for (const endpoint of spec.endpoints) {
    // Track method counts
    const method = endpoint.method.toUpperCase();
    capabilities.methodCounts[method] = (capabilities.methodCounts[method] || 0) + 1;

    // Check for write operations
    if (WRITE_METHODS.includes(method)) {
      capabilities.hasWriteOperations = true;
    }

    // Check for idempotency header
    if (hasIdempotencyHeader(endpoint)) {
      capabilities.hasIdempotency = true;
    }

    // Check for pagination parameters
    if (hasPaginationParams(endpoint)) {
      capabilities.hasPagination = true;
    }

    // Check for rate limiting in responses
    if (hasRateLimitingResponse(endpoint)) {
      capabilities.hasRateLimiting = true;
    }

    // Extract API group from path
    const group = extractApiGroup(endpoint.path);
    if (group) {
      apiGroupCounts[group] = (apiGroupCounts[group] || 0) + 1;
    }
  }

  // Check for webhooks
  if (spec.webhooks && Object.keys(spec.webhooks).length > 0) {
    capabilities.hasWebhooks = true;
  }

  // Check for auth/security
  if (spec.security && spec.security.length > 0) {
    capabilities.hasAuth = true;
    capabilities.supportedAuthTypes = extractAuthTypes(spec.security);
  }

  // Determine API groups
  capabilities.apiGroups = Object.keys(apiGroupCounts).sort(
    (a, b) => apiGroupCounts[b] - apiGroupCounts[a]
  );
  capabilities.primaryApiGroup = capabilities.apiGroups[0] || 'api';

  return capabilities;
}

/**
 * Check if an endpoint uses the Idempotency-Key header
 */
function hasIdempotencyHeader(endpoint: NormalizedEndpoint): boolean {
  const headerParams = endpoint.parameters.filter((p) => p.in === 'header');
  return headerParams.some(
    (p) => p.name.toLowerCase() === 'idempotency-key' || p.name.toLowerCase() === 'x-idempotency-key'
  );
}

/**
 * Check if an endpoint has pagination parameters
 */
function hasPaginationParams(endpoint: NormalizedEndpoint): boolean {
  const queryParams = endpoint.parameters.filter((p) => p.in === 'query');
  return queryParams.some((p) => PAGINATION_PARAMS.includes(p.name.toLowerCase()));
}

/**
 * Check if an endpoint defines rate limiting responses
 */
function hasRateLimitingResponse(endpoint: NormalizedEndpoint): boolean {
  // Check for 429 response code
  if (endpoint.responses['429']) {
    return true;
  }
  
  // Could also check for x-ratelimit headers in response headers
  // but that would require more complex schema traversal
  return false;
}

/**
 * Extract the API group from a path (first segment)
 */
function extractApiGroup(path: string): string {
  // Remove leading slash and split by /
  const segments = path.replace(/^\//, '').split('/');
  
  // Get first non-empty, non-version segment
  for (const segment of segments) {
    // Skip version segments like v1, v2, api
    if (/^v\d+$/i.test(segment) || segment.toLowerCase() === 'api') {
      continue;
    }
    // Skip path parameters
    if (segment.startsWith('{') && segment.endsWith('}')) {
      continue;
    }
    // Return the first meaningful segment
    if (segment) {
      return segment.toLowerCase();
    }
  }
  
  return 'default';
}

/**
 * Extract auth types from security requirements
 */
function extractAuthTypes(security: SecurityRequirement[]): string[] {
  const types = new Set<string>();
  
  for (const req of security) {
    if (req.type) {
      types.add(req.type);
    }
    if (req.scheme) {
      types.add(req.scheme);
    }
  }
  
  return Array.from(types);
}

/**
 * Get a human-readable summary of detected capabilities
 */
export function getCapabilitySummary(capabilities: DetectedCapabilities): string {
  const features: string[] = [];
  
  if (capabilities.hasAuth) {
    features.push(`Auth (${capabilities.supportedAuthTypes.join(', ')})`);
  }
  if (capabilities.hasWriteOperations) {
    features.push('Write operations');
  }
  if (capabilities.hasIdempotency) {
    features.push('Idempotency');
  }
  if (capabilities.hasWebhooks) {
    features.push('Webhooks');
  }
  if (capabilities.hasPagination) {
    features.push('Pagination');
  }
  if (capabilities.hasRateLimiting) {
    features.push('Rate limiting');
  }
  
  return features.length > 0 ? features.join(', ') : 'Basic API';
}



