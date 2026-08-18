---
status: superseded
superseded_by: 0004-support-current-nodejs-release-lines
---

# 使用 Node.js 20+ 实现便携插件机制

[English](0002-use-nodejs-for-portable-plugin-mechanics.md)

使用一份 Node.js 20+ 实现 Git detection、抗碰撞 ID、仓库锁、Turn Receipt、archive 与结构校验，覆盖 Windows、macOS 和 Linux。代价是明确运行时前置条件，收益是单一跨平台实现、一致 JSON 处理与统一测试面，而不必维护 PowerShell/POSIX 两套 shell。

Node.js 发布状态变化后，ADR 0004 取代其支持下限；单一运行时的理由仍然有效。
