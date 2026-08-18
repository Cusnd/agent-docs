---
status: superseded
superseded_by: 0003-use-hook-routed-protocol-without-skill-registration
---

# 把 Agent Docs 控制面与仓库记忆分离

[English](0001-separate-control-plane-from-repository-memory.md)

把 Agent Docs 作为用户安装的 Codex Desktop、CLI 与 IDE 插件分发，每个仓库只在 `docs/agent/` 保存交接记录。原设计使用紧凑 Skill pointer 而不是 `AGENTS.md`。ADR 0003 取代该激活机制，因为即使 Skill 被禁用，其 metadata 仍会进入初始模型上下文。
