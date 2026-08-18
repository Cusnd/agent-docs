# Release process

[简体中文](RELEASING.zh-CN.md)

Releases are built only by the protected `v*` tag workflow. Agent Docs is distributed as a GitHub Release Marketplace ZIP, not as an npm package.

## Preconditions

Before creating a release tag:

1. Recheck the supported Node.js lines against the official Node.js release status.
2. Confirm the GitHub Community Profile is 100% through GitHub's API.
3. Complete the versioned OpenSSF OSPS Baseline Level 1 self-assessment with public evidence. This is a project self-assessment, not third-party certification.
4. Confirm the real OpenSSF Scorecard workflow has produced a result. There is no arbitrary score threshold.
5. Require all nine Windows/Linux/macOS and Node.js 22/24/26 test jobs plus `CI / gate`, `Security / codeql`, and `Security / dependency-review` to pass.
6. Run focused security regressions, concurrent suites, performance sampling, public-content review, version consistency, plugin validation, and coverage output.
7. Review the full diff manually for secrets, private paths, terminal transcripts, unexpected binary files, and unintended runtime dependencies.

## Build contract

Run:

```console
npm ci
npm run quality
npm run test:performance
npm run test:coverage
npm run release:build
npm run release:verify
npm run release:smoke
```

The builder collects only the allowlist in `scripts/lib/release-files.mjs`. It normalizes text to LF, sorts POSIX paths, rejects absolute paths, parent traversal and duplicates, fixes time, OS and permission metadata, and uses the exact locked `fflate` version. It builds twice in separate temporary directories and compares the bytes.

The artifact is named `agent-docs-marketplace-v0.2.0.zip` and has a single top-level directory with the same base name. `SHA256SUMS` contains its SHA-256 digest. Tests, fixtures, workflows, `docs/agent`, repository development scripts, `.git`, dependencies, caches, temporary work, and local configuration are excluded.

Windows, Linux, and macOS Node.js 24 jobs each build the ZIP. Their digests must match exactly. The release workflow attests both the ZIP and checksum with GitHub artifact attestations.

## Publish and verify

Create an annotated `v0.2.0` tag only after the protected-main commit meets every precondition. The tag workflow reruns the gate, builds the artifact, confirms cross-OS equality, creates attestations, and publishes the GitHub Release.

After publication, download the remote assets rather than reusing local build output. Verify `SHA256SUMS`, run `gh attestation verify`, and repeat the install, plugin readback, hook workflow, Stop recovery, and removal smoke test with a disposable subprocess-only `CODEX_HOME`. Do not access or alter the user's real Codex configuration.

Finally read back repository visibility, default branch, feature switches, Actions permissions, security settings, rulesets, Community Profile, Scorecard result, release assets, digest, and attestations through GitHub APIs. Record only sanitized summaries and public links in [release verification](docs/release-verification.md).

If a required GitHub feature, permission, repository name, security setting, or equivalent branch protection is unavailable, stop. Do not rename the repository, weaken the gate, or claim the release is complete.
