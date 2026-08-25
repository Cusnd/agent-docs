# 交给 Agent 安装 Agent Docs

[English](AGENT_INSTALL.md)

这是提供给具备终端和网络访问能力的 Agent 的 canonical 单链接安装契约。Agent Docs 是非官方社区 Codex 插件，不是 OpenAI 产品。本契约安装不可变的 GitHub Release `v0.2.0`，不会从 npm、源码归档、镜像或未固定分支安装。

把下面这个 Raw URL 交给 Agent：

```text
https://raw.githubusercontent.com/Cusnd/agent-docs/main/AGENT_INSTALL.zh-CN.md
```

建议直接发送的一段指令：

```text
完整阅读并严格执行 https://raw.githubusercontent.com/Cusnd/agent-docs/main/AGENT_INSTALL.zh-CN.md，安装 Agent Docs v0.2.0。我授权你只修改我的正常用户侧 Codex 任务所使用的持久 Codex 配置根目录中的 Agent Docs Marketplace 与插件状态，以及新建的操作系统临时文件。写入前必须解析并报告这个准确根目录。向我展示三个 Agent Docs hook 的准确定义并确认它们与已审查 Release 完全一致后，你可以仅通过 Codex 的 `/hooks` 审查界面持久信任这些定义。不得使用 `--dangerously-bypass-hook-trust`。不得把 `CodexSandbox*` 账户、操作系统临时目录、当前 workspace 或 Release 解压目录当作该目标。若无法区分持久用户目标，或已存在冲突的 Agent Docs 状态，停止并询问。不得登录、调用模型或 AI 推理 API、读取凭据、降低任何验证门槛或修改无关配置。
```

下文的 **必须**、**不得**和**停止**具有约束力。本文档是供 Agent 执行的 runbook，不是 shell 脚本。Agent 必须根据检测到的操作系统调整路径和引号语法，但不得降低任何门槛。

## 机器可读契约

中英文文档包含完全相同的契约对象，仓库检查会拒绝两者漂移。

<!-- agent-docs:install-contract:start -->

```json
{
  "schema_version": 3,
  "entrypoint": "https://raw.githubusercontent.com/Cusnd/agent-docs/main/AGENT_INSTALL.md",
  "repository": "Cusnd/agent-docs",
  "distribution": "github-release-zip",
  "release_tag": "v0.2.0",
  "release_page": "https://github.com/Cusnd/agent-docs/releases/tag/v0.2.0",
  "archive": {
    "name": "agent-docs-marketplace-v0.2.0.zip",
    "download_url": "https://github.com/Cusnd/agent-docs/releases/download/v0.2.0/agent-docs-marketplace-v0.2.0.zip",
    "sha256": "70723ad7eb654af02d36c73ca3ea35bda6a5a8043513cf66c5e847e42e65863a",
    "regular_file_count": 34,
    "root": "agent-docs-marketplace-v0.2.0/"
  },
  "checksums": {
    "name": "SHA256SUMS",
    "download_url": "https://github.com/Cusnd/agent-docs/releases/download/v0.2.0/SHA256SUMS",
    "sha256": "f79428e7c25ee45109a91c6df5036f0c0b037e1f7114c8c074f35de074465c06"
  },
  "attestation": {
    "repository": "Cusnd/agent-docs",
    "signer_workflow": "Cusnd/agent-docs/.github/workflows/release.yml",
    "source_ref": "refs/tags/v0.2.0",
    "source_digest": "569fb8a1544d0dfcb95552c953048df5be0e6b5f",
    "predicate_type": "https://slsa.dev/provenance/v1",
    "deny_self_hosted_runners": true
  },
  "marketplace": "agent-docs",
  "plugin": "agent-docs@agent-docs",
  "plugin_version": "0.2.0",
  "verified_codex_cli": "0.147.0",
  "node": "^22.0.0 || ^24.0.0 || ^26.0.0",
  "verified_operating_systems": ["Windows", "Linux", "macOS"],
  "target": {
    "kind": "persistent-user-codex-home",
    "reject_sandbox_identity": true,
    "reject_temporary_or_workspace_path": true
  },
  "marketplace_storage": {
    "relative_path": "marketplaces/agent-docs-v0.2.0",
    "persistent": true,
    "remove_with_temporary_files": false
  },
  "hook_activation": {
    "trust_required": true,
    "review_command": "/hooks",
    "auto_trust": false,
    "persistent_bypass_allowed": false,
    "expected_events": ["UserPromptSubmit", "SubagentStart", "Stop"],
    "expected_status": "Installed 1 / Active 1 / Review 0"
  },
  "safety": {
    "require_target_authorization": true,
    "allow_login": false,
    "allow_model_or_ai_api_calls": false,
    "allow_credential_access": false,
    "overwrite_existing_installation": false
  }
}
```

<!-- agent-docs:install-contract:end -->

## 授权与停止条件

任何写入之前，Agent 必须：

1. 解析用户正常使用的用户侧 Codex 任务所采用的现有持久 Codex 配置根目录。只有为这些正常任务配置，或由用户为本次安装明确指定，而且 canonical 绝对路径确实持久并已获授权时，`CODEX_HOME` 才优先；仅由受限执行器继承的值不能证明它就是用户目标。否则正常 CLI 默认值是 host 用户的 `~/.codex`，不是受限执行身份的默认目录。
2. 在不打印凭据或完整环境变量的前提下，检查当前执行身份、用户 profile、workspace、操作系统临时根目录与 canonical 目标之间的关系。属于 `CodexSandbox*` 身份，或位于临时目录、workspace、仓库、Release 解压目录、非预期链接之后的路径，都不是持久用户目标。若无法独立区分 host 目标，必须停止并请用户明确指定。
3. 写入前向用户报告 canonical 目标。上面的建议指令只授权无歧义的持久用户目标；使用其他指令时，必须先命名或明确授权目标才能继续安装。
4. 确认写入仅限新建的操作系统临时文件，以及该目标下的 Agent Docs Marketplace/插件状态，包括下文定义的持久版本化 Marketplace 源目录。不得设置持久化的用户或系统环境变量。

出现以下任一情况时，Agent 必须停止且不得修改配置：

- 目标缺失、有歧义、超出用户授权、属于 `CodexSandbox*` 身份、位于临时目录/workspace/仓库/解压目录下，或通过非预期链接解析；
- 必需命令缺失、当前 help 不支持所需参数，或需要登录；
- 已有 `agent-docs` Marketplace 或 `agent-docs@agent-docs` 插件存在冲突、不完整或版本不同；
- Release 缺失、是 draft/prerelease、被替换或包含非预期资产；
- digest、checksum manifest、attestation、归档路径、文件数、信任面、安装或回读检查失败。

若完全相同的 `agent-docs@agent-docs` `0.2.0` 已从预期持久 Marketplace 路径安装且回读健康，则不做修改，报告幂等成功。即使插件 cache 存在，根目录位于临时目录或 workspace 的 Marketplace 仍属于冲突状态。不得隐式升级、覆盖、移除、迁移或修复现有安装。

## 安装流程

### 1. 预检本地工具

必须运行本机实际 help/version，不能假定本文档中的语法仍然成立：

```console
codex --version
codex plugin marketplace add --help
codex plugin marketplace list --help
codex plugin marketplace remove --help
codex plugin add --help
codex plugin list --help
codex plugin remove --help
node --version
git --version
gh --version
gh auth status
gh release download --help
gh attestation verify --help
```

不得发起或自动完成登录。Codex CLI `0.147.0` 是本 Release 唯一经过验证的命令接口。若 Codex 版本不同，必须把实际 help 与下文每条命令进行比较，报告该组合尚未验证，并取得用户明确覆盖授权后才能继续。Node.js 必须满足契约范围。`gh attestation verify` 必须提供下文使用的 repository、signer workflow、source ref、source digest、predicate type 和 self-hosted runner policy 参数。

只读取一次当前 Marketplace 与插件 JSON，仅保留冲突判断和回滚所需的最小状态。不得输出完整配置文件、token、环境变量全集或无关插件元数据。

### 2. 只下载固定 Release

在操作系统临时目录下新建随机目录，解析为绝对路径且只供本轮使用。从准确 tag 和仓库中只下载两个指定资产：

```console
gh release download v0.2.0 --repo Cusnd/agent-docs --pattern agent-docs-marketplace-v0.2.0.zip --pattern SHA256SUMS --dir <全新临时目录>
```

不得使用 `latest`、Git 源码归档、npm、镜像、私有 artifact URL、旧下载文件或旧解压目录。通过 Release 元数据确认它不是 draft/prerelease，并确认两个下载资产来自契约中的 URL。

### 3. 验证字节与来源

使用检测到的操作系统中可信的本地 SHA-256 实现：

1. 计算 `SHA256SUMS`，要求 digest 等于契约值。
2. 要求 checksum 文件只包含一条规范化记录，文件名和 archive digest 均与契约相同。
3. 独立计算 ZIP digest，要求同时等于契约值和 checksum 记录。

然后验证下载的**两个**资产。每个资产执行一次以下参数集合，只调整路径引号：

```console
gh attestation verify <下载资产> --repo Cusnd/agent-docs --signer-workflow Cusnd/agent-docs/.github/workflows/release.yml --source-ref refs/tags/v0.2.0 --source-digest 569fb8a1544d0dfcb95552c953048df5be0e6b5f --predicate-type https://slsa.dev/provenance/v1 --deny-self-hosted-runners
```

签名验证成功是必要条件，但并不充分。Agent 必须强制上面的全部 identity 约束；不能仅因 `gh` 找到某个有效 statement 就接受它。

### 4. 解压与执行前检查

先枚举 archive entry，不得直接解压。要求全部满足：

- 恰好 34 个普通文件，唯一顶层目录为 `agent-docs-marketplace-v0.2.0/`；
- entry 是否排序不影响结果，但每条路径都使用 `/`、是相对且唯一的，并且不包含空、`.` 或 `..` 分量；
- 没有符号链接、junction、reparse point target、device、可执行二进制或其他顶层 entry；
- 不包含 `.git`、`.github`、`docs/agent`、`node_modules`、测试、fixture、缓存、临时工作区或用户配置。

通过后才能解压到第二个全新空临时目录，并确认每个输出的解析路径仍位于其中。安装前至少检查：

- `.agents/plugins/marketplace.json`——Marketplace 名称为 `agent-docs`，插件来源为本地 `./plugins/agent-docs`；
- `plugins/agent-docs/.codex-plugin/plugin.json`——名称和版本为 `agent-docs` 与 `0.2.0`；
- `plugins/agent-docs/hooks/hooks.json`——只注册 `UserPromptSubmit`、`SubagentStart` 和 `Stop`；
- `plugins/agent-docs/package.json` 与 `plugins/agent-docs/scripts/`——运行时没有第三方依赖、网络客户端、遥测、登录或模型调用。

完成信任检查前不得执行 archive 中的任何文件。Attestation 证明构建来源，不代表可以跳过对插件行为的审查。

### 5. 事务式安装

只给单个 Codex 子进程应用已授权的配置根目录，不得持久化修改 `CODEX_HOME`。Codex 会记录本地 Marketplace 源的绝对路径，并继续原地使用该目录；安装插件不会让 Marketplace 源变成可丢弃文件。

把已授权目标与 `marketplaces/agent-docs-v0.2.0` 拼接后得到的 canonical 路径定义为 `<persistent-marketplace-directory>`。它必须始终位于该目标之下。绝不能注册临时解压目录、当前任务目录、workspace、仓库 checkout 或其他可丢弃路径。

修改 Codex 配置之前：

1. 若持久目录不存在，在 `<CODEX_HOME>/marketplaces` 下创建全新的同级 staging 目录，把已验证的解压顶层目录复制进去，比较完整相对文件集合以及全部 34 个普通文件的 SHA-256 与已验证解压目录完全一致，然后用原子 rename 变为 `<persistent-marketplace-directory>`；记录该目录由本轮创建。
2. 若持久目录已存在，不得覆盖或合并。只有其 canonical 路径、完整相对文件集合和每个文件 digest 都与已验证解压目录完全相同时才能复用，否则作为冲突停止。
3. 遇到 link、reparse point、非预期文件类型、路径逃逸、目标已有不同字节，或无法证明 copy/rename 完整时，必须拒绝继续。

只注册这个持久目录：

```console
codex plugin marketplace add <persistent-marketplace-directory> --json
codex plugin marketplace list --json
codex plugin add agent-docs@agent-docs --json
codex plugin list --json
```

记录本轮是否成功创建持久源、添加 Marketplace 和添加插件。最终 readback 必须显示 Marketplace `agent-docs` 的根目录是准确的 canonical `<persistent-marketplace-directory>`、已安装 selector 为 `agent-docs@agent-docs`，且插件版本为 `0.2.0`。warning、含糊 JSON、不同来源/版本、非持久来源或缺失 installed marker 均视为失败。

任何写入后的步骤失败时，只按相反顺序回滚本轮创建的状态：

```console
codex plugin remove agent-docs@agent-docs --json
codex plugin marketplace remove agent-docs --json
codex plugin list --json
codex plugin marketplace list --json
```

不得移除已有状态。回读证明本轮创建的 Marketplace entry 已消失后，只有当持久源也是本轮创建、其 canonical 路径正好是已授权目标下的版本化目标，而且内容仍与已验证副本一致时，才能删除它。不得删除预先存在的相同持久源。若无法证明回滚完成，立即停止并报告残留的准确 Agent Docs 状态，不得盲目重试破坏性命令。

### 6. 不启动模型任务地激活已审查 hooks 并完成

成功回读后，先确认两个新建临时目录都解析到操作系统临时根目录内，再只删除它们。必须保留 `<persistent-marketplace-directory>`：它是已安装状态，不是临时解压目录。不得对未解析变量、持久 Marketplace 源、用户目录、workspace、仓库或 Codex 配置根目录执行递归删除。

清理临时目录后，使用相同的单进程授权 `CODEX_HOME` 启动全新的 Codex CLI 进程，再次执行两项回读：

```console
codex plugin marketplace list --json
codex plugin list --json
```

两条命令仍然成功并报告准确的持久来源、selector 与版本，才能证明安装完成；这不能证明 hooks 已激活，因为已启用插件的 hooks 不会自动获得信任。

上面的建议授权只允许在精确定义已审查后写入信任。启动一个不带 prompt 的全新 Codex 交互进程；若启动时出现信任门，则选择 **Review hooks**，否则输入 `/hooks`。逐条审查三个 entry，并要求：

- 来源为 `Plugin - agent-docs@agent-docs`；
- event 与命令分别为 `UserPromptSubmit` → `node "$PLUGIN_ROOT/scripts/agent-docs.mjs" hook user-prompt-submit`、`SubagentStart` → `node "$PLUGIN_ROOT/scripts/agent-docs.mjs" hook subagent-start`、`Stop` → `node "$PLUGIN_ROOT/scripts/agent-docs.mjs" hook stop`；Windows 使用等价的 `commandWindows` 形式；
- timeout 和 context limit 与已审查 Release 中的 `hooks/hooks.json` 完全一致。

只有全部定义匹配后，才能通过该审查界面持久信任。不得手工编辑 `hooks.state`，也不得把 `--dangerously-bypass-hook-trust` 当作安装或验证捷径。信任绑定到准确的 hook-definition hash；定义以后发生变化时必须重新审查，不能静默继承旧信任。

再次进入 `/hooks`，要求 `UserPromptSubmit`、`SubagentStart` 和 `Stop` 每一项均显示 `Installed 1 / Active 1 / Review 0`，然后在不提交模型 prompt 的情况下退出。如果无法进行交互审查，或任一 entry 不一致，必须停止：报告**已安装，hook 激活待完成**，并把准确的 `/hooks` 操作交给用户；不得声称 Agent Docs 已可运行。

报告紧凑结果，包含：

- 已解析且获授权的 Codex 配置目标；
- Release tag、archive digest、checksum 结果与带约束的 attestation 结果；
- 清理后 JSON 回读中的持久 Marketplace 来源、Marketplace/插件名称与已安装版本；
- 三个已审查定义的 `/hooks` 激活状态，或明确的“已安装，hook 激活待完成”状态；
- 本轮是完成安装、发现完全相同的现有安装，还是已经回滚；
- 未发生登录、模型或 AI 推理 API 调用、凭据访问或无关配置修改。

激活完成后，提示用户在合格顶层 Git worktree 中打开一个**全新的 Codex 任务**。第一条 prompt 应创建 pending Turn Receipt；非实质探针必须把它解析为 `not-material`，实质工作则必须创建 Work Session 并关闭 Receipt。不得自动提交该 prompt，因为那会调用模型或 AI 推理 API；已运行任务加载的 hooks 不会追溯更新。

## 显式移除

移除是独立操作，需要用户单独授权，并使用同一个已解析的 Codex 配置目标：

```console
codex plugin remove agent-docs@agent-docs --json
codex plugin marketplace remove agent-docs --json
codex plugin list --json
codex plugin marketplace list --json
```

CLI 移除不会删除 `<CODEX_HOME>/marketplaces/agent-docs-v0.2.0`。只有当移除授权明确包含这个目录、两项 JSON 回读证明已经没有 Marketplace 引用它，而且 canonical 路径仍位于已授权目标下时，才能删除这个准确的版本化源目录。绝不能删除 `marketplaces` 父目录或 Codex 配置根目录。

移除插件不会删除仓库拥有的 `docs/agent` 记录。必须单独审查这些记录，绝不能把删除记录作为卸载插件的隐式步骤。

## 范围与支持

这个入口把安装简化为一个 Agent 可读 URL，但信任门槛仍是刻意保留的。它不授权修改无关插件、全局环境设置、仓库、凭据或当前运行的 Codex 任务。支持全部为 best effort，不承诺响应、修复或发布时间。参见[完整安装文档](INSTALL.zh-CN.md)、[安全与隐私](docs/security-model.zh-CN.md)和[故障排查](docs/troubleshooting.zh-CN.md)。
