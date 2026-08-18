# v0.2.0 发布验证

[English](release-verification.md)

本地门槛已经完成。本报告在公开仓库与发布资产完成远端回读前仍保持未完成，Requirement 在此之前不能变成 `Done`。

## 本地门槛

| 证据                                                              | 要求                              | 记录结果                                                                                                                                            |
| ----------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| syntax、lint、format、文档、公开内容、版本、插件、Agent Docs 检查 | Pass                              | 通过；`npm run check`、精确依赖审计与 Codex Plugin validator                                                                                        |
| 基础测试与定向回归                                                | Pass                              | 通过；50/50，每个 suite 使用 OS 临时目录中的随机 workspace                                                                                          |
| 两个并发基础 suite，连续三轮                                      | 每轮两个都通过                    | 通过；六个完整 50 项测试进程全部成功                                                                                                                |
| 1,000 Session 与 5,000 Receipt 性能样本                           | hook p95 低于 timeout 50%，无超时 | 通过；UserPromptSubmit p95 1,070.7 ms、Stop p95 1,071.8 ms、完整 validate 1,578.0 ms                                                                |
| Coverage 输出                                                     | 生成供审查，不设任意百分比        | 通过；Node coverage：line 88.18%、branch 62.48%、function 92.90%                                                                                    |
| 两次本地确定性 ZIP 构建                                           | 字节一致                          | 通过；34 个 allowlist 文件、66,842 bytes、固定 metadata、SHA-256 `d9fea04a6ffbdc071086f148d96cb5de1659077e63450645b735a8894dabf193`                 |
| 隔离 `CODEX_HOME` 安装、hooks 与移除                              | 不影响真实配置并通过              | 使用 Codex CLI 0.147.0 通过；marketplace add、plugin add/list、material/non-material hook、Stop 修复、plugin/marketplace remove；真实 home 未被修改 |

## 远端门槛

为以下事项记录公开链接或脱敏 API 事实：

- public visibility、default branch、description、topics、Issues、Discussions、Wiki/Projects、merge 设置和 branch 清理。
- 默认 Actions token 只读，且 Actions 不能批准 PR。
- Private Vulnerability Reporting、vulnerability alerts、security updates、secret scanning 与 push protection。
- main 与 `v*` ruleset、准确 required check、更新/删除/force-push 限制和线性历史。
- 九组 OS/Node.js 测试、`CI / gate`、CodeQL、dependency review、外部链接与真实 Scorecard 结果。
- Community Profile API 结果为 100%。
- badge PR 与受保护 merge commit。
- annotated `v0.2.0` tag、Release URL、ZIP 与 checksum、跨 OS 相同 SHA-256 和 GitHub attestation。
- 重新下载远端资产后的 checksum、attestation 与最终隔离安装验证。
- 完成的 [OSPS Level 1 自评](osps-baseline.zh-CN.md)。

本地 artifact 不能代替远端 Release 证据。任何必需事实无法确认时，报告就保持未完成，也不得宣称发布完成。
