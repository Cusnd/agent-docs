# 故障排查

[English](troubleshooting.md)

## Hook 未运行

确认当前路径是可写的顶层 Git worktree，而不是 bare repository、submodule、操作系统临时目录或包含 `.agent-docs-disable` 的仓库。检查 `node --version`、`codex --version` 和 `codex plugin list --json`。新安装插件需要打开全新 Codex 任务。

## 安装后 Marketplace 列表失败

若 `codex plugin marketplace list --json` 或 `codex plugin list --json` 报告 Marketplace manifest 缺失，检查已配置的 Agent Docs 来源路径。本地 Marketplace 会被原地使用：删除源目录后，即使已安装插件 cache 仍存在，后续回读也会失败。位于操作系统临时目录、任务 workspace、仓库 checkout 或已经消失的解压目录下的路径，都不是有效的持久安装。

若已配置的 `CODEX_HOME` 属于 Windows `CodexSandbox*` 账户，安装还错误地写入了受限执行身份，而不是正常用户侧 Codex 任务使用的持久配置。不得复制整个 sandbox 配置，也不要重建已经丢失的临时目录。先解析 host 用户的持久目标，取得明确的修复/迁移授权，再严格执行[交给 Agent 的安装契约](../AGENT_INSTALL.zh-CN.md)，把已验证来源安装到 `<CODEX_HOME>/marketplaces/agent-docs-v0.2.0`。不得隐式移除已有冲突状态。

## `REPOSITORY_PROBE_FAILED`

根据结构化错误与 stderr 区分 Git 缺失、Git timeout、dubious ownership、普通 Git failure 和文件系统瞬态失败。修复具体 Git 条件；仓库身份不确定时不要反复写文档。

## Requirements lock 被占用

短暂等待后重试，不要删除 lock directory。运行时会在超时后自动 quarantine 真正 stale 的锁，并用 acquisition token 防止旧 owner 迟到删除。

## 校验失败

运行 `agent-docs validate --json` 并检查 `error.issues`。常见原因包括畸形或不匹配的生成 marker、缺失交叉引用、`Done` Requirement 存在未勾选标准、关闭 Session 不是 `Done`、archive 年份/排序错误，或路径被链接。修复源记录；不要削弱 validator，也不要修改不可变历史来掩盖问题。

## Stop 阻塞一次

第一次 Stop 发现 pending Receipt 时会提供唯一修复机会。material work 需要更新 Requirement、创建一个 Work Session、校验并关闭 Receipt；non-material work 则关闭为 `not-material`。第二次 Stop 仍然 pending 时，Agent Docs 会记录本地 health warning，并让产品工作继续。

## Receipt 无法关闭

- 控制 digest 已变化时 `not-material` 会失败，应使用有效 Work Session 关闭。
- digest 未变化时 `closed` 会失败，应使用 `not-material`。
- 其他 worktree、替换 Session 或修改终态都会按设计拒绝。
- Schema v1 仍可读，但使用旧运行时捕获的 repository path 和完整历史 digest。

## Windows sharing violation

原子 rename 和清理会对 `EPERM`、`EACCES`、`EBUSY` 做有界重试。如果持续失败，关闭正在扫描或持有该具体仓库文件的程序后重试。不要全局关闭杀毒，也不要删除无关锁。

## 报告问题

按照 [SUPPORT.zh-CN.md](../SUPPORT.zh-CN.md) 操作，只分享脱敏摘要和仓库相对路径。安全问题使用 Private Vulnerability Reporting。
