# 生命周期规则

[English](lifecycle.md)

## Requirement 状态

| 状态          | 含义                        | 常见下一状态                                           |
| ------------- | --------------------------- | ------------------------------------------------------ |
| `Todo`        | 已接受结果，但尚未开始      | `In Progress`、`Deferred`、`Dropped`、`Superseded`     |
| `In Progress` | 正在进行 material execution | `Done`、`Blocked`、`Deferred`、`Dropped`、`Superseded` |
| `Blocked`     | 已指明的外部条件阻止进展    | `In Progress`、`Dropped`、`Superseded`                 |
| `Deferred`    | 有意推迟                    | `Todo`、`In Progress`、`Dropped`、`Superseded`         |
| `Done`        | 满足全部验收与证据规则      | 终态                                                   |
| `Dropped`     | 不再追求该结果              | 终态                                                   |
| `Superseded`  | 新 Requirement 已替代它     | 终态                                                   |

ID 永不复用，终态 Requirement 不重新打开；需要继续时创建新 Requirement 并链接关系。

## Session 状态

- `Done`：该 Session 的目标与检查完成；Requirement 自身标准也满足时，可以关闭 `Done` Requirement。
- `Partial`：完成了有用工作，但预期结果仍不完整。
- `Blocked`：明确外部条件阻止完成。
- `Failed`：执行没有得到可用结果。

Session 状态描述本次执行，而不是 Requirement 是否值得做。不得为了通过校验而虚假升级。

## Receipt 状态

```text
pending --实质变化 + 有效 Session--> closed
pending --Agent Docs 控制摘要未变--> not-material
pending --第二次 Stop--------------> closed (health-warning)
```

health-warning 转换让产品工作在一次修复机会后继续，并不代表文档成功。终态重写、跨 worktree 关闭和替换 Session 都无效。

## Archive 规则

Recently Closed 最多保留最新 20 行，溢出行按最旧优先追加到 `docs/agent/archive/requirements/YYYY.md`，年份必须匹配关闭时间。archive 是 append-only。写 Requirement 或 archive 前先在内存构造并校验目标；校验失败不得留下半更新状态。
