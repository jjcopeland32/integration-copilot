import { router, protectedProcedure } from '../server';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { Prisma, type PrismaClient } from '@prisma/client';
import { encryptCredentials, decryptCredentials } from '@/lib/encryption';

// Credential schemas for different auth types
const apiKeyCredentialsSchema = z.object({
  apiKey: z.string().min(1),
  headerName: z.string().default('X-API-Key'),
});

const oauth2CredentialsSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  tokenUrl: z.string().url(),
  scopes: z.array(z.string()).optional(),
});

const basicCredentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const credentialsSchema = z.union([
  apiKeyCredentialsSchema,
  oauth2CredentialsSchema,
  basicCredentialsSchema,
  z.object({}), // Empty for NONE auth type
]);

const headersSchema = z.record(z.string()).optional();

const environmentTypeSchema = z.enum(['MOCK', 'SANDBOX', 'UAT', 'PRODUCTION']);
const authTypeSchema = z.enum(['NONE', 'API_KEY', 'OAUTH2', 'BASIC']);

/**
 * Helper to verify project belongs to the user's org
 */
async function verifyProjectAccess(
  prisma: PrismaClient,
  projectId: string,
  orgId: string
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, orgId },
  });
  if (!project) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Project not found or access denied',
    });
  }
  return project;
}

/**
 * Helper to verify environment belongs to user's org via its project
 */
async function verifyEnvironmentAccess(
  prisma: PrismaClient,
  environmentId: string,
  orgId: string
) {
  const environment = await prisma.environment.findFirst({
    where: { id: environmentId },
    include: { project: true },
  });
  if (!environment || environment.project.orgId !== orgId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Environment not found or access denied',
    });
  }
  return environment;
}

/**
 * Mask environment for API response - never expose credentials
 */
function maskEnvironment(environment: any) {
  const credentials = environment.credentials;
  const hasCredentials = credentials !== null && credentials !== undefined;
  
  // Determine what type of credentials are set (without exposing values)
  let credentialsSummary: Record<string, boolean> = {};
  if (hasCredentials) {
    try {
      const decrypted = decryptCredentials(credentials as string);
      if (decrypted) {
        credentialsSummary = {
          hasApiKey: 'apiKey' in decrypted,
          hasClientId: 'clientId' in decrypted,
          hasUsername: 'username' in decrypted,
        };
      }
    } catch {
      // If decryption fails, just indicate credentials exist
    }
  }

  return {
    id: environment.id,
    projectId: environment.projectId,
    name: environment.name,
    type: environment.type,
    baseUrl: environment.baseUrl,
    authType: environment.authType,
    hasCredentials,
    credentialsSummary,
    headers: environment.headers,
    isDefault: environment.isDefault,
    isActive: environment.isActive,
    createdAt: environment.createdAt,
    updatedAt: environment.updatedAt,
  };
}

/**
 * Test connection to an environment by making a simple request
 */
async function testEnvironmentConnection(
  baseUrl: string,
  authType: string,
  credentials: Record<string, unknown> | null,
  headers: Record<string, string> | null,
  timeoutMs: number = 5000
): Promise<{ success: boolean; statusCode?: number; error?: string; latencyMs: number }> {
  const startTime = Date.now();
  
  try {
    const requestHeaders: Record<string, string> = {
      'User-Agent': 'IntegrationCopilot/1.0',
      ...(headers || {}),
    };

    // Add auth headers based on auth type
    if (credentials) {
      switch (authType) {
        case 'API_KEY':
          const apiKeyCreds = credentials as { apiKey: string; headerName?: string };
          requestHeaders[apiKeyCreds.headerName || 'X-API-Key'] = apiKeyCreds.apiKey;
          break;
        case 'BASIC':
          const basicCreds = credentials as { username: string; password: string };
          const basicAuth = Buffer.from(`${basicCreds.username}:${basicCreds.password}`).toString('base64');
          requestHeaders['Authorization'] = `Basic ${basicAuth}`;
          break;
        case 'OAUTH2':
          // For OAuth2, we'd need to fetch a token first - for now just test the base URL
          // A full implementation would call the token endpoint
          break;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(baseUrl, {
      method: 'HEAD',
      headers: requestHeaders,
      signal: controller.signal,
    }).catch(async () => {
      // If HEAD fails, try GET
      return fetch(baseUrl, {
        method: 'GET',
        headers: requestHeaders,
        signal: controller.signal,
      });
    });

    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startTime;

    return {
      success: response.ok || response.status < 500,
      statusCode: response.status,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      error: errorMessage.includes('abort') ? 'Connection timed out' : errorMessage,
      latencyMs,
    };
  }
}

export const environmentRouter = router({
  /**
   * List all environments for a project
   */
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.prisma, input.projectId, ctx.orgId);

      const environments = await ctx.prisma.environment.findMany({
        where: { projectId: input.projectId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });

      return environments.map(maskEnvironment);
    }),

  /**
   * Get a single environment by ID
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const environment = await verifyEnvironmentAccess(ctx.prisma, input.id, ctx.orgId);
      return maskEnvironment(environment);
    }),

  /**
   * Create a new environment
   */
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1).max(100),
        type: environmentTypeSchema,
        baseUrl: z.string().url().optional().nullable(),
        authType: authTypeSchema.default('NONE'),
        credentials: credentialsSchema.optional().nullable(),
        headers: headersSchema,
        isDefault: z.boolean().default(false),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyProjectAccess(ctx.prisma, input.projectId, ctx.orgId);

      // Validate that non-MOCK types have a baseUrl
      if (input.type !== 'MOCK' && !input.baseUrl) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'baseUrl is required for non-MOCK environment types',
        });
      }

      // Encrypt credentials if provided
      const encryptedCredentials = encryptCredentials(
        input.credentials as Record<string, unknown> | null
      );

      // If this is set as default, unset other defaults for this project
      if (input.isDefault) {
        await ctx.prisma.environment.updateMany({
          where: { projectId: input.projectId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const environment = await ctx.prisma.environment.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          type: input.type,
          baseUrl: input.baseUrl,
          authType: input.authType,
          credentials: encryptedCredentials ?? Prisma.DbNull,
          headers: input.headers ?? Prisma.DbNull,
          isDefault: input.isDefault,
          isActive: input.isActive,
        },
      });

      return maskEnvironment(environment);
    }),

  /**
   * Update an existing environment
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        type: environmentTypeSchema.optional(),
        baseUrl: z.string().url().optional().nullable(),
        authType: authTypeSchema.optional(),
        credentials: credentialsSchema.optional().nullable(),
        headers: headersSchema,
        isDefault: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await verifyEnvironmentAccess(ctx.prisma, input.id, ctx.orgId);

      const { id, credentials, ...updates } = input;

      // Validate baseUrl requirement
      const newType = updates.type ?? existing.type;
      const newBaseUrl = updates.baseUrl !== undefined ? updates.baseUrl : existing.baseUrl;
      if (newType !== 'MOCK' && !newBaseUrl) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'baseUrl is required for non-MOCK environment types',
        });
      }

      // Handle credentials update
      let encryptedCredentials: string | null | undefined = undefined;
      if (credentials !== undefined) {
        encryptedCredentials = encryptCredentials(
          credentials as Record<string, unknown> | null
        );
      }

      // If setting as default, unset other defaults
      if (updates.isDefault) {
        await ctx.prisma.environment.updateMany({
          where: { 
            projectId: existing.projectId, 
            isDefault: true,
            id: { not: id },
          },
          data: { isDefault: false },
        });
      }

      const environment = await ctx.prisma.environment.update({
        where: { id },
        data: {
          ...updates,
          ...(encryptedCredentials !== undefined && { 
            credentials: encryptedCredentials ?? Prisma.DbNull 
          }),
        },
      });

      return maskEnvironment(environment);
    }),

  /**
   * Delete an environment
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyEnvironmentAccess(ctx.prisma, input.id, ctx.orgId);

      await ctx.prisma.environment.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Set an environment as the default for its project
   */
  setDefault: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const environment = await verifyEnvironmentAccess(ctx.prisma, input.id, ctx.orgId);

      // Unset current default
      await ctx.prisma.environment.updateMany({
        where: { projectId: environment.projectId, isDefault: true },
        data: { isDefault: false },
      });

      // Set new default
      const updated = await ctx.prisma.environment.update({
        where: { id: input.id },
        data: { isDefault: true },
      });

      return maskEnvironment(updated);
    }),

  /**
   * Test connection to an environment
   */
  testConnection: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        timeoutMs: z.number().min(1000).max(30000).default(5000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const environment = await verifyEnvironmentAccess(ctx.prisma, input.id, ctx.orgId);

      if (!environment.baseUrl) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot test connection: environment has no baseUrl configured',
        });
      }

      // Decrypt credentials for the test
      const credentials = decryptCredentials(environment.credentials as string | null);
      const headers = environment.headers as Record<string, string> | null;

      const result = await testEnvironmentConnection(
        environment.baseUrl,
        environment.authType,
        credentials,
        headers,
        input.timeoutMs
      );

      return {
        environmentId: environment.id,
        environmentName: environment.name,
        ...result,
      };
    }),
});



