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

function removeRepoDir(repoDir: string): void {
  try {
    fs.rmSync(repoDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

// Try agent-git whereis to find an existing clone
function findAgentGitPath(config: StoreConfig): string | undefined {
  try {
    const output = execSync(`agent-git whereis github.com/${config.repo}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000,
    });
    const candidate = output.trim();
    if (candidate && fs.existsSync(candidate)) return candidate;
  } catch {
    // agent-git not installed or repo not registered
  }
  return undefined;
}

// Ensure repo is available locally and up to date. Returns repo dir path.
function ensureRepo(config: StoreConfig): string {
  // 1. Check our managed tmp dir
  const tmpDir = getRepoDir(config);
  if (fs.existsSync(tmpDir)) {
    try {
      execSync(`git -C "${tmpDir}" pull origin ${config.branch}`, {
        stdio: 'pipe',
        encoding: 'utf-8',
        timeout: 15000,
      });
      return tmpDir;
    } catch {
      removeRepoDir(tmpDir);
    }
  }

  // 2. Check agent-git managed clone
  const agentDir = findAgentGitPath(config);
  if (agentDir) {
    try {
      execSync(`git -C "${agentDir}" pull origin ${config.branch}`, {
        stdio: 'pipe',
        encoding: 'utf-8',
        timeout: 15000,
      });
      return agentDir;
    } catch {
      // Fall through to clone
    }
  }

  // 3. Fresh clone into tmp dir
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
  
  const sshUrl = `git@github.com:${config.repo}.git`;
  const httpsUrl = `https://github.com/${config.repo}.git`;
  let lastErr: Error | undefined;

  for (const url of [sshUrl, httpsUrl]) {
    try {
      execSync(`git clone --depth 1 --branch ${config.branch} ${url} ${tmpDir}`, {
        stdio: 'pipe',
        encoding: 'utf-8',
        timeout: 30000,
      });
      return tmpDir;
    } catch (err) {
      const msg = (err as Error).message || '';
      // git safe-cloning intercept: repo already cloned elsewhere
      if (msg.includes('already cloned at:')) {
        const match = msg.match(/already cloned at:\s*(.+)/);
        if (match) {
          const existing = match[1].trim();
          try {
            execSync(`git -C "${existing}" pull origin ${config.branch}`, {
              stdio: 'pipe',
              encoding: 'utf-8',
              timeout: 30000,
            });
            return existing;
          } catch (pullErr) {
            lastErr = pullErr as Error;
          }
        }
      }
      lastErr = err as Error;
    }
  }

  throw new Error(`Failed to fetch ${config.repo} (${config.branch}): ${lastErr?.message || 'unknown error'}`);
}

function doesFileExist(repoDir: string, filePath: string): boolean {
  return fs.existsSync(path.join(repoDir, filePath));
}

export function readStoreFile(config: StoreConfig): string {
  const repoDir = ensureRepo(config);
  if (!doesFileExist(repoDir, config.file)) {
    return '';
  }
  return fs.readFileSync(path.join(repoDir, config.file), 'utf-8');
}

export function writeStoreFile(config: StoreConfig, content: string): void {
  const repoDir = ensureRepo(config);
  const filePath = path.join(repoDir, config.file);

  const parentDir = path.dirname(filePath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, { mode: 0o600 });

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
  }
}

export function pullLatest(config: StoreConfig): string {
  return readStoreFile(config);
}
