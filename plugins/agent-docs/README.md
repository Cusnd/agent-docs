# Agent Docs plugin

[简体中文](README.zh-CN.md) · [Project README](../../README.md)

Agent Docs is an unofficial community Codex plugin that maintains compact repository requirements, evidence, Work Sessions, and durable decisions. Its contract is model-independent.

## Plugin boundary

- Hooks only: `UserPromptSubmit`, `SubagentStart`, and `Stop`.
- No registered Skill and no `SessionStart` hook.
- Zero third-party runtime dependencies; supported Node.js range is `^22.0.0 || ^24.0.0 || ^26.0.0`.
- No network, model, telemetry, service, authentication, npm publication, or JavaScript library API.
- Repository documents under `docs/agent`; ephemeral runtime state under the current worktree's Git metadata.

## Behavior

`UserPromptSubmit` creates or reuses a pending schema v2 Turn Receipt and injects the protocol location. A material turn updates the Requirement, creates one immutable Work Session, validates all records, and closes the Receipt with that Session. A non-material turn changes no control state and closes `not-material`.

`SubagentStart` injects the single-writer rule. `Stop` permits one repair pass for a pending Receipt; a second pass records a local health warning and allows product work to continue.

## Compatibility evidence

CI exercises Codex CLI `0.147.0` without model calls on Windows, Linux, and macOS with Node.js 22, 24, and 26. Interactive use has been observed on Windows with Codex `0.147.0`, Node.js 26, and GPT-5.6 Sol. Other Codex or model combinations are unverified and welcome reports; the observed model is not an exclusive target.

## Inspect before installation

Review `.codex-plugin/plugin.json`, `hooks/hooks.json`, `scripts/`, and `protocol/`. Install only from a verified project Release and follow [INSTALL.md](../../INSTALL.md). The Marketplace ZIP contains this runtime and its documentation but excludes tests, development tools, repository workflows, and project `docs/agent` records.

## Operator CLI

Stable v0.2.0 commands are `--help`, `--version`, `init`, `status`, `validate`, and `archive`. Internal Requirement, Session, Decision, Receipt, Lock, and ID commands are protocol mechanics and may change before 1.0. See the [CLI reference](../../docs/cli.md).

## Security

IDs are validated before path construction. Schema v2 Receipts are bound to canonical repository/worktree identity. Linked or escaping document paths are rejected, locks use acquisition tokens and stale quarantine, and writes use flushed same-directory temporary files plus atomic rename. The same-account directory-race limitation and public-data policy are documented in the [security model](../../docs/security-model.md).

Licensed under [MIT](../../LICENSE). This project is not an OpenAI product and is not endorsed by OpenAI.
