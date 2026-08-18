# OpenSSF OSPS Baseline Level 1 自评

[English](osps-baseline.md)

- **Baseline：** [OSPS Baseline v2026.02.19](https://baseline.openssf.org/versions/2026-02-19)
- **范围：** `Cusnd/agent-docs` 源仓库及 v0.2.0 Marketplace 发布流程
- **类型：** 项目自评，不是 OpenSSF 或第三方认证
- **证据日期：** 2026-08-18
- **当前阶段：** v0.2.0 已发布；源码、仓库控制与重新下载的发布资产均已验证

Level 1 适用于代码和非代码项目。下表映射指定 Baseline 的全部 Level 1 控制项。`已满足` 表示项目证据，不代表独立认证。独立的[发布报告](release-verification.zh-CN.md)记录已发布资产的验收证据。

## 远端证据快照

- [公开仓库](https://github.com/Cusnd/agent-docs)使用 `main`，启用 Issues 与 Discussions，关闭 Wiki 与 Projects，只允许 squash merge，并自动删除已合并分支。经认证 API 回读只发现 `@Cusnd` 拥有访问权。
- 生效的 [`main` ruleset](https://github.com/Cusnd/agent-docs/rules/21000773)没有 bypass actor，要求 PR、最新分支、解决全部讨论、线性历史，以及 `CI / gate`、`Security / codeql` 和 `Security / dependency-review`；同时禁止删除和 force-push。
- 生效的 tag ruleset 将 [`v*` 创建限制为 `@Cusnd`](https://github.com/Cusnd/agent-docs/rules/21000782)，并通过无 bypass 的[不可变规则](https://github.com/Cusnd/agent-docs/rules/21000787)禁止更新或删除 `v*` tag。
- Actions 默认 token 为只读，且 Actions 不能批准 PR。Private Vulnerability Reporting、Dependabot alerts/security updates、secret scanning 和 push protection 均已启用。
- 最终发布前 [CI run](https://github.com/Cusnd/agent-docs/actions/runs/32162080649)通过 Windows、Linux、macOS × Node.js 22、24、26，三个确定性打包 job、隔离安装、跨 OS digest 比较和 `CI / gate`；对应 [Security run](https://github.com/Cusnd/agent-docs/actions/runs/32162080586)通过 CodeQL、dependency review 与运行时/公开内容检查。
- GitHub Community Profile API 返回 100%。最终 tag 前的 [Scorecard run](https://github.com/Cusnd/agent-docs/actions/runs/32164767456)为 commit `569fb8a1544d0dfcb95552c953048df5be0e6b5f` 发布真实分数 6.8，使用 Scorecard v5.5.0；项目不声明分数门槛。
- Annotated 且受保护的 [`v0.2.0` Release](https://github.com/Cusnd/agent-docs/releases/tag/v0.2.0)指向 commit `569fb8a1544d0dfcb95552c953048df5be0e6b5f`。[Release run 32165631144](https://github.com/Cusnd/agent-docs/actions/runs/32165631144)通过九组 OS/Node 测试、三组确定性打包和带 attestation 的发布。
- 重新下载的 67,231-byte Marketplace ZIP 与 `SHA256SUMS` 及三个 package job 一致，SHA-256 为 `70723ad7eb654af02d36c73ca3ea35bda6a5a8043513cf66c5e847e42e65863a`；两个发布资产均通过带约束的 GitHub artifact-attestation 验证，ZIP 也通过隔离安装冒烟。详见[发布报告](release-verification.zh-CN.md)。

## Level 1 映射

| 控制项        | 状态           | 证据与理由                                                                                                                                                                                                                                                   |
| ------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OSPS-AC-01.01 | 已满足（声明） | 唯一维护者声明已启用 2FA；[治理](../GOVERNANCE.zh-CN.md)标明敏感资源 owner。这是维护者声明，不声称 GitHub 公开 API 能证明账号设置。                                                                                                                          |
| OSPS-AC-02.01 | 已满足         | 2026-08-18 的认证 collaborator 回读只返回仓库 owner 与唯一管理员 `@Cusnd`；[治理](../GOVERNANCE.zh-CN.md)要求未来协作者也必须按最小权限有意添加。                                                                                                            |
| OSPS-AC-03.01 | 已满足         | 生效的 [`main` ruleset](https://github.com/Cusnd/agent-docs/rules/21000773)通过强制 PR 与三个准确 required check 阻止直接更新。                                                                                                                              |
| OSPS-AC-03.02 | 已满足         | 同一生效规则包含无 bypass actor 的 branch deletion 禁止项。                                                                                                                                                                                                  |
| OSPS-BR-01.01 | 已满足         | [Workflow 策略检查](../scripts/check-actions.mjs)拒绝未按 SHA 固定的 action 和禁用 trigger；workflow 不把 PR 标题、branch 名、commit 文本等不可信 metadata 插入 shell 命令。                                                                                 |
| OSPS-BR-01.03 | 已满足         | PR job 只有 read 权限，不获取项目 secret，不使用 `pull_request_target`；特权 Release 与 attestation job 只为受保护 `v*` tag 运行。参见 [workflows](https://github.com/Cusnd/agent-docs/actions)。                                                            |
| OSPS-BR-03.01 | 已满足         | 权威项目地址是公开可读的 HTTPS 仓库 [`github.com/Cusnd/agent-docs`](https://github.com/Cusnd/agent-docs)。                                                                                                                                                   |
| OSPS-BR-03.02 | 已满足         | [发布说明](../RELEASING.zh-CN.md)把 HTTPS GitHub Releases 定义为唯一分发渠道，不发布 npm 或镜像；workflow 已通过该渠道发布 [v0.2.0 Release](https://github.com/Cusnd/agent-docs/releases/tag/v0.2.0)。                                                       |
| OSPS-BR-07.01 | 已满足         | [公开内容扫描](../scripts/check-public-content.mjs)、PR 人工清单、secret scanning、push protection、CodeQL 与 Security workflow 共同构成防线；不把正则扫描说成无秘密证明。                                                                                   |
| OSPS-DO-01.01 | 已满足         | [README](../README.zh-CN.md)、[安装](../INSTALL.zh-CN.md)、[快速上手](getting-started.zh-CN.md)、[概念](concepts.zh-CN.md)、[生命周期](lifecycle.zh-CN.md)、[CLI](cli.zh-CN.md)、[运营](operations.zh-CN.md)和[排障](troubleshooting.zh-CN.md)覆盖基本功能。 |
| OSPS-DO-02.01 | 已满足         | [支持](../SUPPORT.zh-CN.md)与 Issue Form 定义缺陷报告，[安全](../SECURITY.zh-CN.md)分离私密漏洞报告。                                                                                                                                                        |
| OSPS-GV-02.01 | 已满足         | 已启用 [Discussions](https://github.com/Cusnd/agent-docs/discussions)处理公开问答与提案，Issues 处理可复现缺陷和边界明确的请求。                                                                                                                             |
| OSPS-GV-03.01 | 已满足         | [贡献指南](../CONTRIBUTING.zh-CN.md)、[治理](../GOVERNANCE.zh-CN.md)、PR template 与 Issue Form 描述贡献流程。                                                                                                                                               |
| OSPS-LE-02.01 | 已满足         | 源码使用 OSI 认可的 [MIT License](../LICENSE)。                                                                                                                                                                                                              |
| OSPS-LE-02.02 | 已满足         | 明确的 Release allowlist 把同一 MIT License 放入 Marketplace ZIP。                                                                                                                                                                                           |
| OSPS-LE-03.01 | 已满足         | 源码 License 位于仓库根目录 `LICENSE`。                                                                                                                                                                                                                      |
| OSPS-LE-03.02 | 已满足         | Release verifier 强制 34 文件 ZIP allowlist 包含 `LICENSE`；[Release run 32165631144](https://github.com/Cusnd/agent-docs/actions/runs/32165631144)的三个 package job 得出同一已发布 digest，重新下载的 ZIP 也通过 allowlist 验证。                          |
| OSPS-QA-01.01 | 已满足         | 仓库可通过[权威 HTTPS URL](https://github.com/Cusnd/agent-docs)与公开 API 读取。                                                                                                                                                                             |
| OSPS-QA-01.02 | 已满足         | 公开历史从已审查的 bootstrap commit [`1131b06`](https://github.com/Cusnd/agent-docs/commit/1131b068b82e7d438f4667884454a3fe02fb5951)开始；之后 `main` 变更通过 PR，首例为 [PR #1](https://github.com/Cusnd/agent-docs/pull/1)。                              |
| OSPS-QA-02.01 | 已满足         | `package-lock.json` 精确记录直接与传递开发依赖；插件 `dependencies` 为空。                                                                                                                                                                                   |
| OSPS-QA-04.01 | 不适用         | Agent Docs 只有一个权威 codebase，不产生其他 source repository；[架构](architecture.zh-CN.md)记录全部发布组件。                                                                                                                                              |
| OSPS-QA-05.01 | 已满足         | 生成 executable 与 ZIP 均被忽略，只作为 GitHub Release asset 发布，不进入 Git。                                                                                                                                                                              |
| OSPS-QA-05.02 | 已满足         | 公开内容与 staged diff 审查拒绝意外 binary；仓库只包含可审查源码与文档。                                                                                                                                                                                     |
| OSPS-VM-02.01 | 已满足         | [安全](../SECURITY.zh-CN.md)指定 GitHub Private Vulnerability Reporting 为唯一漏洞渠道；认证 API 回读确认已启用，且私密[提交页](https://github.com/Cusnd/agent-docs/security/advisories/new)可用。                                                           |

## 发布判断

Level 1 实现控制中不再有 `Pending`。受保护的 badge PR 在 tag 创建前已经通过，[发布报告](release-verification.zh-CN.md)记录了不可变 tag、远端 ZIP 与 checksum、两份 attestation、发布后外链成功结果和远端下载物隔离安装。v0.2.0 项目自评已经完成；它仍是项目自评，不是 OpenSSF 或第三方认证。
