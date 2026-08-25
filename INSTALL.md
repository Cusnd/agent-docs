# Install and remove Agent Docs

[简体中文](INSTALL.zh-CN.md)

Use a published GitHub Release unless you are developing the plugin. Agent Docs is not published to npm.

## Agent-operated installation

For a guarded one-link workflow, give the Agent the [Agent installation contract](AGENT_INSTALL.md):

```text
https://raw.githubusercontent.com/Cusnd/agent-docs/main/AGENT_INSTALL.md
```

The contract includes a copy-paste authorization prompt, persistent-user target checks, immutable Release identity and digests, constrained attestation commands, pre-install trust review, conflict handling, persistent Marketplace staging, post-cleanup JSON readback, rollback, and a fresh-task handoff. It does not permit login, model or AI inference API calls, credential access, persistent `CODEX_HOME` environment changes, or changes to unrelated plugins.

## Review the trust surface

Before installation, inspect `.agents/plugins/marketplace.json`, `plugins/agent-docs/.codex-plugin/plugin.json`, `plugins/agent-docs/hooks/hooks.json`, and `plugins/agent-docs/scripts/` inside the extracted archive. The ZIP must not contain tests, repository workflows, development dependencies, `docs/agent`, or executable binaries.

## Verify the release

Download `agent-docs-marketplace-v0.2.0.zip` and `SHA256SUMS` from the same GitHub Release. Compare the ZIP's SHA-256 digest, then verify its GitHub artifact attestation:

```console
gh attestation verify agent-docs-marketplace-v0.2.0.zip --repo Cusnd/agent-docs
```

The checksum protects the downloaded bytes; the attestation binds the artifact to the GitHub Actions build identity. Neither replaces source review.

## Add the persistent marketplace and plugin

First resolve the existing persistent `CODEX_HOME` used by the user's normal Codex tasks. A default rooted in a `CodexSandbox*` account, operating-system temporary directory, current workspace, repository, or extraction directory is the wrong target; stop and resolve the host-user target instead.

After reviewing the extracted ZIP, copy its verified top-level directory to the versioned persistent path `<CODEX_HOME>/marketplaces/agent-docs-v0.2.0`. Compare the complete file set and every file digest before registering it. Do not register the extraction directory directly, and do not overwrite an existing destination with different bytes. In the commands below, `<persistent-marketplace-directory>` means that canonical versioned path:

```console
codex plugin marketplace add <persistent-marketplace-directory>
codex plugin marketplace list --json
codex plugin add agent-docs@agent-docs
codex plugin list --json
```

Keep the persistent Marketplace directory. Delete only disposable download and extraction directories, then run both JSON list commands again from fresh Codex CLI processes. Start a fresh Codex task in a top-level Git worktree only after those readbacks still show Marketplace `agent-docs`, source `<CODEX_HOME>/marketplaces/agent-docs-v0.2.0`, selector `agent-docs@agent-docs`, and version `0.2.0`. On the first material prompt, `UserPromptSubmit` should report a pending Turn Receipt.

For experiments, set `CODEX_HOME` only on the Codex subprocess to an empty disposable directory. The repository's `npm run release:smoke` script automates this isolation and never changes the invoking user's real plugin configuration.

## Remove

```console
codex plugin remove agent-docs@agent-docs --json
codex plugin marketplace remove agent-docs --json
codex plugin list --json
```

Removal does not delete repository-owned `docs/agent` records. Review and remove those files separately only if the repository no longer wants the history.

CLI removal also leaves `<CODEX_HOME>/marketplaces/agent-docs-v0.2.0` on disk. Delete that exact source only with explicit filesystem-removal authorization and only after Marketplace readback proves that it is no longer configured; never delete the parent `marketplaces` directory or `CODEX_HOME`.

If a hook reports a warning, run `agent-docs status --json` and `agent-docs validate --json`. See [troubleshooting](docs/troubleshooting.md).
