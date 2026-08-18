# Agent Docs 插件上下文

[English](CONTEXT.md)

本目录是完整可安装插件源码。仓库级开发、社区政策、workflow、测试和确定性打包位于 Release runtime 之外。

运行时有意保持零依赖和 hook-only。`hooks/hooks.json` 是激活面，`protocol/PROTOCOL.md` 是行为契约，`scripts/agent-docs.mjs` 是进程入口，`scripts/lib/` 包含仓库、文档、状态、路径与校验机制，`protocol/assets/templates/` 用于初始化新仓库记录。

变更必须保留安全顶层 worktree eligibility、per-worktree Git metadata、schema v1 只读兼容、schema v2 Receipt binding、不可变终态转换、token-bound lock、安全 parent 检查、原子写、一次 Stop 修复和完整显式 validate。公开 operator 兼容只覆盖项目 CLI 参考中列出的命令。

项目根负责 Release allowlist。`fflate` 与所有 lint、format、文档工具都是开发依赖，绝不能成为 runtime import 或 ZIP 内容。
