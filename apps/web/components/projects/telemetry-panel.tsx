'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { Copy, RefreshCw, Globe, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

type ProjectTelemetryPanelProps = {
  projectId: string;
};

function maskSecret(secret: string) {
  if (!secret) return '';
  if (secret.length <= 8) {
    return '•'.repeat(secret.length);
  }
  const visible = secret.slice(-4);
  const masked = '•'.repeat(secret.length - 4);
  return `${masked}${visible}`;
}

function useClipboard() {
  const [copied, setCopied] = useState(false);
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Clipboard copy failed', error);
    }
  };
  return { copied, copy };
}

function buildCurlSnippet(endpoint: string, secret: string, projectId: string) {
  const payload = JSON.stringify(
    {
      projectId,
      requestMeta: { method: 'POST', path: '/payments', body: { amount: 12500 } },
      responseMeta: { status: 200, latencyMs: 450 },
      verdict: 'pass',
    },
    null,
    2
  );

  return `payload=$(cat <<'JSON'
${payload}
JSON
)

signature=$(node -e "const crypto=require('crypto');const [payload, secret]=process.argv.slice(2);process.stdout.write(crypto.createHmac('sha256', secret).update(payload).digest('hex'));" "$payload" "${secret}")

curl -sS -X POST ${endpoint} \\
  -H 'content-type: application/json' \\
  -H "x-trace-signature: $signature" \\
  -d "$payload"`;
}

function buildNodeSnippet(endpoint: string, secret: string, projectId: string) {
  return `import crypto from 'crypto';
import fetch from 'node-fetch';

const payload = {
  projectId: '${projectId}',
  requestMeta: { method: 'POST', path: '/payments', body: { amount: 12500 } },
  responseMeta: { status: 200, latencyMs: 450 },
  verdict: 'pass',
};

const signature = crypto.createHmac('sha256', '${secret}').update(JSON.stringify(payload)).digest('hex');

await fetch('${endpoint}', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-trace-signature': signature,
  },
  body: JSON.stringify(payload),
});`;
}

const signatureStyles: Record<string, string> = {
  valid: 'success',
  invalid: 'error',
  unknown: 'warning',
};

export function ProjectTelemetryPanel({ projectId }: ProjectTelemetryPanelProps) {
  const telemetryQuery = trpc.project.telemetry.useQuery({ projectId });
  const rotateMutation = trpc.project.rotateTelemetrySecret.useMutation({
    onSuccess: () => telemetryQuery.refetch(),
  });
  const endpointClipboard = useClipboard();
  const secretClipboard = useClipboard();
  const curlClipboard = useClipboard();
  const nodeClipboard = useClipboard();

  const telemetry = telemetryQuery.data;

  const curlSnippet = useMemo(() => {
    if (!telemetry) return '';
    return buildCurlSnippet(telemetry.endpoint, telemetry.secret, projectId);
  }, [telemetry, projectId]);

  const nodeSnippet = useMemo(() => {
    if (!telemetry) return '';
    return buildNodeSnippet(telemetry.endpoint, telemetry.secret, projectId);
  }, [telemetry, projectId]);

  const handleRotate = () => {
    if (!confirm('Rotate this telemetry secret? Existing senders will need the new value.')) {
      return;
    }
    rotateMutation.mutate({ projectId });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Telemetry Access</CardTitle>
        <CardDescription>Endpoint and signing secret for streaming traces into this project.</CardDescription>
      </CardHeader>
      <CardContent>
        {telemetryQuery.isLoading ? (
          <div className="py-8 text-center text-sm text-gray-500">Loading telemetry configuration…</div>
        ) : telemetry ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Endpoint</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-sm text-gray-900">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <span>{telemetry.endpoint}</span>
                  <Button variant="ghost" size="sm" onClick={() => endpointClipboard.copy(telemetry.endpoint)}>
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    {endpointClipboard.copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>

            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-sky-50 p-4 shadow-inner">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Signing Secret</p>
                  <p className="mt-1 font-mono text-lg text-gray-900">{maskSecret(telemetry.secret)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => secretClipboard.copy(telemetry.secret)}>
                    <Copy className="h-3.5 w-3.5" />
                    {secretClipboard.copied ? 'Copied' : 'Copy Value'}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white"
                    onClick={handleRotate}
                    disabled={rotateMutation.isPending}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {rotateMutation.isPending ? 'Rotating…' : 'Rotate'}
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-600">
                Regenerating the secret invalidates existing signatures. Share the new value with any sandbox integrations.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <SnippetBlock
                title="cURL example"
                code={curlSnippet}
                copy={() => curlClipboard.copy(curlSnippet)}
                copied={curlClipboard.copied}
              />
              <SnippetBlock
                title="Node.js (fetch)"
                code={nodeSnippet}
                copy={() => nodeClipboard.copy(nodeSnippet)}
                copied={nodeClipboard.copied}
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-gray-900">Recent deliveries</h4>
                <Badge variant="outline">{telemetry.deliveries.length} captured</Badge>
              </div>
              {telemetry.deliveries.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                  No telemetry deliveries recorded in the past few runs. Send a signed payload to populate this list.
                </div>
              ) : (
                <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Request</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Signature</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white/80">
                      {telemetry.deliveries.map((delivery) => (
                        <tr key={delivery.id} className="text-gray-700">
                          <td className="px-4 py-3 text-sm">
                            {new Date(delivery.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">
                            {delivery.method ?? 'POST'} {delivery.path ?? '/'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={delivery.verdict === 'pass' ? 'success' : 'warning'}>
                              {delivery.verdict}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Badge
                              variant={
                                signatureStyles[delivery.signatureStatus] === 'success'
                                  ? 'success'
                                  : signatureStyles[delivery.signatureStatus] === 'error'
                                    ? 'error'
                                    : 'warning'
                              }
                            >
                              {delivery.signatureStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700">
            <AlertCircle className="h-5 w-5" />
            Unable to load telemetry configuration.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type SnippetBlockProps = {
  title: string;
  code: string;
  copy: () => void;
  copied: boolean;
};

function SnippetBlock({ title, code, copy, copied }: SnippetBlockProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-900 text-gray-100 shadow-inner">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-gray-400">
        <span>{title}</span>
        <button
          type="button"
          onClick={copy}
          className={clsx(
            'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold',
            copied ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/10 hover:bg-white/20'
          )}
        >
          <Copy className="h-3 w-3" />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-teal-50">{code}</pre>
    </div>
  );
}
