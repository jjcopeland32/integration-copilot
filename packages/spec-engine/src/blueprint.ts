import {
  NormalizedSpec,
  Blueprint,
  BlueprintConfig,
  NormalizedEndpoint,
} from './types';

export class BlueprintGenerator {
  generate(spec: NormalizedSpec, config: BlueprintConfig = {}): Blueprint {
    const filteredEndpoints = this.filterEndpoints(spec.endpoints, config);
    const auth = this.generateAuthInstructions(spec);
    const webhooks = this.generateWebhooks(spec, config);
    const rules = this.generateRules(spec, filteredEndpoints);
    const markdown = this.generateMarkdown(spec, filteredEndpoints, auth, webhooks, rules);

    return {
      version: spec.version,
      spec,
      config,
      endpoints: filteredEndpoints,
      auth,
      webhooks,
      rules,
      markdown,
    };
  }

  private filterEndpoints(
    endpoints: NormalizedEndpoint[],
    config: BlueprintConfig
  ): NormalizedEndpoint[] {
    let filtered = [...endpoints];

    if (config.customerScope?.includedEndpoints) {
      filtered = filtered.filter((e) =>
        config.customerScope!.includedEndpoints!.includes(e.operationId || e.path)
      );
    }

    if (config.customerScope?.excludedEndpoints) {
      filtered = filtered.filter(
        (e) =>
          !config.customerScope!.excludedEndpoints!.includes(e.operationId || e.path)
      );
    }

    return filtered;
  }

  private generateAuthInstructions(spec: NormalizedSpec): {
    type: string;
    instructions: string;
  } {
    if (spec.security.length === 0) {
      return {
        type: 'none',
        instructions: 'No authentication required.',
      };
    }

    const primaryAuth = spec.security[0];
    let instructions = '';

    switch (primaryAuth.type) {
      case 'apiKey':
        instructions = `Use API Key authentication. Include your API key in the ${primaryAuth.in} parameter named "${primaryAuth.name}".`;
        break;
      case 'http':
        if (primaryAuth.scheme === 'bearer') {
          instructions = `Use Bearer token authentication. Include your token in the Authorization header: "Authorization: Bearer YOUR_TOKEN".`;
        } else if (primaryAuth.scheme === 'basic') {
          instructions = `Use Basic authentication. Include credentials in the Authorization header.`;
        }
        break;
      case 'oauth2':
        instructions = `Use OAuth 2.0 authentication. Obtain an access token and include it in the Authorization header.`;
        break;
      default:
        instructions = `Authentication type: ${primaryAuth.type}`;
    }

    return {
      type: primaryAuth.type,
      instructions,
    };
  }

  private generateWebhooks(
    spec: NormalizedSpec,
    config: BlueprintConfig
  ): Array<{ event: string; endpoint: NormalizedEndpoint; payload: any }> {
    if (!config.webhooks?.enabled || !spec.webhooks) {
      return [];
    }

    const webhooks = [];
    for (const [event, endpoint] of Object.entries(spec.webhooks)) {
      if (
        !config.webhooks.endpoints ||
        config.webhooks.endpoints.includes(event)
      ) {
        webhooks.push({
          event,
          endpoint,
          payload: endpoint.requestBody?.content['application/json']?.schema || {},
        });
      }
    }

    return webhooks;
  }

  private generateRules(
    spec: NormalizedSpec,
    endpoints: NormalizedEndpoint[]
  ): Array<{ type: string; description: string; validation: any }> {
    const rules = [];

    // Idempotency rule
    const hasIdempotencyKey = endpoints.some((e) =>
      e.parameters.some((p) => p.name.toLowerCase().includes('idempotency'))
    );
    if (hasIdempotencyKey) {
      rules.push({
        type: 'idempotency',
        description: 'Requests with the same idempotency key should return the same result',
        validation: { required: true },
      });
    }

    // Rate limiting
    rules.push({
      type: 'rate_limit',
      description: 'API calls are subject to rate limiting',
      validation: { maxRequestsPerMinute: 100 },
    });

    // Webhook signature verification
    if (spec.webhooks) {
      rules.push({
        type: 'webhook_signature',
        description: 'Webhook payloads must be verified using HMAC signature',
        validation: { algorithm: 'sha256' },
      });
    }

    return rules;
  }

  private generateMarkdown(
    spec: NormalizedSpec,
    endpoints: NormalizedEndpoint[],
    auth: { type: string; instructions: string },
    webhooks: Array<{ event: string; endpoint: NormalizedEndpoint; payload: any }>,
    rules: Array<{ type: string; description: string; validation: any }>
  ): string {
    let md = `# ${spec.title} - Integration Blueprint\n\n`;
    md += `**Version:** ${spec.version}\n\n`;
    
    if (spec.description) {
      md += `${spec.description}\n\n`;
    }

    md += `## Authentication\n\n`;
    md += `**Type:** ${auth.type}\n\n`;
    md += `${auth.instructions}\n\n`;

    md += `## Endpoints\n\n`;
    md += `This blueprint includes ${endpoints.length} endpoints:\n\n`;
    
    for (const endpoint of endpoints) {
      md += `### ${endpoint.method} ${endpoint.path}\n\n`;
      if (endpoint.summary) {
        md += `**Summary:** ${endpoint.summary}\n\n`;
      }
      if (endpoint.description) {
        md += `${endpoint.description}\n\n`;
      }

      if (endpoint.parameters.length > 0) {
        md += `**Parameters:**\n\n`;
        md += `| Name | In | Required | Description |\n`;
        md += `|------|-----|----------|-------------|\n`;
        for (const param of endpoint.parameters) {
          md += `| ${param.name} | ${param.in} | ${param.required ? 'Yes' : 'No'} | ${param.description || '-'} |\n`;
        }
        md += `\n`;
      }

      if (endpoint.requestBody) {
        md += `**Request Body:** Required\n\n`;
      }

      md += `**Responses:**\n\n`;
      for (const [code, response] of Object.entries(endpoint.responses)) {
        md += `- **${code}:** ${response.description}\n`;
      }
      md += `\n`;
    }

    if (webhooks.length > 0) {
      md += `## Webhooks\n\n`;
      for (const webhook of webhooks) {
        md += `### ${webhook.event}\n\n`;
        md += `**Endpoint:** ${webhook.endpoint.method} ${webhook.endpoint.path}\n\n`;
        if (webhook.endpoint.description) {
          md += `${webhook.endpoint.description}\n\n`;
        }
      }
    }

    if (rules.length > 0) {
      md += `## Integration Rules\n\n`;
      for (const rule of rules) {
        md += `### ${rule.type}\n\n`;
        md += `${rule.description}\n\n`;
      }
    }

    md += `## Next Steps\n\n`;
    md += `1. Review the authentication requirements\n`;
    md += `2. Test the endpoints using the provided mock service\n`;
    md += `3. Run the golden test suite\n`;
    md += `4. Implement webhook handlers (if applicable)\n`;
    md += `5. Complete the certification checklist\n`;

    return md;
  }
}

export function createBlueprintGenerator(): BlueprintGenerator {
  return new BlueprintGenerator();
}
