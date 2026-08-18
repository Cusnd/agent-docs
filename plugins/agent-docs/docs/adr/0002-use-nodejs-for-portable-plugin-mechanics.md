---
status: superseded
superseded_by: 0004-support-current-nodejs-release-lines
---

# Use Node.js 20+ for portable plugin mechanics

[简体中文](0002-use-nodejs-for-portable-plugin-mechanics.zh-CN.md)

Implement Git detection, collision-resistant ID allocation, repository locking, Turn Receipts, archival, and structural validation once in Node.js 20+ for Windows, macOS, and Linux. This accepts an explicit team runtime prerequisite in exchange for one cross-platform implementation, consistent JSON handling, and a single test surface instead of duplicated PowerShell and POSIX shell logic.

ADR 0004 supersedes the support floor because Node.js release status changed; the single-runtime rationale remains valid.
