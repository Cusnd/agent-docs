# 日常运营

[English](operations.md)

## 日常检查

调查 hook warning 前运行 `agent-docs status --json`，关闭 material work 前运行 `agent-docs validate --json`。status 使用小型 per-worktree 运行索引，validate 扫描完整提交历史。

校验前运行 `agent-docs archive --json`。Recently Closed 最多 20 行并按最新优先排列；archive 按最旧优先接收溢出项，且为 append-only。

## Single-writer 规则

只有 root agent 可以编辑 `docs/agent` 或 Agent Docs Git 元数据。Subagent 只返回紧凑的建议证据、路径、检查、风险和下一步。root agent 获取 Requirements lock，重新读取当前文档，应用一次一致变更，校验，然后使用准确 acquisition token 释放。

锁冲突意味着重试，不代表可以删除锁。stale acquisition 会原子 quarantine 已观察锁，再做有界重试。旧 owner 的迟到 release 无法删除后继锁。

## Worktree 与仓库

Receipt、lock、health event 和 index 位于每个 worktree 自己的 Git 元数据目录。repository fingerprint 还包含 common Git directory，因此复制元数据或另一个 linked worktree 都不能关闭 Receipt。提交的 `docs/agent` 属于共享仓库历史，每个 worktree 都会校验。

submodule 明确不合格；应在拥有它的顶层仓库运行 Agent Docs。只要可写且不位于临时目录，unborn repository 可以使用。

## 故障行为

文档写入使用同目录随机文件、exclusive create、数据 flush、带有界瞬态重试的原子 rename，并清理临时文件。多文档 Requirement/archive 变更保留 snapshot；后续写失败时会恢复已完成目标。

每个 Stop 健康事件都是独立不可变文件。`status` 汇总当前 JSON 事件与旧 JSONL，单独统计无效文件且不把它们当成有效证据，并返回最近警告。

Git 子进程具有固定 timeout、输出上限、强制终止和结构化错误分类。sharing violation 等文件系统错误只在可安全重试的地方被视作瞬态。

## 退出与移除

在仓库根目录创建空的 `.agent-docs-disable` 可以停用该仓库 hooks。插件移除见 [INSTALL.zh-CN.md](../INSTALL.zh-CN.md)。两种操作都不会删除已提交记录。
