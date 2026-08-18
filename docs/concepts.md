# Core concepts

[简体中文](concepts.zh-CN.md)

## Requirement

A Requirement is the compact current contract for one outcome. It owns status, priority, acceptance criteria, evidence, next step, and links to closing Work Sessions. Active Requirements are editable; terminal rows are summarized in Recently Closed and eventually archived.

Acceptance Criteria describe observable completion, not activities. Evidence records exact checks and compact results. A `Done` Requirement requires every criterion checked, non-empty evidence, a closing Work Session that references the Requirement, and Session status `Done`.

## Work Session

A Work Session is an immutable handoff for one material execution. It records goal, meaningful changes, important paths, verification, result, commit state, and next step. `Partial`, `Blocked`, and `Failed` Sessions are legitimate evidence of work but can never close a Requirement as `Done`.

Create exactly one Session at the end of a material execution. Do not use Sessions as progress journals or transcripts, and never rewrite one after it has been committed.

## Decision

A Decision records a costly-to-reverse choice, its context, trade-offs, and consequences. It must reference an existing Requirement. Supersede an old decision with a new record rather than editing history.

## Turn Receipt

A Turn Receipt is local runtime state proving that a hook-routed turn was classified. Schema v2 binds the Receipt to canonical repository root, common Git directory, and worktree Git directory. It records the original Agent Docs control-document digest once; duplicate `UserPromptSubmit` calls do not replace that baseline.

`pending` may become `closed` only when the control digest changed and the closure cites a valid Work Session. It may become `not-material` only when the digest did not change. Repeating the same terminal closure is idempotent; changing the terminal state or Session fails.

Schema v1 Receipts remain readable and use full-history digests, but the runtime does not bulk-rewrite them.

## Lock, health event, and worktree index

The Requirements lock is a Git-metadata directory acquired exclusively with a random token, owner, process ID, and timestamp. Stale locks are atomically moved to unique quarantine names before retry. Only the matching token can release the current lock.

Each health warning is one immutable JSON file, so concurrent writers do not share a read-modify-write target. A small per-worktree index maps a Codex session to its most recent Receipt. These are operational files, not project documentation.
