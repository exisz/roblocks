import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import type { StoreConfig } from './types';

const TMP_DIR = path.join(os.tmpdir(), 'roblocks');

function getRepoDir(config: StoreConfig): string {
  const slug = config.repo.replace(/[^a-zA-Z0-9_-]/g, '_');
  const branch = config.branch.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(TMP_DIR, `${slug}__${branch}`);
}

function ensureTmpDir(): void {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
}

function removeRepoDir(repoDir: string): void {
  try {
    fs.rmSync(repoDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
}

function cloneRepo(config: StoreConfig): string {
  const repoDir = getRepoDir(config);
  ensureTmpDir();

  // Clean any stale clone
  removeRepoDir(repoDir);

  const sshUrl = `git@github.com:${config.repo}.git`;
  const httpsUrl = `https://github.com/${config.repo}.git`;

  // Try SSH first, fall back to HTTPS
  const urls = [sshUrl, httpsUrl];
  let lastErr: Error | undefined;

  for (const url of urls) {
    try {
      execSync(`git clone --depth 1 --branch ${config.branch} ${url} ${repoDir}`, {
        stdio: 'pipe',
        encoding: 'utf-8',
        timeout: 30000,
      });
      return repoDir;
    } catch (err) {
      lastErr = err as Error;
    }
  }

  throw new Error(`Failed to clone ${config.repo} (${config.branch}): ${lastErr?.message || 'unknown error'}`);
}

function doesFileExist(repoDir: string, filePath: string): boolean {
  return fs.existsSync(path.join(repoDir, filePath));
}

export function readStoreFile(config: StoreConfig): string {
  const repoDir = cloneRepo(config);
  try {
    if (!doesFileExist(repoDir, config.file)) {
      return ''; // Empty store = empty string
    }
    return fs.readFileSync(path.join(repoDir, config.file), 'utf-8');
  } finally {
    // Don't clean up immediately — write may follow
  }
}

export function writeStoreFile(config: StoreConfig, content: string): void {
  const repoDir = getRepoDir(config);
  const filePath = path.join(repoDir, config.file);

  // Ensure parent directory exists
  const parentDir = path.dirname(filePath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, { mode: 0o600 });

  // Git add + commit + push
  try {
    execSync('git add -A', { cwd: repoDir, stdio: 'pipe' });
    execSync('git diff --cached --quiet || git commit -m "roblocks: update credentials"', {
      cwd: repoDir,
      stdio: 'pipe',
    });
    execSync(`git push origin ${config.branch}`, {
      cwd: repoDir,
      stdio: 'pipe',
      timeout: 30000,
    });
  } catch (err) {
    throw new Error(`Failed to push store: ${(err as Error).message}`);
  } finally {
    removeRepoDir(repoDir);
  }
}

export function pullLatest(config: StoreConfig): string {
  const repoDir = getRepoDir(config);
  ensureTmpDir();

  if (fs.existsSync(repoDir)) {
    try {
      execSync(`git pull origin ${config.branch}`, {
        cwd: repoDir,
        stdio: 'pipe',
        timeout: 15000,
      });
      if (doesFileExist(repoDir, config.file)) {
        return fs.readFileSync(path.join(repoDir, config.file), 'utf-8');
      }
      return '';
    } catch {
      // Fall through to fresh clone
    }
  }

  return readStoreFile(config);
}
