import { TRPCError } from '@trpc/server';
import {
  createPartnerRouter,
  partnerProtectedProcedure,
} from '../server';

export const partnerProjectRouter = createPartnerRouter({
  current: partnerProtectedProcedure.query(async ({ ctx }) => {
    const partnerProject = await ctx.prisma.partnerProject.findUnique({
      where: { id: ctx.session.partnerProjectId },
      include: {
        project: {
          include: {
            specs: true,
            planItems: {
              include: {
                evidences: {
                  where: { partnerProjectId: ctx.session.partnerProjectId },
                },
              },
            },
            suites: {
              include: {
                runs: {
                  where: { actor: 'PARTNER' },
                  orderBy: { createdAt: 'desc' },
                  take: 5,
                },
              },
            },
            traces: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
        memberships: {
          include: { partnerUser: true },
        },
        evidences: true,
      },
    });

    if (!partnerProject) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    return partnerProject;
  }),
});
