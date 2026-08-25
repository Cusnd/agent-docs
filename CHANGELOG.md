# Changelog

[简体中文](CHANGELOG.zh-CN.md)

All notable changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses Semantic Versioning before 1.0 for operator-facing compatibility.

## [Unreleased]

### Added

- Bilingual, one-link Agent installation contracts with pinned Release identities, checksum and attestation gates, trust review, target authorization, transactional rollback, JSON readback, and no-login/no-model boundaries.
- Repository checks that keep both contract objects identical and require every public installation entrypoint and safety-critical command.

### Fixed

- Existing healthy installations now continue to hook review and activation instead of reporting idempotent success while plugin hooks remain untrusted; the bilingual contract checker locks this control-flow requirement.

## [0.2.0] - 2026-08-18

### Added

- Stable operator CLI for `init`, `status`, `validate`, and `archive`, with a versioned JSON envelope and documented exit codes.
- Receipt schema v2 with canonical repository and per-worktree binding, a worktree runtime index, and read-only schema v1 compatibility.
- Token-bound stale-lock quarantine, retrying atomic writes, immutable health events, and structured Git failure classes.
- Strict identifier, generated-marker, cross-reference, lifecycle, archive, and Markdown-table validation.
- Bilingual user, contributor, governance, security, architecture, operations, troubleshooting, and release documentation.
- Cross-platform Node.js 22/24/26 CI, CodeQL, dependency review, Scorecard, secret checks, Dependabot, deterministic packaging, checksum, and artifact-attestation workflows.
- Explicit Marketplace ZIP allowlist, same-machine byte reproducibility checks, cross-OS digest comparison, and isolated `CODEX_HOME` installation smoke tests.
- CI, OpenSSF Scorecard, and Community Profile badges added only after their remote results were verified.

### Changed

- Supported Node.js versions are `^22.0.0 || ^24.0.0 || ^26.0.0` and are reviewed at every release.
- Log Health now uses one immutable file per event instead of concurrent JSONL read-modify-write.
- Hook hot paths hash only control documents and consult the worktree index; full history scanning belongs to explicit validation and CI.
- Public positioning now distinguishes model-independent protocol behavior, CI-verified combinations, observed interactive use, and unverified combinations.
- Repository containment accepts canonical operating-system aliases such as Windows 8.3 paths and macOS `/var` links while still rejecting linked descendants and paths outside the root.
- External-link extraction now stops at Markdown code delimiters and is covered by an offline self-test.

### Security

- Rejects malformed or path-like IDs before path construction.
- Rejects symbolic links, junctions, reparse points, and paths resolving outside the repository before and after writes.
- Prevents a stale lock owner from deleting a successor lock and prevents terminal Receipt rewrites or cross-worktree closure.
- Waits for short-lived live-lock contention with bounded exponential backoff before returning a transient failure.
- Adds a repository-specific public-content gate while keeping the generic Agent Docs validator suitable for private repositories.

[0.2.0]: https://github.com/Cusnd/agent-docs/releases/tag/v0.2.0
