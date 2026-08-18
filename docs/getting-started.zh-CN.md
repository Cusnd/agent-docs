# 快速上手

[English](getting-started.md) · [文档索引](../README.zh-CN.md#文档)

## 判断是否适合

当 Git 仓库是持久事实源，而且代理工作需要明确验收标准、验证证据和交接状态时，可以使用 Agent Docs。不要把它当成聊天转录、遥测存储、秘密管理器、任务调度器或 Git 历史替代品。

插件只在合格的顶层 worktree 中运行。bare repository、submodule、操作系统临时目录、只读 worktree，以及包含 `.agent-docs-disable` 的仓库都会被跳过。

## 安装

按照 [INSTALL.zh-CN.md](../INSTALL.zh-CN.md) 操作：检查 Release 内容，验证 SHA-256 和 GitHub attestation，添加解压后的 Marketplace，安装 `agent-docs@agent-docs`，再打开一个全新的 Codex 任务。

## 第一次 material workflow

1. `UserPromptSubmit` 在当前 worktree 的 Git 元数据中创建 pending Turn Receipt，并注入协议位置。
2. 若仓库尚无记录，运行 `agent-docs init --json`。
3. 实现前新增或更新 Requirement，验收标准必须可观察。
4. 实现并验证产品变更。
5. 更新 Requirement 状态、证据、下一步和关联 Session。
6. 为本次实质执行创建且只创建一个 Work Session。
7. 运行 `agent-docs archive --json` 和 `agent-docs validate --json`。
8. 内部协议使用该 Session 关闭 pending receipt。

Agent Docs 永远不会提交 Git。请依据仓库自己的政策审查并随产品改动提交仓库文档。

## 第一次 non-material workflow

如果本轮没有改变 Requirement 状态、证据、实质风险或下一步，不要初始化或修改 `docs/agent`，直接将 pending receipt 关闭为 `not-material`。hook 的 additional context 会给出准确的内部命令。

## 检查健康状态

```console
agent-docs status --json
agent-docs validate --json
```

`status` 读取 eligibility、Git 身份、可选 Receipt 状态和本地健康事件；`validate` 执行刻意更昂贵的完整历史与交叉引用扫描。

接下来阅读[核心概念](concepts.zh-CN.md)和[生命周期](lifecycle.zh-CN.md)。
