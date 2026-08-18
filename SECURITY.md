# Security policy

[简体中文](SECURITY.zh-CN.md)

## Report a vulnerability privately

Use [GitHub Private Vulnerability Reporting](https://github.com/Cusnd/agent-docs/security/advisories/new) for every suspected vulnerability. Do not disclose vulnerability details in a public Issue, Discussion, pull request, commit, or other public channel. The moderation email is not the vulnerability channel.

Provide the affected version, operating system, Node.js and Codex versions, reproduction steps, impact, and a minimal proof of concept with secrets removed. Avoid accessing data that is not yours and stop testing when further work could harm another user.

The project offers no acknowledgement, response, remediation, or release SLA. Reports and fixes are handled on a best-effort basis. Coordinated disclosure timing is decided privately for each report.

## Supported versions

Only the latest published minor release is supported. Before the first release is published, `main` is development code and receives no security-support promise.

| Version          | Security updates                    |
| ---------------- | ----------------------------------- |
| 0.2.x            | Supported after v0.2.0 is published |
| Earlier versions | Not supported                       |

## Security model summary

Agent Docs is local repository automation. It does not call a model, transmit telemetry, provide a server, or authenticate users. Its principal assets are repository documents and Git-metadata runtime state. It validates IDs before path construction, binds Receipt schema v2 to a canonical repository and worktree, rejects linked path components, uses token-bound locks and atomic writes, and limits Stop to one repair pass.

The plugin cannot fully defend against another process running as the same operating-system account that continuously swaps directories during a write. It also cannot prove that arbitrary prose is safe to publish. See the full [security and privacy model](docs/security-model.md).

Dependencies are recorded in `package-lock.json`. Plugin runtime dependencies remain empty; pinned development dependencies are used only for repository quality and release construction. Dependabot, CodeQL, dependency review, secret scanning, and OpenSSF Scorecard provide additional repository checks.
