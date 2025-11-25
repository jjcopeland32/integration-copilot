import { NextRequest, NextResponse } from 'next/server';
import { config as appConfig } from './config';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

// In-memory store for rate limits (works for single-instance deployments)
// For production multi-instance deployments, use Redis instead
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 60_000); // Clean up every minute
}

function getClientIdentifier(req: NextRequest): string {
  // Try to get IP from various headers (in order of preference)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;

  // Fallback to a hash of user-agent + accept headers as a pseudo-identifier
  const userAgent = req.headers.get('user-agent') ?? 'unknown';
  const accept = req.headers.get('accept') ?? '';
  return `ua:${userAgent.slice(0, 50)}:${accept.slice(0, 20)}`;
}

export type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
};

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  req: NextRequest,
  config?: Partial<RateLimitConfig>
): RateLimitResult {
  startCleanup();

  const {
    maxRequests = appConfig.rateLimit.maxRequests,
    windowMs = appConfig.rateLimit.windowMs,
    keyPrefix = 'global',
  } = config ?? {};

  const clientId = getClientIdentifier(req);
  const key = `${keyPrefix}:${clientId}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Create new entry or reset if window has passed
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  // Increment count
  entry.count++;

  const allowed = entry.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - entry.count);

  if (!allowed) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterMs: entry.resetAt - now,
    };
  }

  return {
    allowed: true,
    remaining,
    resetAt: entry.resetAt,
  };
}

/**
 * Rate limit middleware that returns a response if limit is exceeded
 */
export function withRateLimit(
  req: NextRequest,
  config?: Partial<RateLimitConfig>
): NextResponse | null {
  if (!appConfig.rateLimit.enabled) {
    return null;
  }

  const result = checkRateLimit(req, config);

  if (!result.allowed) {
    const retryAfterSeconds = Math.ceil((result.retryAfterMs ?? 60000) / 1000);
    
    return NextResponse.json(
      {
        ok: false,
        error: 'Rate limit exceeded',
        retryAfter: retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(config?.maxRequests ?? appConfig.rateLimit.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
        },
      }
    );
  }

  return null;
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
  config?: Partial<RateLimitConfig>
): NextResponse {
  const maxRequests = config?.maxRequests ?? appConfig.rateLimit.maxRequests;
  
  response.headers.set('X-RateLimit-Limit', String(maxRequests));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
  
  return response;
}

/**
 * Stricter rate limit config for sensitive endpoints
 */
export const sensitiveEndpointConfig: RateLimitConfig = {
  maxRequests: 30, // More restrictive than default 100
  windowMs: 60_000, // 1 minute window
  keyPrefix: 'sensitive',
};

/**
 * Very strict rate limit for test execution
 */
export const testExecutionConfig: RateLimitConfig = {
  maxRequests: 10, // Only 10 test runs per minute
  windowMs: 60_000,
  keyPrefix: 'test-run',
};

/**
 * Strict rate limit for trace ingestion
 */
export const traceIngestionConfig: RateLimitConfig = {
  maxRequests: 100, // 100 traces per minute
  windowMs: 60_000,
  keyPrefix: 'trace',
};

