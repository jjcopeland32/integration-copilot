import crypto from 'crypto';

export interface WebhookSignatureConfig {
  secret: string;
  algorithm: 'sha256' | 'sha512';
  headerName: string;
}

export class SecurityUtils {
  static generateHmacSignature(
    payload: string | object,
    secret: string,
    algorithm: 'sha256' | 'sha512' = 'sha256'
  ): string {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(data);
    return `${algorithm}=${hmac.digest('hex')}`;
  }

  static verifyHmacSignature(
    payload: string | object,
    signature: string,
    secret: string
  ): boolean {
    const [algorithm, hash] = signature.split('=');
    if (!algorithm || !hash) {
      return false;
    }

    const expectedSignature = this.generateHmacSignature(
      payload,
      secret,
      algorithm as 'sha256' | 'sha512'
    );

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  static generateApiKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  static verifyPassword(password: string, hashedPassword: string): boolean {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = crypto
      .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
      .toString('hex');
    return hash === verifyHash;
  }

  static redactSensitiveData(
    data: any,
    sensitiveFields: string[] = [
      'password',
      'token',
      'secret',
      'apiKey',
      'api_key',
      'authorization',
      'ssn',
      'creditCard',
      'credit_card',
    ]
  ): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.redactSensitiveData(item, sensitiveFields));
    }

    const redacted: any = {};
    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase();
      const shouldRedact = sensitiveFields.some((field) =>
        keyLower.includes(field.toLowerCase())
      );

      if (shouldRedact) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactSensitiveData(value, sensitiveFields);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  static sanitizeInput(input: string): string {
    // Remove potential XSS vectors
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }

  static generateTraceSignature(trace: any, secret: string): string {
    return this.generateHmacSignature(trace, secret, 'sha256');
  }

  static verifyTraceSignature(trace: any, signature: string, secret: string): boolean {
    return this.verifyHmacSignature(trace, signature, secret);
  }
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {}

  isAllowed(key: string): boolean {
    const now = Date.now();
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const timestamps = this.requests.get(key)!;
    const recentRequests = timestamps.filter((t) => now - t < this.windowMs);

    if (recentRequests.length >= this.maxRequests) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    
    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    return true;
  }

  getRemainingRequests(key: string): number {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const recentRequests = timestamps.filter((t) => now - t < this.windowMs);
    return Math.max(0, this.maxRequests - recentRequests.length);
  }

  reset(key: string): void {
    this.requests.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.requests.entries()) {
      const recentRequests = timestamps.filter((t) => now - t < this.windowMs);
      if (recentRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recentRequests);
      }
    }
  }
}

export function createRateLimiter(
  maxRequests: number = 100,
  windowMs: number = 60000
): RateLimiter {
  return new RateLimiter(maxRequests, windowMs);
}
