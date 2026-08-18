# Pull request / 拉取请求

## Outcome / 结果

<!-- Explain the user-visible problem and resulting behavior. / 说明用户可见问题与结果。 -->

## Evidence / 证据

<!-- List focused commands and compact results; do not paste full terminal output. / 列出定向命令与紧凑结果，不粘贴终端全文。 -->

## Risk and compatibility / 风险与兼容

<!-- Cover stable CLI, hooks, Node.js, worktrees, security, privacy, and release artifacts when relevant. / 必要时说明稳定 CLI、hook、Node、worktree、安全、隐私和发布物影响。 -->

## Checklist / 检查清单

- [ ] I added or updated a regression test for every fixed defect or major behavior change. / 每个修复或重大行为变化都有回归测试。
- [ ] `npm run quality` passes, plus relevant performance and release checks. / 质量、相关性能和发布检查通过。
- [ ] User-facing English and `.zh-CN.md` documents are updated together. / 面向用户的英中文档同步更新。
- [ ] `CHANGELOG.md` and its Chinese mirror cover user-visible changes. / 用户可见变更已进入双语 changelog。
- [ ] I manually reviewed the full diff for secrets, private paths, task/thread identifiers, private URLs, and terminal or conversation transcripts. / 已人工检查秘密、私有路径、任务标识、私有 URL、终端或对话全文。
- [ ] The plugin still has zero third-party runtime dependencies, or this PR explicitly proposes a separately reviewed boundary change. / 插件仍为零第三方运行时依赖，或本 PR 明确提出单独审查的边界变化。
- [ ] Release allowlist changes are intentional and contain no tests, project records, automation, or development tools. / Release allowlist 变化是有意的，且不包含测试、项目记录、自动化或开发工具。
- [ ] This PR does not disclose a vulnerability. / 本 PR 未公开披露漏洞。
