import {
  createPartnerRouter,
  partnerProtectedProcedure,
} from '../server';

export const partnerAuthRouter = createPartnerRouter({
  session: partnerProtectedProcedure.query(({ ctx }) => {
    const { session } = ctx;
    return {
      id: session.id,
      expiresAt: session.expiresAt,
      partnerProjectId: session.partnerProjectId,
      projectId: session.partnerProject.projectId,
      partnerUser: {
        id: session.partnerUser.id,
        email: session.partnerUser.email,
        name: session.partnerUser.name,
      },
      partnerProject: {
        id: session.partnerProject.id,
        partnerName: session.partnerProject.partnerName,
        status: session.partnerProject.status,
        requirements: session.partnerProject.requirements,
      },
    };
  }),
});
