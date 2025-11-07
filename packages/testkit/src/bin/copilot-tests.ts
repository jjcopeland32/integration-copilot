#!/usr/bin/env node
import { runSuiteById } from '../runner';

declare const process: {
  argv: string[];
  exit(code?: number): void;
  exitCode?: number;
};

interface CliArgs {
  suiteId: string;
  baseUrl: string;
  noArtifacts?: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = value;
        i += 1;
      }
    }
  }

  const suiteId = (args.suite || args['suite-id']) as string | undefined;
  const baseUrl = (args.base || args['base-url']) as string | undefined;

  if (!suiteId || !baseUrl) {
    throw new Error('Usage: copilot-tests --suite <SUITE_ID> --base <BASE_URL>');
  }

  return {
    suiteId,
    baseUrl,
    noArtifacts: Boolean(args['no-artifacts']),
  };
}

async function main() {
  try {
    const { suiteId, baseUrl, noArtifacts } = parseArgs(process.argv.slice(2));
    const result = await runSuiteById(suiteId, {
      baseUrl,
      saveArtifacts: !noArtifacts,
    });

    const summary = result.summary;
    // eslint-disable-next-line no-console
    console.log(`Suite ${suiteId} — ${summary.passed}/${summary.total} passed in ${summary.durationMs}ms`);
    if (summary.failed > 0) {
      for (const testCase of result.cases.filter((c) => c.status === 'failed')) {
        // eslint-disable-next-line no-console
        console.log(`  ✗ ${testCase.id}: ${testCase.errors.join('; ')}`);
      }
      process.exitCode = 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error(message);
    process.exit(1);
  }
}

void main();
