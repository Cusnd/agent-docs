# Operations

[简体中文](operations.zh-CN.md)

## Daily checks

Run `agent-docs status --json` before investigating a hook warning and `agent-docs validate --json` before closing material work. The status command uses the small per-worktree runtime index; validate scans complete committed history.

Run `agent-docs archive --json` before validation. Recently Closed remains capped at 20 rows, newest first. The archive receives overflow oldest first and is append-only.

## Single-writer rule

Only the root agent edits `docs/agent` or Agent Docs Git metadata. Subagents return concise proposed evidence, paths, checks, risks, and next steps. The root agent obtains the Requirements lock, rereads the current document, applies one coherent edit, validates, and releases the exact acquisition token.

Lock contention is a retry condition, not permission to delete a lock. Stale acquisition atomically quarantines an observed lock and retries with a bound. A late release from an earlier owner cannot remove a successor.

## Worktrees and repositories

Receipts, locks, health events, and indexes live under each worktree's Git metadata directory. The repository fingerprint also includes the common Git directory, so copied metadata and another linked worktree cannot close a receipt. Committed `docs/agent` remains part of the shared repository history and is validated in each worktree.

Submodules are deliberately ineligible. Run Agent Docs in the top-level owning repository. Unborn repositories are eligible if they are writable and not temporary.

## Failure behavior

Document writes use a same-directory random file created exclusively, flush data, atomically rename with bounded transient retry, and clean temporary files. Multi-document requirement/archive changes retain snapshots and restore completed targets if a later write fails.

Each Stop health event is a separate immutable file. `status` aggregates valid current JSON events and legacy JSONL records, counts invalid files without treating them as valid evidence, and returns recent warnings.

Git subprocesses have fixed timeouts, bounded output, forced termination, and structured error classes. Filesystem errors such as sharing violations are classified as transient only where retry is safe.

## Opt out and removal

Add an empty `.agent-docs-disable` file at the repository root to deactivate hooks for that repository. Plugin removal is documented in [INSTALL.md](../INSTALL.md). Neither action deletes committed records.
