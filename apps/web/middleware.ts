import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  PARTNER_SESSION_COOKIE_NAME,
} from '@/lib/partner/session';

/**
 * Protected route patterns for the client portal.
 * All project-scoped pages are now nested under /projects/[id]/
 */
const CLIENT_PROTECTED_PATTERNS = [
  '/projects',
];

/**
 * Routes that should be publicly accessible (no auth required).
 */
const PUBLIC_PATTERNS = [
  '/login',
  '/api/auth',
  '/api/health',
  '/_next',
  '/favicon.ico',
];

/**
 * Partner portal protected routes (require partner session cookie).
 */
const PARTNER_PORTAL_PATTERN = '/partner';
const PARTNER_LOGIN_PATH = '/partner/login';
const PARTNER_API_PATTERNS = ['/api/partner/auth', '/api/partner/invite'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes through
  if (PUBLIC_PATTERNS.some((pattern) => pathname.startsWith(pattern))) {
    return NextResponse.next();
  }

  // Handle partner portal routes
  if (pathname.startsWith(PARTNER_PORTAL_PATTERN)) {
    // Allow partner auth/invite APIs
    if (PARTNER_API_PATTERNS.some((pattern) => pathname.startsWith(pattern))) {
      return NextResponse.next();
    }

    // Allow partner login page
    if (pathname === PARTNER_LOGIN_PATH) {
      return NextResponse.next();
    }

    // Check for partner session cookie
    const partnerToken = request.cookies.get(PARTNER_SESSION_COOKIE_NAME)?.value;
    
    if (!partnerToken) {
      const loginUrl = new URL(PARTNER_LOGIN_PATH, request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Partner has a token - allow through (actual session validation happens in layout)
    return NextResponse.next();
  }

  // Handle client portal protected routes
  if (CLIENT_PROTECTED_PATTERNS.some((pattern) => pathname.startsWith(pattern))) {
    // Check for NextAuth session
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // Handle root path - redirect to login if not authenticated
  if (pathname === '/') {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Authenticated users go to projects
    return NextResponse.redirect(new URL('/projects', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
