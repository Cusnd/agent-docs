---
status: accepted
supersedes: 0001-separate-control-plane-from-repository-memory
---

# Use a hook-routed protocol without Skill registration

[简体中文](0003-use-hook-routed-protocol-without-skill-registration.zh-CN.md)

Do not expose Agent Docs through the plugin `skills` field or any `SKILL.md`. Codex includes every registered Skill's name, description, and path in the initial context even when implicit invocation is disabled, so a disabled Skill still creates the context pollution this system is meant to avoid.

Keep the complete model-independent protocol and templates under ordinary `protocol/` resources. `UserPromptSubmit` creates the Turn Receipt and injects only its identity, the materiality boundary, the absolute protocol path, and the non-material resolution command in eligible Git worktrees. `SubagentStart` injects only the single-writer boundary when needed. `Stop` performs the one-pass repair. Remove `SessionStart` because it adds context before a material turn exists.

This preserves automatic repository handling while eliminating Agent Docs from the global Skill catalog and from unrelated or non-Git session context.
