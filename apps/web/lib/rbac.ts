import { auth } from './auth';

export type Role = 'OWNER' | 'ADMIN' | 'VENDOR' | 'PARTNER' | 'VIEWER';

export class RBACError extends Error {
  status: number;

  constructor(message = 'Unauthorized', status = 401) {
    super(message);
    this.name = 'RBACError';
    this.status = status;
  }
}

export async function requireRole(allowed: Role[]) {
  if (process.env.RBAC_DISABLED === 'true') {
    return { session: null, role: 'VIEWER' as Role };
  }

  const session = await auth();
  const role = (session?.user as { role?: Role } | undefined)?.role;

  if (!session || !role || !allowed.includes(role)) {
    throw new RBACError('Forbidden', session ? 403 : 401);
  }

  return { session, role };
}
