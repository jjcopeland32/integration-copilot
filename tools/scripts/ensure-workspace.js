#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const net = require('net');

if (process.env.SKIP_ENSURE_WORKSPACE === '1') {
  console.log('[setup] SKIP_ENSURE_WORKSPACE=1, skipping workspace bootstrap');
  process.exit(0);
}

const ROOT = path.resolve(__dirname, '..', '..');
const PACKAGES = [
  'spec-engine',
  'mockgen',
  'validator',
  'orchestrator',
  'connectors',
  'testkit',
];

const args = process.argv.slice(2);
const withDb = args.includes('--with-db');
const ROOT_ENV_PATH = path.join(ROOT, '.env');

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${commandArgs.join(' ')}`);
  }
}

function fileExists(...segments) {
  return fs.existsSync(path.join(ROOT, ...segments));
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const contents = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function ensureEnvFile() {
  const envPath = ROOT_ENV_PATH;
  if (fs.existsSync(envPath)) {
    return parseEnvFile(envPath);
  }

  const examplePath = path.join(ROOT, '.env.example');
  if (!fs.existsSync(examplePath)) {
    return {};
  }

  fs.copyFileSync(examplePath, envPath);
  console.log('[setup] Created .env from .env.example');
  return parseEnvFile(envPath);
}

function ensureNextAppEnv() {
  const appEnvPath = path.join(ROOT, 'apps', 'web', '.env.local');
  try {
    if (!fs.existsSync(ROOT_ENV_PATH)) {
      return;
    }
    const sourceContents = fs.readFileSync(ROOT_ENV_PATH, 'utf8');
    let needsUpdate = true;
    if (fs.existsSync(appEnvPath)) {
      const current = fs.readFileSync(appEnvPath, 'utf8');
      needsUpdate = current !== sourceContents;
    }
    if (needsUpdate) {
      fs.mkdirSync(path.dirname(appEnvPath), { recursive: true });
      fs.writeFileSync(appEnvPath, sourceContents);
      console.log('[setup] Synced apps/web/.env.local with root .env');
    }
  } catch (error) {
    console.warn('[setup] Unable to sync Next.js env file:', error.message);
  }
}

function ensurePrismaClient() {
  const prismaTargets = [
    path.join(ROOT, 'node_modules', '.prisma', 'client', 'index.js'),
    path.join(ROOT, 'apps', 'web', 'node_modules', '.prisma', 'client', 'index.js'),
  ];

  const hasClient = prismaTargets.some((target) => fs.existsSync(target));
  if (hasClient) {
    return;
  }

  if (!fileExists('node_modules')) {
    console.log('[setup] Skipping Prisma generation (dependencies not installed)');
    return;
  }

  console.log('[setup] Generating Prisma client');
  run('pnpm', ['prisma:generate']);
}

function ensurePackageBuilds() {
  for (const pkg of PACKAGES) {
    const distEntry = path.join(ROOT, 'packages', pkg, 'dist', 'index.js');
    if (fs.existsSync(distEntry)) {
      continue;
    }
    console.log(`[setup] Building workspace package ${pkg}`);
    run('pnpm', ['-C', `packages/${pkg}`, 'build']);
  }
}

function commandExists(command) {
  const whichCmd = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(whichCmd, [command], { stdio: 'ignore' });
  return result.status === 0;
}

function waitForPort(host, port, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      const socket = net.createConnection({ host, port });
      let settled = false;

      socket.once('connect', () => {
        settled = true;
        socket.destroy();
        resolve(true);
      });

      socket.once('error', () => {
        if (!settled) {
          socket.destroy();
          if (Date.now() - start >= timeoutMs) {
            reject(new Error(`Timed out waiting for ${host}:${port}`));
            return;
          }
          setTimeout(check, 500);
        }
      });
    };

    check();
  });
}

async function ensureDatabase(env) {
  if (!withDb) {
    return;
  }

  const dbUrl = process.env.DATABASE_URL || env.DATABASE_URL;
  if (!dbUrl) {
    return;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(dbUrl);
  } catch (error) {
    console.warn('[setup] Invalid DATABASE_URL, skipping automatic database bootstrap');
    return;
  }

  const host = parsedUrl.hostname;
  const port = parsedUrl.port ? Number(parsedUrl.port) : 5432;

  if (!['localhost', '127.0.0.1'].includes(host)) {
    return;
  }

  if (!commandExists('docker')) {
    console.warn('[setup] Docker not detected, cannot automatically start local database');
    return;
  }

  if (!fileExists('docker-compose.yml')) {
    return;
  }

  console.log('[setup] Ensuring local Postgres container is running');
  try {
    run('docker', ['compose', 'up', '-d', 'db']);
    await waitForPort(host, port);
    console.log(`[setup] Database ready at ${host}:${port}`);
  } catch (error) {
    console.warn('[setup] Unable to verify database availability:', error.message);
  }
}

function applyDatabaseMigrations() {
  if (!withDb) {
    return;
  }
  try {
    console.log('[setup] Applying Prisma migrations');
    run('pnpm', ['db:migrate']);
  } catch (error) {
    console.warn('[setup] Failed to apply migrations automatically:', error.message);
  }
}

async function main() {
  try {
    const env = ensureEnvFile();
    for (const [key, value] of Object.entries(env)) {
      if (typeof process.env[key] === 'undefined') {
        process.env[key] = value;
      }
    }
    ensureNextAppEnv();
    const hasDependencies = fileExists('node_modules');

    if (!hasDependencies) {
      console.log('[setup] Dependencies are missing. Run `pnpm install` first.');
      return;
    }

    ensurePrismaClient();
    ensurePackageBuilds();
    await ensureDatabase(env);
    applyDatabaseMigrations();
  } catch (error) {
    console.error('[setup] Failed to prepare workspace');
    console.error(error);
    process.exit(1);
  }
}

main();
