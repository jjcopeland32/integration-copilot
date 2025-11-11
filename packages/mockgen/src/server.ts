import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { Server } from 'http';
import { MockRoute, MockConfig } from './generator';

export class MockServer {
  private app: Express;
  private config: MockConfig;
  private server?: Server;
  private rateLimitByHeader = new Set<string>();

  constructor(config: MockConfig) {
    this.app = express();
    this.config = config;
    this.setupMiddleware();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`[Mock] ${req.method} ${req.path}`);
      next();
    });

    // Rate limiting middleware
    if (this.config.enableRateLimit) {
      const requests = new Map<string, number[]>();
      const rateLimit = this.config.rateLimit || 100;

      this.app.use((req, res, next) => {
        const key = req.ip || 'unknown';
        const now = Date.now();
        const windowMs = 60000; // 1 minute

        if (!requests.has(key)) {
          requests.set(key, []);
        }

        const timestamps = requests.get(key)!;
        const recentRequests = timestamps.filter((t) => now - t < windowMs);
        
        if (recentRequests.length >= rateLimit) {
          res.status(429).json({
            error: 'Too Many Requests',
            message: `Rate limit of ${rateLimit} requests per minute exceeded`,
          });
          return;
        }

        recentRequests.push(now);
        requests.set(key, recentRequests);
        next();
      });
    }
  }

  registerRoutes(routes: MockRoute[]) {
    for (const route of routes) {
      this.registerRoute(route);
    }

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found in mock spec`,
      });
    });
  }

  private registerRoute(route: MockRoute) {
    const method = route.method.toLowerCase() as keyof Express;
    
    (this.app[method] as any)(route.path, async (req: Request, res: Response) => {
      try {
        // Simulate latency
        if (this.config.enableLatency) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.config.latencyMs || 100)
          );
        }

        // Check for idempotency key
        const idempotencyKey = req.headers['idempotency-key'] as string;
        if (idempotencyKey) {
          // In a real implementation, we'd cache responses by idempotency key
          console.log(`[Idempotency] Key: ${idempotencyKey}`);
        }

        if (await this.handleSimulationHeaders(req, res)) {
          return;
        }

        // Return mock response
        res.status(route.statusCode).json(route.response);
      } catch (error) {
        console.error('[Mock Error]', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Mock server error',
        });
      }
    });
  }

  private async handleSimulationHeaders(req: Request, res: Response): Promise<boolean> {
    const rateLimitHeader = req.headers['x-simulate-rate-limit'];
    if (typeof rateLimitHeader === 'string') {
      const key = `${req.ip}:${req.path}`;
      if (rateLimitHeader === 'reset') {
        this.rateLimitByHeader.delete(key);
      } else {
        this.rateLimitByHeader.add(key);
      }
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
      });
      return true;
    }

    const simulateError = req.headers['x-simulate-error'];
    if (simulateError) {
      const statusCode = Number(simulateError) || 500;
      res.status(statusCode).json({
        error: 'Simulated error',
      });
      return true;
    }

    const simulateDelay = req.headers['x-simulate-delay'];
    if (simulateDelay) {
      const delayMs = Number(simulateDelay) || 3000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      res.status(408).json({
        error: 'Request Timeout',
        message: 'Simulated timeout',
      });
      return true;
    }

    const simulateInvalid = req.headers['x-simulate-invalid'];
    if (simulateInvalid && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
      res.status(400).json({
        error: 'Invalid input',
        message: 'Missing required fields',
      });
      return true;
    }

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const body = req.body ?? {};
      if (typeof body.currency === 'string' && body.currency.toUpperCase() === 'INVALID') {
        res.status(400).json({
          error: 'Invalid parameter',
          message: 'Unsupported currency',
          field: 'currency',
        });
        return true;
      }
    }

    return false;
  }

  getApp(): Express {
    return this.app;
  }

  listen(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        console.log(`Mock server running on port ${port}`);
        console.log(`Base URL: ${this.config.baseUrl}`);
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolve, reject) => {
      this.server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    this.server = undefined;
  }
}

export function createMockServer(config: MockConfig): MockServer {
  return new MockServer(config);
}
