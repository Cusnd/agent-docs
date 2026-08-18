# Agent Docs Hook 协议

[English](PROTOCOL.md)

维护未来 Agent 无需重放对话即可信任的紧凑运营记忆。只记录结果与证据，不记录转录。

## 不可协商契约

- Root Agent 是唯一语义 writer；subagent 返回紧凑证据，不编辑 `docs/agent` 或 Agent Docs Git 元数据。
- Requirement 只有在全部 Acceptance Criteria 满足并由具体证据支持时才是 `Done`。没有证据就不是 Done。
- 第一个实质实现步骤前写好验收标准；用户给定标准优先。
- 不保存原始 prompt、完整 assistant 输出、完整终端捕获、秘密、凭据或隐藏推理。
- 正常工作期间更新记录，但只有用户已授权项目提交时才一起 commit；不得自动创建 log-only commit。
- 日志失败不阻塞、回滚或重新分类产品 Requirement，只记录 Log Health。

## 定位 CLI

CLI 位于插件根 `scripts/agent-docs.mjs`，使用受支持 Node.js 范围 `^22.0.0 || ^24.0.0 || ^26.0.0`：

```text
node <plugin-root>/scripts/agent-docs.mjs <command>
```

hook context 通常会给出绝对 CLI 路径与 Turn Receipt identity，必须使用其中准确值。

## 判断 materiality

改变 Requirement 状态、证据、风险或下一步的轮次属于 material。只读诊断若产生可复用证据或具体下一步也属于 material。纯解释、聊天、重复状态和真正 no-op 不属于 material。

非实质轮次不创建仓库文件，直接运行：

```text
node <cli> receipt resolve --turn-id <receipt> --state not-material
```

## 执行 material work

1. 仅在 `docs/agent/manifest.json` 不存在时运行 `init`；编辑前读取 manifest、requirements 与关联 Session/Decision。
2. 澄清同一可独立验证结果时复用当前 Requirement；独立结果创建链接新 Requirement；替换则创建新 ID 并把旧项设为 `Superseded`。
3. 实现前确保存在具体 checkbox Acceptance Criteria、priority、status 和 next step。默认 `P2`；只有用户明确设置或已验证生产紧急情况才用 `P0`。
4. 手工编辑 `requirements.md` 前，以 Receipt identity 获取 lock、保存 acquisition token、重新读取文件、编辑，并在 finally 等价路径用同一 token 释放。CLI 的 `requirement new`、`requirement close` 和 `archive` 已自动锁与重试一次。
5. 实现并验证，只保存准确命令、紧凑结果与文件/artifact 引用，不粘贴完整输出。
6. 更新 Requirement status、criteria、evidence、next step 与 Work Session；终态不得留在 Active。
7. 为本次 material root-agent episode 创建且只创建一个紧凑 Work Session，状态仅限 `Done`、`Partial`、`Blocked`、`Failed`。
8. 只有选择难以逆转、缺少上下文会令人意外且存在真实取舍时，才创建 Decision。
9. 先 `archive`，再 `validate`；声明完成前修复全部结构错误。
10. 用 `--state closed --session <S-ID>` 关闭 Receipt；代码已变并不等于协议完成。

## Stop 修复

pending Receipt 可以让 Stop 阻塞一次。唯一修复轮次中完成 material 流程或标为 non-material；material 时校验并关闭 Receipt。重试仍失败时允许 Stop，报告 Log Health Warning，产品状态保持不变。

## 按需读取参考

- [lifecycle.zh-CN.md](references/lifecycle.zh-CN.md)：分类、状态转换、并发、Stop 与 commit 边界。
- [schema.zh-CN.md](references/schema.zh-CN.md)：创建或修复仓库记录前阅读。
- [security.zh-CN.md](references/security.zh-CN.md)：判断证据是否适合保存。
- `assets/templates/` 由 `init` 复制，除修复损坏初始化外不要手工复制。
