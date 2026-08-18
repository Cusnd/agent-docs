# CLI reference

[简体中文](cli.zh-CN.md)

Agent Docs v0.2.0 promises compatibility only for the operator commands on this page. Invoke the bundled runtime as `node plugins/agent-docs/scripts/agent-docs.mjs` during repository development; an installed plugin's hook context supplies its absolute CLI path.

## Stable commands

### `agent-docs --help`

Prints usage and the stable/internal boundary to stdout. Exit `0`.

### `agent-docs --version`

Prints only the semantic version. Exit `0`.

### `agent-docs init [--json]`

Creates the Agent Docs control documents when absent. Repeating it is safe and reports that initialization already exists.

### `agent-docs status [--turn-id UUID] [--json]`

Reports repository eligibility, branch, HEAD, local Log Health aggregation, and optionally one Receipt. The UUID is validated before any path use.

### `agent-docs validate [--json]`

Performs full history, schema, generated-marker, cross-reference, lifecycle, archive, secret-pattern, and safe-path validation. This command intentionally does more work than hook hot paths.

### `agent-docs archive [--json]`

Moves Recently Closed overflow to year-specific append-only archives while holding the Requirements lock.

All four operator commands accept `--cwd <repository>` as a development/testing convenience, but installed operators normally run them from the repository.

## JSON contract

With `--json`, stdout contains exactly one JSON object and diagnostics go to stderr. Success has `data`; failure has `error`; they are mutually exclusive.

```json
{
  "schema_version": 1,
  "command": "validate",
  "ok": true,
  "data": {
    "valid": true
  }
}
```

```json
{
  "schema_version": 1,
  "command": "validate",
  "ok": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Agent Docs validation failed."
  }
}
```

Consumers must ignore unknown object fields for forward-compatible additions, but may rely on the envelope fields, mutual exclusion, and exit codes.

## Exit codes

| Code | Meaning                                               |
| ---- | ----------------------------------------------------- |
| `0`  | Success                                               |
| `1`  | Repository documents or lifecycle state are invalid   |
| `2`  | Arguments or configuration are invalid                |
| `3`  | Git, lock, or filesystem operation failed transiently |
| `4`  | Unexpected internal failure                           |

Git probe errors distinguish `GIT_NOT_FOUND`, `NOT_GIT_REPOSITORY`, `GIT_TIMEOUT`, dubious ownership, and ordinary Git failure when structured output applies.

## Internal commands

Requirement, Session, Decision, Receipt, Lock, and ID commands are used by hooks and the protocol. Their options and raw JSON are not stable before 1.0. They are not a JavaScript API and are not separately published.
