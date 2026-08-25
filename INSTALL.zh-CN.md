# 安装与移除 Agent Docs

[English](INSTALL.md)

除非正在开发插件，否则应使用正式 GitHub Release。Agent Docs 不通过 npm 发布。

## 由 Agent 执行安装

若要使用带安全门槛的单链接流程，把[交给 Agent 的安装契约](AGENT_INSTALL.zh-CN.md)发给 Agent：

```text
https://raw.githubusercontent.com/Cusnd/agent-docs/main/AGENT_INSTALL.zh-CN.md
```

契约包含可复制的授权指令、持久用户目标检查、不可变 Release identity 与 digest、带约束的 attestation 命令、安装前信任审查、冲突处理、持久 Marketplace staging、临时清理后的 JSON 回读、回滚和新任务交接。它不允许登录、模型或 AI 推理 API 调用、凭据访问、持久化修改 `CODEX_HOME` 环境变量或改变无关插件。

## 审查信任面

安装前检查解压目录中的 `.agents/plugins/marketplace.json`、`plugins/agent-docs/.codex-plugin/plugin.json`、`plugins/agent-docs/hooks/hooks.json` 和 `plugins/agent-docs/scripts/`。发布 ZIP 不应包含测试、仓库工作流、开发依赖、`docs/agent` 或可执行二进制文件。

## 验证发布物

从同一个 GitHub Release 下载 `agent-docs-marketplace-v0.2.0.zip` 和 `SHA256SUMS`。比较 ZIP 的 SHA-256，再验证 GitHub artifact attestation：

```console
gh attestation verify agent-docs-marketplace-v0.2.0.zip --repo Cusnd/agent-docs
```

校验和保护下载到的字节；attestation 将产物绑定到 GitHub Actions 构建身份。两者都不能替代源码审查。

## 添加持久 Marketplace 与插件

先解析用户正常 Codex 任务所使用的现有持久 `CODEX_HOME`。若默认路径属于 `CodexSandbox*` 账户，或位于操作系统临时目录、当前 workspace、仓库或解压目录下，它就是错误目标；必须停止并改为解析 host 用户目标。

审查解压后的 ZIP 后，把已验证的顶层目录复制到版本化持久路径 `<CODEX_HOME>/marketplaces/agent-docs-v0.2.0`。注册前比较完整文件集合和每个文件 digest。不得直接注册解压目录，也不得用不同字节覆盖已有目标。下列命令中的 `<persistent-marketplace-directory>` 就是该 canonical 版本化路径：

```console
codex plugin marketplace add <persistent-marketplace-directory>
codex plugin marketplace list --json
codex plugin add agent-docs@agent-docs
codex plugin list --json
```

必须保留持久 Marketplace 目录。只删除可丢弃的下载与解压目录，然后用全新的 Codex CLI 进程再次运行两项 JSON list 命令。只有回读仍显示 Marketplace `agent-docs`、来源 `<CODEX_HOME>/marketplaces/agent-docs-v0.2.0`、selector `agent-docs@agent-docs` 与版本 `0.2.0` 后，才在顶层 Git worktree 中打开全新的 Codex 任务。第一次实质提示应由 `UserPromptSubmit` 报告 pending Turn Receipt。

实验时只给 Codex 子进程设置一个空的一次性 `CODEX_HOME`。仓库的 `npm run release:smoke` 会自动完成隔离，绝不会修改调用者真实的插件配置。

## 移除

```console
codex plugin remove agent-docs@agent-docs --json
codex plugin marketplace remove agent-docs --json
codex plugin list --json
```

移除插件不会删除仓库拥有的 `docs/agent` 记录。只有仓库明确不再需要这些历史时，才应单独审查并删除。

CLI 移除也不会删除磁盘上的 `<CODEX_HOME>/marketplaces/agent-docs-v0.2.0`。只有取得明确的文件删除授权，且 Marketplace 回读证明该路径已不再配置时，才能删除这个准确的源目录；绝不能删除 `marketplaces` 父目录或 `CODEX_HOME`。

hook 报告警告时运行 `agent-docs status --json` 和 `agent-docs validate --json`。详见[故障排查](docs/troubleshooting.zh-CN.md)。
