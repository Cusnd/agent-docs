# Agent Docs repository schema

[简体中文](schema.zh-CN.md)

## Topology

```text
docs/agent/
  manifest.json
  requirements.md
  sessions/YYYY-MM/S-YYYYMMDD-HHMMSS-XXXX.md
  decisions/D-YYYYMMDD-HHMM-XXXX.md
  archive/requirements/YYYY.md
```

All timestamps are UTC ISO 8601. IDs use uppercase alphanumeric random suffixes.

## Schema Manifest

`manifest.json` has exactly the operational metadata needed to recognize the format:

```json
{
  "schema_version": 1,
  "initialized_at": "2026-08-11T12:34:56.789Z",
  "generator": "agent-docs",
  "generator_version": "0.2.0"
}
```

## Active Requirement

Keep each Requirement between its generated start/end markers. Required metadata and section order:

```markdown
<!-- agent-docs:req:R-20260811-123456-A1B2:start -->

### R-20260811-123456-A1B2: Observable outcome

- **Created:** 2026-08-11T12:34:56.789Z
- **Updated:** 2026-08-11T12:40:00.000Z
- **Summary:** Observable outcome
- **Priority:** P2
- **Status:** In Progress
- **Supersedes:** None

#### Acceptance Criteria

- [x] A reviewer can reproduce the primary behavior.
- [ ] The failure path has a passing regression test.

#### Evidence

- `npm test` — primary path passes; failure-path test remains.

#### Next Step

Add and run the failure-path regression test.

#### Related Sessions

- S-20260811-124500-C3D4

<!-- agent-docs:req:R-20260811-123456-A1B2:end -->
```

Clarifications update this record. Never create one Requirement per user message.

## Recently Closed and archive

Recently Closed is a six-column Markdown table containing at most 20 rows, newest first:

```markdown
| ID    | Closed (UTC)             | Status | Summary | Evidence          | Session |
| ----- | ------------------------ | ------ | ------- | ----------------- | ------- |
| R-... | 2026-08-11T13:00:00.000Z | Done   | Outcome | `npm test` passed | S-...   |
```

Only `Done`, `Dropped`, and `Superseded` are valid here. Older rows move unchanged to the matching `archive/requirements/YYYY.md`; archives are append-only.

## Work Session

Use one file per material Root Agent episode. Required metadata:

- `Closed`, `Requirements`, `Status`, `Branch`, `Start HEAD`, `End HEAD`, and `Executor`.
- Status is exactly `Done`, `Partial`, `Blocked`, or `Failed`.
- At least one Requirement ID is required.

Required sections, in compact form:

- `Goal`
- `Changes`
- `Files`
- `Verification` with Check, Result, and Evidence columns
- `Result`
- `Commit`
- `Next Step`

Do not create `Log Only` sessions. A no-op turn resolves its receipt as not material.

## Durable Decision

Create a Decision only when the choice is costly to reverse, surprising without rationale, and has a real trade-off. Required metadata: `Date`, `Status`, `Requirements`, `Supersedes`. Required sections: `Context`, `Decision`, `Trade-offs`, `Consequences`.

Allowed Decision statuses are `Proposed`, `Accepted`, `Superseded`, and `Deprecated`. A Decision must reference at least one Requirement.

## Validator boundary

The validator checks schema version, exact marker count and order, marker/file ID agreement, required fields, allowed status and priority values, ID/filename formats, recent-row limit, sorting and archive year, cross-references and reference types, unresolved template tokens, Done evidence and closing-Session gates, Markdown table escaping, linked-path safety, and obvious secret patterns. The Root Agent remains responsible for whether prose and evidence are true, sufficient, and safe to publish.

Repository documents remain schema version 1 in v0.2.0. Receipt schema is separate local runtime metadata: newly created Receipts use schema v2, while schema v1 is read-only compatible and is never bulk-rewritten.
