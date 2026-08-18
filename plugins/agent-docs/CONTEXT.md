# Agent Docs plugin context

[简体中文](CONTEXT.zh-CN.md)

This directory is the complete installable plugin source. Repository-level development, community policy, workflows, tests, and deterministic packaging live outside the release runtime.

The runtime is deliberately dependency-free and hook-only. `hooks/hooks.json` is the activation surface; `protocol/PROTOCOL.md` is the behavioral contract; `scripts/agent-docs.mjs` is the process entry point; `scripts/lib/` contains repository, document, state, path, and validation mechanics; `protocol/assets/templates/` initializes new repository records.

Changes must preserve safe top-level-worktree eligibility, per-worktree Git metadata, schema v1 read compatibility, schema v2 Receipt binding, immutable terminal transitions, token-bound locks, safe parent checks, atomic writes, one Stop repair pass, and full explicit validation. Public operator compatibility is restricted to the commands documented in the project CLI reference.

The project root owns release allowlisting. `fflate` and all lint/format/documentation tools are development dependencies and must never become runtime imports or ZIP contents.
