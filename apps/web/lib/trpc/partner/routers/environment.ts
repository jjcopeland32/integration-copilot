import {
  createPartnerRouter,
  partnerProtectedProcedure,
} from '../server';

/**
 * Mask environment for partner API response - never expose credentials
 */
function maskEnvironmentForPartner(environment: any) {
  return {
    id: environment.id,
    projectId: environment.projectId,
    name: environment.name,
    type: environment.type,
    baseUrl: environment.baseUrl,
    authType: environment.authType,
    hasCredentials: environment.credentials !== null && environment.credentials !== undefined,
    isDefault: environment.isDefault,
    isActive: environment.isActive,
  };
}

export const partnerEnvironmentRouter = createPartnerRouter({
  /**
   * List all active environments for the partner's project
   */
  list: partnerProtectedProcedure.query(async ({ ctx }) => {
    // Get the project ID from the partner's session
    const partnerProject = await ctx.prisma.partnerProject.findUnique({
      where: { id: ctx.session.partnerProjectId },
      select: { projectId: true },
    });

    if (!partnerProject) {
      return [];
    }

    const environments = await ctx.prisma.environment.findMany({
      where: {
        projectId: partnerProject.projectId,
        isActive: true, // Partners only see active environments
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    return environments.map(maskEnvironmentForPartner);
  }),
});



