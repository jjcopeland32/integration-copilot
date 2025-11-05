import { TraceData, ValidationResult } from './validator';

export interface TraceStorage {
  save(trace: TraceData): Promise<string>;
  get(traceId: string): Promise<TraceData | null>;
  list(projectId: string, limit?: number): Promise<TraceData[]>;
}

export interface RedactionPolicy {
  enabled: boolean;
  fields: string[];
  patterns: RegExp[];
}

export class TraceManager {
  constructor(
    private storage: TraceStorage,
    private redactionPolicy?: RedactionPolicy
  ) {}

  async saveTrace(trace: TraceData): Promise<string> {
    const redactedTrace = this.applyRedaction(trace);
    return this.storage.save(redactedTrace);
  }

  async getTrace(traceId: string): Promise<TraceData | null> {
    return this.storage.get(traceId);
  }

  async listTraces(projectId: string, limit: number = 50): Promise<TraceData[]> {
    return this.storage.list(projectId, limit);
  }

  private applyRedaction(trace: TraceData): TraceData {
    if (!this.redactionPolicy?.enabled) {
      return trace;
    }

    const redacted = { ...trace };

    // Redact request body
    if (redacted.requestMeta.body) {
      redacted.requestMeta.body = this.redactObject(
        redacted.requestMeta.body,
        this.redactionPolicy
      );
    }

    // Redact response body
    if (redacted.responseMeta.body) {
      redacted.responseMeta.body = this.redactObject(
        redacted.responseMeta.body,
        this.redactionPolicy
      );
    }

    // Redact headers
    redacted.requestMeta.headers = this.redactHeaders(
      redacted.requestMeta.headers
    );
    redacted.responseMeta.headers = this.redactHeaders(
      redacted.responseMeta.headers
    );

    return redacted;
  }

  private redactObject(obj: any, policy: RedactionPolicy): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const redacted: any = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      // Check if field should be redacted
      if (policy.fields.includes(key.toLowerCase())) {
        redacted[key] = '[REDACTED]';
        continue;
      }

      // Check patterns
      const shouldRedact = policy.patterns.some((pattern) =>
        pattern.test(key)
      );
      if (shouldRedact) {
        redacted[key] = '[REDACTED]';
        continue;
      }

      // Recursively redact nested objects
      if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactObject(value, policy);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  private redactHeaders(headers: Record<string, string>): Record<string, string> {
    const redacted = { ...headers };
    const sensitiveHeaders = [
      'authorization',
      'api-key',
      'x-api-key',
      'cookie',
      'set-cookie',
    ];

    for (const header of sensitiveHeaders) {
      if (redacted[header]) {
        redacted[header] = '[REDACTED]';
      }
      if (redacted[header.toLowerCase()]) {
        redacted[header.toLowerCase()] = '[REDACTED]';
      }
    }

    return redacted;
  }

  generateHumanReadableDiff(trace: TraceData): string {
    let output = `# Trace Report\n\n`;
    output += `**Verdict:** ${trace.verdict.toUpperCase()}\n`;
    output += `**Timestamp:** ${trace.requestMeta.timestamp}\n`;
    output += `**Latency:** ${trace.responseMeta.latencyMs}ms\n\n`;

    output += `## Request\n\n`;
    output += `\`\`\`\n${trace.requestMeta.method} ${trace.requestMeta.path}\n\`\`\`\n\n`;

    if (trace.validation.errors.length > 0) {
      output += `## Validation Errors\n\n`;
      for (const error of trace.validation.errors) {
        output += `### ${error.field}\n\n`;
        output += `**Message:** ${error.message}\n\n`;
        if (error.expected) {
          output += `**Expected:** \`${JSON.stringify(error.expected)}\`\n\n`;
        }
        if (error.actual) {
          output += `**Actual:** \`${JSON.stringify(error.actual)}\`\n\n`;
        }
        if (error.specLink) {
          output += `**Spec Reference:** ${error.specLink}\n\n`;
        }
      }
    }

    if (trace.validation.warnings.length > 0) {
      output += `## Warnings\n\n`;
      for (const warning of trace.validation.warnings) {
        output += `- ${warning}\n`;
      }
      output += `\n`;
    }

    output += `## Response\n\n`;
    output += `**Status Code:** ${trace.responseMeta.statusCode}\n\n`;

    if (trace.responseMeta.body) {
      output += `**Body:**\n\n\`\`\`json\n${JSON.stringify(
        trace.responseMeta.body,
        null,
        2
      )}\n\`\`\`\n`;
    }

    return output;
  }
}

export function createTraceManager(
  storage: TraceStorage,
  redactionPolicy?: RedactionPolicy
): TraceManager {
  return new TraceManager(storage, redactionPolicy);
}
