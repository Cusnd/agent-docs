---
status: accepted
supersedes: 0001-separate-control-plane-from-repository-memory
---

# 使用 hook 路由协议，不注册 Skill

[English](0003-use-hook-routed-protocol-without-skill-registration.md)

不要通过插件 `skills` 字段或任何 `SKILL.md` 暴露 Agent Docs。即使 implicit invocation 被禁用，Codex 仍会把每个注册 Skill 的 name、description 与 path 放入初始上下文，因此 disabled Skill 仍会产生本系统希望避免的 context pollution。

完整 model-independent 协议与模板放在普通 `protocol/` 资源下。`UserPromptSubmit` 只在合格 Git worktree 注入 Receipt identity、materiality 边界、绝对协议路径与 non-material 关闭命令；`SubagentStart` 只在需要时注入 single-writer；`Stop` 执行一次修复。移除 `SessionStart`，因为 material turn 尚未存在时不应增加上下文。

这样既保留自动仓库处理，也让 Agent Docs 不出现在全局 Skill catalog 和无关或非 Git session context 中。
