# 🗄️ roblocks

> Distributed credential vault with git-backed storage for distributed agents.

**Why roblocks?** Robots need blocks. Your agents need secrets. Store them safely in git — encrypted at rest by GitHub's infrastructure, versioned by default, auditable forever.

## Philosophy

- **Git is the source of truth** — no local cache, no state drift
- **Read from origin, write to origin** — every `set` is a commit+push, every `get` is a fresh fetch
- **Transparent authentication** — uses whatever git credentials the shell has (SSH key, PAT, `gh auth`)
- **Strict but flexible format** — supports key-value and lists, rejects arbitrary nesting

## Data Model

```yaml
# Level 1: key → scalar or sequence
openai_api_key: "sk-xxx"                    # Level 2: simple string

stripe_secret:                               # Level 2: compound object
  value: "sk_live_xxx"
  expiry: "2026-12-01"

github_bots:                                 # Level 1: list
  - value: "ghp_xxx"                         # Level 2: string
    username: "bot-001"
    purpose: "star-farming"
  - value: "ghp_yyy"
    username: "bot-002"
    tags: [issue-tracker]
```

### Rules

| Level | Allowed | Required |
|-------|---------|----------|
| 1 (key) | scalar or sequence | — |
| 2 (value) | string or object | if object, must contain `value:` |
| 3+ | ❌ rejected | — |

All other fields (`expiry`, `tags`, `purpose`, `username`, etc.) are optional metadata.

## Install

```bash
npm install -g roblocks
```

## Quick Start

```bash
# Register a store (central registry)
roblocks store add empire \
  --repo exisz/credentials \
  --file stores/empire.yaml \
  --branch main

# List registered stores
roblocks store list

# Set a simple key
roblocks set empire openai_api_key "sk-xxx"

# Set with metadata
roblocks set empire stripe_secret --json '{"value":"sk_live_xxx","expiry":"2026-12-01"}'

# Get a key
roblocks get empire openai_api_key

# Get a list item by index
roblocks get empire github_bots[0]

# Get all items in a list
roblocks get empire github_bots --format json

# Delete a key
roblocks delete empire openai_api_key
```

## Configuration

`~/.roblocks/config.yaml` — central store registry:

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

Multiple stores can point to the same repo (different files) or different repos entirely.

## CLI Reference

### `roblocks store add <name> --repo <repo> --file <path> [--branch <branch>]`
Register a new store in `~/.roblocks/config.yaml`.

### `roblocks store list`
List all registered stores.

### `roblocks store remove <name>`
Remove a store from registry (does not delete remote file).

### `roblocks get <store> <key> [--format json|yaml|env]`
Fetch and display a value. Lists are returned as arrays.

### `roblocks set <store> <key> <value> [--json]`
Set a value. Auto-detects scalar vs list. `--json` forces object parse.

### `roblocks delete <store> <key>`
Remove a key from the store.

### `roblocks list <store> [--format json|yaml]`
List all keys in a store (names only, no values).

### `roblocks validate <store>`
Validate store YAML against roblocks schema.

## Authentication

roblocks delegates to whatever git credentials are available in the environment:
- SSH key (`~/.ssh/id_*`)
- GitHub CLI (`gh auth status`)
- GitHub Personal Access Token (`GITHUB_TOKEN` env var)
- HTTPS credentials (git credential helper)

## License

MIT
