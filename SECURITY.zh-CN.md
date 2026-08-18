# 安全政策

[English](SECURITY.md)

## 私密报告漏洞

所有疑似漏洞都必须通过 [GitHub Private Vulnerability Reporting](https://github.com/Cusnd/agent-docs/security/advisories/new)报告。不得在公开 Issue、Discussion、PR、commit 或其他公开渠道披露漏洞细节。行为准则邮箱不是漏洞渠道。

请提供受影响版本、操作系统、Node.js 与 Codex 版本、复现步骤、影响和已经移除秘密的最小证明。不要访问不属于你的数据；如果继续测试可能伤害其他用户，应立即停止。

项目不承诺确认、响应、修复或发布时间，全部处理均为 best effort。协调披露时间会针对每份报告私下确定。

## 支持版本

仅支持最新发布的 minor 版本。首个 Release 发布前，`main` 属于开发代码，不承诺安全支持。

| 版本     | 安全更新          |
| -------- | ----------------- |
| 0.2.x    | v0.2.0 发布后支持 |
| 更早版本 | 不支持            |

## 安全模型摘要

Agent Docs 是本地仓库自动化工具，不调用模型、不发送遥测、不提供服务端，也不处理登录。主要资产是仓库文档和 Git 元数据中的运行状态。它会在路径拼接前校验 ID，把 Receipt schema v2 绑定到 canonical repository 与 worktree，拒绝链接路径，使用 token 绑定的锁和原子写入，并把 Stop 限制为一次修复机会。

插件无法完全抵御以同一操作系统账号运行、并持续在写入期间替换目录的其他进程，也无法证明任意自然语言内容适合公开。完整说明见[安全与隐私模型](docs/security-model.zh-CN.md)。

依赖记录在 `package-lock.json`。插件运行时依赖保持为空；精确锁定的开发依赖只用于仓库质量和 Release 构建。Dependabot、CodeQL、dependency review、秘密扫描和 OpenSSF Scorecard 提供额外仓库检查。
