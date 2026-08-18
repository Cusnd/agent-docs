# 架构

[English](architecture.md)

## 组件

Agent Docs 是一个本地 Node.js 运行时，具有四个边界：

1. **Codex hooks** 把 `UserPromptSubmit`、`SubagentStart` 和 `Stop` 事件路由给 CLI 进程。
2. **仓库文档**位于 `docs/agent`，保存可审查的 Requirement、Work Session、Decision 与 archive。
3. **每个 worktree 的 Git 元数据**保存 Receipt、Requirements lock、健康事件和 session index。
4. **Operator CLI** 暴露小型稳定维护接口，内部命令实现协议状态转换。

项目没有服务端、数据库、遥测、网络调用、模型调用、JavaScript library API、npm 分发或常驻进程。

## 事件流

```text
UserPromptSubmit
  -> 验证 repository/worktree eligibility
  -> 创建或复用 schema v2 pending receipt
  -> 只捕获一次 control digest
  -> 注入 protocol context

material execution
  -> 在 token-bound lock 下更新 Requirement
  -> 写入且只写一个不可变 Work Session
  -> archive + 完整 validate
  -> 使用 Session 关闭 Receipt

Stop
  -> 通过 index 查当前 Receipt
  -> 第一次提供修复阻塞
  -> 第二次写不可变 health event 并停止阻塞
```

热路径只哈希 `manifest.json` 和 `requirements.md`，并查 per-worktree index；显式 validate 扫描全部 Session、Decision、archive 与引用。

## 仓库身份

Git 提供顶层 root、common directory 和 worktree-specific Git directory，三者都用 real path 规范化。Schema v2 同时 fingerprint repository identity 与 worktree identity，元数据实际位于 worktree Git directory。因此普通 clone、linked worktree、submodule 与 unborn repository 有意采用不同 eligibility 与隔离行为。

## 写入路径

写文档前，每一级已存在 parent 都通过 `lstat` 与 `realpath` 检查；符号链接、junction、reparse point 和仓库逃逸会被拒绝，写入前后都会复核 parent。文件使用同目录随机临时名、exclusive create、数据 flush、带有界重试的原子 rename 和清理。Requirement/archive 多文件更新使用 rollback snapshot。

该设计可以降低意外与机会型路径攻击，但无法在同一账号、持续替换目录的进程面前建立操作系统安全边界。

## 打包

仓库开发使用精确锁定的 dev dependency，插件包没有 runtime dependency。Release 构建只在根工具中使用 `fflate`，并从明确 allowlist 收集确定性 ZIP；构建器和依赖本身都不会进入 ZIP。

架构决策保存在 `plugins/agent-docs/docs/adr/`。
