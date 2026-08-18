# Agent Docs Hook Protocol

[简体中文](PROTOCOL.zh-CN.md)

Maintain compact operational memory that a future Agent can trust without replaying the conversation. Record outcomes and evidence, never a transcript.

## Non-negotiable contract

- The Root Agent is the sole semantic writer. Subagents return concise evidence; they do not edit `docs/agent` or Agent Docs Git metadata.
- A Requirement is `Done` only when every Acceptance Criterion is satisfied and cited by concrete evidence. No evidence means not Done.
- Write Acceptance Criteria before the first material implementation step. User-supplied criteria take precedence.
- Never store raw prompts, complete assistant output, full terminal captures, secrets, credentials, or hidden reasoning.
- Update logs during normal work, but commit them only when the user has already authorized a commit. Never create a log-only commit automatically.
- Logging failure does not block, roll back, or reclassify the product Requirement. Report it as Log Health only.

## Locate the CLI

The CLI is `scripts/agent-docs.mjs` at the plugin root, next to this `protocol/` directory. Run it with a supported Node.js release (`^22.0.0 || ^24.0.0 || ^26.0.0`):

```text
node <plugin-root>/scripts/agent-docs.mjs <command>
```

Hook context normally supplies the absolute CLI path and Turn Receipt identity. Use the exact values from that context.

## Classify the turn

Treat the turn as material when it changes a Requirement's state, evidence, risk, or next step. A read-only diagnosis is material when it produces reusable evidence or a concrete next step. Pure explanation, chat, status repetition, and true no-op work are not material.

For a non-material turn, resolve the receipt without creating repository files:

```text
node <cli> receipt resolve --turn-id <receipt> --state not-material
```

## Execute material work

1. Run `init` only if `docs/agent/manifest.json` is absent. Read `manifest.json`, `requirements.md`, and any linked Session or Decision before editing.
2. Reuse the current Requirement for clarification or scope refinement. Create a linked new Requirement only for a separately verifiable outcome; use a new Requirement plus `Superseded` for replacement.
3. Before implementation, ensure the Requirement has specific checkbox Acceptance Criteria, priority, status, and next step. Default priority is `P2`; use `P0` only when the user explicitly sets it or a production emergency is verified.
4. For manual `requirements.md` edits, acquire the repository lock with the receipt identity, retain its acquisition token, reread the file, edit, then release that exact token in a `finally`-equivalent path. CLI `requirement new`, `requirement close`, and `archive` already lock and retry once.
5. Perform the work and verification. Keep exact commands plus compact result summaries and file or artifact references. Do not paste full output.
6. Update the Requirement's status, checked criteria, evidence, next step, and linked Work Session. Keep terminal Requirements out of Active.
7. Create exactly one compact Work Session for the material root-agent episode. Use only `Done`, `Partial`, `Blocked`, or `Failed`.
8. Create a Decision only if the choice is costly to reverse, surprising without context, and based on a real trade-off. All three conditions are required.
9. Run `archive`, then `validate`. Correct every structural error before making a completion claim.
10. Close the Turn Receipt with `--state closed --session <S-ID>`. Continue through this step autonomously; changed code alone is not completion.

## Stop repair

The Stop hook may block once when a receipt remains pending. On that single repair pass, follow this protocol, either complete the material workflow or mark the turn not material, validate if material, and resolve the receipt. If the retry still fails, allow Stop, report the Log Health Warning, and leave product state unchanged.

## Read references only as needed

- Read [lifecycle.md](references/lifecycle.md) for classification, status transitions, concurrency, Stop behavior, and commit boundaries.
- Read [schema.md](references/schema.md) before creating or repairing repository records.
- Read [security.md](references/security.md) when deciding whether evidence is safe to store.
- Templates under `assets/templates/` are copied by `init`; do not hand-copy them unless repairing a damaged initialization.
