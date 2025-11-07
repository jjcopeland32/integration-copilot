import path from 'path';

const repoRoot = path.resolve(__dirname, '../../..');

export function getRepoRoot() {
  return repoRoot;
}

export function getToolsDir() {
  return path.join(repoRoot, 'tools');
}

export function getArtifactsDir() {
  return path.join(repoRoot, '.artifacts/testruns');
}
