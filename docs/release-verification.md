# v0.2.0 release verification

[简体中文](release-verification.zh-CN.md)

The local gate is complete. This report remains incomplete until the public repository and released assets are read back; the release Requirement cannot become `Done` before then.

## Local gate

| Evidence                                                                                    | Required result                                    | Recorded result                                                                                                                                          |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Syntax, lint, formatting, documentation, public content, version, plugin, Agent Docs checks | Pass                                               | Pass; `npm run check`, exact dependency audit, and the Codex Plugin validator                                                                            |
| Base test suite and focused regressions                                                     | Pass                                               | Pass; 50/50 with OS-temporary randomized suite workspaces                                                                                                |
| Two concurrent base suites, three rounds                                                    | Both pass in every round                           | Pass; all six complete 50-test processes                                                                                                                 |
| 1,000 Sessions and 5,000 Receipts performance sample                                        | Hook p95 below 50% timeout; no timeout             | Pass; UserPromptSubmit p95 1,070.7 ms, Stop p95 1,071.8 ms, full validate 1,578.0 ms                                                                     |
| Coverage output                                                                             | Generated for review; no arbitrary percentage gate | Pass; Node coverage: 88.18% lines, 62.48% branches, 92.90% functions                                                                                     |
| Two deterministic local ZIP builds                                                          | Byte-identical                                     | Pass; 34 allowlisted files, 66,842 bytes, fixed metadata, SHA-256 `d9fea04a6ffbdc071086f148d96cb5de1659077e63450645b735a8894dabf193`                     |
| Isolated `CODEX_HOME` install, hooks, and removal                                           | Pass without touching real configuration           | Pass with Codex CLI 0.147.0; marketplace add, plugin add/list, material/non-material hooks, Stop repair, plugin/marketplace removal; real home untouched |

## Remote gate

Record public links or sanitized API facts for:

- Public visibility, default branch, description, topics, Issues, Discussions, Wiki/Projects state, merge settings, and branch cleanup.
- Read-only default Actions token and prohibition on Actions approving pull requests.
- Private Vulnerability Reporting, vulnerability alerts, security updates, secret scanning, and push protection.
- Main and `v*` rulesets, exact required check names, update/deletion/force-push restrictions, and linear history.
- Nine operating-system/Node.js test jobs, `CI / gate`, CodeQL, dependency review, external link run, and real Scorecard result.
- Community Profile API result of 100%.
- Badge pull request and protected merge commit.
- Annotated `v0.2.0` tag, Release URL, ZIP and checksum assets, cross-OS matching SHA-256, and GitHub attestations.
- Fresh download of remote assets, checksum and attestation verification, and final isolated install smoke.
- Completed [OSPS Level 1 self-assessment](osps-baseline.md).

No local artifact may substitute for remote-release evidence. If any required fact cannot be established, the report remains incomplete and publication must not be represented as finished.
