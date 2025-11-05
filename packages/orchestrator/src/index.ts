import { PrismaClient, ProjectStatus, Role } from '@prisma/client';
import { createRBACService, RBACService } from './rbac';

export interface CreateOrgInput {
  name: string;
  ownerUserId: string;
}

export interface CreateProjectInput {
  orgId: string;
  name: string;
  userId: string;
  vendorConfig?: Record<string, any>;
}

export class Orchestrator {
  private rbac: RBACService;

  constructor(private prisma: PrismaClient) {
    this.rbac = createRBACService(prisma);
  }

  async createOrganization(input: CreateOrgInput) {
    const org = await this.prisma.organization.create({
      data: {
        name: input.name,
        memberships: {
          create: {
            userId: input.ownerUserId,
            role: Role.OWNER,
          },
        },
      },
      include: {
        memberships: true,
      },
    });
    return org;
  }

  async createProject(input: CreateProjectInput) {
    await this.rbac.requireRole(input.userId, input.orgId, [
      Role.OWNER,
      Role.ADMIN,
      Role.VENDOR,
    ]);

    const project = await this.prisma.project.create({
      data: {
        orgId: input.orgId,
        name: input.name,
        status: ProjectStatus.DRAFT,
        vendorConfig: (input.vendorConfig as any) || null,
      },
    });
    return project;
  }

  async getProject(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        org: true,
        specs: true,
        blueprints: true,
        mocks: true,
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    await this.rbac.requireRole(userId, project.orgId, [
      Role.OWNER,
      Role.ADMIN,
      Role.VENDOR,
      Role.PARTNER,
      Role.VIEWER,
    ]);

    return project;
  }

  async listProjects(orgId: string, userId: string) {
    await this.rbac.requireRole(userId, orgId, [
      Role.OWNER,
      Role.ADMIN,
      Role.VENDOR,
      Role.PARTNER,
      Role.VIEWER,
    ]);

    return this.prisma.project.findMany({
      where: { orgId },
      include: {
        specs: true,
        blueprints: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateProjectStatus(
    projectId: string,
    userId: string,
    status: ProjectStatus
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    await this.rbac.requireRole(userId, project.orgId, [
      Role.OWNER,
      Role.ADMIN,
    ]);

    return this.prisma.project.update({
      where: { id: projectId },
      data: { status },
    });
  }

  getRBAC(): RBACService {
    return this.rbac;
  }
}

export function createOrchestrator(prisma: PrismaClient): Orchestrator {
  return new Orchestrator(prisma);
}

export * from './rbac';
export * from './plan-board';
export * from './reports';
