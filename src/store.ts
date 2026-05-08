import YAML from 'yaml';
import { StoreSchema, Level2Value, isCompoundValue, getValueString } from './types';
import type { Store, Level1Value } from './types';
import type { StoreConfig } from './types';
import { readStoreFile, writeStoreFile, pullLatest } from './git';

function loadStore(config: StoreConfig): Store {
  const raw = pullLatest(config);
  if (!raw.trim()) return {};
  const parsed = YAML.parse(raw) || {};
  const validated = StoreSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(`Store validation failed: ${validated.error.message}`);
  }
  return validated.data;
}

function saveStore(config: StoreConfig, store: Store): void {
  // Re-validate before save
  const validated = StoreSchema.safeParse(store);
  if (!validated.success) {
    throw new Error(`Store validation failed before save: ${validated.error.message}`);
  }
  const yaml = YAML.stringify(validated.data, { indent: 2, lineWidth: 0 });
  writeStoreFile(config, yaml);
}

function parseKeyPath(key: string): { key: string; index?: number } {
  const match = key.match(/^(.+)\[(\d+)\]$/);
  if (match) {
    return { key: match[1], index: parseInt(match[2], 10) };
  }
  return { key };
}

// --- Public API ---

export function getValue(config: StoreConfig, key: string): Level1Value | undefined {
  const store = loadStore(config);
  const { key: k, index } = parseKeyPath(key);

  if (index !== undefined) {
    const val = store[k];
    if (!Array.isArray(val)) return undefined;
    return val[index];
  }

  return store[key];
}

export function getAllValues(config: StoreConfig): Store {
  return loadStore(config);
}

export function setValue(config: StoreConfig, key: string, value: Level1Value): void {
  const store = loadStore(config);
  store[key] = value;
  saveStore(config, store);
}

export function setValueFromString(config: StoreConfig, key: string, value: string, isJson?: boolean): void {
  let parsed: Level1Value;

  if (isJson) {
    const obj = JSON.parse(value);
    if (Array.isArray(obj)) {
      parsed = obj.map(v => typeof v === 'string' ? v : v);
    } else {
      parsed = obj;
    }
  } else {
    // Try to parse as JSON first (for compound values), fall back to string
    try {
      const obj = JSON.parse(value);
      if (Array.isArray(obj)) {
        parsed = obj.map(v => typeof v === 'string' ? v : v);
      } else if (typeof obj === 'object' && obj !== null) {
        parsed = obj;
      } else {
        parsed = String(obj);
      }
    } catch {
      parsed = value;
    }
  }

  setValue(config, key, parsed);
}

export function deleteValue(config: StoreConfig, key: string): boolean {
  const store = loadStore(config);
  const { key: k, index } = parseKeyPath(key);

  if (index !== undefined) {
    const val = store[k];
    if (!Array.isArray(val)) return false;
    if (index < 0 || index >= val.length) return false;
    val.splice(index, 1);
    if (val.length === 0) {
      delete store[k];
    }
  } else {
    if (!(key in store)) return false;
    delete store[key];
  }

  saveStore(config, store);
  return true;
}

export function listKeys(config: StoreConfig): string[] {
  const store = loadStore(config);
  return Object.keys(store);
}

export function validateStore(config: StoreConfig): { valid: boolean; errors?: string } {
  try {
    loadStore(config);
    return { valid: true };
  } catch (err) {
    return { valid: false, errors: (err as Error).message };
  }
}

export function formatValue(value: Level1Value, format: 'json' | 'yaml' | 'string'): string {
  if (format === 'json') {
    return JSON.stringify(value, null, 2);
  }
  if (format === 'yaml') {
    return YAML.stringify(value, { indent: 2 });
  }
  // string: scalar only
  if (Array.isArray(value)) {
    return value.map(v => getValueString(v)).join('\n');
  }
  return getValueString(value);
}

export function getValueOnly(value: Level1Value): string {
  if (Array.isArray(value)) {
    return value.map(getValueString).join('\n');
  }
  return getValueString(value);
}
