# v0.2.0 发布验证

[English](release-verification.md)

Agent Docs v0.2.0 已于 2026-08-18 发布；下列本地、仓库控制、受保护检查和发布资产门槛均成功完成。本报告记录项目证据，不是第三方认证。

## 本地门槛

| 证据                                                              | 要求                              | 记录结果                                                                                                                                            |
| ----------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| syntax、lint、format、文档、公开内容、版本、插件、Agent Docs 检查 | Pass                              | 通过；`npm run check`、精确依赖审计与 Codex Plugin validator                                                                                        |
| 基础测试与定向回归                                                | Pass                              | 通过；52/52，每个 suite 使用 OS 临时目录中的随机 workspace                                                                                          |
| 两个并发基础 suite，连续三轮                                      | 每轮两个都通过                    | 通过；六个完整 52 项测试进程全部成功                                                                                                                |
| 1,000 Session 与 5,000 Receipt 性能样本                           | hook p95 低于 timeout 50%，无超时 | 通过；UserPromptSubmit p95 1,070.7 ms、Stop p95 1,071.8 ms、完整 validate 1,578.0 ms                                                                |
| Coverage 输出                                                     | 生成供审查，不设任意百分比        | 通过；Node coverage：line 88.06%、branch 63.10%、function 92.90%                                                                                    |
| 两次本地确定性发布候选 ZIP 构建                                   | 字节一致                          | 通过；34 个 allowlist 文件、66,887 bytes、固定 metadata、SHA-256 `086bc5f8acc6ea1400b60c8e7b4946e65b3a61641a21a4b60a6276f20e2924c8`                 |
| 隔离 `CODEX_HOME` 安装、hooks 与移除                              | 不影响真实配置并通过              | 使用 Codex CLI 0.147.0 通过；marketplace add、plugin add/list、material/non-material hook、Stop 修复、plugin/marketplace remove；真实 home 未被修改 |

## 发布前远端门槛

- 仓库 API 回读：公开 `main`；启用 Issues 与 Discussions；关闭 Wiki 与 Projects；只允许 squash merge；启用合并后删除 branch；description 与六个 topics 符合预期。
- Actions API 回读：默认 token 权限为 `read`，Actions 不能批准 PR。
- Security API 回读：Private Vulnerability Reporting、Dependabot alerts/security updates、secret scanning 与 push protection 已启用。
- Collaborator 回读：只有 owner 与唯一管理员 `@Cusnd`。
- Ruleset 回读：受保护的 [`main`](https://github.com/Cusnd/agent-docs/rules/21000773)、[只允许 `@Cusnd` 创建 `v*`](https://github.com/Cusnd/agent-docs/rules/21000782)，以及[不可变 `v*` tag](https://github.com/Cusnd/agent-docs/rules/21000787)。
- [PR #1](https://github.com/Cusnd/agent-docs/pull/1)通过最终 [CI run](https://github.com/Cusnd/agent-docs/actions/runs/32162080649)与 [Security run](https://github.com/Cusnd/agent-docs/actions/runs/32162080586)，随后 squash merge 为 `e600424`。
- [PR #2](https://github.com/Cusnd/agent-docs/pull/2)通过受保护检查，将真实结果徽章与发布前证据 squash merge 为 `569fb8a1544d0dfcb95552c953048df5be0e6b5f`。
- Community Profile API：100%。最终 tag 前的 [Scorecard run](https://github.com/Cusnd/agent-docs/actions/runs/32164767456)为 commit `569fb8a1544d0dfcb95552c953048df5be0e6b5f` 发布真实分数 6.8，使用 Scorecard v5.5.0；项目不设分数门槛。
- [OSPS Level 1 自评](osps-baseline.zh-CN.md)：实现控制全部为`已满足`或`不适用`；这是项目自评，不是认证。
- 首次[外链运行](https://github.com/Cusnd/agent-docs/actions/runs/32163046480)正确发现尚未发布的 v0.2.0 URL，同时暴露 Markdown 反引号解析缺陷。PR #2 已修复并自测解析器；发布后的成功运行记录如下。

## 已发布版本证据

| 证据                 | 验证结果                                                                                                                                                                                                                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 不可变发布输入       | Annotated tag [`v0.2.0`](https://github.com/Cusnd/agent-docs/releases/tag/v0.2.0)的 tag-object SHA 为 `f6c6d1dffdcf68f826c620d968870a524420280b`，指向 commit `569fb8a1544d0dfcb95552c953048df5be0e6b5f`。生效的 tag ruleset 只允许 `@Cusnd` 创建 `v*`，且任何人都不能绕过更新或删除禁令。                     |
| Release workflow     | [Run 32165631144](https://github.com/Cusnd/agent-docs/actions/runs/32165631144)成功完成：quality、九组 OS/Node 测试、三组 OS 打包和带 attestation 的发布 job 全部通过。                                                                                                                                        |
| 已发布资产           | 非草稿、非预发布的 [Agent Docs v0.2.0 Release](https://github.com/Cusnd/agent-docs/releases/tag/v0.2.0)仅包含 `agent-docs-marketplace-v0.2.0.zip`（67,231 bytes）和 `SHA256SUMS`（100 bytes）。三个打包 job 得到相同 ZIP SHA-256：`70723ad7eb654af02d36c73ca3ea35bda6a5a8043513cf66c5e847e42e65863a`。         |
| 远端重新下载         | 从 Release 新下载的文件与 `SHA256SUMS` 一致；checksum 文件自身 SHA-256 为 `f79428e7c25ee45109a91c6df5036f0c0b037e1f7114c8c074f35de074465c06`。仓库 verifier 接受这份确切的 34 文件 ZIP，并从 tag 源码逐字节重建成功。                                                                                          |
| Artifact attestation | `gh attestation verify` 在同时约束仓库 `Cusnd/agent-docs`、workflow `.github/workflows/release.yml`、source ref `refs/tags/v0.2.0`、source commit `569fb8a1544d0dfcb95552c953048df5be0e6b5f` 与 GitHub-hosted runner 后，接受两个下载资产。两份 statement 均为 SLSA provenance v1，并包含准确 subject digest。 |
| 隔离安装             | `npm run release:smoke` 针对下载 ZIP、Codex CLI 0.147.0 和一次性 child-only `CODEX_HOME` 通过：marketplace add、plugin install/list/readback、初始化、material/non-material Receipt、Stop 修复与移除均成功；未读取或修改活跃用户配置。                                                                         |
| 发布后外链           | 手动 [Links run 32166550406](https://github.com/Cusnd/agent-docs/actions/runs/32166550406)针对已发布 URL 成功完成。                                                                                                                                                                                            |
| 最终远端回读         | GitHub API 再次确认：public、`main`、Community Profile 100%、Issues/Discussions、Wiki/Projects 关闭、squash-only、Actions token 只读、PVR、Dependabot security updates、secret scanning、push protection、三个 active ruleset、annotated tag、成功的 Release jobs 和两个 uploaded assets。                     |

上面的初步本地 ZIP digest 作为发布前门槛证据保留；PR #2 的文档变化改变了最终归档字节。发布证据只使用重新下载的远端资产及其准确 digest。v0.2.0 的全部发布门槛均已完成；本报告合并且 Agent Docs validate 成功后，可以关闭发布 Requirement。
