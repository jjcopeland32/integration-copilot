import { randomBytes } from 'crypto';
import type {
  PartnerProject,
  PartnerSession,
  PartnerUser,
  Prisma,
  Project,
} from '@prisma/client';
import { cookies } from 'next/headers';
import { prisma } from '../prisma';

export const PARTNER_SESSION_COOKIE_NAME = 'ic_partner_session';

const ttlHours = Number(process.env.PARTNER_SESSION_TTL_HOURS ?? 24);

const defaultCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/partner',
};

export type PartnerSessionWithRelations = PartnerSession & {
  partnerUser: PartnerUser;
  partnerProject: PartnerProject & { project: Project };
};

const sessionInclude = {
  partnerUser: true,
  partnerProject: {
    include: {
      project: true,
    },
  },
} satisfies Prisma.PartnerSessionInclude;

const expiryFromNow = (hours: number) =>
  new Date(Date.now() + hours * 60 * 60 * 1000);

export async function createPartnerSession(
  partnerUserId: string,
  partnerProjectId: string,
) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = expiryFromNow(ttlHours);
  const session = await prisma.partnerSession.create({
    data: {
      token,
      partnerUserId,
      partnerProjectId,
      expiresAt,
    },
  });
  return session;
}

export async function loadPartnerSession(
  token: string,
): Promise<PartnerSessionWithRelations | null> {
  if (!token) {
    return null;
  }

  const session = await prisma.partnerSession.findUnique({
    where: { token },
    include: sessionInclude,
  });
  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    await prisma.partnerSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  return session;
}

export async function resolvePartnerSessionFromCookies() {
  const token = cookies().get(PARTNER_SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const session = await loadPartnerSession(token);
  return session;
}

export async function revokePartnerSession(token: string) {
  if (!token) {
    return;
  }
  await prisma.partnerSession.deleteMany({ where: { token } });
}

export function getPartnerSessionCookieOptions(expiresAt: Date) {
  return {
    ...defaultCookieOptions,
    expires: expiresAt,
  };
}

export function getPartnerSessionTokenFromHeaders(headers?: Headers) {
  if (!headers) {
    return undefined;
  }

  const cookieHeader = headers.get('cookie');
  if (!cookieHeader) {
    return undefined;
  }

  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) {
      continue;
    }
    if (rawKey === PARTNER_SESSION_COOKIE_NAME) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return undefined;
}

export { defaultCookieOptions as partnerSessionCookieOptions };
