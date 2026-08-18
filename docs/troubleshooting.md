# Troubleshooting

[简体中文](troubleshooting.zh-CN.md)

## Hook is inactive

Check that this is a writable top-level Git worktree, not a bare repository, submodule, operating-system temporary directory, or repository with `.agent-docs-disable`. Confirm `node --version`, `codex --version`, and `codex plugin list --json`. A newly installed plugin requires a fresh Codex task.

## `REPOSITORY_PROBE_FAILED`

Use the structured error and stderr to distinguish missing Git, Git timeout, dubious ownership, ordinary Git failure, and filesystem transient failure. Fix the specific Git condition; do not repeatedly run document writes while repository identity is uncertain.

## Requirements lock is held

Wait briefly and retry. Do not delete the lock directory. The runtime automatically quarantines a genuinely stale lock after its timeout and uses the acquisition token to prevent late-owner deletion.

## Validation fails

Run `agent-docs validate --json` and inspect `error.issues`. Common causes include malformed or mismatched generated markers, a missing cross-reference, an unchecked criterion on a `Done` Requirement, a non-`Done` closing Session, wrong archive year/order, or a linked path. Correct the source record; do not weaken the validator or edit immutable history to conceal the issue.

## Stop blocks once

The first Stop with a pending Receipt is the single repair pass. For material work, update the Requirement, create one Work Session, validate, and close the receipt. For non-material work, close it as `not-material`. If the second Stop still finds it pending, Agent Docs records a local health warning and allows product work to continue.

## Receipt cannot close

- `not-material` fails when the Agent Docs control digest changed; use a valid Work Session closure.
- `closed` fails when the digest did not change; use `not-material`.
- A different worktree, replacement Session, or changed terminal state is rejected by design.
- Schema v1 remains readable but uses the repository path and full-history digest captured by the older runtime.

## Windows sharing violation

Atomic rename and cleanup retry `EPERM`, `EACCES`, and `EBUSY` with an upper bound. If failure persists, close programs scanning or holding the specific repository file and retry. Do not disable antivirus globally or remove unrelated locks.

## Report a problem

Follow [SUPPORT.md](../SUPPORT.md). Share only sanitized summaries and repository-relative paths. Use Private Vulnerability Reporting for security issues.
