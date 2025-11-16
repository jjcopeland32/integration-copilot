import { NextResponse } from 'next/server';
import {
  PARTNER_SESSION_COOKIE_NAME,
  getPartnerSessionCookieOptions,
  getPartnerSessionTokenFromHeaders,
  revokePartnerSession,
} from '@/lib/partner/session';

export async function POST(req: Request) {
  const token = getPartnerSessionTokenFromHeaders(req.headers);
  if (token) {
    await revokePartnerSession(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: PARTNER_SESSION_COOKIE_NAME,
    value: '',
    ...getPartnerSessionCookieOptions(new Date(0)),
  });
  return response;
}
