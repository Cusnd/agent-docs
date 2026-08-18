---
status: superseded
superseded_by: 0003-use-hook-routed-protocol-without-skill-registration
---

# Separate Agent Docs control from repository memory

[简体中文](0001-separate-control-plane-from-repository-memory.zh-CN.md)

Distribute Agent Docs as a user-installed plugin for Codex Desktop, CLI, and IDE, while keeping only handoff records under `docs/agent/` in each repository. The original design injected a compact Skill pointer instead of using `AGENTS.md`. ADR 0003 supersedes that activation mechanism because even Skill metadata appears in the initial model context.
