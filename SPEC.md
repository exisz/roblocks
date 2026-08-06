# roblocks tool specification

`roblocks` is the canonical git-backed credential store for distributed agents.
It registers named stores in `~/.roblocks/config.yaml`; each store points to a
private repository, YAML file, and branch.

## Safe discovery

- `roblocks store list` shows registered store locations without secret values.
- `roblocks list <store>` shows key names without secret values.
- `roblocks search <store> <keyword>` searches key names without secret values.
- `roblocks validate <store>` validates the remote store schema.

## Secret access and mutation

- `roblocks get <store> <key>` prints a secret and must only be used when the
  active task explicitly requires that value. Never paste its output into chat
  or logs.
- `roblocks set <store> <key> <value>` and `roblocks delete <store> <key>` mutate
  the canonical remote store and require explicit authorization for the named
  credential.
- Use a private repository because roblocks does not encrypt individual values.
