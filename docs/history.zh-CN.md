# 公开项目历史

[English](history.md)

Agent Docs 最初是一个经过验证的本地 hook-only 插件原型。其便携 Node.js 实现、hook manifest、协议、模板和测试被复制到一个独立 unborn Git repository，同时保持正在使用的本地安装不变。首次交接验证了源码等价性和原有九项测试。

随后的公开发布审计发现 Receipt identity 与 lifecycle enforcement、worktree binding、stale-lock reclamation、链接路径、原子写、并发健康日志、validator 严格性和共享测试 fixture 等风险。公开决策选择 MIT License、`Cusnd/agent-docs`、双语文档、外部贡献、Release ZIP 分发，以及公开且脱敏的 `docs/agent` dogfooding。

v0.2.0 修复上述问题，定义小型稳定 operator CLI，把运行状态放入各 worktree Git 元数据，增加确定性发布工程和隔离安装测试，并建立 GitHub 社区与安全治理。仓库初始提交是启用 branch/tag rules 前唯一允许的 bootstrap push；之后主分支变更全部通过 PR。

公开仓库以 commit [`1131b06`](https://github.com/Cusnd/agent-docs/commit/1131b068b82e7d438f4667884454a3fe02fb5951)完成 bootstrap。随后两个受保护 PR 修复跨平台校验并记录真实徽章，最终从 commit `569fb8a` 创建 annotated、不可变的 [`v0.2.0` Release](https://github.com/Cusnd/agent-docs/releases/tag/v0.2.0)。三个操作系统的 package job 得到相同的 34 文件 Marketplace ZIP，SHA-256 为 `70723ad7eb654af02d36c73ca3ea35bda6a5a8043513cf66c5e847e42e65863a`；重新下载的 Release 通过 checksum、attestation、重建、链接与隔离安装验证。

本历史有意省略本地安装路径、内部任务标识、私有 artifact 地址、终端全文和对话溯源。原始 `docs/agent/manifest.json` 保留 generator `0.1.0` 作为初始化来源；新模板使用 generator `0.2.0`。
