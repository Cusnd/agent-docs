# Agent Docs 插件

[English](README.md) · [项目 README](../../README.zh-CN.md)

Agent Docs 是非官方社区 Codex 插件，用紧凑仓库文档维护 Requirement、证据、Work Session 和持久决策。其契约与模型无关。

## 插件边界

- 只使用 `UserPromptSubmit`、`SubagentStart` 和 `Stop` hooks。
- 不注册 Skill，也不使用 `SessionStart` hook。
- 零第三方运行时依赖；Node.js 支持范围为 `^22.0.0 || ^24.0.0 || ^26.0.0`。
- 无网络、模型、遥测、服务端、认证、npm 发布或 JavaScript library API。
- 仓库文档写入 `docs/agent`；临时运行状态写入当前 worktree 的 Git 元数据。

## 行为

`UserPromptSubmit` 创建或复用 pending schema v2 Turn Receipt，并注入协议位置。material turn 更新 Requirement、创建一个不可变 Work Session、校验全部记录，并用该 Session 关闭 Receipt；non-material turn 不改变控制状态，关闭为 `not-material`。

`SubagentStart` 注入 single-writer 规则。`Stop` 对 pending Receipt 提供一次修复机会；第二次会记录本地 health warning 并让产品工作继续。

## 兼容性证据

CI 使用 Codex CLI `0.147.0`，不调用模型，在 Windows、Linux、macOS 上测试 Node.js 22、24、26。已观察交互组合是 Windows、Codex `0.147.0`、Node.js 26 与 GPT-5.6 Sol。其他 Codex 或模型组合均未验证，欢迎报告；已观察模型不是唯一目标。

## 安装前检查

检查 `.codex-plugin/plugin.json`、`hooks/hooks.json`、`scripts/` 和 `protocol/`。只从已验证项目 Release 安装，并遵循 [INSTALL.zh-CN.md](../../INSTALL.zh-CN.md)。Marketplace ZIP 包含本运行时和文档，但排除测试、开发工具、仓库 workflow 和项目 `docs/agent` 记录。

## Operator CLI

v0.2.0 稳定命令为 `--help`、`--version`、`init`、`status`、`validate` 与 `archive`。内部 Requirement、Session、Decision、Receipt、Lock 和 ID 命令属于协议机制，在 1.0 前可能变化。详见 [CLI 参考](../../docs/cli.zh-CN.md)。

## 安全

ID 在路径拼接前校验；schema v2 Receipt 绑定 canonical repository/worktree identity；链接或逃逸文档路径被拒绝；锁使用 acquisition token 与 stale quarantine；写入采用已 flush 同目录临时文件和原子 rename。同账号目录 race 限制和公开数据政策见[安全模型](../../docs/security-model.zh-CN.md)。

使用 [MIT](../../LICENSE) 授权。本项目不是 OpenAI 产品，也未获得 OpenAI 官方背书。
