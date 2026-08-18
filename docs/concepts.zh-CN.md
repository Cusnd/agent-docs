# 核心概念

[English](concepts.md)

## Requirement

Requirement 是一个结果的紧凑当前契约，包含状态、优先级、Acceptance Criteria、证据、下一步和关闭 Work Session。Active Requirement 可以编辑；终态会在 Recently Closed 中保留摘要，随后进入 archive。

Acceptance Criteria 描述可观察的完成条件，而不是活动。Evidence 保存准确检查与紧凑结果。Requirement 要成为 `Done`，必须勾选全部标准、提供非空证据，并引用一个同样引用该 Requirement 且状态为 `Done` 的关闭 Work Session。

## Work Session

Work Session 是一次 material execution 的不可变交接，记录目标、实质变化、重要路径、验证、结果、commit 状态和下一步。`Partial`、`Blocked`、`Failed` Session 可以如实记录工作，但绝不能作为 Requirement `Done` 的关闭证据。

在 material execution 结束时创建且只创建一个 Session。不要把它当成进度日志或对话转录；提交后不得重写。

## Decision

Decision 保存难以逆转的选择、上下文、取舍和后果，必须引用已存在的 Requirement。需要改变旧决策时创建新的 superseding record，不要修改历史。

## Turn Receipt

Turn Receipt 是本地运行状态，用于证明 hook 路由的轮次已经分类。Schema v2 绑定 canonical repository root、common Git directory 和当前 worktree Git directory。第一次 `UserPromptSubmit` 只记录一次 Agent Docs 控制文档 digest；重复提交不会覆盖 baseline。

只有控制 digest 发生变化且引用有效 Work Session 时，`pending` 才能变成 `closed`；只有 digest 未变时才可变成 `not-material`。完全相同的终态关闭可幂等重试，改变终态或 Session 会失败。

Schema v1 Receipt 仍可读取并使用完整历史 digest，但运行时不会批量重写。

## 锁、健康事件与 worktree 索引

Requirements lock 是 Git 元数据目录，通过 exclusive create 获得，包含随机 token、owner、PID 和时间。stale lock 会先原子移动到唯一 quarantine 名，再重试；只有匹配 token 才能释放当前锁。

每个健康警告都是独立不可变 JSON 文件，因此并发 writer 不会读改写同一目标。小型 per-worktree index 把 Codex session 映射到最新 Receipt。这些是运行文件，不是项目文档。
