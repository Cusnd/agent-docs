# 安装与移除 Agent Docs

[English](INSTALL.md)

除非正在开发插件，否则应使用正式 GitHub Release。Agent Docs 不通过 npm 发布。

## 由 Agent 执行安装

若要使用带安全门槛的单链接流程，把[交给 Agent 的安装契约](AGENT_INSTALL.zh-CN.md)发给 Agent：

```text
https://raw.githubusercontent.com/Cusnd/agent-docs/main/AGENT_INSTALL.zh-CN.md
```

契约包含可复制的授权指令、不可变 Release identity 与 digest、带约束的 attestation 命令、安装前信任审查、冲突处理、JSON 回读、回滚、临时目录清理和新任务交接。它不允许登录、模型或 AI 推理 API 调用、凭据访问、持久化修改 `CODEX_HOME` 或改变无关插件。

## 审查信任面

安装前检查解压目录中的 `.agents/plugins/marketplace.json`、`plugins/agent-docs/.codex-plugin/plugin.json`、`plugins/agent-docs/hooks/hooks.json` 和 `plugins/agent-docs/scripts/`。发布 ZIP 不应包含测试、仓库工作流、开发依赖、`docs/agent` 或可执行二进制文件。

## 验证发布物

从同一个 GitHub Release 下载 `agent-docs-marketplace-v0.2.0.zip` 和 `SHA256SUMS`。比较 ZIP 的 SHA-256，再验证 GitHub artifact attestation：

```console
gh attestation verify agent-docs-marketplace-v0.2.0.zip --repo Cusnd/agent-docs
```

校验和保护下载到的字节；attestation 将产物绑定到 GitHub Actions 构建身份。两者都不能替代源码审查。

## 添加 Marketplace 与插件

解压 ZIP 后运行：

```console
codex plugin marketplace add <解压后的-marketplace-目录>
codex plugin add agent-docs@agent-docs
codex plugin list --json
```

随后在顶层 Git worktree 中打开一个全新的 Codex 任务。第一次实质提示应由 `UserPromptSubmit` 报告 pending Turn Receipt。

实验时只给 Codex 子进程设置一个空的一次性 `CODEX_HOME`。仓库的 `npm run release:smoke` 会自动完成隔离，绝不会修改调用者真实的插件配置。

## 移除

```console
codex plugin remove agent-docs@agent-docs --json
codex plugin marketplace remove agent-docs --json
codex plugin list --json
```

移除插件不会删除仓库拥有的 `docs/agent` 记录。只有仓库明确不再需要这些历史时，才应单独审查并删除。

hook 报告警告时运行 `agent-docs status --json` 和 `agent-docs validate --json`。详见[故障排查](docs/troubleshooting.zh-CN.md)。
