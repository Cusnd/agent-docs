# Agent Docs 生命周期

[English](lifecycle.md)

## Eligibility 与激活

只有当前路径属于非 bare 顶层 Git worktree、不是 submodule、root 可写、不位于操作系统临时目录且根目录无 `.agent-docs-disable` 时才默认激活。激活不创建 `docs/agent`；第一个 material turn 才初始化。插件不修改 `AGENTS.md`。

## Materiality

Work Session 表示一次 Root Agent execution episode，而不是一个聊天 turn。只有改变 Requirement state、completion evidence、已知风险/阻塞或具体 next step 时才创建。产生可复用证据/下一步的只读诊断也符合；纯解释、重复状态、没有持久结果的计划和 no-op 不符合。

## Requirement identity 与状态

同一可独立验证结果的澄清继续使用同一 ID；独立结果使用新 ID 并显式链接；替换创建新 ID，旧项成为 `Superseded`。ID 使用 UTC 时间和四位随机后缀，永不重排或复用。

允许状态：`Todo`、`In Progress`、`Blocked`、`Deferred`、`Done`、`Dropped`、`Superseded`。后三者是终态。日志失败不得把产品 Requirement 改成 `Blocked` 或 `Failed`。Priority 为 `P0` 至 `P3`，默认 `P2`；`P0` 需要用户明确设置或已验证生产紧急情况。

## Acceptance Criteria 与证据

第一个实质实现步骤前写可观察 checkbox criterion。只在证据支持时勾选。好证据包括准确验证命令与摘要、精确文件/符号、已经获授权创建的 commit ID，以及不暴露秘密的 artifact reference。失败与未验证范围必须如实记录。

## Single writer 与锁

Root Agent 负责语义写入；subagent 返回证据。手工编辑 `requirements.md` 前，用当前 Receipt identity 获取锁并保存 token，获取后重新读取，写最小变更，即使失败也用同一 token 释放。

锁位于当前 worktree Git 元数据，五分钟后可判定 stale。回收先把观察到的锁原子移动到唯一 quarantine；release 需要匹配 acquisition token，旧 owner 无法删除后继。冲突时重读并重试一次，仍失败则保留产品工作并报告 Log Health。

## Turn Receipt 与 Stop

`UserPromptSubmit` 在当前 worktree Git 元数据写 pending Receipt。Schema v2 绑定 canonical repository、common Git directory 与 worktree Git directory identity，并只捕获一次控制 baseline；重复提交复用。Schema v1 只读兼容。无仓库记录时关闭 `not-material`，material 后用有效 Work Session 关闭 `closed`。

Receipt 终态不可变；完全相同关闭幂等，改变终态或 Session 失败。`closed` 要求控制状态已变与有效 Work Session；`not-material` 要求未变。其他 linked worktree 无法关闭本 worktree Receipt。

Stop 对 pending Receipt 只阻塞一次；修复仍失败则写 Log Health Warning 并允许停止，不循环，也不把日志问题变成产品失败。

## Commit 边界

Agent Docs 可以在已授权项目工作中更新 working tree，但不自行获得 commit 权限。只有用户已经授权包含这些变更的 commit 时才加入；不得创建自动或 log-only commit。
