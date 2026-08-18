# 发布流程

[English](RELEASING.md)

Release 只能由受保护的 `v*` tag 工作流构建。Agent Docs 通过 GitHub Release Marketplace ZIP 分发，不发布 npm 包。

## 前置条件

创建发布 tag 之前：

1. 对照 Node.js 官方发布状态重新检查支持线。
2. 通过 GitHub API 确认 Community Profile 为 100%。
3. 完成指定版本 OpenSSF OSPS Baseline Level 1 自评并链接公开证据；这只是项目自评，不是第三方认证。
4. 确认真实 OpenSSF Scorecard 工作流已经产生结果；不设置任意分数门槛。
5. 要求 Windows/Linux/macOS 与 Node.js 22/24/26 九组测试，以及 `CI / gate`、`Security / codeql`、`Security / dependency-review` 全部通过。
6. 运行定向安全回归、并发测试、性能样本、公开内容检查、版本一致性、插件校验和 coverage 输出。
7. 人工检查完整 diff，排除秘密、私有路径、终端全文、意外二进制和非预期运行时依赖。

## 构建契约

运行：

```console
npm ci
npm run quality
npm run test:performance
npm run test:coverage
npm run release:build
npm run release:verify
npm run release:smoke
```

构建器只收集 `scripts/lib/release-files.mjs` 中的 allowlist。它会把文本统一为 LF、排序 POSIX 路径、拒绝绝对路径、父级逃逸和重复项，固定时间、OS 与权限元数据，并使用锁文件中的精确 `fflate` 版本。它会在两个独立临时目录构建并比较字节。

产物名为 `agent-docs-marketplace-v0.2.0.zip`，内部只有同名顶层目录。`SHA256SUMS` 保存 SHA-256。测试、fixture、工作流、`docs/agent`、仓库开发脚本、`.git`、依赖、缓存、临时工作区和本机配置均被排除。

Windows、Linux 和 macOS 的 Node.js 24 job 分别构建 ZIP，digest 必须完全一致。Release 工作流使用 GitHub artifact attestations 为 ZIP 与 checksum 生成证明。

## 发布与复核

只有受保护 `main` 上的 commit 满足全部前置条件后，才能创建 annotated `v0.2.0` tag。tag 工作流会重新运行门槛、构建、比较跨 OS 结果、生成 attestation 并发布 GitHub Release。

发布后必须重新下载远端资产，不能复用本机构建物。验证 `SHA256SUMS`、运行 `gh attestation verify`，并用只对子进程生效的一次性 `CODEX_HOME` 重做安装、插件 readback、hook workflow、Stop 恢复和移除。不得访问或改变用户真实 Codex 配置。

最后通过 GitHub API 回读可见性、默认分支、功能开关、Actions 权限、安全设置、ruleset、Community Profile、Scorecard 结果、Release assets、digest 和 attestation。只把脱敏摘要与公开链接写入[发布验证](docs/release-verification.zh-CN.md)。

若必需 GitHub 功能、权限、仓库名、安全设置或等价分支保护不可用，必须停止。不得改名、降低门槛或宣称完成。
