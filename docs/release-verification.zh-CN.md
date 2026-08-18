# v0.2.0 发布验证

[English](release-verification.md)

本地门槛与发布前远端控制门槛已经完成。本报告在发布资产完成远端回读前仍保持未完成，Requirement 在此之前不能变成 `Done`。

## 本地门槛

| 证据                                                              | 要求                              | 记录结果                                                                                                                                            |
| ----------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| syntax、lint、format、文档、公开内容、版本、插件、Agent Docs 检查 | Pass                              | 通过；`npm run check`、精确依赖审计与 Codex Plugin validator                                                                                        |
| 基础测试与定向回归                                                | Pass                              | 通过；52/52，每个 suite 使用 OS 临时目录中的随机 workspace                                                                                          |
| 两个并发基础 suite，连续三轮                                      | 每轮两个都通过                    | 通过；六个完整 52 项测试进程全部成功                                                                                                                |
| 1,000 Session 与 5,000 Receipt 性能样本                           | hook p95 低于 timeout 50%，无超时 | 通过；UserPromptSubmit p95 1,070.7 ms、Stop p95 1,071.8 ms、完整 validate 1,578.0 ms                                                                |
| Coverage 输出                                                     | 生成供审查，不设任意百分比        | 通过；Node coverage：line 88.06%、branch 63.10%、function 92.90%                                                                                    |
| 两次本地确定性 ZIP 构建                                           | 字节一致                          | 通过；34 个 allowlist 文件、66,887 bytes、固定 metadata、SHA-256 `086bc5f8acc6ea1400b60c8e7b4946e65b3a61641a21a4b60a6276f20e2924c8`                 |
| 隔离 `CODEX_HOME` 安装、hooks 与移除                              | 不影响真实配置并通过              | 使用 Codex CLI 0.147.0 通过；marketplace add、plugin add/list、material/non-material hook、Stop 修复、plugin/marketplace remove；真实 home 未被修改 |

## 发布前远端门槛

- 仓库 API 回读：公开 `main`；启用 Issues 与 Discussions；关闭 Wiki 与 Projects；只允许 squash merge；启用合并后删除 branch；description 与六个 topics 符合预期。
- Actions API 回读：默认 token 权限为 `read`，Actions 不能批准 PR。
- Security API 回读：Private Vulnerability Reporting、Dependabot alerts/security updates、secret scanning 与 push protection 已启用。
- Collaborator 回读：只有 owner 与唯一管理员 `@Cusnd`。
- Ruleset 回读：受保护的 [`main`](https://github.com/Cusnd/agent-docs/rules/21000773)、[只允许 `@Cusnd` 创建 `v*`](https://github.com/Cusnd/agent-docs/rules/21000782)，以及[不可变 `v*` tag](https://github.com/Cusnd/agent-docs/rules/21000787)。
- [PR #1](https://github.com/Cusnd/agent-docs/pull/1)通过最终 [CI run](https://github.com/Cusnd/agent-docs/actions/runs/32162080649)与 [Security run](https://github.com/Cusnd/agent-docs/actions/runs/32162080586)，随后 squash merge 为 `e600424`。
- Community Profile API：100%。启用规则后的 [Scorecard run](https://github.com/Cusnd/agent-docs/actions/runs/32163049236)：6.8，Scorecard v5.5.0；项目不设分数门槛。
- [OSPS Level 1 自评](osps-baseline.zh-CN.md)：实现控制全部为`已满足`或`不适用`；这是项目自评，不是认证。
- 首次[外链运行](https://github.com/Cusnd/agent-docs/actions/runs/32163046480)正确发现尚未发布的 v0.2.0 URL，同时暴露 Markdown 反引号解析缺陷。本 PR 修复并自测解析器；发布后仍必须重跑成功。

## 仅发布后可取得的剩余证据

- 受保护的 badge/evidence PR 与 squash merge。
- annotated 且不可变的 `v0.2.0` tag 与成功的 Release workflow。
- Release URL、ZIP 与 checksum、跨 OS 一致 SHA-256，以及两个 GitHub artifact attestation。
- 重新下载远端资产后的 checksum、attestation 与最终隔离安装验证。
- 发布后外链成功结果，以及最终 settings/release API 回读。

本地 artifact 不能代替远端 Release 证据。任何必需事实无法确认时，报告就保持未完成，也不得宣称发布完成。
