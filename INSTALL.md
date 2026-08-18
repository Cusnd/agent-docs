# Install and remove Agent Docs

[简体中文](INSTALL.zh-CN.md)

Use a published GitHub Release unless you are developing the plugin. Agent Docs is not published to npm.

## Review the trust surface

Before installation, inspect `.agents/plugins/marketplace.json`, `plugins/agent-docs/.codex-plugin/plugin.json`, `plugins/agent-docs/hooks/hooks.json`, and `plugins/agent-docs/scripts/` inside the extracted archive. The ZIP must not contain tests, repository workflows, development dependencies, `docs/agent`, or executable binaries.

## Verify the release

Download `agent-docs-marketplace-v0.2.0.zip` and `SHA256SUMS` from the same GitHub Release. Compare the ZIP's SHA-256 digest, then verify its GitHub artifact attestation:

```console
gh attestation verify agent-docs-marketplace-v0.2.0.zip --repo Cusnd/agent-docs
```

The checksum protects the downloaded bytes; the attestation binds the artifact to the GitHub Actions build identity. Neither replaces source review.

## Add the marketplace and plugin

Extract the ZIP and run:

```console
codex plugin marketplace add <extracted-marketplace-directory>
codex plugin add agent-docs@agent-docs
codex plugin list --json
```

Start a fresh Codex task in a top-level Git worktree. On the first material prompt, `UserPromptSubmit` should report a pending Turn Receipt.

For experiments, set `CODEX_HOME` only on the Codex subprocess to an empty disposable directory. The repository's `npm run release:smoke` script automates this isolation and never changes the invoking user's real plugin configuration.

## Remove

```console
codex plugin remove agent-docs@agent-docs --json
codex plugin marketplace remove agent-docs --json
codex plugin list --json
```

Removal does not delete repository-owned `docs/agent` records. Review and remove those files separately only if the repository no longer wants the history.

If a hook reports a warning, run `agent-docs status --json` and `agent-docs validate --json`. See [troubleshooting](docs/troubleshooting.md).
