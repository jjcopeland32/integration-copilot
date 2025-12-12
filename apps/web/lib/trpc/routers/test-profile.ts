import { router, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import {
  detectCapabilities,
  getDefaultProfile,
  TEST_CATEGORIES,
  TEST_CATEGORIES_MAP,
  validateCategorySettings,
  getCategorySettingsSummary,
  type DetectedCapabilities,
  type CategorySettings,
  type NormalizedSpec,
} from '@integration-copilot/spec-engine';

const testCategoryStatusSchema = z.enum(['REQUIRED', 'OPTIONAL', 'NA', 'AUTO']);

/**
 * Helper to verify spec belongs to the user's org via its project
 */
async function verifySpecAccess(
  prisma: PrismaClient,
  specId: string,
  orgId: string
) {
  const spec = await prisma.spec.findFirst({
    where: { id: specId },
    include: { project: true },
  });
  if (!spec || spec.project.orgId !== orgId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Spec not found or access denied',
    });
  }
  return spec;
}

/**
 * Get or create a test profile for a spec
 */
async function getOrCreateTestProfile(
  prisma: PrismaClient,
  specId: string,
  normalizedSpec: NormalizedSpec | null
) {
  // Try to find existing profile
  let profile = await prisma.testProfile.findUnique({
    where: { specId },
  });

  if (profile) {
    return profile;
  }

  // Create default profile
  const capabilities: DetectedCapabilities = normalizedSpec
    ? detectCapabilities(normalizedSpec)
    : {
        hasIdempotency: false,
        hasPagination: false,
        hasWebhooks: false,
        hasWriteOperations: true,
        hasRateLimiting: false,
        hasAuth: true,
        supportedAuthTypes: [],
        apiGroups: ['api'],
        primaryApiGroup: 'api',
        endpointCount: 0,
        methodCounts: {},
      };

  const categorySettings = getDefaultProfile(capabilities);

  profile = await prisma.testProfile.create({
    data: {
      specId,
      apiGroup: capabilities.primaryApiGroup,
      categorySettings: categorySettings as any,
      detectedCapabilities: capabilities as any,
    },
  });

  return profile;
}

/**
 * Format profile for API response
 */
function formatTestProfile(profile: any) {
  const categorySettings = profile.categorySettings as CategorySettings;
  const detectedCapabilities = profile.detectedCapabilities as DetectedCapabilities;

  return {
    id: profile.id,
    specId: profile.specId,
    apiGroup: profile.apiGroup,
    categorySettings,
    detectedCapabilities,
    summary: getCategorySettingsSummary(categorySettings),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export const testProfileRouter = router({
  /**
   * Get test profile for a spec (auto-create with defaults if none exists)
   */
  getBySpec: protectedProcedure
    .input(z.object({ specId: z.string() }))
    .query(async ({ ctx, input }) => {
      const spec = await verifySpecAccess(ctx.prisma, input.specId, ctx.orgId);
      
      const normalizedSpec = spec.normalized as NormalizedSpec | null;
      const profile = await getOrCreateTestProfile(ctx.prisma, input.specId, normalizedSpec);

      return formatTestProfile(profile);
    }),

  /**
   * Update category settings for a test profile
   */
  update: protectedProcedure
    .input(
      z.object({
        specId: z.string(),
        categorySettings: z.record(testCategoryStatusSchema),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifySpecAccess(ctx.prisma, input.specId, ctx.orgId);

      // Validate the settings
      const validation = validateCategorySettings(input.categorySettings);
      if (!validation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Invalid category settings: ${validation.errors.join(', ')}`,
        });
      }

      // Ensure profile exists
      let profile = await ctx.prisma.testProfile.findUnique({
        where: { specId: input.specId },
      });

      if (!profile) {
        // Get spec to create profile
        const spec = await ctx.prisma.spec.findUnique({
          where: { id: input.specId },
        });
        if (!spec) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Spec not found',
          });
        }
        profile = await getOrCreateTestProfile(
          ctx.prisma,
          input.specId,
          spec.normalized as NormalizedSpec | null
        );
      }

      // Update the settings
      const updated = await ctx.prisma.testProfile.update({
        where: { specId: input.specId },
        data: {
          categorySettings: input.categorySettings as any,
        },
      });

      return formatTestProfile(updated);
    }),

  /**
   * Reset profile to auto-detected defaults
   */
  resetToDefaults: protectedProcedure
    .input(z.object({ specId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const spec = await verifySpecAccess(ctx.prisma, input.specId, ctx.orgId);

      const normalizedSpec = spec.normalized as NormalizedSpec | null;
      
      // Re-detect capabilities
      const capabilities: DetectedCapabilities = normalizedSpec
        ? detectCapabilities(normalizedSpec)
        : {
            hasIdempotency: false,
            hasPagination: false,
            hasWebhooks: false,
            hasWriteOperations: true,
            hasRateLimiting: false,
            hasAuth: true,
            supportedAuthTypes: [],
            apiGroups: ['api'],
            primaryApiGroup: 'api',
            endpointCount: 0,
            methodCounts: {},
          };

      const categorySettings = getDefaultProfile(capabilities);

      // Update or create profile
      const profile = await ctx.prisma.testProfile.upsert({
        where: { specId: input.specId },
        create: {
          specId: input.specId,
          apiGroup: capabilities.primaryApiGroup,
          categorySettings: categorySettings as any,
          detectedCapabilities: capabilities as any,
        },
        update: {
          apiGroup: capabilities.primaryApiGroup,
          categorySettings: categorySettings as any,
          detectedCapabilities: capabilities as any,
        },
      });

      return formatTestProfile(profile);
    }),

  /**
   * Get all test categories with their descriptions
   */
  getCategories: protectedProcedure.query(async () => {
    return TEST_CATEGORIES.map((cat) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      dependsOn: cat.dependsOn,
      alwaysApplicable: cat.alwaysApplicable ?? false,
    }));
  }),

  /**
   * Get a single category definition
   */
  getCategory: protectedProcedure
    .input(z.object({ categoryId: z.string() }))
    .query(async ({ input }) => {
      const category = TEST_CATEGORIES_MAP[input.categoryId];
      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        });
      }
      return {
        id: category.id,
        name: category.name,
        description: category.description,
        icon: category.icon,
        dependsOn: category.dependsOn,
        alwaysApplicable: category.alwaysApplicable ?? false,
      };
    }),

  /**
   * Bulk update category settings
   */
  bulkUpdateCategory: protectedProcedure
    .input(
      z.object({
        specId: z.string(),
        categoryId: z.string(),
        status: testCategoryStatusSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifySpecAccess(ctx.prisma, input.specId, ctx.orgId);

      // Verify category exists
      if (!TEST_CATEGORIES_MAP[input.categoryId]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        });
      }

      // Get or create profile
      const spec = await ctx.prisma.spec.findUnique({
        where: { id: input.specId },
      });
      if (!spec) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Spec not found',
        });
      }

      let profile = await ctx.prisma.testProfile.findUnique({
        where: { specId: input.specId },
      });

      if (!profile) {
        profile = await getOrCreateTestProfile(
          ctx.prisma,
          input.specId,
          spec.normalized as NormalizedSpec | null
        );
      }

      // Update single category
      const currentSettings = profile.categorySettings as CategorySettings;
      const updatedSettings = {
        ...currentSettings,
        [input.categoryId]: input.status,
      };

      const updated = await ctx.prisma.testProfile.update({
        where: { specId: input.specId },
        data: {
          categorySettings: updatedSettings as any,
        },
      });

      return formatTestProfile(updated);
    }),
});



