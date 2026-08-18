# v0.2.0 release verification

[简体中文](release-verification.zh-CN.md)

The local gate and pre-release remote-control gate are complete. This report remains incomplete until the published assets are read back; the release Requirement cannot become `Done` before then.

## Local gate

| Evidence                                                                                    | Required result                                    | Recorded result                                                                                                                                          |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Syntax, lint, formatting, documentation, public content, version, plugin, Agent Docs checks | Pass                                               | Pass; `npm run check`, exact dependency audit, and the Codex Plugin validator                                                                            |
| Base test suite and focused regressions                                                     | Pass                                               | Pass; 52/52 with OS-temporary randomized suite workspaces                                                                                                |
| Two concurrent base suites, three rounds                                                    | Both pass in every round                           | Pass; all six complete 52-test processes                                                                                                                 |
| 1,000 Sessions and 5,000 Receipts performance sample                                        | Hook p95 below 50% timeout; no timeout             | Pass; UserPromptSubmit p95 1,070.7 ms, Stop p95 1,071.8 ms, full validate 1,578.0 ms                                                                     |
| Coverage output                                                                             | Generated for review; no arbitrary percentage gate | Pass; Node coverage: 88.06% lines, 63.10% branches, 92.90% functions                                                                                     |
| Two deterministic local ZIP builds                                                          | Byte-identical                                     | Pass; 34 allowlisted files, 66,887 bytes, fixed metadata, SHA-256 `086bc5f8acc6ea1400b60c8e7b4946e65b3a61641a21a4b60a6276f20e2924c8`                     |
| Isolated `CODEX_HOME` install, hooks, and removal                                           | Pass without touching real configuration           | Pass with Codex CLI 0.147.0; marketplace add, plugin add/list, material/non-material hooks, Stop repair, plugin/marketplace removal; real home untouched |

## Pre-release remote gate

- Repository API readback: public `main`; Issues and Discussions enabled; Wiki and Projects disabled; squash-only merge; merged-branch deletion enabled; expected description and six topics present.
- Actions API readback: default token permission `read`; Actions cannot approve pull-request reviews.
- Security API readback: Private Vulnerability Reporting, Dependabot alerts/security updates, secret scanning, and push protection enabled.
- Collaborator readback: only `@Cusnd`, the owner and sole administrator.
- Ruleset readback: protected [`main`](https://github.com/Cusnd/agent-docs/rules/21000773), [`v*` creation restricted to `@Cusnd`](https://github.com/Cusnd/agent-docs/rules/21000782), and immutable [`v*` tags](https://github.com/Cusnd/agent-docs/rules/21000787).
- [PR #1](https://github.com/Cusnd/agent-docs/pull/1) passed the final [CI run](https://github.com/Cusnd/agent-docs/actions/runs/32162080649) and [Security run](https://github.com/Cusnd/agent-docs/actions/runs/32162080586), then squash-merged as `e600424`.
- Community Profile API: 100%. Rules-enabled [Scorecard run](https://github.com/Cusnd/agent-docs/actions/runs/32163049236): 6.8, Scorecard v5.5.0, with no project threshold.
- [OSPS Level 1 self-assessment](osps-baseline.md): all implementation controls `Met` or `Not applicable`; this is a project self-assessment, not certification.
- The first [external-link run](https://github.com/Cusnd/agent-docs/actions/runs/32163046480) correctly found the not-yet-published v0.2.0 URL and exposed a Markdown backtick parsing defect. This pull request fixes and self-tests the parser; a successful post-release rerun is still required.

## Remaining release-only evidence

- Protected badge/evidence pull request and squash merge.
- Annotated immutable `v0.2.0` tag and successful Release workflow.
- Release URL, ZIP and checksum assets, cross-OS matching SHA-256, and both GitHub artifact attestations.
- Fresh download of remote assets, checksum and attestation verification, and final isolated installation smoke.
- Successful post-release external-link run and final settings/release API readback.

No local artifact may substitute for remote-release evidence. If any required fact cannot be established, the report remains incomplete and publication must not be represented as finished.
