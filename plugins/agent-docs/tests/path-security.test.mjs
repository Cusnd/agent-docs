import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { cp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { cleanupWork, createRepo, jsonOutput, resetWork, runCli, workRoot } from "./helpers.mjs";

before(resetWork);
after(cleanupWork);

async function linkDirectory(target, link) {
  await symlink(target, link, process.platform === "win32" ? "junction" : "dir");
}

test("refuses initialization when docs/agent is a symlink or junction", async () => {
  const repo = await createRepo("path-agent-link");
  const outside = path.join(workRoot, "outside-agent-link");
  await mkdir(outside, { recursive: true });
  await mkdir(path.join(repo, "docs"), { recursive: true });
  await linkDirectory(outside, path.join(repo, "docs", "agent"));

  const result = runCli(repo, ["init"], { expectSuccess: false });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /symbolic link|junction|unsafe repository path/i);
  await assert.rejects(readFile(path.join(outside, "manifest.json"), "utf8"), /ENOENT/);
});

test("refuses a Work Session write through a linked sessions directory", async () => {
  const repo = await createRepo("path-session-link");
  runCli(repo, ["init"]);
  const requirement = jsonOutput(
    runCli(repo, [
      "requirement",
      "new",
      "--summary",
      "Keep Work Sessions inside the repository",
      "--criteria",
      "No external file is written.",
      "--next-step",
      "Exercise linked-directory rejection.",
    ]),
  );
  const outside = path.join(workRoot, "outside-session-link");
  await mkdir(outside, { recursive: true });
  const sessions = path.join(repo, "docs", "agent", "sessions");
  await rm(sessions, { recursive: true, force: true });
  await linkDirectory(outside, sessions);

  const result = runCli(
    repo,
    [
      "session",
      "new",
      "--requirements",
      requirement.id,
      "--goal",
      "Do not escape the repository",
      "--status",
      "Partial",
      "--change",
      "Exercise path containment.",
      "--file",
      "docs/agent/requirements.md",
      "--verification",
      "path containment",
      "--verification-result",
      "Passed",
      "--verification-evidence",
      "No external write is allowed.",
      "--result",
      "The write was rejected.",
      "--next-step",
      "Keep the repository path safe.",
    ],
    { expectSuccess: false },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /symbolic link|junction|unsafe repository path/i);
  assert.deepEqual(await readdir(outside), []);
});

test("refuses to replace requirements.md when the target file is a symbolic link", async () => {
  const repo = await createRepo("path-requirements-file-link");
  runCli(repo, ["init"]);
  const outside = path.join(workRoot, "outside-requirements.md");
  const requirements = path.join(repo, "docs", "agent", "requirements.md");
  await writeFile(outside, "outside sentinel\n", "utf8");
  await rm(requirements, { force: true });
  await symlink(outside, requirements, "file");

  const result = runCli(
    repo,
    [
      "requirement",
      "new",
      "--summary",
      "Do not follow a linked target",
      "--criteria",
      "The outside file is unchanged.",
    ],
    { expectSuccess: false },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /symbolic link|junction|unsafe repository path/i);
  assert.equal(await readFile(outside, "utf8"), "outside sentinel\n");
});

test("validator rejects an Agent Docs tree replaced by a symlink or junction", async () => {
  const repo = await createRepo("path-validator-link");
  runCli(repo, ["init"]);
  const agentDocs = path.join(repo, "docs", "agent");
  const outside = path.join(workRoot, "outside-validator-link");
  await cp(agentDocs, outside, { recursive: true });
  await rm(agentDocs, { recursive: true, force: true });
  await linkDirectory(outside, agentDocs);

  const result = runCli(repo, ["validate", "--json"], { expectSuccess: false });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /unsafe-path|symbolic link|junction/i);
});
