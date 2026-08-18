# Agent Docs

[English](README.md)

[![CI](https://github.com/Cusnd/agent-docs/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Cusnd/agent-docs/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/Cusnd/agent-docs/badge)](https://securityscorecards.dev/viewer/?uri=github.com/Cusnd/agent-docs)
[![Community Profile：100%](https://img.shields.io/badge/community%20profile-100%25-brightgreen)](https://github.com/Cusnd/agent-docs/community)

Agent Docs 是一个非官方、由社区维护的 Codex 插件，用 Git 仓库内紧凑且可复核的文档保存 Requirement、验证证据、Work Session 和持久决策。它不是 OpenAI 产品，也未获得 OpenAI 官方背书。

本插件只使用 hooks：注册 `UserPromptSubmit`、`SubagentStart` 和 `Stop`，不注册 Skill，也不注册 `SessionStart` hook。运行时只使用 Node.js 标准库，第三方运行时依赖为零。

## 为什么需要 Agent Docs

很长的代理对话并不是可靠的项目记录。Agent Docs 把每轮有实质影响的结果收敛为一组小而可审查的仓库契约：

- `docs/agent/requirements.md` 保存当前目标、验收标准、证据、状态和下一步。
- `docs/agent/sessions/` 为每次实质执行保存一个不可变 Work Session。
- `docs/agent/decisions/` 保存难以逆转的决策。
- Git 元数据保存临时 Receipt、锁、健康事件和 worktree 索引；这些运行记录不会提交到仓库。

**Material turn（实质轮次）**会改变 Requirement 状态、证据、风险或下一项可执行工作，必须更新 Agent Docs、创建且只创建一个 Work Session、完成校验并关闭 Turn Receipt。**Non-material turn（非实质轮次）**不改变上述内容，直接以 `not-material` 关闭 Receipt，也不会初始化仓库文档。

## 信任边界

Agent Docs 只向合格的顶层 Git worktree 中的 `docs/agent/` 和该 worktree 自己的 Git 元数据目录写入内容。它拒绝 bare repository、submodule、操作系统临时目录、显式禁用的仓库、不安全 ID，以及通过链接逃逸的文档路径。完整边界与本地攻击者限制见[安全与隐私模型](docs/security-model.zh-CN.md)。

安装任何插件前，都应检查 Marketplace entry、插件 manifest、hook 命令和运行时脚本。发布 ZIP 只从明确 allowlist 构建；测试、仓库自动化、`docs/agent` 和开发依赖都不会进入发布物。

## 快速开始

前置条件：

- 经验证的插件命令接口使用 Codex CLI `0.147.0`。
- Node.js `^22.0.0 || ^24.0.0 || ^26.0.0`。
- Git。

从 [v0.2.0 Release](https://github.com/Cusnd/agent-docs/releases/tag/v0.2.0) 下载 `agent-docs-marketplace-v0.2.0.zip` 和 `SHA256SUMS`，验证校验和与 GitHub artifact attestation，解压后运行：

```console
codex plugin marketplace add <解压后的-marketplace-目录>
codex plugin add agent-docs@agent-docs
codex plugin list --json
```

安装后请在合格 Git 仓库中打开一个全新的 Codex 任务；插件不会改变已经运行任务的 hook 集合。完整的检查、校验、恢复与卸载步骤见 [INSTALL.zh-CN.md](INSTALL.zh-CN.md)。

## 兼容性

| 范围           | Codex CLI | Node.js              | 操作系统              | 模型                     |
| -------------- | --------- | -------------------- | --------------------- | ------------------------ |
| CI 已验证      | `0.147.0` | 22、24、26           | Windows、Linux、macOS | 无；CI 不调用模型        |
| 已观察交互组合 | `0.147.0` | 26                   | Windows               | GPT-5.6 Sol              |
| 其他组合       | 未验证    | 超出声明范围即不支持 | 未验证                | 契约与模型无关，欢迎反馈 |

hook 协议在契约层面与模型无关，已观察模型不是唯一支持目标。项目每次发布都会依据 [Node.js 官方发布状态](https://nodejs.org/en/about/previous-releases)复核支持线。

## Operator CLI

v0.2.0 的稳定操作员命令刻意保持很小：

```text
agent-docs --help
agent-docs --version
agent-docs init [--json]
agent-docs status [--turn-id UUID] [--json]
agent-docs validate [--json]
agent-docs archive [--json]
```

Requirement、Session、Decision、Receipt、Lock 和 ID 命令属于内部协议机制，1.0 前不保证兼容。项目不提供 JavaScript library API，也不发布 npm 包。详见 [CLI 参考](docs/cli.zh-CN.md)。

## 文档

- [快速上手](docs/getting-started.zh-CN.md)
- [核心概念与生命周期](docs/concepts.zh-CN.md)
- [日常运营](docs/operations.zh-CN.md)
- [故障排查](docs/troubleshooting.zh-CN.md)
- [架构](docs/architecture.zh-CN.md)
- [安全与隐私](docs/security-model.zh-CN.md)
- [发布与验证](RELEASING.zh-CN.md)
- [公开项目历史](docs/history.zh-CN.md)

英文文档是 canonical 版本，所有面向用户的文档都有完整简体中文镜像，CI 会检查一一对应关系。`docs/agent`、英文 License 法律文本和机器生成模板不适用镜像规则。

## 社区与支持

使用问答请进入 [GitHub Discussions](https://github.com/Cusnd/agent-docs/discussions)；可复现缺陷、功能建议和文档请求请进入 [Issues](https://github.com/Cusnd/agent-docs/issues)；安全漏洞只能使用 [GitHub Private Vulnerability Reporting](https://github.com/Cusnd/agent-docs/security/advisories/new)，不得公开提交 Issue。

全部维护与支持均为 best effort。项目不承诺响应、确认、修复或发布时间。欢迎外部 PR，但不保证合并。参见 [SUPPORT.zh-CN.md](SUPPORT.zh-CN.md)、[CONTRIBUTING.zh-CN.md](CONTRIBUTING.zh-CN.md)和 [GOVERNANCE.zh-CN.md](GOVERNANCE.zh-CN.md)。

## License

[MIT](LICENSE) — Copyright (c) 2026 liuso。中文说明不改变英文 License 的法律效力。
