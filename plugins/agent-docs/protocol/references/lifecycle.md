# Agent Docs lifecycle

[简体中文](lifecycle.zh-CN.md)

## Eligibility and activation

Agent Docs activates by default only when all conditions hold:

- The current path belongs to a non-bare Git worktree.
- The worktree is the top-level repository, not a Git submodule.
- The repository root is writable.
- The repository is not under the operating-system temporary directory.
- `.agent-docs-disable` is absent from the repository root.

Activation does not create `docs/agent`. The first material turn initializes it. The plugin never modifies `AGENTS.md`.

## Materiality

A Work Session represents one Root Agent execution episode, not a chat turn. Create it only when the episode materially changes at least one of:

- Requirement state;
- completion evidence;
- known risk or blocker;
- concrete next step.

A read-only diagnosis qualifies if it creates reusable evidence or a next step. Chat-only explanations, repeated status, planning with no durable outcome, and no-op work do not qualify.

## Requirement identity

- Clarification or refinement of the same independently verifiable outcome updates the same ID.
- A distinct independently verifiable outcome gets a new ID and explicit links.
- A replacement gets a new ID; the old Requirement becomes `Superseded`.
- IDs are UTC time plus a four-character random suffix. Never renumber or reuse them.

## Requirement state machine

Allowed statuses are exactly:

- `Todo`: accepted outcome with no material implementation underway.
- `In Progress`: material implementation or verification is underway.
- `Blocked`: cannot progress because a named dependency or decision is unavailable.
- `Deferred`: intentionally postponed without claiming completion.
- `Done`: every Acceptance Criterion is satisfied and evidenced.
- `Dropped`: intentionally abandoned without replacement.
- `Superseded`: replaced by a linked new Requirement.

`Done`, `Dropped`, and `Superseded` are terminal and belong in Recently Closed or the archive. Do not use logging failures as a reason to move a product Requirement to `Blocked` or `Failed`.

Priorities are `P0` through `P3`; default to `P2`. `P0` requires explicit user priority or a verified production emergency.

## Acceptance Criteria and evidence

Write observable checkbox criteria before the first material implementation step. Criteria describe outcomes or constraints, not a task list. Check an item only when evidence supports it.

Good evidence is compact and reproducible:

- exact verification command plus pass/fail summary;
- file path with a precise symbol or line reference;
- commit ID when a commit was already authorized and created;
- artifact path or external evidence reference that does not expose secrets.

Record failures and unverified areas honestly. `Partial`, `Blocked`, and `Failed` Work Sessions preserve useful progress without manufacturing completion.

## Single writer and locking

The Root Agent owns all semantic writes for its task. Subagents may inspect, implement, or test when separately authorized, but they return evidence to the Root Agent for consolidation.

Before manually editing `requirements.md`:

1. acquire the lock using the current receipt identity;
2. reread `requirements.md` after acquisition;
3. write a minimal update;
4. release the lock even on failure.

The lock lives under the current worktree's Git metadata, expires after five minutes, and may be reclaimed when stale. Reclamation first atomically renames the observed lock into a unique quarantine path. Release requires the matching acquisition token, so an old owner cannot remove a successor. On contention, reread and retry once. If that fails, preserve the product work and report Log Health.

## Turn Receipts and Stop

`UserPromptSubmit` writes a pending Turn Receipt under the current worktree's Git metadata. Schema v2 binds canonical repository, common Git directory, and worktree Git directory identities and captures the control-document baseline only once. Duplicate submission reuses that baseline. It contains identifiers and repository state hashes, never the prompt. Schema v1 remains read-only compatible. The Root Agent resolves it as:

- `not-material` when no Agent Docs repository record is needed; or
- `closed` with a valid Work Session after material work.

At Stop, a pending receipt triggers one blocking repair request. If it remains pending while the retry is active, Agent Docs records a Log Health Warning and allows Stop. It does not loop and does not convert logging trouble into product failure.

Terminal Receipt transitions are immutable. The same closure is idempotent, but another terminal state or replacement Session fails. `closed` requires changed control state and a valid Work Session; `not-material` requires unchanged control state. Another linked worktree cannot close this worktree's Receipt.

## Commit boundary

Agent Docs may update working-tree records during authorized project work. It never grants itself commit permission. Include its files only when the user already authorized a commit encompassing those changes. Do not create automatic or log-only commits.
