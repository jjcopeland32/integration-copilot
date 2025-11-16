import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const INVITE_TTL_HOURS = Number(process.env.PARTNER_INVITE_TTL_HOURS ?? 72);

const expiresAtFromNow = () =>
  new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.orgId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { projectId, email, partnerName, partnerProjectId } = body as {
    projectId?: string;
    email?: string;
    partnerName?: string;
    partnerProjectId?: string;
  };

  if (!projectId || !email) {
    return NextResponse.json(
      { error: 'projectId and email are required' },
      { status: 400 },
    );
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      orgId: session.user.orgId,
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let partnerProject =
    partnerProjectId
      ? await prisma.partnerProject.findUnique({
          where: { id: partnerProjectId },
        })
      : await prisma.partnerProject.findFirst({
          where: {
            projectId: project.id,
            partnerName: partnerName ?? email,
          },
        });

  if (partnerProject && partnerProject.projectId !== project.id) {
    return NextResponse.json(
      { error: 'Partner project mismatch' },
      { status: 400 },
    );
  }

  if (!partnerProject) {
    partnerProject = await prisma.partnerProject.create({
      data: {
        projectId: project.id,
        partnerName: partnerName ?? email,
        status: 'PENDING',
      },
    });
  }

  const expiresAt = expiresAtFromNow();
  const token = randomBytes(24).toString('hex');

  const invite = await prisma.partnerInvite.create({
    data: {
      email: email.toLowerCase(),
      token,
      expiresAt,
      partnerProjectId: partnerProject.id,
    },
  });

  return NextResponse.json({
    inviteId: invite.id,
    partnerProjectId: partnerProject.id,
    expiresAt,
    token,
  });
}
