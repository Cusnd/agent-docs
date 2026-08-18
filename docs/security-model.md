# Security and privacy model

[简体中文](security-model.zh-CN.md)

## Assets and actors

Protected assets are repository-controlled Agent Docs records, each worktree's runtime state, release artifacts, and public-project confidentiality. Trusted actors are the repository owner, the local Codex process, Git, Node.js, and reviewed GitHub workflows. Pull requests, branch metadata, archive contents, downloaded artifacts, and arbitrary prose are untrusted until validated.

## Enforced boundaries

- IDs are checked against complete anchored ASCII shapes before lookup or path construction. Absolute paths, separators, parent components, suffixes, prefixes, and deceptive variants fail.
- Repository root, common Git directory, and worktree Git directory are canonicalized. Receipt schema v2 binds to both repository and worktree fingerprints.
- The document root and every existing parent reject symbolic links, junctions, reparse points, and realpath escape before writes; target parents are checked again around writes.
- Requirements locking uses exclusive creation, random acquisition tokens, stale-lock quarantine, bounded retry, and token verification at release.
- Atomic writes use exclusive same-directory temporary files, flush, rename, bounded Windows transient retry, and temporary cleanup. Related requirement/archive updates are rollback-capable.
- Receipt terminal states are immutable. Material closure requires changed control state and a valid Session; non-material closure requires unchanged control state.
- Validator checks strict markers, file/ID agreement, cross-references, lifecycle, archives, table escaping, and obvious secret patterns.
- Hooks have bounded Git subprocesses and a one-repair-pass Stop policy.

## Data placement

Committed data lives only under `docs/agent`. Runtime Receipt, lock, index, and health data lives under the current worktree's Git metadata and is not included in releases. The plugin emits compact hook context and diagnostics to Codex; it does not transmit data, call a model, collect telemetry, or read user credentials.

This public repository deliberately commits sanitized `docs/agent` dogfooding records. Its additional scanner rejects common user paths, machine names, internal task/thread identifiers, signed private URLs, credentials, cookies, private keys, and terminal-capture markers. Release archives exclude all project records.

## Residual risks

- A process with the same operating-system account that continuously races directory replacement can exceed the protection offered by repeated path checks.
- Pattern scanning cannot prove prose is non-sensitive. Human review remains mandatory.
- Git, Node.js, Codex, the operating system, and GitHub Actions are part of the trusted computing base.
- A malicious reviewed change to pinned automation or the release allowlist can alter artifacts; branch rules, CODEOWNERS, checks, attestations, and reproducible bytes reduce but do not eliminate that risk.
- Schema v1 Receipt compatibility retains its original path-based identity and full-history hash behavior.

## Public disclosure rules

Use repository-relative paths, public GitHub links, and compact check summaries. Never commit private paths, host names, task/thread identifiers, private artifact or temporary URLs, complete terminal output, conversation transcripts, credentials, cookies, or authentication material. Report vulnerabilities only through the channel in [SECURITY.md](../SECURITY.md).

The generic plugin validator intentionally does not enforce this repository's public-disclosure policy, because Agent Docs also serves private repositories.
