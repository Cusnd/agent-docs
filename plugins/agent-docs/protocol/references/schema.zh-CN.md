# Agent Docs 仓库 schema

[English](schema.md)

## 拓扑

```text
docs/agent/
  manifest.json
  requirements.md
  sessions/YYYY-MM/S-YYYYMMDD-HHMMSS-XXXX.md
  decisions/D-YYYYMMDD-HHMM-XXXX.md
  archive/requirements/YYYY.md
```

时间使用 UTC ISO 8601，ID 随机后缀使用大写字母数字。

## Manifest

新初始化模板使用：

```json
{
  "schema_version": 1,
  "initialized_at": "2026-08-18T00:00:00.000Z",
  "generator": "agent-docs",
  "generator_version": "0.2.0"
}
```

仓库文档在 v0.2.0 仍为 schema 1。Receipt 是独立本地运行 schema：新 Receipt 使用 v2，v1 只读兼容且不批量重写。

## Active Requirement

每个 Requirement 位于准确生成 start/end marker 之间，按顺序包含 `Created`、`Updated`、`Summary`、`Priority`、`Status`、`Supersedes`，以及 `Acceptance Criteria`、`Evidence`、`Next Step`、`Related Sessions`。澄清更新同一记录，不得按每条用户消息创建 Requirement。

## Recently Closed 与 archive

Recently Closed 是六列表格，最多 20 行且最新优先：ID、Closed、Status、Summary、Evidence、Session。只允许 `Done`、`Dropped`、`Superseded`。更旧行不变地追加到匹配年份 archive，archive append-only。表格字段必须转义管道符、换行与控制字符。

## Work Session

每个 material Root Agent episode 使用一个文件。必需 metadata：`Closed`、`Requirements`、`Status`、`Branch`、`Start HEAD`、`End HEAD`、`Executor`。状态仅限 `Done`、`Partial`、`Blocked`、`Failed`，至少引用一个 Requirement。

必需 section：`Goal`、`Changes`、`Files`、带 Check/Result/Evidence 的 `Verification`、`Result`、`Commit`、`Next Step`。不得创建 Log Only Session；no-op 关闭为 not-material。

## Durable Decision

只有难以逆转、无上下文令人意外且存在真实 trade-off 的选择才创建 Decision。必需 metadata 为 `Date`、`Status`、`Requirements`、`Supersedes`；必需 section 为 `Context`、`Decision`、`Trade-offs`、`Consequences`；状态为 `Proposed`、`Accepted`、`Superseded`、`Deprecated`，并至少引用一个 Requirement。

## Validator 边界

Validator 检查 schema、marker 数量与顺序、marker/file ID、必需字段、状态/priority、ID/filename、recent limit、排序/archive 年份、交叉引用与类型、未解析 template token、Done evidence/closing Session、表格转义、链接路径安全和明显秘密模式。Root Agent 仍负责判断自然语言是否真实、充分且适合公开。
