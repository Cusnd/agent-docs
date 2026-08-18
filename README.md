# Agent Docs

[简体中文](README.zh-CN.md)

[![CI](https://github.com/Cusnd/agent-docs/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Cusnd/agent-docs/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/Cusnd/agent-docs/badge)](https://securityscorecards.dev/viewer/?uri=github.com/Cusnd/agent-docs)
[![Community profile: 100%](https://img.shields.io/badge/community%20profile-100%25-brightgreen)](https://github.com/Cusnd/agent-docs/community)

Agent Docs is an unofficial, community-maintained Codex plugin that keeps compact requirements, verification evidence, Work Sessions, and durable decisions inside a Git repository. It is not an OpenAI product and is not endorsed by OpenAI.

The plugin is hook-only. It registers `UserPromptSubmit`, `SubagentStart`, and `Stop`; it does not register a Skill or a `SessionStart` hook. Its runtime is built entirely on Node.js standard-library APIs and has zero third-party runtime dependencies.

## Why Agent Docs

Long agent conversations are poor project records. Agent Docs turns the material outcome of a turn into a small, reviewable repository contract:

- `docs/agent/requirements.md` tracks the current outcome, acceptance criteria, evidence, status, and next step.
- `docs/agent/sessions/` stores one immutable Work Session for each material execution.
- `docs/agent/decisions/` stores costly-to-reverse decisions.
- Git metadata stores ephemeral receipts, locks, health events, and worktree indexes; these runtime records are not committed.

A **material turn** changes requirement state, evidence, risk, or the next actionable step. It must update Agent Docs, create exactly one Work Session, validate the records, and close its Turn Receipt. A **non-material turn** changes none of those things and closes the receipt as `not-material` without initializing repository documents.

## Trust boundary

Agent Docs writes only to `docs/agent/` in an eligible top-level Git worktree and to that worktree's Git metadata directory. It rejects bare repositories, submodules, operating-system temporary directories, opted-out repositories, unsafe identifiers, and linked or escaping document paths. See the [security and privacy model](docs/security-model.md) for the complete boundary and its local-attacker limitation.

Before installing any plugin, review its marketplace entry, manifest, hook commands, and runtime scripts. The release archive is assembled from an explicit allowlist; tests, repository automation, `docs/agent`, and development dependencies are excluded.

## Quick start

Requirements:

- Codex CLI `0.147.0` for the verified plugin command surface.
- Node.js `^22.0.0 || ^24.0.0 || ^26.0.0`.
- Git.

Download `agent-docs-marketplace-v0.2.0.zip` and `SHA256SUMS` from the [v0.2.0 release](https://github.com/Cusnd/agent-docs/releases/tag/v0.2.0), verify the checksum and GitHub artifact attestation, extract the archive, and run:

```console
codex plugin marketplace add <extracted-marketplace-directory>
codex plugin add agent-docs@agent-docs
codex plugin list --json
```

Open a fresh Codex task in an eligible Git repository after installation. The plugin does not modify an existing task's hook set. Full review, verification, recovery, and removal instructions are in [INSTALL.md](INSTALL.md).

## Compatibility

| Scope                  | Codex CLI    | Node.js                                 | Operating systems     | Model                                       |
| ---------------------- | ------------ | --------------------------------------- | --------------------- | ------------------------------------------- |
| CI verified            | `0.147.0`    | 22, 24, 26                              | Windows, Linux, macOS | None; CI makes no model call                |
| Observed interactively | `0.147.0`    | 26                                      | Windows               | GPT-5.6 Sol                                 |
| Other combinations     | Not verified | Outside the stated range is unsupported | Not verified          | Model-independent contract; reports welcome |

The hook protocol is model-independent. The observed model is not an exclusive support target. Node release lines are reviewed on every project release against the [official Node.js release schedule](https://nodejs.org/en/about/previous-releases).

## Operator CLI

The stable v0.2.0 operator surface is deliberately small:

```text
agent-docs --help
agent-docs --version
agent-docs init [--json]
agent-docs status [--turn-id UUID] [--json]
agent-docs validate [--json]
agent-docs archive [--json]
```

Requirement, Session, Decision, Receipt, Lock, and ID commands are internal protocol mechanics and are not stable before 1.0. There is no JavaScript library API and no npm package publication. See the [CLI reference](docs/cli.md).

## Documentation

- [Getting started](docs/getting-started.md)
- [Core concepts and lifecycle](docs/concepts.md)
- [Operations](docs/operations.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Architecture](docs/architecture.md)
- [Security and privacy](docs/security-model.md)
- [Release and verification](RELEASING.md)
- [Public project history](docs/history.md)

English documents are canonical. User-facing documents have complete Simplified Chinese mirrors, checked by CI. `docs/agent`, the legal License text, and generated templates are intentionally excluded from the mirror rule.

## Community and support

Questions belong in [GitHub Discussions](https://github.com/Cusnd/agent-docs/discussions). Reproducible defects, feature proposals, and documentation requests belong in [Issues](https://github.com/Cusnd/agent-docs/issues). Security vulnerabilities must use [GitHub Private Vulnerability Reporting](https://github.com/Cusnd/agent-docs/security/advisories/new), never a public Issue.

All maintenance and support are best effort. The project makes no response, acknowledgement, fix, or release SLA. External pull requests are welcome but are not guaranteed to be merged. See [SUPPORT.md](SUPPORT.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [GOVERNANCE.md](GOVERNANCE.md).

## License

[MIT](LICENSE) — Copyright (c) 2026 liuso.
