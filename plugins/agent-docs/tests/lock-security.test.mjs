import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFile, stat, writeFile } from "node:fs/promises";
import { inspectRepository } from "../scripts/lib/repo.mjs";
import { acquireRequirementsLock, releaseRequirementsLock } from "../scripts/lib/state.mjs";
import { cleanupWork, createRepo, resetWork } from "./helpers.mjs";

before(resetWork);
after(cleanupWork);

test("uses acquisition tokens so a stale owner cannot release its successor", async () => {
  const directory = await createRepo("lock-late-release");
  const repo = await inspectRepository(directory);
  const first = await acquireRequirementsLock(repo, "writer-a");
  assert.equal(first.acquired, true);
  assert.match(first.token, /^[0-9a-f]{32}$/);

  const ownerFile = first.lock;
  assert.equal((await stat(ownerFile)).isFile(), true);
  const record = JSON.parse(await readFile(ownerFile, "utf8"));
  record.acquired_at = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await writeFile(ownerFile, `${JSON.stringify(record, null, 2)}\n`, "utf8");

  const successor = await acquireRequirementsLock(repo, "writer-b");
  assert.equal(successor.acquired, true);
  assert.equal(successor.reclaimed, true);
  assert.notEqual(successor.token, first.token);

  await assert.rejects(
    releaseRequirementsLock(repo, "writer-a", first.token),
    /held by writer-b|token does not match/,
  );
  const conflict = await acquireRequirementsLock(repo, "writer-c");
  assert.equal(conflict.acquired, false);
  assert.equal(conflict.owner, "writer-b");
  assert.equal((await releaseRequirementsLock(repo, "writer-b", successor.token)).released, true);
});

test("allows only one concurrent stale-lock reclaimer", async () => {
  const directory = await createRepo("lock-concurrent-reclaim");
  const repo = await inspectRepository(directory);
  const original = await acquireRequirementsLock(repo, "stale-writer");
  const ownerFile = original.lock;
  const record = JSON.parse(await readFile(ownerFile, "utf8"));
  record.acquired_at = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await writeFile(ownerFile, `${JSON.stringify(record, null, 2)}\n`, "utf8");

  const results = await Promise.all([
    acquireRequirementsLock(repo, "reclaimer-a"),
    acquireRequirementsLock(repo, "reclaimer-b"),
  ]);
  const acquired = results.filter((result) => result.acquired);
  assert.equal(acquired.length, 1);
  assert.equal(acquired[0].reclaimed, true);
  await releaseRequirementsLock(repo, acquired[0].owner, acquired[0].token);
});
