import { PrismaClient, Role } from '@prisma/client';

export interface RBACContext {
  userId: string;
  orgId: string;
}

export class RBACService {
  constructor(private prisma: PrismaClient) {}

  async getUserRole(userId: string, orgId: string): Promise<Role | null> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });
    return membership?.role ?? null;
  }

  async hasRole(
    userId: string,
    orgId: string,
    allowedRoles: Role[]
  ): Promise<boolean> {
    const role = await this.getUserRole(userId, orgId);
    return role !== null && allowedRoles.includes(role);
  }

  async requireRole(
    userId: string,
    orgId: string,
    allowedRoles: Role[]
  ): Promise<void> {
    const hasAccess = await this.hasRole(userId, orgId, allowedRoles);
    if (!hasAccess) {
      throw new Error('Insufficient permissions');
    }
  }

  async canManageOrg(userId: string, orgId: string): Promise<boolean> {
    return this.hasRole(userId, orgId, [Role.OWNER, Role.ADMIN]);
  }

  async canManageProject(userId: string, orgId: string): Promise<boolean> {
    return this.hasRole(userId, orgId, [
      Role.OWNER,
      Role.ADMIN,
      Role.VENDOR,
    ]);
  }

  async canViewProject(userId: string, orgId: string): Promise<boolean> {
    return this.hasRole(userId, orgId, [
      Role.OWNER,
      Role.ADMIN,
      Role.VENDOR,
      Role.PARTNER,
      Role.VIEWER,
    ]);
  }

  async canRunTests(userId: string, orgId: string): Promise<boolean> {
    return this.hasRole(userId, orgId, [
      Role.OWNER,
      Role.ADMIN,
      Role.VENDOR,
      Role.PARTNER,
    ]);
  }

  async canUploadEvidence(userId: string, orgId: string): Promise<boolean> {
    return this.hasRole(userId, orgId, [
      Role.OWNER,
      Role.ADMIN,
      Role.VENDOR,
      Role.PARTNER,
    ]);
  }
}

export function createRBACService(prisma: PrismaClient): RBACService {
  return new RBACService(prisma);
}
