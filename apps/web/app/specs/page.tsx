'use client';
import { useState } from 'react';

export default function SpecsPage() {
  const [loading, setLoading] = useState(false);
  const [demoInfo, setDemoInfo] = useState<{ blueprintUrl?: string; mockBaseUrl?: string } | null>(null);
  const [runStatus, setRunStatus] = useState<string | null>(null);

  async function loadPetstoreDemo() {
    setLoading(true);
    setRunStatus(null);
    try {
      // Hit an internal route that returns a normalized model + spins a mock
      const res = await fetch('/api/specs/sample/petstore', { method: 'POST' });
      const data = await res.json();
      setDemoInfo({ blueprintUrl: data?.blueprintUrl, mockBaseUrl: data?.mockBaseUrl });
    } finally {
      setLoading(false);
    }
  }

  async function runBaseline() {
    setRunStatus('Running…');
    try {
      const res = await fetch('/api/tests/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          suiteId: 'PAYMENTS_BASELINE_v1',
          envKey: 'mock', // safer than sending baseUrl from client
        }),
      });
      const data = await res.json();
      setRunStatus(data?.ok ? '✅ Passed (see artifacts)' : `❌ Failed: ${data?.error ?? 'Unknown'}`);
    } catch (e: any) {
      setRunStatus(`❌ Error: ${e?.message ?? 'Unknown'}`);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Specs & Demo</h1>

      <button
        onClick={loadPetstoreDemo}
        disabled={loading}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-60"
      >
        {loading ? 'Loading…' : 'Load Sample Spec (Petstore)'}
      </button>

      {demoInfo?.blueprintUrl && (
        <div className="space-y-2">
          <div>
            Blueprint: <a className="text-blue-600 underline" href={demoInfo.blueprintUrl}>{demoInfo.blueprintUrl}</a>
          </div>
          <div>Mock Base URL: <code>{demoInfo.mockBaseUrl}</code></div>
          <button
            onClick={runBaseline}
            className="px-4 py-2 rounded bg-indigo-600 text-white"
          >
            Run Payments Baseline
          </button>
          {runStatus && <div className="text-sm">{runStatus}</div>}
        </div>
      )}
    </div>
  );
}
