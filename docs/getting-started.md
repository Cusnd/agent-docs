# Getting started

[简体中文](getting-started.zh-CN.md) · [Documentation index](../README.md#documentation)

## Decide whether Agent Docs fits

Use Agent Docs when a Git repository is the durable source of truth and agent work needs explicit acceptance criteria, verification evidence, and handoff state. Do not use it as a chat transcript, telemetry store, secret manager, task scheduler, or substitute for Git history.

The plugin works only in an eligible top-level worktree. It is inactive in bare repositories, submodules, operating-system temporary directories, read-only worktrees, and repositories containing `.agent-docs-disable`.

## Install

Follow [INSTALL.md](../INSTALL.md). Review the release contents, verify SHA-256 and the GitHub attestation, add the extracted Marketplace, install `agent-docs@agent-docs`, and start a fresh Codex task.

## First material workflow

1. `UserPromptSubmit` creates a pending Turn Receipt in this worktree's Git metadata and injects the protocol location.
2. Initialize records with `agent-docs init --json` if the repository has none.
3. Add or update the Requirement before implementation. Its acceptance criteria must be observable.
4. Implement and verify the product change.
5. Update Requirement status, evidence, next step, and related Session.
6. Create exactly one Work Session for the material execution.
7. Run `agent-docs archive --json` and `agent-docs validate --json`.
8. The internal protocol closes the pending receipt with that Session.

Agent Docs never commits. Review and commit repository documents with the product changes according to the repository's own policy.

## First non-material workflow

If the turn changes no Requirement status, evidence, material risk, or next step, do not initialize or edit `docs/agent`. Close the pending receipt as `not-material`. The hook's additional context contains the exact internal command.

## Verify health

```console
agent-docs status --json
agent-docs validate --json
```

`status` reads eligibility, Git identity, receipt state when requested, and local health events. `validate` performs the intentionally more expensive full history and cross-reference scan.

Next, read [core concepts](concepts.md) and the [lifecycle](lifecycle.md).
