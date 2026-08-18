import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cleanupWork, cli, createRepo, jsonOutput, resetWork, run, runCli } from "./helpers.mjs";

before(resetWork);
after(cleanupWork);

test("exposes the stable v0.2.0 operator commands with JSON envelopes", async () => {
  const version = run(process.execPath, [cli, "--version"]);
  assert.equal(version.stdout.trim(), "0.2.0");

  const repo = await createRepo("cli-envelope");
  const initialized = jsonOutput(runCli(repo, ["init", "--json"]));
  assert.deepEqual(Object.keys(initialized).sort(), ["command", "data", "ok", "schema_version"]);
  assert.equal(initialized.schema_version, 1);
  assert.equal(initialized.command, "init");
  assert.equal(initialized.ok, true);
  assert.equal(initialized.data.initialized, true);

  for (const command of ["status", "validate", "archive"]) {
    const result = runCli(repo, [command, "--json"]);
    assert.equal(result.stderr, "");
    const envelope = jsonOutput(result);
    assert.equal(envelope.schema_version, 1);
    assert.equal(envelope.command, command);
    assert.equal(envelope.ok, true);
    assert.ok(Object.hasOwn(envelope, "data"));
    assert.equal(Object.hasOwn(envelope, "error"), false);
  }
});

test("returns a JSON error envelope and exit 1 for invalid Agent Docs", async () => {
  const repo = await createRepo("cli-validation-error");
  runCli(repo, ["init"]);
  const requirements = path.join(repo, "docs", "agent", "requirements.md");
  const content = await readFile(requirements, "utf8");
  await writeFile(
    requirements,
    content.replace("agent-docs:active:start", "agent-docs:active:broken"),
    "utf8",
  );

  const result = runCli(repo, ["validate", "--json"], { expectSuccess: false });
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  const envelope = jsonOutput(result);
  assert.equal(envelope.ok, false);
  assert.equal(envelope.command, "validate");
  assert.equal(envelope.error.code, "VALIDATION_FAILED");
  assert.ok(Array.isArray(envelope.error.issues));
  assert.equal(Object.hasOwn(envelope, "data"), false);
});

test("uses exit 2 for an invalid stable-command invocation", async () => {
  const repo = await createRepo("cli-usage-error");
  const result = runCli(repo, ["status", "--unknown-option"], { expectSuccess: false });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /unknown option/i);
});

test("uses exit 1 and one JSON envelope when archive finds invalid project records", async () => {
  const repo = await createRepo("cli-archive-project-error");
  runCli(repo, ["init"]);
  const requirements = path.join(repo, "docs", "agent", "requirements.md");
  await writeFile(
    requirements,
    (await readFile(requirements, "utf8")).replace(
      "<!-- agent-docs:active:start -->",
      "<!-- agent-docs:active:start -->\n<!-- agent-docs:active:start -->",
    ),
    "utf8",
  );

  const result = runCli(repo, ["archive", "--json"], { expectSuccess: false });
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "");
  const envelope = jsonOutput(result);
  assert.equal(envelope.command, "archive");
  assert.equal(envelope.ok, false);
  assert.equal(Object.hasOwn(envelope, "data"), false);
  assert.ok(envelope.error.message.includes("marker"));
});
