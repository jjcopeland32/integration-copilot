export interface AppConfig {
  database: {
    url: string;
  };
  auth: {
    secret: string;
    sessionMaxAge: number;
  };
  features: {
    mockService: boolean;
    goldenTests: boolean;
    validator: boolean;
    planBoard: boolean;
    readinessReports: boolean;
    slackIntegration: boolean;
    jiraIntegration: boolean;
  };
  integrations: {
    slack?: {
      webhookUrl: string;
      enabled: boolean;
    };
    jira?: {
      baseUrl: string;
      email: string;
      apiToken: string;
      projectKey: string;
      enabled: boolean;
    };
  };
  security: {
    webhookSecret: string;
    traceSigningSecret: string;
    enableRedaction: boolean;
    redactionFields: string[];
  };
  rateLimit: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
}

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    console.warn(`Environment variable ${key} is not set`);
    return '';
  }
  return value || defaultValue || '';
}

function getEnvBool(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function getEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function loadConfig(): AppConfig {
  return {
    database: {
      url: getEnv('DATABASE_URL', 'postgresql://localhost:5432/integration_copilot'),
    },
    auth: {
      secret: getEnv('AUTH_SECRET', 'development-secret-change-in-production'),
      sessionMaxAge: getEnvInt('SESSION_MAX_AGE', 30 * 24 * 60 * 60), // 30 days
    },
    features: {
      mockService: getEnvBool('FEATURE_MOCK_SERVICE', true),
      goldenTests: getEnvBool('FEATURE_GOLDEN_TESTS', true),
      validator: getEnvBool('FEATURE_VALIDATOR', true),
      planBoard: getEnvBool('FEATURE_PLAN_BOARD', true),
      readinessReports: getEnvBool('FEATURE_READINESS_REPORTS', true),
      slackIntegration: getEnvBool('FEATURE_SLACK', false),
      jiraIntegration: getEnvBool('FEATURE_JIRA', false),
    },
    integrations: {
      slack: getEnv('SLACK_WEBHOOK_URL')
        ? {
            webhookUrl: getEnv('SLACK_WEBHOOK_URL'),
            enabled: getEnvBool('SLACK_ENABLED', false),
          }
        : undefined,
      jira: getEnv('JIRA_BASE_URL')
        ? {
            baseUrl: getEnv('JIRA_BASE_URL'),
            email: getEnv('JIRA_EMAIL'),
            apiToken: getEnv('JIRA_API_TOKEN'),
            projectKey: getEnv('JIRA_PROJECT_KEY'),
            enabled: getEnvBool('JIRA_ENABLED', false),
          }
        : undefined,
    },
    security: {
      webhookSecret: getEnv('WEBHOOK_SECRET', 'webhook-secret-change-in-production'),
      traceSigningSecret: getEnv('TRACE_SIGNING_SECRET', 'trace-secret-change-in-production'),
      enableRedaction: getEnvBool('ENABLE_REDACTION', true),
      redactionFields: getEnv('REDACTION_FIELDS', 'password,token,secret,ssn,creditCard')
        .split(',')
        .map((f) => f.trim()),
    },
    rateLimit: {
      enabled: getEnvBool('RATE_LIMIT_ENABLED', true),
      maxRequests: getEnvInt('RATE_LIMIT_MAX_REQUESTS', 100),
      windowMs: getEnvInt('RATE_LIMIT_WINDOW_MS', 60000),
    },
  };
}

export const config = loadConfig();
