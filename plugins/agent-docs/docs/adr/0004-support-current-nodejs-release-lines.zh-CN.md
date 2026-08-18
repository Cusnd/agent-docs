---
status: accepted
supersedes: 0002-use-nodejs-for-portable-plugin-mechanics
---

# 支持当前 Node.js 发布线

[English](0004-support-current-nodejs-release-lines.md)

Agent Docs v0.2.0 支持 Node.js `^22.0.0 || ^24.0.0 || ^26.0.0`，并在 Windows、Linux 与 macOS 上测试每条版本线。每次项目发布都依据 Node.js 官方发布状态重新检查，而不是把某个数字下限永久视为受支持。

这既保留一份零依赖 Node.js 实现，也避免承诺已经 EOL 的版本。新增或移除发布线时，CI、文档、package metadata、release note 与兼容证据必须一起变化。
