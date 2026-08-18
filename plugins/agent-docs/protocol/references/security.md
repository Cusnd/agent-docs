# Evidence and security boundary

[简体中文](security.zh-CN.md)

## Never store

- raw user prompts or full conversation transcripts;
- full assistant output or hidden reasoning;
- complete terminal captures when a compact result is sufficient;
- passwords, session cookies, authorization headers, API keys, private keys, tokens, recovery codes, or secret environment values;
- unnecessary personal data or unrelated repository content.
- user-directory paths, machine names, internal task or thread identifiers, private artifact URLs, temporary download URLs, or conversation provenance when records will be public.

The structural validator detects only obvious patterns. A passing scan is not proof that a document is safe.

## Safe evidence pattern

Prefer a reproducible reference over copied output:

```text
`node --test` — 18/18 tests passed; see tests/receipt.test.mjs.
```

For a failed check, preserve the useful boundary without dumping secrets:

```text
`npm test` — failed in receipt fallback assertion; no product files were rolled back.
```

For external systems, cite a non-secret artifact ID or user-visible URL only when authorized. Redact values rather than partially masking a token that remains reusable.

## Health records

Turn Receipts, locks, immutable Log Health event files, and the session index live under the current worktree's Git metadata. They may contain repository paths, branch/HEAD identifiers, model names, timestamps, and state hashes. They must not contain prompt content or secrets and are never committed by Agent Docs.

Before repository-document writes, Agent Docs rejects linked, reparse-point, or escaping parent paths and checks parents around the write. This cannot fully defend against another process with the same operating-system account that continuously races directory replacement.
