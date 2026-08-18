# 证据与安全边界

[English](security.md)

## 永不保存

- 原始用户 prompt 或完整对话转录；
- 完整 assistant 输出或隐藏推理；
- 可以用摘要代替的完整终端捕获；
- password、session cookie、认证 header、API key、private key、token、recovery code 或秘密环境值；
- 不必要个人数据或无关仓库内容；
- 公开记录中的用户目录路径、机器名、内部 task/thread 标识、私有 artifact URL、临时下载 URL 或对话 provenance。

结构 validator 只能识别明显模式；通过 scan 不等于内容安全证明。

## 安全证据形式

优先保存可复核引用而非复制输出，例如：

```text
`node --test` — 18/18 tests passed; see tests/receipt.test.mjs.
```

失败检查也应保留有用边界而不泄漏秘密。外部系统只有在获授权时才引用非秘密 artifact ID 或用户可见 URL；应移除值，而不是部分遮盖仍可复用 token。

## Health record 与路径

Turn Receipt、lock、不可变 Log Health event 和 session index 位于当前 worktree Git 元数据。它们可包含 repository path、branch/HEAD、model name、timestamp 与 state hash，但不得包含 prompt 或秘密，Agent Docs 永不提交它们。

仓库文档写入前会拒绝 linked、reparse-point 或逃逸 parent，并在写入前后检查。该机制无法完全抵御同一操作系统账号下持续 race 替换目录的进程。
