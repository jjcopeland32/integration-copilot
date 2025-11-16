import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  PARTNER_SESSION_COOKIE_NAME,
  createPartnerSession,
  getPartnerSessionCookieOptions,
} from '@/lib/partner/session';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { token, name } = body as { token?: string; name?: string };
  if (!token) {
    return NextResponse.json({ error: 'token is required' }, { status: 400 });
  }

  const invite = await prisma.partnerInvite.findUnique({
    where: { token },
    include: {
      partnerProject: {
        include: {
          project: true,
        },
      },
    },
  });

  if (!invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invite expired' }, { status: 400 });
  }

  const email = invite.email.toLowerCase();

  const partnerUser = await prisma.partnerUser.upsert({
    where: { email },
    update: {
      name: name ?? undefined,
    },
    create: {
      email,
      name: name ?? undefined,
    },
  });

  await prisma.partnerMembership.upsert({
    where: {
      partnerUserId_partnerProjectId: {
        partnerUserId: partnerUser.id,
        partnerProjectId: invite.partnerProjectId,
      },
    },
    update: {},
    create: {
      partnerProjectId: invite.partnerProjectId,
      partnerUserId: partnerUser.id,
      role: 'CONTRIBUTOR',
    },
  });

  if (!invite.acceptedAt) {
    await prisma.partnerInvite.update({
      where: { id: invite.id },
      data: {
        acceptedAt: new Date(),
      },
    });
  }

  const session = await createPartnerSession(
    partnerUser.id,
    invite.partnerProjectId,
  );

  const response = NextResponse.json({
    partnerProjectId: invite.partnerProjectId,
    projectId: invite.partnerProject.projectId,
  });

  response.cookies.set({
    name: PARTNER_SESSION_COOKIE_NAME,
    value: session.token,
    ...getPartnerSessionCookieOptions(session.expiresAt),
  });

  return response;
}
