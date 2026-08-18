# Lifecycle rules

[简体中文](lifecycle.zh-CN.md)

## Requirement states

| State         | Meaning                                      | Normal next states                                     |
| ------------- | -------------------------------------------- | ------------------------------------------------------ |
| `Todo`        | Outcome is accepted but work has not started | `In Progress`, `Deferred`, `Dropped`, `Superseded`     |
| `In Progress` | Material execution is underway               | `Done`, `Blocked`, `Deferred`, `Dropped`, `Superseded` |
| `Blocked`     | A named external condition prevents progress | `In Progress`, `Dropped`, `Superseded`                 |
| `Deferred`    | Work is intentionally postponed              | `Todo`, `In Progress`, `Dropped`, `Superseded`         |
| `Done`        | All acceptance and evidence rules are met    | Terminal                                               |
| `Dropped`     | Outcome is no longer pursued                 | Terminal                                               |
| `Superseded`  | A newer Requirement replaces this one        | Terminal                                               |

IDs are never reused. A terminal Requirement is not reopened. Create a new Requirement and link the relationship.

## Session states

- `Done`: this Session's goal and checks completed; it may close a `Done` Requirement when all Requirement criteria are also met.
- `Partial`: useful work completed, but the intended result is incomplete.
- `Blocked`: a named outside condition prevents completion.
- `Failed`: the attempted execution did not produce a usable result.

Session status describes the execution, not the Requirement's desirability. Never upgrade status to make validation pass.

## Receipt states

```text
pending --material change + valid Done/other Session--> closed
pending --no Agent Docs control change--------------> not-material
pending --second Stop pass--------------------------> closed (health-warning)
```

The health-warning transition protects product work after one repair attempt; it does not claim documentation success. Terminal rewrites, cross-worktree closure, and Session substitution are invalid.

## Archive rules

Recently Closed contains at most 20 newest rows. Overflow rows are appended oldest first to `docs/agent/archive/requirements/YYYY.md`, where `YYYY` matches the closure timestamp. The archive is append-only. Before any Requirement or archive write, the target documents are constructed and validated in memory; a failed validation must not leave a partial update.
