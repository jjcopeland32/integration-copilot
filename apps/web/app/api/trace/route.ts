import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { RBACError, requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { ensureTelemetrySecret } from '@/lib/projects/telemetry';
import { withRateLimit, traceIngestionConfig } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const DEFAULT_REDACTION_FIELDS = ['cardNumber', 'cvv', 'ssn', 'password'];

type Primitive = string | number | boolean | null;

type Redactable = Primitive | Record<string, any> | Array<any>;

type TracePayload = {
  projectId: string;
  requestMeta: Record<string, any>;
  responseMeta: Record<string, any>;
  verdict: string;
};

function getRedactionList(): string[] {
  const envList = process.env.TELEMETRY_REDACT_FIELDS;
  if (!envList) return DEFAULT_REDACTION_FIELDS;
  return envList
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function redactValue(value: Redactable, fields: Set<string>): Redactable {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, fields));
  }

  if (value && typeof value === 'object') {
    const redacted: Record<string, Redactable> = {};
    for (const [key, val] of Object.entries(value)) {
      if (fields.has(key)) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactValue(val as Redactable, fields);
      }
    }
    return redacted;
  }

  return value;
}

function timingSafeCompare(expected: string, received: string) {
  const expectedBuffer = Buffer.from(expected, 'hex');
  const receivedBuffer = Buffer.from(received, 'hex');
  if (expectedBuffer.length === 0 || expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function POST(req: NextRequest) {
  // Check rate limit first
  const rateLimitResponse = withRateLimit(req, traceIngestionConfig);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    await requireRole(['OWNER', 'ADMIN', 'VENDOR', 'PARTNER']);
  } catch (error) {
    if (error instanceof RBACError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    throw error;
  }

  const signature = req.headers.get('x-trace-signature');
  if (!signature) {
    return NextResponse.json(
      { ok: false, error: 'missing x-trace-signature header' },
      { status: 401 }
    );
  }

  const rawBody = await req.text();
  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON payload' }, { status: 400 });
  }

  const projectId = typeof (payload as any)?.projectId === 'string' ? (payload as any).projectId : null;
  if (!projectId) {
    return NextResponse.json({ ok: false, error: 'payload must include projectId' }, { status: 400 });
  }

  let secret: string;
  try {
    secret = await ensureTelemetrySecret(projectId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'project not found';
    return NextResponse.json({ ok: false, error: message }, { status: 404 });
  }

  const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const isValid = timingSafeCompare(expectedSignature, signature);

  if (!isValid) {
    return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 401 });
  }

  const fields = new Set(getRedactionList());
  const sanitized = redactValue(payload as Redactable, fields) as TracePayload;

  if (!sanitized.projectId || !sanitized.requestMeta || !sanitized.responseMeta || !sanitized.verdict) {
    return NextResponse.json(
      { ok: false, error: 'payload must include projectId, requestMeta, responseMeta, verdict' },
      { status: 400 }
    );
  }

  const traceRecord = await prisma.trace.create({
    data: {
      projectId,
      requestMeta: sanitized.requestMeta,
      responseMeta: sanitized.responseMeta,
      verdict: sanitized.verdict,
      signatureStatus: 'valid',
      redaction: {
        fields: Array.from(fields),
      },
    },
  });

  return NextResponse.json({ ok: true, id: traceRecord.id });
}

export async function GET() {
  try {
    await requireRole(['OWNER', 'ADMIN', 'VENDOR', 'PARTNER']);
  } catch (error) {
    if (error instanceof RBACError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    throw error;
  }

  return NextResponse.json({ ok: true, info: 'POST trace payloads here with x-trace-signature header' });
}
