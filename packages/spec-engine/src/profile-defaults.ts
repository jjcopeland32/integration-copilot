import { DetectedCapabilities } from './capability-detector';

/**
 * Status for a test category in a profile
 */
export type TestCategoryStatus = 'REQUIRED' | 'OPTIONAL' | 'NA' | 'AUTO';

/**
 * Definition of a test category
 */
export interface TestCategoryDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Which capability this category depends on */
  dependsOn?: keyof DetectedCapabilities;
  /** Whether this category is always applicable */
  alwaysApplicable?: boolean;
}

/**
 * All test categories with their metadata
 */
export const TEST_CATEGORIES: TestCategoryDefinition[] = [
  {
    id: 'auth_001',
    name: 'Authentication - Valid Credentials',
    description: 'Validates credential handling and token verification',
    icon: '🔐',
    dependsOn: 'hasAuth',
  },
  {
    id: 'core_001',
    name: 'Create Resource - Success',
    description: 'Tests successful resource creation via POST endpoints',
    icon: '➕',
    dependsOn: 'hasWriteOperations',
  },
  {
    id: 'edge_001',
    name: 'Idempotency - Duplicate Request',
    description: 'Tests duplicate request handling with idempotency keys',
    icon: '🔁',
    dependsOn: 'hasIdempotency',
  },
  {
    id: 'error_001',
    name: 'Invalid Input - Missing Required Fields',
    description: 'Tests error handling for invalid or missing input data',
    icon: '❌',
    dependsOn: 'hasWriteOperations',
  },
  {
    id: 'webhook_001',
    name: 'Webhook - Signature Verification',
    description: 'Tests webhook signature validation and payload handling',
    icon: '📡',
    dependsOn: 'hasWebhooks',
  },
  {
    id: 'edge_002',
    name: 'Rate Limiting - Exceeded',
    description: 'Tests rate limit enforcement and 429 response handling',
    icon: '⏱️',
    dependsOn: 'hasRateLimiting',
  },
  {
    id: 'edge_003',
    name: 'Timeout Handling',
    description: 'Tests proper timeout handling for slow requests',
    icon: '⌛',
    alwaysApplicable: true,
  },
  {
    id: 'core_002',
    name: 'Refund/Reversal - Success',
    description: 'Tests successful resource deletion or reversal operations',
    icon: '↩️',
    dependsOn: 'hasWriteOperations',
  },
  {
    id: 'edge_004',
    name: 'Retry Logic - Transient Failure',
    description: 'Tests retry behavior on transient failures (503, network errors)',
    icon: '🔄',
    alwaysApplicable: true,
  },
  {
    id: 'error_002',
    name: 'Invalid Parameter - Unsupported Value',
    description: 'Tests error handling for invalid parameter values',
    icon: '⚠️',
    dependsOn: 'hasWriteOperations',
  },
];

/**
 * Map of category ID to definition for quick lookup
 */
export const TEST_CATEGORIES_MAP: Record<string, TestCategoryDefinition> = TEST_CATEGORIES.reduce(
  (acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  },
  {} as Record<string, TestCategoryDefinition>
);

/**
 * Category settings - map of category ID to status
 */
export type CategorySettings = Record<string, TestCategoryStatus>;

/**
 * Get default test profile based on detected capabilities
 */
export function getDefaultProfile(capabilities: DetectedCapabilities): CategorySettings {
  const settings: CategorySettings = {};

  for (const category of TEST_CATEGORIES) {
    if (category.alwaysApplicable) {
      // Always applicable categories default to AUTO
      settings[category.id] = 'AUTO';
    } else if (category.dependsOn) {
      // Check if the capability is present
      const capabilityValue = capabilities[category.dependsOn];
      
      if (typeof capabilityValue === 'boolean' && !capabilityValue) {
        // Capability not present - mark as N/A
        settings[category.id] = 'NA';
      } else {
        // Capability present - default to AUTO
        settings[category.id] = 'AUTO';
      }
    } else {
      // No dependency - default to AUTO
      settings[category.id] = 'AUTO';
    }
  }

  return settings;
}

/**
 * Get the list of applicable test categories based on current settings
 */
export function getApplicableCategories(
  settings: CategorySettings,
  capabilities: DetectedCapabilities
): TestCategoryDefinition[] {
  return TEST_CATEGORIES.filter((category) => {
    const status = settings[category.id];
    
    // Skip N/A categories
    if (status === 'NA') {
      return false;
    }
    
    // REQUIRED and OPTIONAL are always included
    if (status === 'REQUIRED' || status === 'OPTIONAL') {
      return true;
    }
    
    // AUTO - check capability
    if (status === 'AUTO') {
      if (category.alwaysApplicable) {
        return true;
      }
      if (category.dependsOn) {
        const capabilityValue = capabilities[category.dependsOn];
        return typeof capabilityValue === 'boolean' ? capabilityValue : true;
      }
      return true;
    }
    
    return false;
  });
}

/**
 * Validate category settings - ensure all categories are covered
 */
export function validateCategorySettings(settings: CategorySettings): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check that at least one category is REQUIRED
  const hasRequired = Object.values(settings).some((s) => s === 'REQUIRED');
  if (!hasRequired) {
    errors.push('At least one test category should be marked as REQUIRED');
  }
  
  // Check that all known categories are present
  for (const category of TEST_CATEGORIES) {
    if (!(category.id in settings)) {
      errors.push(`Missing setting for category: ${category.name}`);
    }
  }
  
  // Check for unknown categories
  for (const categoryId of Object.keys(settings)) {
    if (!TEST_CATEGORIES_MAP[categoryId]) {
      errors.push(`Unknown category: ${categoryId}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Count categories by status
 */
export function countCategoriesByStatus(settings: CategorySettings): Record<TestCategoryStatus, number> {
  const counts: Record<TestCategoryStatus, number> = {
    REQUIRED: 0,
    OPTIONAL: 0,
    NA: 0,
    AUTO: 0,
  };
  
  for (const status of Object.values(settings)) {
    if (status in counts) {
      counts[status]++;
    }
  }
  
  return counts;
}

/**
 * Get a summary string for category settings
 */
export function getCategorySettingsSummary(settings: CategorySettings): string {
  const counts = countCategoriesByStatus(settings);
  const parts: string[] = [];
  
  if (counts.REQUIRED > 0) parts.push(`${counts.REQUIRED} Required`);
  if (counts.OPTIONAL > 0) parts.push(`${counts.OPTIONAL} Optional`);
  if (counts.NA > 0) parts.push(`${counts.NA} N/A`);
  if (counts.AUTO > 0) parts.push(`${counts.AUTO} Auto`);
  
  return parts.join(', ');
}



