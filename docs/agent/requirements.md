# Agent Requirements

This file is the compact source of truth for current outcomes and constraints. It is not a transcript or activity log.

## Active

<!-- agent-docs:active:start -->
<!-- agent-docs:req:R-20260818-124939-69OB:start -->
### R-20260818-124939-69OB: 将 Agent Docs 安全加固并公开发布为成熟的 GitHub 开源项目

- **Created:** 2026-08-18T12:49:39.567Z
- **Updated:** 2026-08-18T15:39:06.332Z
- **Summary:** 将 Agent Docs 安全加固并公开发布为成熟的 GitHub 开源项目
- **Priority:** P2
- **Status:** In Progress
- **Supersedes:** None

#### Acceptance Criteria

- [ ] Public repository Cusnd/agent-docs is released under MIT with sanitized bilingual documentation and complete GitHub Community Profile.
- [ ] Receipt, lock, repository-path, atomic-write, validator, and concurrent-test risks are fixed and covered by reproducible regression tests.
- [ ] CI passes on Windows, Linux, and macOS across the agreed maintained Node.js 22, 24, and 26 matrix, while the plugin keeps zero third-party runtime dependencies.
- [ ] Version 0.2.0 is published as a GitHub Release with a reproducible Marketplace ZIP, SHA-256 checksum, GitHub artifact attestation, changelog, and fresh-install evidence.
- [ ] GitHub repository security, community, and branch settings meet the agreed OSPS Baseline Level 1 gate and are read back after configuration.
- [ ] The stable operator CLI subset, model-independent contract, verified compatibility matrix, no-SLA support policy, and public docs/agent redaction rules are documented and enforced.

#### Evidence

- `npm run check` passed; an isolated `npm test` passed 9/9; Agent Docs validation and the current Codex Plugin validator passed.
- Read-only audit identified release-blocking Receipt/path, stale-lock, symlink, atomic-write, validator, and shared test-fixture risks; see S-20260818-124957-YGYX.
- User selected Cusnd/agent-docs, MIT, v0.2.0, bilingual documentation, open collaboration, public sanitized docs/agent, cross-platform Node 22/24/26, and OSPS Level 1 plus artifact attestation.
- User confirmed me@esoren.com as the public moderation contact and attested that the Cusnd account has 2FA enabled.
- D-20260818-1259-4YJO accepts public sanitized docs/agent dogfooding with a repository-specific disclosure gate and exclusion from the Marketplace ZIP.
- Receipt schema v2, canonical worktree binding, strict IDs, safe-path checks, token-bound locks, retrying atomic writes, immutable health events, validator lifecycle rules, and isolated test fixtures are implemented.
- The sequential base suite passed 50/50; three rounds of two concurrent full 50-test suites passed from randomized OS-temporary workspaces.
- The 1,000-Session/5,000-Receipt sample measured UserPromptSubmit p95 1,070.7 ms, Stop p95 1,071.8 ms, and full validate 1,578.0 ms, all below the configured performance gates.
- Node built-in coverage completed with 88.18% line, 62.48% branch, and 92.90% function coverage; this release intentionally has no arbitrary percentage gate.
- The final local quality gate, exact dependency audits, Codex Plugin validator, deterministic 34-file/66,842-byte ZIP build and metadata verification, and isolated CODEX_HOME install/hook/removal smoke test pass.
- The local Marketplace ZIP SHA-256 is `d9fea04a6ffbdc071086f148d96cb5de1659077e63450645b735a8894dabf193`; it remains local evidence only until the remote Release artifact is independently downloaded and verified.
- English canonical and complete Chinese mirror documentation, community health files, public-content rules, pinned-SHA CI/Security/Scorecard/Links/Release workflows, and the OSPS v2026.02.19 Level 1 evidence map are implemented locally.

#### Next Step

Perform the final staged-content review and bootstrap commit, create and harden Cusnd/agent-docs, wait for all remote gates, then publish and independently verify the attested v0.2.0 Release.

#### Related Sessions

- S-20260818-124957-YGYX
- S-20260818-130124-7DDC
<!-- agent-docs:req:R-20260818-124939-69OB:end -->
<!-- agent-docs:active:end -->

## Recently Closed

The newest 20 closed Requirements remain here. Older rows move to `archive/requirements/YYYY.md`.

<!-- agent-docs:closed:start -->
| ID | Closed (UTC) | Status | Summary | Evidence | Session |
| --- | --- | --- | --- | --- | --- |
| R-20260818-120804-WB89 | 2026-08-18T12:11:46.706Z | Done | 将 Agent Docs hook-only 实现交接为独立可维护项目 | Project checks passed; 9/9 tests; 0 import hash mismatches; live plugin remains installed/enabled from its original path. | S-20260818-121145-XUWB |
<!-- agent-docs:closed:end -->
