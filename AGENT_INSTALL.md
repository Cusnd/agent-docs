# Install Agent Docs with an Agent

[简体中文](AGENT_INSTALL.zh-CN.md)

This is the canonical, one-link installation contract for an Agent with shell and network access. Agent Docs is an unofficial community Codex plugin, not an OpenAI product. The contract installs the immutable `v0.2.0` GitHub Release; it does not install from npm, a source archive, a mirror, or an unpinned branch.

Give the Agent this raw URL:

```text
https://raw.githubusercontent.com/Cusnd/agent-docs/main/AGENT_INSTALL.md
```

Suggested one-message instruction:

```text
Read and follow https://raw.githubusercontent.com/Cusnd/agent-docs/main/AGENT_INSTALL.md in full. Install Agent Docs v0.2.0. You are authorized to modify only Agent Docs marketplace and plugin state in the persistent Codex configuration root used by my normal user-facing Codex tasks, plus fresh operating-system temporary files. Resolve and report that exact root before writing. Do not treat a `CodexSandbox*` account, an operating-system temporary directory, the current workspace, or the extracted release directory as that target. If you cannot distinguish the persistent user target, or conflicting Agent Docs state already exists, stop and ask. Do not log in, call a model or AI inference API, read credentials, weaken a verification gate, or modify any unrelated configuration.
```

The words **MUST**, **MUST NOT**, and **STOP** below are binding. This document is an executable runbook for an Agent, not a shell script. The Agent must adapt path and quoting syntax to the detected operating system without weakening any gate.

## Machine-readable contract

The English and Chinese documents contain the same contract object. A repository check rejects drift between them.

<!-- agent-docs:install-contract:start -->

```json
{
  "schema_version": 2,
  "entrypoint": "https://raw.githubusercontent.com/Cusnd/agent-docs/main/AGENT_INSTALL.md",
  "repository": "Cusnd/agent-docs",
  "distribution": "github-release-zip",
  "release_tag": "v0.2.0",
  "release_page": "https://github.com/Cusnd/agent-docs/releases/tag/v0.2.0",
  "archive": {
    "name": "agent-docs-marketplace-v0.2.0.zip",
    "download_url": "https://github.com/Cusnd/agent-docs/releases/download/v0.2.0/agent-docs-marketplace-v0.2.0.zip",
    "sha256": "70723ad7eb654af02d36c73ca3ea35bda6a5a8043513cf66c5e847e42e65863a",
    "regular_file_count": 34,
    "root": "agent-docs-marketplace-v0.2.0/"
  },
  "checksums": {
    "name": "SHA256SUMS",
    "download_url": "https://github.com/Cusnd/agent-docs/releases/download/v0.2.0/SHA256SUMS",
    "sha256": "f79428e7c25ee45109a91c6df5036f0c0b037e1f7114c8c074f35de074465c06"
  },
  "attestation": {
    "repository": "Cusnd/agent-docs",
    "signer_workflow": "Cusnd/agent-docs/.github/workflows/release.yml",
    "source_ref": "refs/tags/v0.2.0",
    "source_digest": "569fb8a1544d0dfcb95552c953048df5be0e6b5f",
    "predicate_type": "https://slsa.dev/provenance/v1",
    "deny_self_hosted_runners": true
  },
  "marketplace": "agent-docs",
  "plugin": "agent-docs@agent-docs",
  "plugin_version": "0.2.0",
  "verified_codex_cli": "0.147.0",
  "node": "^22.0.0 || ^24.0.0 || ^26.0.0",
  "verified_operating_systems": ["Windows", "Linux", "macOS"],
  "target": {
    "kind": "persistent-user-codex-home",
    "reject_sandbox_identity": true,
    "reject_temporary_or_workspace_path": true
  },
  "marketplace_storage": {
    "relative_path": "marketplaces/agent-docs-v0.2.0",
    "persistent": true,
    "remove_with_temporary_files": false
  },
  "safety": {
    "require_target_authorization": true,
    "allow_login": false,
    "allow_model_or_ai_api_calls": false,
    "allow_credential_access": false,
    "overwrite_existing_installation": false
  }
}
```

<!-- agent-docs:install-contract:end -->

## Authorization and stop conditions

Before any write, the Agent MUST:

1. Resolve the existing, persistent Codex configuration root used by the user's normal user-facing Codex tasks. A `CODEX_HOME` configured for those normal tasks, or explicitly named by the user for this installation, wins only when its canonical absolute path is persistent and authorized. A value inherited only by the restricted executor is not proof of the user target. Otherwise the normal CLI default is `~/.codex` for the host user—not for a restricted execution identity.
2. Inspect the effective identity, user profile, current workspace, operating-system temporary root, and canonical target relationship without printing credentials or the environment wholesale. A target owned by a `CodexSandbox*` identity, or located in a temporary directory, workspace, repository, release extraction, or path reached through an unexpected link, is not the persistent user target. If the host target cannot be distinguished independently, STOP and ask the user to name it.
3. Report the canonical target to the user before writing. The suggested instruction above authorizes only an unambiguous persistent user target. Any other instruction must name or clearly authorize the target before installation proceeds.
4. Confirm that writes are limited to newly created operating-system temporary files and Agent Docs marketplace/plugin state under that target, including the persistent versioned Marketplace source defined below. Do not set a persistent user or system environment variable.

The Agent MUST STOP without making a configuration change when any of these conditions holds:

- the target is missing, ambiguous, outside the user's authorization, belongs to a `CodexSandbox*` identity, lies under a temporary directory/workspace/repository/extraction directory, or resolves through an unexpected link;
- a required command is missing, its current help does not support the required flags, or a login would be needed;
- an existing `agent-docs` marketplace or `agent-docs@agent-docs` plugin is conflicting, incomplete, or a different version;
- the release is missing, draft, prerelease, substituted, or has unexpected assets;
- a digest, checksum manifest, attestation, archive-path, file-count, trust-surface, install, or readback check fails.

If the exact `agent-docs@agent-docs` version `0.2.0` is already installed from the expected persistent Marketplace path and readback is healthy, make no change and report idempotent success. A Marketplace rooted in a temporary directory or workspace is conflicting state even if the plugin cache exists. Never upgrade, overwrite, remove, migrate, or repair an existing installation implicitly.

## Installation procedure

### 1. Preflight the local tools

Run the local help/version commands rather than assuming syntax from this document:

```console
codex --version
codex plugin marketplace add --help
codex plugin marketplace list --help
codex plugin marketplace remove --help
codex plugin add --help
codex plugin list --help
codex plugin remove --help
node --version
git --version
gh --version
gh auth status
gh release download --help
gh attestation verify --help
```

Do not initiate or automate a login. Codex CLI `0.147.0` is the only verified command surface for this release. With another Codex version, compare the actual help with every command below and require an explicit user override after reporting that the combination is unverified. Node.js must satisfy the contract range. `gh attestation verify` must expose the repository, signer workflow, source ref, source digest, predicate type, and self-hosted-runner policy flags used below.

Read the current marketplace and plugin JSON once, retaining only the minimum state needed for conflict detection and rollback. Do not print complete configuration files, tokens, environment dumps, or unrelated plugin metadata.

### 2. Download only the pinned Release

Create a new random directory under the operating system's temporary directory. Resolve it to an absolute path and use it only for this run. Download exactly the two named assets from the exact tag and repository:

```console
gh release download v0.2.0 --repo Cusnd/agent-docs --pattern agent-docs-marketplace-v0.2.0.zip --pattern SHA256SUMS --dir <fresh-temporary-directory>
```

Do not use `latest`, Git source archives, npm, mirrors, private artifact URLs, an existing download, or an existing extraction directory. Confirm through the release metadata that the release is neither draft nor prerelease and that both downloaded assets came from the URLs in the contract.

### 3. Verify bytes and provenance

Using a local SHA-256 implementation available on the detected operating system:

1. Compute `SHA256SUMS` and require its digest to equal the contract value.
2. Require the checksum file to contain exactly one normalized entry naming the contract archive with the contract archive digest.
3. Compute the archive digest independently and require it to equal both the contract value and the checksum entry.

Then verify **both** downloaded assets. Use the following argument set as one command per asset, adapting only path quoting:

```console
gh attestation verify <downloaded-asset> --repo Cusnd/agent-docs --signer-workflow Cusnd/agent-docs/.github/workflows/release.yml --source-ref refs/tags/v0.2.0 --source-digest 569fb8a1544d0dfcb95552c953048df5be0e6b5f --predicate-type https://slsa.dev/provenance/v1 --deny-self-hosted-runners
```

Successful signature verification is necessary but not sufficient. The Agent MUST enforce every identity constraint shown above and MUST NOT accept an attestation merely because `gh` found some valid statement.

### 4. Inspect before extraction and execution

Enumerate archive entries without extracting them. Require all of the following:

- exactly 34 regular files and one top-level directory named `agent-docs-marketplace-v0.2.0/`;
- sorted or unsorted entry order is acceptable, but every path uses `/`, is relative, is unique, and contains no empty, `.` or `..` component;
- no symbolic link, junction, reparse-point target, device, executable binary, or additional top-level entry;
- no `.git`, `.github`, `docs/agent`, `node_modules`, tests, fixtures, cache, temporary workspace, or user configuration.

Only after that check, extract into a second new empty temporary directory and verify that every resolved output remains below it. Before installation, inspect at least:

- `.agents/plugins/marketplace.json` — marketplace name is `agent-docs` and the plugin source is local `./plugins/agent-docs`;
- `plugins/agent-docs/.codex-plugin/plugin.json` — name and version are `agent-docs` and `0.2.0`;
- `plugins/agent-docs/hooks/hooks.json` — only `UserPromptSubmit`, `SubagentStart`, and `Stop` are registered;
- `plugins/agent-docs/package.json` and `plugins/agent-docs/scripts/` — runtime has no third-party dependencies, network client, telemetry, login, or model invocation.

Do not execute a file from the archive before this review. Attestation proves build provenance, not that plugin behavior should be trusted without inspection.

### 5. Install transactionally

Apply the authorized configuration root only to the individual Codex subprocesses. Do not persistently change `CODEX_HOME`. Codex records a local Marketplace's absolute source path and continues to use that directory in place; plugin installation does not make the Marketplace source disposable.

Define `<persistent-marketplace-directory>` as the canonical path obtained by joining the authorized target with `marketplaces/agent-docs-v0.2.0`. It MUST remain below that target. Never register the temporary extraction directory, current task directory, workspace, repository checkout, or any other disposable path.

Before changing Codex configuration:

1. If the persistent directory does not exist, create a fresh staging sibling below `<CODEX_HOME>/marketplaces`, copy the verified extracted top-level directory into it, compare the complete relative file set and SHA-256 of all 34 regular files with the verified extraction, then atomically rename the staging directory to `<persistent-marketplace-directory>`. Track that this run created it.
2. If the persistent directory already exists, do not overwrite or merge it. Reuse it only if its canonical path, complete relative file set, and every file digest exactly match the verified extraction; otherwise STOP as a conflict.
3. Reject links, reparse points, unexpected file types, path escapes, an existing destination with different bytes, or a copy/rename that cannot be proven complete.

Register only the persistent directory:

```console
codex plugin marketplace add <persistent-marketplace-directory> --json
codex plugin marketplace list --json
codex plugin add agent-docs@agent-docs --json
codex plugin list --json
```

Track whether this run successfully created the persistent source, added the Marketplace, and added the plugin. The final readback MUST show Marketplace `agent-docs` rooted at the exact canonical `<persistent-marketplace-directory>`, installed selector `agent-docs@agent-docs`, and plugin version `0.2.0`. Treat warnings, ambiguous JSON, a different source/version, a non-persistent source, or a missing installed marker as failure.

If any post-write step fails, roll back only state created by this run, in reverse order:

```console
codex plugin remove agent-docs@agent-docs --json
codex plugin marketplace remove agent-docs --json
codex plugin list --json
codex plugin marketplace list --json
```

Never remove pre-existing state. After readback proves that the Marketplace entry created by this run is gone, remove the persistent source only if this run created it, its canonical path is exactly the versioned destination below the authorized target, and its contents still match the verified copy. Never remove a pre-existing identical source. If rollback cannot be proven complete, STOP and report the exact remaining Agent Docs state without retrying destructive commands blindly.

### 6. Finish without starting a model task

After successful readback, remove only the two fresh temporary directories after verifying that each resolves inside the operating system's temporary root. Retain `<persistent-marketplace-directory>`: it is installed state, not temporary extraction. Do not recursively delete an unresolved variable, persistent Marketplace source, user directory, workspace, repository, or Codex configuration root.

After temporary cleanup, invoke fresh Codex CLI processes with the same authorized per-process `CODEX_HOME` and repeat both readbacks:

```console
codex plugin marketplace list --json
codex plugin list --json
```

Both commands MUST still succeed and report the exact persistent source, selector, and version before installation is reported complete.

Report a compact result containing:

- resolved and authorized Codex configuration target;
- release tag, archive digest, checksum result, and constrained attestation result;
- persistent Marketplace source, Marketplace/plugin name, and installed version from post-cleanup JSON readback;
- whether the run installed, found an identical existing installation, or rolled back;
- confirmation that no login, model or AI inference API call, credential access, or unrelated configuration change occurred.

Tell the user to open a **fresh Codex task** in an eligible top-level Git worktree. Do not open an interactive task automatically: that could trigger login or model activity. Hooks loaded by an already-running task do not change retroactively.

## Explicit removal

Removal is a separate operation and requires separate user authorization. It uses the same resolved Codex configuration target:

```console
codex plugin remove agent-docs@agent-docs --json
codex plugin marketplace remove agent-docs --json
codex plugin list --json
codex plugin marketplace list --json
```

CLI removal does not delete `<CODEX_HOME>/marketplaces/agent-docs-v0.2.0`. Delete that exact versioned source only when the removal authorization explicitly includes it, both JSON readbacks prove that no configured Marketplace references it, and its canonical path remains below the authorized target. Never delete the `marketplaces` parent or the Codex configuration root.

Removing the plugin does not delete repository-owned `docs/agent` records. Review those records separately; never delete them as an implicit part of uninstalling the plugin.

## Scope and support

This entrypoint reduces installation to one Agent-readable URL, but the trust gates remain deliberate. It does not grant permission to change unrelated plugins, global environment settings, repositories, credentials, or the currently running Codex task. Support is best effort with no response, fix, or release SLA. See [INSTALL.md](INSTALL.md), [security and privacy](docs/security-model.md), and [troubleshooting](docs/troubleshooting.md).
