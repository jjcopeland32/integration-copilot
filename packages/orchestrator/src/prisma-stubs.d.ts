declare module '@prisma/client' {
  export enum Role {
    OWNER = 'OWNER',
    ADMIN = 'ADMIN',
    VENDOR = 'VENDOR',
    PARTNER = 'PARTNER',
    VIEWER = 'VIEWER',
  }

  export enum ProjectStatus {
    DRAFT = 'DRAFT',
    IN_PROGRESS = 'IN_PROGRESS',
    READY = 'READY',
    ARCHIVED = 'ARCHIVED',
  }

  export enum PlanStatus {
    TODO = 'TODO',
    IN_PROGRESS = 'IN_PROGRESS',
    BLOCKED = 'BLOCKED',
    DONE = 'DONE',
  }

  export enum ReportKind {
    READINESS = 'READINESS',
    AUDIT = 'AUDIT',
    MIGRATION = 'MIGRATION',
  }

  export type PrismaPromise<T> = Promise<T>;

  export class PrismaClient {
    organization: {
      create(args: unknown): Promise<any>;
    };
    project: {
      create(args: unknown): Promise<any>;
      findUnique(args: unknown): Promise<any>;
      findMany(args: unknown): Promise<any[]>;
      update(args: unknown): Promise<any>;
    };
    membership: {
      findUnique(args: unknown): Promise<{ role: Role } | null>;
    };
    planItem: {
      createMany(args: unknown): Promise<any>;
      create(args: unknown): Promise<any>;
      update(args: unknown): Promise<any>;
      findMany(args: unknown): Promise<any[]>;
      findUnique(args: unknown): Promise<any>;
    };
    report: {
      create(args: unknown): Promise<any>;
      update(args: unknown): Promise<any>;
      findUnique(args: unknown): Promise<any>;
    };
  }
}
