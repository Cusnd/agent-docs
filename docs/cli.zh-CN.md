# CLI 参考

[English](cli.md)

Agent Docs v0.2.0 只对本页 operator command 承诺兼容。仓库开发时可使用 `node plugins/agent-docs/scripts/agent-docs.mjs`；安装后的 hook context 会提供插件 CLI 的绝对路径。

## 稳定命令

### `agent-docs --help`

向 stdout 输出用法与稳定/内部边界，exit `0`。

### `agent-docs --version`

只输出语义版本，exit `0`。

### `agent-docs init [--json]`

在缺失时创建 Agent Docs 控制文档。重复执行安全，并会报告已初始化。

### `agent-docs status [--turn-id UUID] [--json]`

报告仓库 eligibility、branch、HEAD、本地 Log Health 汇总，以及可选的单个 Receipt。UUID 会在任何路径使用前校验。

### `agent-docs validate [--json]`

执行完整历史、schema、生成 marker、交叉引用、生命周期、archive、秘密模式与安全路径校验。它刻意比 hook 热路径做更多工作。

### `agent-docs archive [--json]`

持有 Requirements lock，把 Recently Closed 溢出项移动到按年份划分的 append-only archive。

四个 operator command 都支持 `--cwd <repository>`，供开发和测试使用；安装后的日常操作通常直接在仓库中执行。

## JSON 契约

使用 `--json` 时，stdout 只包含一个 JSON object，诊断进入 stderr。成功使用 `data`，失败使用 `error`，二者互斥。

```json
{
  "schema_version": 1,
  "command": "validate",
  "ok": true,
  "data": {
    "valid": true
  }
}
```

```json
{
  "schema_version": 1,
  "command": "validate",
  "ok": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Agent Docs validation failed."
  }
}
```

消费者应忽略未来新增的未知字段，但可以依赖 envelope 字段、互斥关系和 exit code。

## Exit code

| Code | 含义                       |
| ---- | -------------------------- |
| `0`  | 成功                       |
| `1`  | 仓库文档或生命周期状态无效 |
| `2`  | 参数或配置无效             |
| `3`  | Git、锁或文件系统瞬态失败  |
| `4`  | 未预期内部失败             |

在适用结构化输出时，Git probe 会区分 `GIT_NOT_FOUND`、`NOT_GIT_REPOSITORY`、`GIT_TIMEOUT`、dubious ownership 与普通 Git failure。

## 内部命令

Requirement、Session、Decision、Receipt、Lock 和 ID 命令供 hooks 与协议使用，其选项和原始 JSON 在 1.0 前不稳定。它们不是 JavaScript API，也不会单独发布。
