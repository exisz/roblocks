# 🗄️ roblocks

[![npm version](https://img.shields.io/npm/v/roblocks.svg)](https://www.npmjs.com/package/roblocks)
[![npm downloads](https://img.shields.io/npm/dm/roblocks.svg)](https://www.npmjs.com/package/roblocks)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

> Distributed credential vault with git-backed storage for agents and small teams.

**roblocks** gives robots a simple credential vault: values live in a private GitHub repo, writes are committed and pushed, reads fetch fresh origin state, and every change is auditable through git history.

## Why roblocks?

- **Git is the source of truth** — no local cache, no state drift
- **Read from origin, write to origin** — every `set` is a commit + push; every `get` fetches fresh state
- **Transparent authentication** — uses whatever git credentials the shell already has: SSH key, PAT, `gh auth`, or credential helper
- **Strict but flexible format** — supports simple key/value secrets, objects with metadata, and lists
- **Agent-friendly** — one CLI command is enough for distributed workers to retrieve or update shared credentials

> Security note: use a private repository for real credentials. roblocks provides workflow, validation, versioning, and auditability; it does not encrypt individual values before committing them.

## Install

```bash
npm install -g roblocks
```

Or run without installing:

```bash
npm exec --package roblocks -- roblocks --help
```

## Quick Start

```bash
# Register a store in ~/.roblocks/config.yaml
roblocks store add empire \
  --repo exisz/credentials \
  --file stores/empire.yaml \
  --branch main

# Set a simple credential
roblocks set empire openai_api_key "sk-xxx"

# Set a credential with metadata
roblocks set empire stripe_secret --json '{"value":"sk_live_xxx","expiry":"2026-12-01"}'

# Read a credential
roblocks get empire openai_api_key

# Read JSON for agents/scripts
roblocks get empire stripe_secret --format json

# List keys without printing values
roblocks list empire

# Search key names without printing values
roblocks search empire dokploy

# Validate store schema
roblocks validate empire
```

## Data Model

```yaml
# Level 1: key → scalar, object, or sequence
openai_api_key: "sk-xxx"

stripe_secret:
  value: "sk_live_xxx"
  expiry: "2026-12-01"
  account: "production"

github_bots:
  - value: "ghp_xxx"
    username: "bot-001"
    purpose: "star-farming"
  - value: "ghp_yyy"
    username: "bot-002"
    tags: [issue-tracker]
```

### Schema Rules

| Level | Allowed | Required |
| --- | --- | --- |
| 1 | scalar, object, or sequence | — |
| 2 | string or object | if object, must contain `value:` |
| 3+ | rejected | — |

Metadata fields such as `expiry`, `tags`, `purpose`, `username`, `account`, and `url` are optional.

## Configuration

`~/.roblocks/config.yaml` stores registered vaults:

```yaml
stores:
  empire:
    repo: exisz/credentials
    file: stores/empire.yaml
    branch: main
  personal:
    repo: exisz/credentials
    file: stores/personal.yaml
    branch: main
```

Multiple stores can point to the same repo, different files in one repo, or different repos.

## CLI Reference

### `roblocks store add <name> --repo <repo> --file <path> [--branch <branch>]`
Register a store in `~/.roblocks/config.yaml`.

### `roblocks store list`
List registered stores.

### `roblocks store remove <name>`
Remove a store from the local registry. This does not delete the remote file.

### `roblocks get <store> <key> [--format json|yaml|string]`
Fetch and print a value. Lists can be read as a whole or by index, e.g. `github_bots[0]`.

### `roblocks set <store> <key> <value> [--json]`
Set a credential value. `--json` stores structured metadata.

### `roblocks delete <store> <key>`
Remove a key from the store.

### `roblocks list <store> [--format json|yaml]`
List key names without printing secret values.

### `roblocks search <store> <keyword> [--format json|yaml] [--metadata]`
Search key names without printing secret values. Matching is case-insensitive. Use `--metadata` to also search non-secret metadata fields on compound values; the secret `value` field is never searched or printed.

Examples:

```bash
roblocks search empire dokploy
roblocks search empire tailscale --format json
roblocks search empire deploy --metadata
```

### `roblocks validate <store>`
Validate a store YAML file against roblocks' schema.

## Authentication

roblocks delegates to git/GitHub credentials already available in the environment:

- SSH keys (`~/.ssh/id_*`)
- GitHub CLI (`gh auth status`)
- `GITHUB_TOKEN`
- HTTPS credential helpers

## License

MIT
