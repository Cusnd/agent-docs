# Public project history

[简体中文](history.zh-CN.md)

Agent Docs began as a verified local hook-only plugin prototype. Its portable Node.js implementation, hook manifest, protocol, templates, and tests were copied into a dedicated unborn Git repository without changing the active local installation. The initial handoff verified source equivalence and the original nine-test suite.

A public-release audit then identified weaknesses in Receipt identity and lifecycle enforcement, worktree binding, stale-lock reclamation, linked-path handling, atomic writes, concurrent health logging, validator strictness, and shared test fixtures. Publication decisions selected the MIT License, `Cusnd/agent-docs`, bilingual documentation, external contributions, release ZIP distribution, and public sanitized `docs/agent` dogfooding.

Version 0.2.0 addresses those findings, defines a small stable operator CLI, moves runtime state to per-worktree Git metadata, adds deterministic release engineering and isolated installation tests, and establishes GitHub community and security governance. The repository's initial commit is the one permitted bootstrap push before branch and tag rules are enabled; subsequent primary-branch changes use pull requests.

The public repository was bootstrapped at commit [`1131b06`](https://github.com/Cusnd/agent-docs/commit/1131b068b82e7d438f4667884454a3fe02fb5951). Two protected pull requests then repaired cross-platform validation and recorded verified badges before the annotated, immutable [`v0.2.0` release](https://github.com/Cusnd/agent-docs/releases/tag/v0.2.0) was created from commit `569fb8a`. Its three operating-system package jobs produced the same 34-file Marketplace ZIP with SHA-256 `70723ad7eb654af02d36c73ca3ea35bda6a5a8043513cf66c5e847e42e65863a`; the downloaded release passed checksum, attestation, rebuild, link, and isolated-install verification.

This history deliberately omits local installation paths, internal task identifiers, private artifact locations, terminal transcripts, and conversation provenance. The original `docs/agent/manifest.json` keeps generator version `0.1.0` as initialization provenance; new templates use generator `0.2.0`.
