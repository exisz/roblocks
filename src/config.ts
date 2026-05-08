import fs from 'fs';
import os from 'os';
import path from 'path';
import YAML from 'yaml';
import { RegistrySchema, type Registry, type StoreConfig } from './types';

const CONFIG_DIR = path.join(os.homedir(), '.roblocks');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.yaml');

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

function loadRaw(): unknown {
  if (!fs.existsSync(CONFIG_FILE)) return { stores: {} };
  const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
  return YAML.parse(raw) || { stores: {} };
}

export function loadRegistry(): Registry {
  const parsed = RegistrySchema.safeParse(loadRaw());
  if (!parsed.success) {
    throw new Error(`Invalid config at ${CONFIG_FILE}: ${parsed.error.message}`);
  }
  return parsed.data;
}

function saveRegistry(registry: Registry): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, YAML.stringify(registry, { indent: 2 }), { mode: 0o600 });
}

export function getStoreConfig(name: string): StoreConfig {
  const registry = loadRegistry();
  const config = registry.stores[name];
  if (!config) {
    throw new Error(`Store "${name}" not found. Run "roblocks store add ${name} --repo <repo> --file <file>" to register.`);
  }
  return config;
}

export function listStores(): string[] {
  return Object.keys(loadRegistry().stores);
}

export function addStore(name: string, config: StoreConfig): void {
  const registry = loadRegistry();
  registry.stores[name] = config;
  saveRegistry(registry);
}

export function removeStore(name: string): void {
  const registry = loadRegistry();
  delete registry.stores[name];
  saveRegistry(registry);
}

export function getAllStores(): Record<string, StoreConfig> {
  return { ...loadRegistry().stores };
}
