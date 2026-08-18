---
status: accepted
supersedes: 0002-use-nodejs-for-portable-plugin-mechanics
---

# Support current Node.js release lines

[简体中文](0004-support-current-nodejs-release-lines.zh-CN.md)

Support Node.js `^22.0.0 || ^24.0.0 || ^26.0.0` for Agent Docs v0.2.0. Test every line on Windows, Linux, and macOS. Recheck the set against the official Node.js release status at every project release rather than treating a numeric minimum as indefinitely supported.

This preserves one dependency-free Node.js implementation while avoiding an end-of-life support promise. Adding or removing a release line requires CI, documentation, package metadata, release notes, and compatibility evidence to change together.
