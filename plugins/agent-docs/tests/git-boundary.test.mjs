import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { git, inspectRepository } from "../scripts/lib/repo.mjs";
import { cleanupWork, createRepo, resetWork, workRoot } from "./helpers.mjs";

before(resetWork);
after(cleanupWork);

test("reports a missing Git executable distinctly from a non-repository", async () => {
  const original = process.env.PATH;
  process.env.PATH = "";
  try {
    const result = await inspectRepository(workRoot);
    assert.equal(result.eligible, false);
    assert.equal(result.reason, "git-not-found");
  } finally {
    process.env.PATH = original;
  }
});

test("terminates a timed-out Git subprocess with a stable error code", async () => {
  const repo = await createRepo("git-timeout");
  const slowProgram = path.join(workRoot, "slow-git-boundary.mjs");
  await writeFile(
    slowProgram,
    "await new Promise((resolve) => setTimeout(resolve, 3000));\n",
    "utf8",
  );
  assert.throws(
    () =>
      git(repo, [], {
        timeoutMs: 50,
        executable: process.execPath,
        prefixArgs: [slowProgram],
      }),
    (error) => error?.code === "GIT_TIMEOUT",
  );
});
