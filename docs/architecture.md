# Architecture

[简体中文](architecture.zh-CN.md)

## Components

Agent Docs is one local Node.js runtime with four boundaries:

1. **Codex hooks** route `UserPromptSubmit`, `SubagentStart`, and `Stop` events to the CLI process.
2. **Repository documents** under `docs/agent` hold reviewable Requirements, Work Sessions, Decisions, and archives.
3. **Per-worktree Git metadata** holds Receipts, the Requirements lock, health events, and the session index.
4. **Operator CLI** exposes the small stable maintenance surface while internal commands implement protocol transitions.

There is no server, database, telemetry, network call, model call, JavaScript library API, npm distribution, or persistent process.

## Event flow

```text
UserPromptSubmit
  -> verify eligible repository/worktree
  -> create or reuse schema v2 pending receipt
  -> capture control digest once
  -> inject protocol context

material execution
  -> update Requirement under token-bound lock
  -> write exactly one immutable Work Session
  -> archive + full validate
  -> close receipt with Session

Stop
  -> index lookup for current receipt
  -> first pass blocks for repair
  -> second pass writes immutable health event and stops blocking
```

The hot path hashes only `manifest.json` and `requirements.md` and consults the per-worktree index. Explicit validation scans all Session, Decision, archive, and reference content.

## Repository identity

Git provides the top-level root, common directory, and worktree-specific Git directory. All are canonicalized with real paths. Schema v2 fingerprints both repository identity and worktree identity, while the metadata location is the worktree Git directory. A normal clone, linked worktree, submodule, and unborn repository therefore have intentionally different eligibility and isolation behavior.

## Write path

Before a document write, every existing parent is inspected with `lstat` and `realpath`; symbolic links, junctions, reparse points, and repository escape are rejected. The parent is checked around the write. Files use a random same-directory temporary name created exclusively, data flush, atomic rename with bounded retry, and cleanup. Requirement/archive multi-file updates use rollback snapshots.

The design reduces accidental and opportunistic path attacks but does not establish an operating-system security boundary against a process with the same account continuously racing directory replacement.

## Packaging

Repository development uses exact locked dev dependencies. The plugin package has no runtime dependencies. Release construction uses `fflate` only from root tooling and collects an explicit allowlist into a deterministic ZIP. Neither the builder nor its dependency enters that ZIP.

Architecture decisions are preserved under `plugins/agent-docs/docs/adr/`.
