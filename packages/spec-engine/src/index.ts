import yaml from 'js-yaml';

export type NormalizedModel = {
  info: { title?: string; version?: string };
  servers: { url: string }[];
  paths: Array<{
    method: string;
    path: string;
    operationId?: string;
    summary?: string;
  }>;
};

export function ingestOpenAPI(input: string): NormalizedModel {
  const raw = input.trim().startsWith('{') ? JSON.parse(input) : yaml.load(input);
  const doc: any = raw || {};
  const info = doc.info ?? {};
  const servers = (doc.servers ?? []).map((s: any) => ({ url: s.url }));

  const paths: NormalizedModel['paths'] = [];
  for (const p of Object.keys(doc.paths ?? {})) {
    const ops = doc.paths[p] ?? {};
    for (const method of Object.keys(ops)) {
      const op = ops[method] ?? {};
      paths.push({
        method: method.toUpperCase(),
        path: p,
        operationId: op.operationId,
        summary: op.summary,
      });
    }
  }

  return { info, servers, paths };
}

export function generateBlueprint(model: NormalizedModel): { markdown: string; json: any } {
  const lines: string[] = [];
  lines.push(`# ${model.info.title ?? 'API'} (v${model.info.version ?? 'unknown'})`);
  lines.push('');
  lines.push('## Endpoints');
  for (const ep of model.paths) {
    lines.push(`- **${ep.method} ${ep.path}**${ep.summary ? ` — ${ep.summary}` : ''}`);
  }
  const markdown = lines.join('\n');
  const json = model;
  return { markdown, json };
}
