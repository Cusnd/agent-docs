# Install Agent Docs with an Agent

[简体中文](AGENT_INSTALL.zh-CN.md)

This is the canonical, one-link installation contract for an Agent with shell and network access. Agent Docs is an unofficial community Codex plugin, not an OpenAI product. The contract installs the immutable `v0.2.0` GitHub Release; it does not install from npm, a source archive, a mirror, or an unpinned branch.

Give the Agent this raw URL:

```text
https://raw.githubusercontent.com/Cusnd/agent-docs/main/AGENT_INSTALL.md
```

Suggested one-message instruction:

```text
Read and follow https://raw.githubusercontent.com/Cusnd/agent-docs/main/AGENT_INSTALL.md in full. Install Agent Docs v0.2.0. You are authorized to modify only Agent Docs marketplace and plugin state in the active Codex configuration root that you resolve and report, plus fresh operating-system temporary files. If the target is ambiguous or conflicting Agent Docs state already exists, stop and ask. Do not log in, call a model or AI inference API, read credentials, weaken a verification gate, or modify any unrelated configuration.
```

The words **MUST**, **MUST NOT**, and **STOP** below are binding. This document is an executable runbook for an Agent, not a shell script. The Agent must adapt path and quoting syntax to the detected operating system without weakening any gate.

## Machine-readable contract

The English and Chinese documents contain the same contract object. A repository check rejects drift between them.

<!-- agent-docs:install-contract:start -->

```json
{
  "schema_version": 1,
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

1. Resolve the Codex configuration root that the Codex subprocess will actually use. An explicitly supplied `CODEX_HOME` wins; otherwise use the active Codex CLI default. Do not set a persistent user or system environment variable.
2. Report that target to the user. The suggested instruction above explicitly authorizes the unambiguous active target. Any other instruction must name or clearly authorize a target before installation proceeds.
3. Confirm that writes are limited to newly created operating-system temporary files and Agent Docs marketplace/plugin state under that target.

The Agent MUST STOP without making a configuration change when any of these conditions holds:

- the target is missing, ambiguous, outside the user's authorization, or resolves through an unexpected link;
- a required command is missing, its current help does not support the required flags, or a login would be needed;
- an existing `agent-docs` marketplace or `agent-docs@agent-docs` plugin is conflicting, incomplete, or a different version;
- the release is missing, draft, prerelease, substituted, or has unexpected assets;
- a digest, checksum manifest, attestation, archive-path, file-count, trust-surface, install, or readback check fails.

If the exact `agent-docs@agent-docs` version `0.2.0` is already installed from the expected marketplace and readback is healthy, make no change and report idempotent success. Never upgrade, overwrite, remove, or repair an existing installation implicitly.

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

Apply the authorized configuration root only to the individual Codex subprocesses. Do not persistently change `CODEX_HOME`. Use the extracted top-level directory—the directory containing `.agents/`—as the Marketplace source:

```console
codex plugin marketplace add <extracted-top-level-directory> --json
codex plugin marketplace list --json
codex plugin add agent-docs@agent-docs --json
codex plugin list --json
```

Track whether this run successfully added the marketplace and plugin. The final readback MUST show marketplace `agent-docs`, installed selector `agent-docs@agent-docs`, and plugin version `0.2.0`. Treat warnings, ambiguous JSON, a different source/version, or a missing installed marker as failure.

If any post-write step fails, roll back only state created by this run, in reverse order:

```console
codex plugin remove agent-docs@agent-docs --json
codex plugin marketplace remove agent-docs --json
codex plugin list --json
codex plugin marketplace list --json
```

Never remove pre-existing state. If rollback cannot be proven complete, STOP and report the exact remaining Agent Docs state without retrying destructive commands blindly.

### 6. Finish without starting a model task

After successful readback, remove only the two fresh temporary directories after verifying that each resolves inside the operating system's temporary root. Do not recursively delete an unresolved variable, user directory, workspace, repository, or Codex configuration root.

Report a compact result containing:

- resolved and authorized Codex configuration target;
- release tag, archive digest, checksum result, and constrained attestation result;
- marketplace/plugin name and installed version from JSON readback;
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

Removing the plugin does not delete repository-owned `docs/agent` records. Review those records separately; never delete them as an implicit part of uninstalling the plugin.

## Scope and support

This entrypoint reduces installation to one Agent-readable URL, but the trust gates remain deliberate. It does not grant permission to change unrelated plugins, global environment settings, repositories, credentials, or the currently running Codex task. Support is best effort with no response, fix, or release SLA. See [INSTALL.md](INSTALL.md), [security and privacy](docs/security-model.md), and [troubleshooting](docs/troubleshooting.md).
