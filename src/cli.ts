#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import {
  loadRegistry,
  getStoreConfig,
  listStores,
  addStore,
  removeStore,
  getAllStores,
} from './config';
import {
  getValue,
  getAllValues,
  setValueFromString,
  deleteValue,
  listKeys,
  validateStore,
  formatValue,
  getValueOnly,
} from './store';

const packageVersion = (() => {
  try {
    // package.json is always included by npm for published packages.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../package.json').version as string;
  } catch {
    return '0.0.0';
  }
})();

const program = new Command();

program
  .name('roblocks')
  .description('Distributed credential vault with git-backed storage')
  .version(packageVersion);

// --- store commands ---

const storeCmd = program.command('store').description('Manage credential stores');

storeCmd
  .command('add <name>')
  .description('Register a new store')
  .requiredOption('--repo <repo>', 'GitHub repo (owner/name)')
  .requiredOption('--file <file>', 'Path to store file within repo')
  .option('--branch <branch>', 'Git branch', 'main')
  .action((name, opts) => {
    addStore(name, { repo: opts.repo, file: opts.file, branch: opts.branch });
    console.log(chalk.green(`✓ Store "${name}" registered`));
    console.log(`  repo:   ${opts.repo}`);
    console.log(`  file:   ${opts.file}`);
    console.log(`  branch: ${opts.branch}`);
  });

storeCmd
  .command('list')
  .description('List registered stores')
  .action(() => {
    const stores = getAllStores();
    const names = Object.keys(stores);
    if (names.length === 0) {
      console.log(chalk.yellow('No stores registered.'));
      console.log('Run: roblocks store add <name> --repo <repo> --file <file>');
      return;
    }
    console.log(chalk.bold('Registered stores:'));
    for (const name of names) {
      const s = stores[name];
      console.log(`  ${chalk.cyan(name)} → ${s.repo}:${s.file} (${s.branch})`);
    }
  });

storeCmd
  .command('remove <name>')
  .description('Remove a store from registry')
  .action((name) => {
    removeStore(name);
    console.log(chalk.green(`✓ Store "${name}" removed from registry`));
  });

// --- get ---

program
  .command('get <store> <key>')
  .description('Get a credential value')
  .option('-f, --format <format>', 'Output format: json, yaml, string', 'string')
  .action(async (storeName, key, opts) => {
    const config = getStoreConfig(storeName);
    const value = getValue(config, key);
    if (value === undefined) {
      console.error(chalk.red(`Key "${key}" not found in store "${storeName}"`));
      process.exit(1);
    }
    console.log(formatValue(value, opts.format as 'json' | 'yaml' | 'string'));
  });

// --- set ---

program
  .command('set <store> <key> <value>')
  .description('Set a credential value (auto-detects scalar/list/object)')
  .option('--json', 'Force JSON parsing of value')
  .action(async (storeName, key, value, opts) => {
    const config = getStoreConfig(storeName);
    setValueFromString(config, key, value, opts.json);
    console.log(chalk.green(`✓ Set ${storeName}/${key}`));
  });

// --- delete ---

program
  .command('delete <store> <key>')
  .description('Delete a credential key')
  .action(async (storeName, key) => {
    const config = getStoreConfig(storeName);
    const ok = deleteValue(config, key);
    if (!ok) {
      console.error(chalk.red(`Key "${key}" not found in store "${storeName}"`));
      process.exit(1);
    }
    console.log(chalk.green(`✓ Deleted ${storeName}/${key}`));
  });

// --- list ---

program
  .command('list <store>')
  .description('List all keys in a store')
  .option('-f, --format <format>', 'Output format: json, yaml', 'yaml')
  .action(async (storeName, opts) => {
    const config = getStoreConfig(storeName);
    const keys = listKeys(config);
    if (keys.length === 0) {
      console.log(chalk.yellow('Store is empty.'));
      return;
    }
    if (opts.format === 'json') {
      console.log(JSON.stringify(keys, null, 2));
    } else {
      console.log(chalk.bold(`Keys in ${storeName}:`));
      for (const key of keys) {
        console.log(`  ${key}`);
      }
    }
  });

// --- validate ---

program
  .command('validate <store>')
  .description('Validate store schema')
  .action(async (storeName) => {
    const config = getStoreConfig(storeName);
    const result = validateStore(config);
    if (result.valid) {
      console.log(chalk.green(`✓ Store "${storeName}" is valid`));
    } else {
      console.error(chalk.red(`✗ Store "${storeName}" validation failed:`));
      console.error(result.errors);
      process.exit(1);
    }
  });

// --- import (from .env) ---

program
  .command('import <store> <envfile>')
  .description('Import key-value pairs from a .env file')
  .action(async (storeName, envfile) => {
    const fs = await import('fs');
    const config = getStoreConfig(storeName);

    if (!fs.existsSync(envfile)) {
      console.error(chalk.red(`File not found: ${envfile}`));
      process.exit(1);
    }

    const content = fs.readFileSync(envfile, 'utf-8');
    const lines = content.split('\n');
    let imported = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (key && value) {
        setValueFromString(config, key, value);
        imported++;
      }
    }

    console.log(chalk.green(`✓ Imported ${imported} values from ${envfile} into ${storeName}`));
  });

program.parse();
