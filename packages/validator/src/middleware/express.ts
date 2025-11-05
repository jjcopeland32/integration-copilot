// packages/validator/src/middleware/express.ts
// Minimal Express middleware that validates a request/response against a schema+rules.
// Replace `validateAgainstSchema` with your real validator and signing logic.

import type { Request, Response, NextFunction } from 'express';

type ValidatorOptions = {
  schemaRef?: string;
  rules?: Record<string, any>;
  redact?: { fields?: string[] };
  projectId: string;
  telemetryUrl: string; // e.g., `${APP_URL}/api/trace`
  signingSecret: string;
};

function sign(payload: any, secret: string) {
  // TODO: HMAC signature with secret
  return 'signature';
}

async function postTrace(url: string, body: any, signature: string) {
  await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-trace-signature': signature },
    body: JSON.stringify(body),
  });
}

export function createValidator(opts: ValidatorOptions) {
  return async function validator(req: Request, res: Response, next: NextFunction) {
    const started = Date.now();
    const send = res.send;

    (res as any).send = async function (body?: any) {
      try {
        const latency = Date.now() - started;
        const requestMeta = {
          method: req.method,
          url: req.originalUrl,
          headers: req.headers,
          body: (req as any).body,
        };
        const responseMeta = {
          status: res.statusCode,
          headers: res.getHeaders(),
          body,
          latency,
        };

        // TODO: real validation
        const verdict = 'PASS'; // or 'FAIL' with reasons

        const tracePayload = {
          projectId: opts.projectId,
          requestMeta,
          responseMeta,
          verdict,
          schemaRef: opts.schemaRef,
          rules: opts.rules,
        };

        if (opts.redact?.fields?.length) {
          for (const f of opts.redact.fields) {
            if (requestMeta.body && requestMeta.body[f]) requestMeta.body[f] = '***';
            if (responseMeta.body && responseMeta.body[f]) responseMeta.body[f] = '***';
          }
        }

        const sig = sign(tracePayload, opts.signingSecret);
        await postTrace(opts.telemetryUrl, tracePayload, sig);
      } catch (e) {
        // swallow telemetry errors; never block response
        console.warn('trace post failed', e);
      }
      return send.call(this, body);
    };

    next();
  };
}
