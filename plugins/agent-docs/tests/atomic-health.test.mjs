import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { after, before, test } from "node:test";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { inspectRepository } from "../scripts/lib/repo.mjs";
import { atomicWrite, metadataRoot } from "../scripts/lib/state.mjs";
import {
  cleanupWork,
  cli,
  createRepo,
  jsonOutput,
  resetWork,
  run,
  runCli,
  workRoot,
} from "./helpers.mjs";

before(resetWork);
after(cleanupWork);

function runHookAsync(repo, event, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, "hook", event], {
      cwd: repo,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`hook ${event} exited ${code}: ${stderr}\n${stdout}`));
    });
    child.stdin.end(JSON.stringify(input));
  });
}

test("cleans its unique temporary file when an atomic replacement fails", async () => {
  const parent = path.join(workRoot, "atomic-cleanup");
  const target = path.join(parent, "target.txt");
  await mkdir(target, { recursive: true });

  await assert.rejects(atomicWrite(target, "replacement"));
  const entries = await readdir(parent);
  assert.deepEqual(entries, ["target.txt"]);
});

test("keeps one complete value when two atomic writers race", async () => {
  const parent = path.join(workRoot, "atomic-writers");
  const target = path.join(parent, "target.txt");
  await mkdir(parent, { recursive: true });
  await writeFile(target, "original", "utf8");
  const left = `left-${"A".repeat(16_384)}`;
  const right = `right-${"B".repeat(16_384)}`;

  await Promise.all([atomicWrite(target, left), atomicWrite(target, right)]);

  assert.ok([left, right].includes(await readFile(target, "utf8")));
  assert.deepEqual(await readdir(parent), ["target.txt"]);
});

test("retries transient Windows-style rename failures with bounded backoff", async () => {
  const parent = path.join(workRoot, "atomic-transient-rename");
  const target = path.join(parent, "target.txt");
  await mkdir(parent, { recursive: true });
  let attempts = 0;
  await atomicWrite(target, "replacement", {
    renameOperation: async (source, destination) => {
      attempts += 1;
      if (attempts < 3) {
        const error = new Error("transient sharing violation");
        error.code = attempts === 1 ? "EPERM" : "EBUSY";
        throw error;
      }
      await rename(source, destination);
    },
    waitOperation: async () => {},
  });

  assert.equal(attempts, 3);
  assert.equal(await readFile(target, "utf8"), "replacement");
  assert.deepEqual(await readdir(parent), ["target.txt"]);
});

test("preserves the original and removes the temporary file after permanent rename failure", async () => {
  const parent = path.join(workRoot, "atomic-permanent-rename");
  const target = path.join(parent, "target.txt");
  await mkdir(parent, { recursive: true });
  await writeFile(target, "valid original", "utf8");
  const failure = Object.assign(new Error("persistent sharing violation"), { code: "EACCES" });

  await assert.rejects(
    atomicWrite(target, "invalid replacement", {
      renameOperation: async () => {
        throw failure;
      },
      waitOperation: async () => {},
    }),
    /persistent sharing violation/,
  );

  assert.equal(await readFile(target, "utf8"), "valid original");
  assert.deepEqual(await readdir(parent), ["target.txt"]);
});

test("records each concurrent Stop health warning as an immutable event", async () => {
  const repo = await createRepo("health-events");
  const inputs = Array.from({ length: 8 }, (_, index) => ({
    cwd: repo,
    session_id: `health-session-${index}`,
    turn_id: `${String(index + 1).padStart(8, "0")}-1111-7111-8111-${String(index + 1).padStart(12, "0")}`,
  }));
  for (const input of inputs) {
    run(process.execPath, [cli, "hook", "user-prompt-submit"], {
      cwd: repo,
      input: JSON.stringify(input),
    });
  }

  await Promise.all(
    inputs.map((input) => runHookAsync(repo, "stop", { ...input, stop_hook_active: true })),
  );

  const inspected = await inspectRepository(repo);
  const healthDirectory = path.join(metadataRoot(inspected), "health");
  const names = (await readdir(healthDirectory)).sort();
  assert.equal(names.length, inputs.length);
  assert.ok(names.every((name) => name.endsWith(".json")));
  const records = await Promise.all(
    names.map(async (name) => JSON.parse(await readFile(path.join(healthDirectory, name), "utf8"))),
  );
  assert.equal(new Set(records.map((record) => record.identity)).size, inputs.length);
  const status = jsonOutput(runCli(repo, ["status", "--json"]));
  assert.equal(status.data.health.count, inputs.length);
  assert.equal(status.data.health.invalid_files, 0);
});
