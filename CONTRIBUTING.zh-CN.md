# 为 Agent Docs 贡献

[English](CONTRIBUTING.md)

感谢你帮助改进 Agent Docs。项目欢迎外部 PR，但提交不意味着必然获得审查、接收或发布。所有维护都是 best effort，不提供 SLA。

## 选择正确渠道

- 使用 [Discussions](https://github.com/Cusnd/agent-docs/discussions)提出使用问题和探索设计。
- 使用结构化 [Issue](https://github.com/Cusnd/agent-docs/issues/new/choose)报告可复现缺陷、边界明确的功能或文档请求。
- 使用 [Private Vulnerability Reporting](https://github.com/Cusnd/agent-docs/security/advisories/new)报告漏洞。不得在公开 Issue、Discussion 或 PR 中披露疑似漏洞。

## 开发环境

安装受支持的 Node.js 版本和 Git，然后运行：

```console
npm ci
npm run quality
npm run test:performance
npm run release:build
npm run release:verify
```

根包和插件包都是 private，不得发布到 npm。`fflate` 和质量工具只是仓库级开发依赖；插件运行时代码必须继续只使用 Node.js 内置模块。

## 变更政策

修复缺陷或改变公开行为时先写失败测试。每个已修复缺陷都需要一个能在旧实现失败、在新实现通过的定向回归。重大变更必须新增或更新自动化测试。普通测试必须按进程隔离，并发编排不得递归调用自己。

v0.2.0 的稳定 operator CLI 仅包括 `--help`、`--version`、`init`、`status`、`validate` 和 `archive`。选项、JSON envelope、stdout/stderr 划分或 exit code 的变化都属于兼容性变化。内部协议命令在 1.0 前可以演进，但同样需要测试。

除非经过单独设计审查明确变更，否则必须保留 hook-only 架构、三个 hook 事件、worktree 隔离、零运行时依赖和 model-independent 契约。

## 文档与公开内容政策

英文是 canonical。修改任何面向用户的英文 Markdown 时，必须在同一 PR 更新对应 `.zh-CN.md`。机器生成模板、`docs/agent` 和英文 MIT License 法律文本除外。

公开证据只能使用仓库相对路径、紧凑结果摘要和公开 GitHub URL。不得提交用户目录路径、机器名、内部 Codex 任务或线程标识、私有 artifact 链接、临时下载链接、终端全文、对话转录、凭据、cookie 或认证 header。自动扫描只是防护栏，审查者仍须人工判断隐私上下文。

不得重写已经提交的 Work Session 或 Decision；需要纠错时创建新记录。`docs/agent` 是公开 dogfooding 证据，但不进入发布 ZIP。

## PR 检查清单

请求审查前：

1. 运行 `npm run quality`、相关定向测试；修改打包时还要运行发布检查。
2. 用户可见行为变化时更新双语文档和 `CHANGELOG.md`。
3. 确认没有新增运行时依赖，也没有意外扩大发布 allowlist。
4. 人工检查完整 diff，排除秘密、私有上下文、生成二进制和终端全文。
5. 在 PR 中说明问题、测试证据、兼容性影响和剩余风险。

提交贡献即表示你有权按项目 [MIT License](LICENSE) 提交这些内容，并同意遵守[行为准则](CODE_OF_CONDUCT.zh-CN.md)。
