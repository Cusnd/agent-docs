# OpenSSF OSPS Baseline Level 1 自评

[English](osps-baseline.md)

- **Baseline：** [OSPS Baseline v2026.02.19](https://baseline.openssf.org/versions/2026-02-19)
- **范围：** `Cusnd/agent-docs` 源仓库与 v0.2.0 Marketplace Release
- **类型：** 项目自评，不是 OpenSSF 或第三方认证
- **当前阶段：** 本地质量门槛通过后才算本地实现完成；GitHub 回读前远端证据仍为 pending

该版本 Baseline 把 Level 1 定义为适用于任何代码或非代码项目。本映射覆盖全部 Level 1 控制项。任何 `Pending` 都会阻塞 Release；创建 `v0.2.0` tag 前必须变成带公开或可复核证据的 `Met`。

| 控制项        | 远端 bootstrap 前状态        | 证据与理由                                                                                                                                                                                                                                                   |
| ------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OSPS-AC-01.01 | 维护者声明；远端证据待回读   | 唯一维护者声明已启用 2FA；治理文档列出敏感资源 owner。这是维护者声明，不宣称 GitHub 公开 API 证明账号设置。                                                                                                                                                  |
| OSPS-AC-02.01 | 待回读                       | [治理](../GOVERNANCE.zh-CN.md)要求手动、最小权限添加协作者；需要远端设置与 collaborator 回读。                                                                                                                                                               |
| OSPS-AC-03.01 | 待 ruleset                   | 计划中的 `main` ruleset 阻止直接更新，并要求 PR 与命名检查。                                                                                                                                                                                                 |
| OSPS-AC-03.02 | 待 ruleset                   | 计划中的 `main` ruleset 阻止删除 branch。                                                                                                                                                                                                                    |
| OSPS-BR-01.01 | 本地已实现；待 workflow 证据 | workflow 不把 PR 标题、branch 名、commit 文本等不可信 metadata 插入 shell；Release 只接收已校验 `v*` ref。                                                                                                                                                   |
| OSPS-BR-01.03 | 本地已实现；待 workflow 证据 | 不可信 PR job 只有 read 权限，不获取项目 secret，不使用 `pull_request_target`；特权 Release 与 attestation job 只在受保护 tag 运行。                                                                                                                         |
| OSPS-BR-03.01 | 待公开仓库                   | 官方项目链接全部使用 GitHub HTTPS 或其他 HTTPS 文档源；API 必须确认权威公开 URL。                                                                                                                                                                            |
| OSPS-BR-03.02 | 待 Release                   | GitHub Releases over HTTPS 是唯一官方分发渠道，不声明 npm 或镜像。                                                                                                                                                                                           |
| OSPS-BR-07.01 | 本地已实现；待远端 scanner   | [公开内容扫描](../scripts/check-public-content.mjs)、PR 人工清单、secret scanning、push protection 和 Security workflow 共同组成防线；不把正则扫描说成无秘密证明。                                                                                           |
| OSPS-DO-01.01 | 本地已实现                   | [README](../README.zh-CN.md)、[安装](../INSTALL.zh-CN.md)、[快速上手](getting-started.zh-CN.md)、[概念](concepts.zh-CN.md)、[生命周期](lifecycle.zh-CN.md)、[CLI](cli.zh-CN.md)、[运营](operations.zh-CN.md)和[排障](troubleshooting.zh-CN.md)覆盖基本功能。 |
| OSPS-DO-02.01 | 本地已实现                   | [支持](../SUPPORT.zh-CN.md)与 Issue Form 定义缺陷报告，[安全](../SECURITY.zh-CN.md)分离私密漏洞报告。                                                                                                                                                        |
| OSPS-GV-02.01 | 待启用 Discussions           | [支持](../SUPPORT.zh-CN.md)把问答与提案分配到公开 Discussions，把可复现工作分配到 Issues；API 必须确认 Discussions 已启用。                                                                                                                                  |
| OSPS-GV-03.01 | 本地已实现                   | [贡献指南](../CONTRIBUTING.zh-CN.md)、[治理](../GOVERNANCE.zh-CN.md)、PR template 与 Issue Form 描述贡献流程。                                                                                                                                               |
| OSPS-LE-02.01 | 本地已实现                   | 源码使用 OSI 认可的 [MIT License](../LICENSE)。                                                                                                                                                                                                              |
| OSPS-LE-02.02 | 本地已实现                   | 明确 Release allowlist 会把同一 MIT License 放入 Marketplace ZIP。                                                                                                                                                                                           |
| OSPS-LE-03.01 | 本地已实现                   | 源码 License 位于根目录 `LICENSE`。                                                                                                                                                                                                                          |
| OSPS-LE-03.02 | 待发布物验证                 | 必须证明 ZIP 包含根 `LICENSE`，且 Release 与 checksum 一起发布。                                                                                                                                                                                             |
| OSPS-QA-01.01 | 待公开仓库                   | API 必须确认 `https://github.com/Cusnd/agent-docs` 可公开读取。                                                                                                                                                                                              |
| OSPS-QA-01.02 | 待首次 push                  | Git commit history 保存作者、时间与变更；公开历史从已审查 bootstrap commit 开始。                                                                                                                                                                            |
| OSPS-QA-02.01 | 本地已实现                   | `package-lock.json` 记录准确直接与传递开发依赖；插件 `dependencies` 为空。                                                                                                                                                                                   |
| OSPS-QA-04.01 | 不适用                       | Agent Docs 只有一个权威 codebase，不产生其他 source repository；[架构](architecture.zh-CN.md)记录全部发布组件。                                                                                                                                              |
| OSPS-QA-05.01 | 本地已实现                   | 生成 executable 与 ZIP 被忽略，只作为 GitHub Release asset 发布，不进入 Git。                                                                                                                                                                                |
| OSPS-QA-05.02 | 本地已实现                   | 公开内容与 staged diff 检查拒绝意外 binary；仓库只包含可审查源码和文档。                                                                                                                                                                                     |
| OSPS-VM-02.01 | 待启用 PVR                   | [安全](../SECURITY.zh-CN.md)指定 GitHub Private Vulnerability Reporting 为唯一漏洞联系人；API 必须确认功能已启用。                                                                                                                                           |

## 发布判断

只要仍有 `Pending`，自评就不完整。远端配置后，badge PR 必须把 pending 理由替换为公开 URL 或脱敏 GitHub API 回读。发布报告记录准确 commit、workflow run、ruleset ID、Community Profile、Scorecard、asset、checksum 与 attestation。
