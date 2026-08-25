# 变更日志

[English](CHANGELOG.md)

这里记录所有重要变化。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，项目在 1.0 前针对 operator-facing 兼容性使用语义化版本。

## [未发布]

### 新增

- 双语、单链接 Agent 安装契约：固定 Release identity，强制 checksum 与 attestation、信任审查、目标授权、事务式回滚、JSON 回读，以及不登录/不调用模型边界。
- 仓库检查保证两个契约对象完全一致，并要求所有公开安装入口和安全关键命令持续存在。

### 修复

- 现有健康安装现在会继续执行 hook 审查与激活，不再在插件 hooks 尚未获信任时提前报告幂等成功；双语契约检查会锁定这条控制流要求。

## [0.2.0] - 2026-08-18

### 新增

- 为 `init`、`status`、`validate` 和 `archive` 提供稳定 operator CLI、版本化 JSON envelope 与明确 exit code。
- Receipt schema v2：绑定 canonical repository 和独立 worktree，使用 worktree 运行索引，并只读兼容 schema v1。
- token 绑定的 stale-lock quarantine、带重试的原子写入、不可变健康事件和结构化 Git 错误类型。
- 严格校验 ID、生成 marker、交叉引用、生命周期、archive 和 Markdown 表格。
- 双语用户、贡献、治理、安全、架构、运营、故障排查与发布文档。
- 跨平台 Node.js 22/24/26 CI、CodeQL、dependency review、Scorecard、秘密检查、Dependabot、确定性打包、校验和与 artifact attestation 工作流。
- 明确的 Marketplace ZIP allowlist、同机字节级复现、跨 OS digest 比对，以及隔离 `CODEX_HOME` 安装冒烟测试。
- 仅在远端结果验证后添加 CI、OpenSSF Scorecard 与 Community Profile 徽章。

### 变更

- 支持的 Node.js 范围改为 `^22.0.0 || ^24.0.0 || ^26.0.0`，每次发布都重新检查。
- Log Health 从并发读改写同一 JSONL 改为每个事件一个不可变文件。
- hook 热路径只哈希控制文档并读取 worktree 索引；完整历史扫描只在显式 validate 与 CI 中运行。
- 公开定位明确区分 model-independent 协议、CI 已验证组合、已观察交互组合和未验证组合。
- 仓库包含关系允许 Windows 8.3 路径、macOS `/var` 链接等操作系统规范别名，同时仍拒绝链接子目录和仓库根之外的路径。
- 外链提取现在会在 Markdown 代码分隔符处停止，并由离线自测覆盖。

### 安全

- 在路径拼接前拒绝畸形或路径形式的 ID。
- 在写入前后拒绝符号链接、junction、reparse point 和解析到仓库外的路径。
- 防止旧锁持有者删除后继锁，并阻止终态 Receipt 重写与跨 worktree 关闭。
- 遇到短时活锁竞争时使用有界指数退避等待，超过边界后才返回瞬态失败。
- 新增本仓库专用公开内容检查，同时保持通用 Agent Docs validator 适用于私有仓库。

[0.2.0]: https://github.com/Cusnd/agent-docs/releases/tag/v0.2.0
