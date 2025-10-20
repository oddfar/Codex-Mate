Codex Mate (Initial Project Skeleton)

This repository contains an initial code skeleton to implement the core configuration and management features described in doc/1、初级创建项目prompt.md.

Scope covered in this skeleton:
- Multi-node management (list, switch, add, edit, delete)
- Credential storage per provider under ~/.codex/codex-mate/credentials.json and auth propagation to ~/.codex/auth.json when switching
- MCP server management via direct config.toml editing
- Full config.toml raw read/write and a minimal TOML parser/stringifier tailored for our needs
- Project trust management under [projects."<abs-path>"]
- CLI detection for `codex --version`

What this is not yet:
- A full Tauri + React desktop app UI. This is the headless core logic that such an app can call into.

Structure:
- src/paths.ts: Well-known paths under ~/.codex
- src/tomlUtil.ts: Minimal TOML parse/stringify helpers sufficient for doc requirements
- src/codexMate.ts: High-level operations implementing the features from the doc
- src/types.ts: Types shared across the helpers
- src/index.ts: Export barrel

Note
- Writes are done atomically where reasonable; backups are not created per the behavior rules.
- The TOML utilities are intentionally conservative and may not preserve comments or unknown formatting.

