import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { formatId } from "../scripts/lib/documents.mjs";
import { inspectRepository } from "../scripts/lib/repo.mjs";
import {
  acquireRequirementsLock,
  loadReceipt,
  releaseRequirementsLock,
} from "../scripts/lib/state.mjs";
import {
  cleanupWork,
  cli,
  createRepo,
  jsonOutput,
  packageRoot,
  resetWork,
  run,
  runCli,
} from "./helpers.mjs";

const WORKFLOW_RECEIPT = "33333333-3333-7333-8333-333333333333";

before(resetWork);
after(cleanupWork);

test("allocates stable UTC ID shapes", () => {
  const date = new Date("2026-08-11T12:34:56.789Z");
  assert.equal(formatId("requirement", date, "A1B2"), "R-20260811-123456-A1B2");
  assert.equal(formatId("session", date, "C3D4"), "S-20260811-123456-C3D4");
  assert.equal(formatId("decision", date, "E5F6"), "D-20260811-1234-E5F6");
});

test("uses hook-only activation with no registered Skill", async () => {
  const manifest = JSON.parse(
    await readFile(path.join(packageRoot, ".codex-plugin", "plugin.json"), "utf8"),
  );
  assert.equal(Object.hasOwn(manifest, "skills"), false);
  await assert.rejects(
    readFile(path.join(packageRoot, "skills", "agent-docs", "SKILL.md"), "utf8"),
    /ENOENT/,
  );
  assert.match(
    await readFile(path.join(packageRoot, "protocol", "PROTOCOL.md"), "utf8"),
    /^# Agent Docs Hook Protocol/,
  );
  const hooks = JSON.parse(await readFile(path.join(packageRoot, "hooks", "hooks.json"), "utf8"));
  assert.deepEqual(
    Object.keys(hooks.hooks).sort(),
    ["Stop", "SubagentStart", "UserPromptSubmit"].sort(),
  );
  assert.doesNotMatch(JSON.stringify(hooks), /\$agent-docs/);
});

test("activates only for eligible top-level worktrees", async () => {
  const repo = await createRepo("eligibility");
  assert.equal((await inspectRepository(repo)).eligible, true);

  await writeFile(path.join(repo, ".agent-docs-disable"), "", "utf8");
  assert.equal((await inspectRepository(repo)).reason, "opted-out");

  const source = await createRepo("submodule-source");
  const parent = await createRepo("submodule-parent");
  run(
    "git",
    ["-c", "protocol.file.allow=always", "submodule", "add", "--quiet", source, "nested"],
    { cwd: parent },
  );
  assert.equal((await inspectRepository(path.join(parent, "nested"))).reason, "git-submodule");
});

test("enforces Acceptance Criteria, records a Work Session, and validates closure", async () => {
  const repo = await createRepo("workflow");
  run(process.execPath, [cli, "hook", "user-prompt-submit"], {
    cwd: repo,
    input: JSON.stringify({ cwd: repo, session_id: "workflow-session", turn_id: WORKFLOW_RECEIPT }),
  });
  assert.equal(jsonOutput(runCli(repo, ["init", "--json"])).data.initialized, true);
  assert.equal(runCli(repo, ["validate"]).status, 0);

  const requirement = jsonOutput(
    runCli(repo, [
      "requirement",
      "new",
      "--summary",
      "Deliver verified behavior",
      "--criteria",
      "Primary behavior passes an automated test.",
      "--criteria",
      "Failure behavior passes an automated test.",
      "--next-step",
      "Implement and verify both behaviors.",
      "--turn-id",
      "workflow-turn",
    ]),
  );

  const session = jsonOutput(
    runCli(repo, [
      "session",
      "new",
      "--requirements",
      requirement.id,
      "--goal",
      "Verify both behavior paths",
      "--status",
      "Done",
      "--change",
      "Implemented both paths.",
      "--file",
      "src/example.js",
      "--verification",
      "node --test",
      "--verification-result",
      "Passed",
      "--verification-evidence",
      "2/2 tests passed.",
      "--result",
      "Both acceptance paths passed.",
      "--next-step",
      "No follow-up required.",
    ]),
  );

  const premature = runCli(
    repo,
    [
      "requirement",
      "close",
      "--id",
      requirement.id,
      "--status",
      "Done",
      "--session",
      session.id,
      "--evidence",
      "node --test passed.",
      "--turn-id",
      "workflow-turn",
    ],
    { expectSuccess: false },
  );
  assert.equal(premature.status, 1);
  assert.match(premature.stderr, /every Acceptance Criterion/);

  const requirementsFile = path.join(repo, "docs", "agent", "requirements.md");
  let content = await readFile(requirementsFile, "utf8");
  content = content
    .replace("- **Status:** Todo", "- **Status:** In Progress")
    .replaceAll("- [ ]", "- [x]")
    .replace(
      "- None yet.\n\n#### Next Step",
      "- `node --test` — 2/2 tests passed.\n\n#### Next Step",
    )
    .replace("Implement and verify both behaviors.", "No follow-up required.")
    .replace("- None yet.\n<!-- agent-docs:req:", `- ${session.id}\n<!-- agent-docs:req:`);
  await writeFile(requirementsFile, content, "utf8");

  assert.equal(
    runCli(repo, [
      "requirement",
      "close",
      "--id",
      requirement.id,
      "--status",
      "Done",
      "--session",
      session.id,
      "--evidence",
      "node --test: 2/2 passed.",
      "--turn-id",
      "workflow-turn",
    ]).status,
    0,
  );

  const decision = jsonOutput(
    runCli(repo, [
      "decision",
      "new",
      "--requirements",
      requirement.id,
      "--title",
      "Use one portable runtime",
      "--context",
      "Two shell implementations would drift across platforms.",
      "--decision",
      "Use dependency-free Node.js 20 or later.",
      "--trade-offs",
      "Adds a runtime prerequisite while removing duplicated mechanics.",
      "--consequences",
      "All platforms share one implementation and test surface.",
    ]),
  );
  assert.match(decision.id, /^D-/);

  const validation = runCli(repo, ["validate", "--json"]);
  assert.equal(validation.status, 0);
  assert.equal(jsonOutput(validation).data.valid, true);
  const receipt = jsonOutput(
    runCli(repo, [
      "receipt",
      "resolve",
      "--turn-id",
      WORKFLOW_RECEIPT,
      "--state",
      "closed",
      "--session",
      session.id,
    ]),
  );
  assert.equal(receipt.state, "closed");
  assert.equal(receipt.session, session.id);
});

test("keeps receipts and one-pass Stop recovery in Git metadata", async () => {
  const repo = await createRepo("receipts");
  const prompt = {
    cwd: repo,
    session_id: "session-receipt",
    model: "gpt-5.6-sol",
  };
  const submitted = run(process.execPath, [cli, "hook", "user-prompt-submit"], {
    cwd: repo,
    input: JSON.stringify(prompt),
  });
  const submittedContext = jsonOutput(submitted).hookSpecificOutput.additionalContext;
  assert.match(submittedContext, /pending/);
  assert.match(submittedContext, /protocol[\\/]PROTOCOL\.md/);
  assert.doesNotMatch(submittedContext, /\$agent-docs/);
  const receiptIdentity = submittedContext.match(/Turn Receipt (.+?) is pending/)?.[1];
  assert.ok(receiptIdentity);
  assert.equal(await readFile(path.join(repo, "README.md"), "utf8"), "# Disposable fixture\n");

  const inspected = await inspectRepository(repo);
  assert.equal((await loadReceipt(inspected, receiptIdentity)).state, "pending");
  const blocked = jsonOutput(
    run(process.execPath, [cli, "hook", "stop"], {
      cwd: repo,
      input: JSON.stringify({ ...prompt, stop_hook_active: false }),
    }),
  );
  assert.equal(blocked.decision, "block");

  const allowed = jsonOutput(
    run(process.execPath, [cli, "hook", "stop"], {
      cwd: repo,
      input: JSON.stringify({ ...prompt, stop_hook_active: true }),
    }),
  );
  assert.match(allowed.systemMessage, /Log Health Warning/);
  const closed = await loadReceipt(inspected, receiptIdentity);
  assert.equal(closed.state, "closed");
  assert.equal(closed.resolution, "health-warning");
  const healthFiles = await readdir(path.join(inspected.commonDir, "agent-docs", "health"));
  assert.equal(healthFiles.length, 1);
  assert.equal((await inspectRepository(repo)).eligible, true);
});

test("injects single-writer context only when a subagent starts", async () => {
  const repo = await createRepo("hook-context");
  const subagentStart = jsonOutput(
    run(process.execPath, [cli, "hook", "subagent-start"], {
      cwd: repo,
      input: JSON.stringify({ cwd: repo, session_id: "session-context", agent_id: "child" }),
    }),
  );
  assert.match(subagentStart.hookSpecificOutput.additionalContext, /single-writer rule/);
  await assert.rejects(
    readFile(path.join(repo, "docs", "agent", "manifest.json"), "utf8"),
    /ENOENT/,
  );
});

test("resolves non-material turns without initializing repository docs", async () => {
  const repo = await createRepo("not-material");
  const input = { cwd: repo, session_id: "session-chat" };
  const submitted = jsonOutput(
    run(process.execPath, [cli, "hook", "user-prompt-submit"], {
      cwd: repo,
      input: JSON.stringify(input),
    }),
  );
  const receiptIdentity = submitted.hookSpecificOutput.additionalContext.match(
    /Turn Receipt (.+?) is pending/,
  )?.[1];
  assert.ok(receiptIdentity);
  const resolved = jsonOutput(
    runCli(repo, ["receipt", "resolve", "--turn-id", receiptIdentity, "--state", "not-material"]),
  );
  assert.equal(resolved.state, "not-material");
  await assert.rejects(
    readFile(path.join(repo, "docs", "agent", "manifest.json"), "utf8"),
    /ENOENT/,
  );
});

test("serializes requirements writers and archives overflow", async () => {
  const repo = await createRepo("lock-archive");
  runCli(repo, ["init"]);
  const inspected = await inspectRepository(repo);
  const writerA = await acquireRequirementsLock(inspected, "writer-a");
  assert.equal(writerA.acquired, true);
  const conflict = await acquireRequirementsLock(inspected, "writer-b");
  assert.equal(conflict.acquired, false);
  await releaseRequirementsLock(inspected, "writer-a", writerA.token);
  const writerB = await acquireRequirementsLock(inspected, "writer-b");
  assert.equal(writerB.acquired, true);
  await releaseRequirementsLock(inspected, "writer-b", writerB.token);

  const requirementsFile = path.join(repo, "docs", "agent", "requirements.md");
  let content = await readFile(requirementsFile, "utf8");
  const rows = [];
  for (let index = 0; index < 21; index += 1) {
    const second = String(59 - index).padStart(2, "0");
    const suffix = `A${String(index).padStart(3, "0")}`;
    const req = `R-20260811-1234${second}-${suffix}`;
    const session = `S-20260811-1334${second}-${suffix}`;
    rows.push(
      `| ${req} | 2026-08-11T12:34:${second}.000Z | Done | Outcome ${index} | check passed | ${session} |`,
    );
  }
  content = content.replace(
    "| --- | --- | --- | --- | --- | --- |\n<!-- agent-docs:closed:end -->",
    `| --- | --- | --- | --- | --- | --- |\n${rows.join("\n")}\n<!-- agent-docs:closed:end -->`,
  );
  await writeFile(requirementsFile, content, "utf8");
  const archived = jsonOutput(runCli(repo, ["archive", "--turn-id", "archive-turn", "--json"]));
  assert.equal(archived.data.archived, 1);
  const recent = await readFile(requirementsFile, "utf8");
  assert.equal((recent.match(/^\| R-/gm) || []).length, 20);
  const archive = await readFile(
    path.join(repo, "docs", "agent", "archive", "requirements", "2026.md"),
    "utf8",
  );
  assert.equal((archive.match(/^\| R-/gm) || []).length, 1);
});

test("reports obvious secret patterns without echoing the secret", async () => {
  const repo = await createRepo("secret-scan");
  runCli(repo, ["init"]);
  const requirementsFile = path.join(repo, "docs", "agent", "requirements.md");
  const secret = ["sk", "proj", "ABCDEFGHIJKLMNOPQRSTUVWXYZ012345"].join("-");
  let content = await readFile(requirementsFile, "utf8");
  content = content.replace("This file is", `Unsafe ${secret}\n\nThis file is`);
  await writeFile(requirementsFile, content, "utf8");
  const validation = runCli(repo, ["validate", "--json"], { expectSuccess: false });
  assert.equal(validation.status, 1);
  assert.match(validation.stdout, /secret-pattern/);
  assert.doesNotMatch(validation.stdout, new RegExp(secret));
});
