import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = process.env.TELEMETRY_SIGNING_SECRET || '';
  const sig = req.headers.get('x-trace-signature') || '';
  // TODO: Replace with real HMAC verification
  if (!secret || !sig) {
    return NextResponse.json({ ok: false, error: 'missing signature or secret' }, { status: 400 });
  }
  const payload = await req.json().catch(() => ({}));
  // In MVP, we just log. Later: persist via Prisma if DATABASE_URL provided.
  console.log('TRACE', { sig, payload });
  return NextResponse.json({ ok: true });
}

export function GET() {
  return NextResponse.json({ ok: true, info: 'POST trace payloads here with x-trace-signature header' });
}