import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { addRequirement, createDecision, createSession } from "../scripts/lib/documents.mjs";
import { inspectRepository } from "../scripts/lib/repo.mjs";
import { createPendingReceipt, metadataRoot } from "../scripts/lib/state.mjs";
import { cleanupWork, createRepo, jsonOutput, packageRoot, resetWork, runCli } from "./helpers.mjs";

before(resetWork);
after(cleanupWork);

const validRequirement = "R-20260818-120000-ABCD";
const validSession = "S-20260818-120000-ABCD";
const validDecision = "D-20260818-1200-ABCD";
const validReceipt = "11111111-1111-7111-8111-111111111111";

function invalidVariants(valid) {
  return [
    `../${valid}`,
    `C:\\workspace\\${valid}`,
    `/workspace/${valid}`,
    `${valid}/child`,
    `${valid}\\child`,
    `${valid}%2f..%2foutside`,
    valid.replaceAll("-", "－"),
    `${valid}／outside`,
    `${valid}.md`,
    `X${valid}`,
    `${valid}TRAILING`,
  ];
}

test("rejects path-like, encoded, Unicode-confusable, prefixed, and suffixed record IDs", async () => {
  const directory = await createRepo("strict-record-ids");
  runCli(directory, ["init"]);
  const repo = await inspectRepository(directory);
  const requirement = jsonOutput(
    runCli(directory, [
      "requirement",
      "new",
      "--id",
      validRequirement,
      "--summary",
      "Anchor strict ID tests",
      "--criteria",
      "Every invalid ID is rejected.",
      "--next-step",
      "Exercise each record type.",
    ]),
  );
  assert.equal(requirement.id, validRequirement);

  for (const id of invalidVariants(validRequirement)) {
    await assert.rejects(
      addRequirement(repo, {
        id,
        summary: "Must not be written",
        criteria: ["The invalid ID is rejected."],
      }),
      /Invalid Requirement ID/,
    );
  }
  for (const id of invalidVariants(validSession)) {
    await assert.rejects(
      createSession(repo, packageRoot, {
        id,
        requirements: [validRequirement],
        goal: "Must not be written",
      }),
      /Invalid Work Session ID/,
    );
  }
  for (const id of invalidVariants(validDecision)) {
    await assert.rejects(
      createDecision(repo, packageRoot, {
        id,
        requirements: [validRequirement],
        title: "Must not be written",
      }),
      /Invalid Decision ID/,
    );
  }
  for (const id of invalidVariants(validReceipt)) {
    await assert.rejects(
      createPendingReceipt(repo, { turn_id: id, session_id: "strict-id-fixture" }),
      /Invalid Receipt ID/,
    );
  }

  assert.deepEqual(await readdir(path.join(directory, "docs", "agent", "sessions")), []);
  assert.deepEqual(await readdir(path.join(directory, "docs", "agent", "decisions")), []);
  const receipts = path.join(metadataRoot(repo), "receipts");
  await assert.rejects(readdir(receipts), /ENOENT/);
});

test("validates Supersedes references before constructing generated paths", async () => {
  const directory = await createRepo("strict-supersedes");
  runCli(directory, ["init"]);
  const repo = await inspectRepository(directory);
  await addRequirement(repo, {
    id: validRequirement,
    summary: "Anchor supersession tests",
    criteria: ["Supersedes points to an existing record of the correct type."],
  });

  await assert.rejects(
    addRequirement(repo, {
      id: "R-20260818-120001-ABCD",
      summary: "Reject a path-like superseded Requirement",
      supersedes: `../${validRequirement}`,
    }),
    /Invalid Requirement ID/,
  );
  await assert.rejects(
    createDecision(repo, packageRoot, {
      id: validDecision,
      requirements: [validRequirement],
      title: "Reject a missing superseded Decision",
      supersedes: "D-20260818-1159-WXYZ",
    }),
    /Referenced Decision not found/,
  );
});
