import type { PrismaClient, Role, Project } from '@prisma/client';

type DemoWorkspaceConfig = {
  userId: string;
  email: string;
  name: string;
  orgId: string;
  orgName: string;
  role: Role;
  projectName: string;
};

function getDemoWorkspaceConfig(): DemoWorkspaceConfig {
  return {
    userId: process.env.DEMO_USER_ID ?? 'user_demo',
    email: process.env.DEMO_USER_EMAIL ?? 'demo@integration.local',
    name: process.env.DEMO_USER_NAME ?? 'Demo Integrator',
    orgId: process.env.DEMO_ORG_ID ?? 'org_demo',
    orgName: process.env.DEMO_ORG_NAME ?? 'Demo Integration Org',
    role: (process.env.DEMO_USER_ROLE as Role) ?? 'OWNER',
    projectName: process.env.DEMO_PROJECT_NAME ?? 'Payments Baseline',
  };
}

export async function ensureDemoWorkspace(
  prisma: PrismaClient,
  opts: { userId?: string | null; orgId?: string | null } = {}
) {
  const config = getDemoWorkspaceConfig();
  const userId = opts.userId ?? config.userId;
  const orgId = opts.orgId ?? config.orgId;

  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {
      email: config.email,
      name: config.name,
    },
    create: {
      id: userId,
      email: config.email,
      name: config.name,
    },
  });

  const org = await prisma.organization.upsert({
    where: { id: orgId },
    update: { name: config.orgName },
    create: {
      id: orgId,
      name: config.orgName,
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_orgId: {
        userId,
        orgId,
      },
    },
    update: {
      role: config.role,
    },
    create: {
      userId,
      orgId,
      role: config.role,
    },
  });

  let project = await prisma.project.findFirst({
    where: { orgId },
    orderBy: { createdAt: 'asc' },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        orgId,
        name: config.projectName,
        status: 'ACTIVE',
      },
    });
  }

  return { user, org, project };
}

export async function resolveProject(
  prisma: PrismaClient,
  opts: { projectId?: string | null; userId?: string | null; orgId?: string | null } = {}
) {
  if (opts.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: opts.projectId },
    });
    if (!project) {
      throw new Error('Project not found');
    }
    return project;
  }

  // Prefer an existing project for the user's org
  if (opts.orgId) {
    const existing = await prisma.project.findFirst({
      where: { orgId: opts.orgId },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return existing;
    return prisma.project.create({
      data: {
        orgId: opts.orgId,
        name: 'Starter Project',
        status: 'ACTIVE',
      },
    });
  }

  // Fallback to demo workspace for unauthenticated contexts
  const { project } = await ensureDemoWorkspace(prisma, {
    userId: opts.userId,
    orgId: opts.orgId,
  });
  return project;
}

export async function ensureProjectForSpec(
  prisma: PrismaClient,
  projectId: string | undefined | null,
  ctx: { userId?: string | null; orgId?: string | null }
): Promise<Project> {
  return resolveProject(prisma, {
    projectId,
    userId: ctx.userId,
    orgId: ctx.orgId,
  });
}
