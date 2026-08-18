# 安全与隐私模型

[English](security-model.md)

## 资产与参与者

受保护资产包括仓库控制的 Agent Docs 记录、每个 worktree 的运行状态、Release 产物和公开项目信息保密性。受信任参与者包括仓库 owner、本地 Codex 进程、Git、Node.js 和已审查的 GitHub workflow。PR、branch metadata、archive 内容、下载产物和任意自然语言在校验前均不可信。

## 强制边界

- 所有 ID 在 lookup 或路径拼接前都按完整 anchored ASCII 形式校验；绝对路径、分隔符、父级组件、前后缀和混淆变体都会失败。
- repository root、common Git directory 与 worktree Git directory 经过 canonicalize；Receipt schema v2 同时绑定 repository 和 worktree fingerprint。
- 文档根与每一级已存在 parent 在写入前拒绝符号链接、junction、reparse point 与 realpath 逃逸；写入前后再次检查 target parent。
- Requirements lock 使用 exclusive create、随机 token、stale-lock quarantine、有界重试与 release token 校验。
- 原子写使用同目录 exclusive 临时文件、flush、rename、Windows 瞬态有界重试和临时文件清理；关联 Requirement/archive 更新支持 rollback。
- Receipt 终态不可变。material closure 需要控制状态已改变和有效 Session；non-material closure 需要控制状态未变。
- Validator 检查严格 marker、文件/ID 一致性、交叉引用、生命周期、archive、表格转义和明显秘密模式。
- Hooks 使用有界 Git 子进程和一次修复的 Stop policy。

## 数据位置

提交数据只位于 `docs/agent`。Receipt、lock、index 与 health 运行数据位于当前 worktree Git 元数据，不进入 Release。插件向 Codex 发出紧凑 hook context 与诊断，不传输数据、不调用模型、不收集遥测，也不读取用户凭据。

本公开仓库有意提交已脱敏 `docs/agent` dogfooding 记录。附加 scanner 会拒绝常见用户路径、机器名、内部 task/thread 标识、签名私有 URL、凭据、cookie、私钥和终端捕获 marker。Release archive 排除全部项目记录。

## 剩余风险

- 同一操作系统账号下持续 race 替换目录的进程，可能超过重复路径检查提供的保护。
- 模式扫描无法证明自然语言不敏感，仍必须人工审查。
- Git、Node.js、Codex、操作系统和 GitHub Actions 属于可信计算基。
- 恶意且被审查通过的自动化或 allowlist 变更可以改变产物；branch rule、CODEOWNERS、检查、attestation 和可复现字节只能降低而不能消除风险。
- Schema v1 Receipt 兼容保留原有 path identity 和完整历史 hash 行为。

## 公开披露规则

只使用仓库相对路径、公开 GitHub URL 和紧凑检查摘要。不得提交私有路径、host name、task/thread 标识、私有 artifact/临时 URL、完整终端输出、对话转录、凭据、cookie 或认证材料。漏洞只能通过 [SECURITY.zh-CN.md](../SECURITY.zh-CN.md) 指定渠道报告。

通用插件 validator 有意不强制本仓库公开披露政策，因为 Agent Docs 也服务私有仓库。
