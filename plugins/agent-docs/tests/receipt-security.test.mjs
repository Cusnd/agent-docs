import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  cleanupWork,
  createRepo,
  jsonOutput,
  resetWork,
  run,
  runCli,
  cli,
  workRoot,
} from "./helpers.mjs";
import { hashAgentDocs, inspectRepository } from "../scripts/lib/repo.mjs";
import { loadReceipt, metadataRoot, receiptPath, resolveReceipt } from "../scripts/lib/state.mjs";

before(resetWork);
after(cleanupWork);

const TURN_ID = "11111111-1111-7111-8111-111111111111";

test("rejects a malformed Work Session ID before resolving a Receipt path", async () => {
  const repo = await createRepo("receipt-session-id");
  const submitted = jsonOutput(
    run(process.execPath, [cli, "hook", "user-prompt-submit"], {
      cwd: repo,
      input: JSON.stringify({
        cwd: repo,
        session_id: "session-receipt-path",
        turn_id: TURN_ID,
      }),
    }),
  );
  assert.match(submitted.hookSpecificOutput.additionalContext, new RegExp(TURN_ID));
  runCli(repo, ["init"]);

  const result = runCli(
    repo,
    ["receipt", "resolve", "--turn-id", TURN_ID, "--state", "closed", "--session", "../../outside"],
    { expectSuccess: false },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid Work Session ID/);
});

test("rejects a malformed Receipt ID before looking up Git metadata", async () => {
  const repo = await createRepo("receipt-turn-id");
  const result = runCli(
    repo,
    ["receipt", "resolve", "--turn-id", "../../outside", "--state", "not-material"],
    { expectSuccess: false },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid Receipt ID/);
});

test("creates a schema v2 Receipt in worktree-specific Git metadata", async () => {
  const repo = await createRepo("receipt-schema-v2");
  run(process.execPath, [cli, "hook", "user-prompt-submit"], {
    cwd: repo,
    input: JSON.stringify({
      cwd: repo,
      session_id: "session-schema-v2",
      turn_id: TURN_ID,
    }),
  });

  const inspected = await inspectRepository(repo);
  const receipt = await loadReceipt(inspected, TURN_ID);
  assert.equal(receipt.schema_version, 2);
  assert.equal(typeof receipt.baseline_control_hash, "string");
  assert.equal(Object.hasOwn(receipt, "baseline_docs_hash"), false);
  assert.equal(typeof receipt.repository_fingerprint, "string");
  assert.equal(typeof receipt.worktree_fingerprint, "string");
  assert.equal(metadataRoot(inspected), `${inspected.gitDir}${path.sep}agent-docs`);
});

test("normalizes hexadecimal Receipt IDs without creating case-sensitive aliases", async () => {
  const repo = await createRepo("receipt-case-normalization");
  const upper = "AAAAAAAA-AAAA-7AAA-8AAA-AAAAAAAAAAAA";
  run(process.execPath, [cli, "hook", "user-prompt-submit"], {
    cwd: repo,
    input: JSON.stringify({ cwd: repo, session_id: "receipt-case", turn_id: upper }),
  });
  const inspected = await inspectRepository(repo);
  const receipt = await loadReceipt(inspected, upper);
  assert.equal(receipt.identity, upper.toLowerCase());
  const resolved = jsonOutput(
    runCli(repo, ["receipt", "resolve", "--turn-id", upper, "--state", "not-material"]),
  );
  assert.equal(resolved.identity, upper.toLowerCase());
});

test("keeps the original Receipt baseline when UserPromptSubmit is repeated", async () => {
  const repo = await createRepo("receipt-idempotent-submit");
  const input = JSON.stringify({
    cwd: repo,
    session_id: "session-idempotent-submit",
    turn_id: TURN_ID,
  });
  run(process.execPath, [cli, "hook", "user-prompt-submit"], { cwd: repo, input });
  const inspected = await inspectRepository(repo);
  const first = await loadReceipt(inspected, TURN_ID);

  runCli(repo, ["init"]);
  run(process.execPath, [cli, "hook", "user-prompt-submit"], { cwd: repo, input });
  const second = await loadReceipt(inspected, TURN_ID);

  assert.equal(second.created_at, first.created_at);
  assert.equal(second.baseline_control_hash, first.baseline_control_hash);
  const result = runCli(
    repo,
    ["receipt", "resolve", "--turn-id", TURN_ID, "--state", "not-material"],
    { expectSuccess: false },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /changed during this turn/);
});

test("makes Receipt terminal transitions immutable and identical retries idempotent", async () => {
  const repo = await createRepo("receipt-terminal-state");
  runCli(repo, ["init"]);
  const requirement = jsonOutput(
    runCli(repo, [
      "requirement",
      "new",
      "--summary",
      "Keep terminal receipts immutable",
      "--criteria",
      "Receipt retries are idempotent.",
      "--next-step",
      "Exercise the Receipt state machine.",
    ]),
  );
  const session = jsonOutput(
    runCli(repo, [
      "session",
      "new",
      "--requirements",
      requirement.id,
      "--goal",
      "Provide a valid alternative Work Session",
      "--status",
      "Partial",
      "--change",
      "Prepared state-machine evidence.",
      "--file",
      "docs/agent/requirements.md",
      "--verification",
      "state-machine setup",
      "--verification-result",
      "Passed",
      "--verification-evidence",
      "A valid linked Work Session exists.",
      "--result",
      "Setup completed.",
      "--next-step",
      "Run the Receipt transition assertions.",
    ]),
  );
  run(process.execPath, [cli, "hook", "user-prompt-submit"], {
    cwd: repo,
    input: JSON.stringify({ cwd: repo, session_id: "terminal-state", turn_id: TURN_ID }),
  });

  const first = jsonOutput(
    runCli(repo, ["receipt", "resolve", "--turn-id", TURN_ID, "--state", "not-material"]),
  );
  const retried = jsonOutput(
    runCli(repo, ["receipt", "resolve", "--turn-id", TURN_ID, "--state", "not-material"]),
  );
  assert.equal(retried.updated_at, first.updated_at);

  const rewrite = runCli(
    repo,
    ["receipt", "resolve", "--turn-id", TURN_ID, "--state", "closed", "--session", session.id],
    { expectSuccess: false },
  );
  assert.notEqual(rewrite.status, 0);
  assert.match(rewrite.stderr, /already resolved/);
});

test("serializes competing terminal Receipt transitions so only one can win", async () => {
  const directory = await createRepo("receipt-competing-terminal-writers");
  run(process.execPath, [cli, "hook", "user-prompt-submit"], {
    cwd: directory,
    input: JSON.stringify({ cwd: directory, session_id: "competing-writers", turn_id: TURN_ID }),
  });
  const requirement = jsonOutput(runCli(directory, ["init", "--json"]));
  assert.equal(requirement.data.initialized, true);
  const created = jsonOutput(
    runCli(directory, [
      "requirement",
      "new",
      "--id",
      "R-20260818-120000-ABCD",
      "--summary",
      "Serialize terminal transitions",
      "--criteria",
      "Only one terminal transition wins.",
      "--next-step",
      "Race two closures.",
    ]),
  );
  const repo = await inspectRepository(directory);
  const closedAt = new Date(Date.now() + 1_000).toISOString();
  const closure = (session) => ({
    session,
    closedAt,
    status: "Partial",
    requirements: [created.id],
  });
  const results = await Promise.allSettled([
    resolveReceipt(repo, TURN_ID, "closed", closure("S-20260818-120001-AAAA")),
    resolveReceipt(repo, TURN_ID, "closed", closure("S-20260818-120002-BBBB")),
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.match(
    results.find((result) => result.status === "rejected").reason.message,
    /already resolved/,
  );
  const persisted = await loadReceipt(repo, TURN_ID);
  assert.ok(["S-20260818-120001-AAAA", "S-20260818-120002-BBBB"].includes(persisted.session));
});

test("requires a material Agent Docs change before closing a Receipt", async () => {
  const repo = await createRepo("receipt-material-change");
  runCli(repo, ["init"]);
  const requirement = jsonOutput(
    runCli(repo, [
      "requirement",
      "new",
      "--summary",
      "Require material closure evidence",
      "--criteria",
      "A valid Work Session exists.",
      "--next-step",
      "Verify the closure gate.",
    ]),
  );
  const session = jsonOutput(
    runCli(repo, [
      "session",
      "new",
      "--requirements",
      requirement.id,
      "--goal",
      "Prepare pre-existing evidence",
      "--status",
      "Partial",
      "--change",
      "Created before the Receipt baseline.",
      "--file",
      "docs/agent/requirements.md",
      "--verification",
      "fixture setup",
      "--verification-result",
      "Passed",
      "--verification-evidence",
      "The fixture validates.",
      "--result",
      "Fixture prepared.",
      "--next-step",
      "Attempt closure without further changes.",
    ]),
  );
  run(process.execPath, [cli, "hook", "user-prompt-submit"], {
    cwd: repo,
    input: JSON.stringify({ cwd: repo, session_id: "material-change", turn_id: TURN_ID }),
  });

  const result = runCli(
    repo,
    ["receipt", "resolve", "--turn-id", TURN_ID, "--state", "closed", "--session", session.id],
    { expectSuccess: false },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /did not change during this turn/);
});

test("rejects a Work Session created before the current Turn Receipt", async () => {
  const repo = await createRepo("receipt-current-session");
  runCli(repo, ["init"]);
  const requirement = jsonOutput(
    runCli(repo, [
      "requirement",
      "new",
      "--summary",
      "Bind closure evidence to the current turn",
      "--criteria",
      "A pre-existing Work Session cannot close a later Receipt.",
      "--next-step",
      "Exercise the freshness gate.",
    ]),
  );
  const oldSession = jsonOutput(
    runCli(repo, [
      "session",
      "new",
      "--requirements",
      requirement.id,
      "--goal",
      "Create evidence before the Receipt",
      "--status",
      "Partial",
      "--change",
      "Prepared an intentionally stale Work Session.",
      "--file",
      "docs/agent/requirements.md",
      "--verification",
      "fixture setup",
      "--verification-result",
      "Passed",
      "--verification-evidence",
      "The stale Session exists.",
      "--result",
      "The fixture is ready.",
      "--next-step",
      "Reject it as current-turn evidence.",
    ]),
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  run(process.execPath, [cli, "hook", "user-prompt-submit"], {
    cwd: repo,
    input: JSON.stringify({ cwd: repo, session_id: "current-session", turn_id: TURN_ID }),
  });
  const requirementsFile = path.join(repo, "docs", "agent", "requirements.md");
  const content = await readFile(requirementsFile, "utf8");
  await writeFile(
    requirementsFile,
    content.replace("- **Status:** Todo", "- **Status:** In Progress"),
    "utf8",
  );

  const rejected = runCli(
    repo,
    ["receipt", "resolve", "--turn-id", TURN_ID, "--state", "closed", "--session", oldSession.id],
    { expectSuccess: false },
  );
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /predates this Turn Receipt/);
});

test("isolates Receipts per linked worktree and rejects copied metadata", async () => {
  const repo = await createRepo("receipt-worktree-main");
  const linked = path.join(workRoot, "receipt-worktree-linked");
  run("git", ["worktree", "add", "--quiet", "-b", "receipt-linked", linked], { cwd: repo });
  const mainRepo = await inspectRepository(repo);
  const linkedRepo = await inspectRepository(linked);
  assert.notEqual(metadataRoot(mainRepo), metadataRoot(linkedRepo));

  run(process.execPath, [cli, "hook", "user-prompt-submit"], {
    cwd: repo,
    input: JSON.stringify({ cwd: repo, session_id: "main-worktree", turn_id: TURN_ID }),
  });
  run(process.execPath, [cli, "hook", "user-prompt-submit"], {
    cwd: linked,
    input: JSON.stringify({ cwd: linked, session_id: "linked-worktree", turn_id: TURN_ID }),
  });
  const mainReceipt = await loadReceipt(mainRepo, TURN_ID);
  const linkedReceipt = await loadReceipt(linkedRepo, TURN_ID);
  assert.notEqual(mainReceipt.worktree_fingerprint, linkedReceipt.worktree_fingerprint);

  const copiedId = "22222222-2222-7222-8222-222222222222";
  run(process.execPath, [cli, "hook", "user-prompt-submit"], {
    cwd: repo,
    input: JSON.stringify({ cwd: repo, session_id: "copied-worktree", turn_id: copiedId }),
  });
  const source = receiptPath(mainRepo, copiedId);
  const destination = receiptPath(linkedRepo, copiedId);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);

  const rejected = runCli(
    linked,
    ["receipt", "resolve", "--turn-id", copiedId, "--state", "not-material"],
    { expectSuccess: false },
  );
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /different repository or worktree/);
});

test("finds the latest session Receipt through an index without scanning unrelated files", async () => {
  const repo = await createRepo("receipt-session-index");
  const sessionId = "session-index-fixture";
  const submitted = jsonOutput(
    run(process.execPath, [cli, "hook", "user-prompt-submit"], {
      cwd: repo,
      input: JSON.stringify({ cwd: repo, session_id: sessionId }),
    }),
  );
  assert.match(
    submitted.hookSpecificOutput.additionalContext,
    /Turn Receipt [0-9a-f-]+ is pending/,
  );
  const inspected = await inspectRepository(repo);
  const receipts = path.join(metadataRoot(inspected), "receipts");
  await writeFile(path.join(receipts, "unrelated-corrupt.json"), "not json", "utf8");

  const stopped = jsonOutput(
    run(process.execPath, [cli, "hook", "stop"], {
      cwd: repo,
      input: JSON.stringify({ cwd: repo, session_id: sessionId, stop_hook_active: false }),
    }),
  );
  assert.equal(stopped.decision, "block");
});

test("reads a repository-bound schema v1 Receipt without rewriting it in place", async () => {
  const repo = await createRepo("receipt-schema-v1");
  run(process.execPath, [cli, "hook", "user-prompt-submit"], {
    cwd: repo,
    input: JSON.stringify({ cwd: repo, session_id: "schema-v1", turn_id: TURN_ID }),
  });
  const inspected = await inspectRepository(repo);
  const file = receiptPath(inspected, TURN_ID);
  const receipt = JSON.parse(await readFile(file, "utf8"));
  receipt.schema_version = 1;
  receipt.baseline_docs_hash = await hashAgentDocs(repo);
  delete receipt.baseline_control_hash;
  delete receipt.repository_fingerprint;
  delete receipt.worktree_fingerprint;
  await writeFile(file, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");

  const resolved = jsonOutput(
    runCli(repo, ["receipt", "resolve", "--turn-id", TURN_ID, "--state", "not-material"]),
  );
  assert.equal(resolved.schema_version, 1);
  assert.equal(resolved.state, "not-material");
  const persisted = JSON.parse(await readFile(file, "utf8"));
  assert.equal(persisted.schema_version, 1);
});

test("creates and resolves a worktree-bound Receipt in an unborn repository", async () => {
  const repo = path.join(workRoot, "receipt-unborn");
  await mkdir(repo, { recursive: true });
  run("git", ["init", "--quiet", repo]);
  const input = { cwd: repo, session_id: "unborn-session", turn_id: TURN_ID };
  run(process.execPath, [cli, "hook", "user-prompt-submit"], {
    cwd: repo,
    input: JSON.stringify(input),
  });

  const inspected = await inspectRepository(repo);
  assert.equal(inspected.head, "UNBORN");
  const receipt = await loadReceipt(inspected, TURN_ID);
  assert.equal(receipt.start_head, "UNBORN");
  const resolved = jsonOutput(
    runCli(repo, ["receipt", "resolve", "--turn-id", TURN_ID, "--state", "not-material"]),
  );
  assert.equal(resolved.state, "not-material");
});
