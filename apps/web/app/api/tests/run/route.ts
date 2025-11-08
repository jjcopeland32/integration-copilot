import { NextRequest, NextResponse } from 'next/server';
import { runSuiteById } from '@integration-copilot/testkit';

// SSRF Fix: Base URL validation helper.
function isValidBaseUrl(baseUrl: string): boolean {
  try {
    // Only allow https or http protocol
    const url = new URL(baseUrl, 'http://dummy');
    if (!/^https?:$/.test(url.protocol)) return false;
    // HOSTNAMES TO BLOCK: localhost, loopback, private, or link-local addresses
    const forbiddenHosts = ['localhost', '127.0.0.1', '::1'];
    if (forbiddenHosts.includes(url.hostname)) return false;
    // Reject IPv4 private and link-local (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16)
    const privateRanges = [
      /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3})$/,
      /^(172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/,
      /^(192\.168\.\d{1,3}\.\d{1,3})$/,
      /^(169\.254\.\d{1,3}\.\d{1,3})$/,
    ];
    if (privateRanges.some(rx => rx.test(url.hostname))) return false;
    // Also reject if host ends with .local or .internal (optional)
    if (/\.(local|internal)$/.test(url.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const suiteId = body?.suiteId as string | undefined;
    const baseUrl = body?.baseUrl as string | undefined;

    if (!suiteId || !baseUrl) {
      return NextResponse.json(
        { error: 'suiteId and baseUrl are required' },
        { status: 400 }
      );
    }

    // SSRF Fix: Validate the submitted baseUrl is safe.
    if (!isValidBaseUrl(baseUrl)) {
      return NextResponse.json(
        { error: 'Invalid or forbidden baseUrl' },
        { status: 400 }
      );
    }

    const result = await runSuiteById(suiteId, {
      baseUrl,
      saveArtifacts: true,
    });

    return NextResponse.json({
      suiteId,
      runId: result.runId,
      summary: result.summary,
    });
  } catch (error) {
    console.error('[tests/run] failed to execute suite', error);
    return NextResponse.json(
      { error: 'Failed to execute golden tests' },
      { status: 500 }
    );
  }
}
