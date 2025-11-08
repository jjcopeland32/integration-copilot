#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { runSuite } from '../src/index.js';

/**
 * @typedef {{
 *   command?: string,
 *   suiteId?: string,
 *   file?: string,
 *   base?: string,
 *   actor?: 'VENDOR' | 'PARTNER'
 * }} CLIOptions
 */

function parseArgs(argv) {
  const [, , ...rest] = argv;
  /** @type {CLIOptions} */
  const options = { command: rest[0] };

  for (let i = 1; i < rest.length; i += 1) {
    const current = rest[i];
    if (current === '--suite') {
      options.suiteId = rest[++i];
    } else if (current === '--file') {
      options.file = rest[++i];
    } else if (current === '--base') {
      options.base = rest[++i];
    } else if (current === '--actor') {
      const actor = rest[++i];
      if (actor === 'VENDOR' || actor === 'PARTNER') {
        options.actor = actor;
      }
    }
  }

  return options;
}

async function readSuiteFromFile(filePath) {
  const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const raw = await fs.readFile(absolute, 'utf8');
  return JSON.parse(raw);
}

async function fetchSuite(baseUrl, suiteId) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tests/${suiteId}`);
  if (!response.ok) {
    throw new Error(`Failed to load suite ${suiteId}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function writeArtifacts(result) {
  const artifactsDir = path.join(process.cwd(), '.artifacts/testruns');
  await fs.mkdir(artifactsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(artifactsDir, `${timestamp}.json`);
  await fs.writeFile(filePath, JSON.stringify(result, null, 2));
  return filePath;
}

function printSummary(result) {
  const { summary, suiteId, baseUrl } = result;
  console.log(`Suite: ${suiteId}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Total: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed} | Skipped: ${summary.skipped}`);
  for (const caseResult of result.results) {
    console.log(` - [${caseResult.status.toUpperCase()}] ${caseResult.id}: ${caseResult.name}`);
    if (caseResult.message) {
      console.log(`   ↳ ${caseResult.message}`);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.command !== 'run') {
    console.error('Usage: copilot-tests run --suite <ID> [--base <url>] [--actor <role>]');
    process.exit(1);
  }

  const base = options.base || process.env.COPILOT_BASE_URL || 'http://localhost:3000';
  let suite;

  if (options.file) {
    suite = await readSuiteFromFile(options.file);
  } else if (options.suiteId) {
    suite = await fetchSuite(base, options.suiteId);
  } else {
    console.error('Either --suite or --file must be provided');
    process.exit(1);
    return;
  }

  const result = await runSuite({ suite, baseUrl: base, actor: options.actor });
  printSummary(result);
  const artifactPath = await writeArtifacts(result);
  console.log(`Artifacts written to ${artifactPath}`);

  if (result.summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
