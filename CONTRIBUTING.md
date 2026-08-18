# Contributing to Agent Docs

[简体中文](CONTRIBUTING.zh-CN.md)

Thank you for helping improve Agent Docs. External pull requests are welcome, but submission does not guarantee review, acceptance, or a release. All project activity is best effort and has no service-level agreement.

## Choose the right channel

- Use [Discussions](https://github.com/Cusnd/agent-docs/discussions) for usage questions and design exploration.
- Use a structured [Issue](https://github.com/Cusnd/agent-docs/issues/new/choose) for a reproducible defect, scoped feature, or documentation request.
- Use [Private Vulnerability Reporting](https://github.com/Cusnd/agent-docs/security/advisories/new) for vulnerabilities. Never disclose a suspected vulnerability in a public Issue, Discussion, or pull request.

## Development setup

Install a supported Node.js release and Git, then run:

```console
npm ci
npm run quality
npm run test:performance
npm run release:build
npm run release:verify
```

The root package and plugin package are private. Do not publish either package to npm. `fflate` and the quality tools are repository-only development dependencies; plugin runtime code must continue to use only Node.js built-ins.

## Change policy

Use a failing test first for defects and public behavior changes. Every fixed defect needs a focused regression that fails on the old implementation and passes on the fix. Major changes must add or update automated tests. Keep ordinary tests isolated per process; concurrency orchestration must not recursively invoke itself.

The stable v0.2.0 operator CLI is limited to `--help`, `--version`, `init`, `status`, `validate`, and `archive`. Changes to their options, JSON envelope, stdout/stderr split, or exit codes are compatibility changes. Internal protocol commands may evolve before 1.0 but still require tests.

Preserve the hook-only architecture, the three registered hook events, worktree isolation, zero runtime dependencies, and the model-independent contract unless a separately reviewed design explicitly changes them.

## Documentation and public-content policy

English is canonical. Every changed user-facing English Markdown document must update its `.zh-CN.md` mirror in the same pull request. Generated templates, `docs/agent`, and the English MIT License text are exceptions.

Public evidence must use repository-relative paths, compact result summaries, and public GitHub URLs. Do not commit user-directory paths, machine names, internal Codex task or thread identifiers, private artifact links, temporary download links, terminal transcripts, conversation transcripts, credentials, cookies, or authentication headers. Automated scanning is only a guardrail; reviewers must still inspect privacy context manually.

Do not rewrite committed Work Sessions or Decisions. Correct them with a new record. `docs/agent` is public dogfooding evidence and is excluded from release ZIP files.

## Pull request checklist

Before requesting review:

1. Run `npm run quality`, the relevant focused tests, and release checks when packaging changes.
2. Update both language versions of documentation and `CHANGELOG.md` when user-visible behavior changes.
3. Confirm no runtime dependency was added and no release allowlist entry was added accidentally.
4. Review the complete diff for secrets, private context, generated binaries, and terminal output.
5. Explain the problem, test evidence, compatibility effect, and remaining risk in the pull request.

By contributing, you represent that you have the right to submit your work under the project's [MIT License](LICENSE) and agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
