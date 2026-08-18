import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { cleanupWork, createRepo, jsonOutput, resetWork, runCli } from "./helpers.mjs";

before(resetWork);
after(cleanupWork);

function parseEscapedTableRow(row) {
  const cells = [];
  let current = "";
  let escaped = false;
  for (const character of row.trim().replace(/^\|/, "").replace(/\|$/, "")) {
    if (escaped) {
      current += character;
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (character === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  return cells;
}

test("rejects malformed and missing Requirement references before creating records", async () => {
  const repo = await createRepo("validator-prewrite-references");
  runCli(repo, ["init"]);

  const malformed = runCli(
    repo,
    ["session", "new", "--requirements", "../../outside", "--goal", "Reject malformed references"],
    { expectSuccess: false },
  );
  assert.notEqual(malformed.status, 0);
  assert.match(malformed.stderr, /Invalid Requirement ID/);

  const missingId = "R-20260818-120000-ABCD";
  const missing = runCli(
    repo,
    ["decision", "new", "--requirements", missingId, "--title", "Do not create dangling records"],
    { expectSuccess: false },
  );
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /Referenced Requirement not found/);

  const sessionFiles = await readdir(path.join(repo, "docs", "agent", "sessions"));
  const decisionFiles = await readdir(path.join(repo, "docs", "agent", "decisions"));
  assert.deepEqual(sessionFiles, []);
  assert.deepEqual(decisionFiles, []);
});

test("does not allow a Partial Work Session to close a Requirement as Done", async () => {
  const repo = await createRepo("validator-done-session-status");
  runCli(repo, ["init"]);
  const requirement = jsonOutput(
    runCli(repo, [
      "requirement",
      "new",
      "--summary",
      "Require successful completion evidence",
      "--criteria",
      "The success path is verified.",
      "--next-step",
      "Complete the success path.",
    ]),
  );
  const session = jsonOutput(
    runCli(repo, [
      "session",
      "new",
      "--requirements",
      requirement.id,
      "--goal",
      "Record incomplete work",
      "--status",
      "Partial",
      "--change",
      "Only part of the outcome is complete.",
      "--file",
      "docs/agent/requirements.md",
      "--verification",
      "partial check",
      "--verification-result",
      "Partial",
      "--verification-evidence",
      "The success path is not complete.",
      "--result",
      "More work remains.",
      "--next-step",
      "Finish the success path.",
    ]),
  );
  const requirementsFile = path.join(repo, "docs", "agent", "requirements.md");
  let content = await readFile(requirementsFile, "utf8");
  content = content
    .replace("- [ ] The success path is verified.", "- [x] The success path is verified.")
    .replace("- None yet.", "- `node --test` — the assertion was exercised.")
    .replace("- None yet.\n<!-- agent-docs:req:", `- ${session.id}\n<!-- agent-docs:req:`);
  await writeFile(requirementsFile, content, "utf8");

  const result = runCli(
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
      "A partial Session cannot prove Done.",
    ],
    { expectSuccess: false },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must have status Done/);
});

test("reports malformed Requirement markers instead of silently ignoring them", async () => {
  const repo = await createRepo("validator-malformed-marker");
  runCli(repo, ["init"]);
  const requirementsFile = path.join(repo, "docs", "agent", "requirements.md");
  let content = await readFile(requirementsFile, "utf8");
  content = content.replace(
    "<!-- agent-docs:active:end -->",
    "<!-- agent-docs:req:not-a-valid-id:start -->\n<!-- agent-docs:active:end -->",
  );
  await writeFile(requirementsFile, content, "utf8");

  const result = runCli(repo, ["validate", "--json"], { expectSuccess: false });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /requirement-marker-syntax/);
});

test("rejects duplicate, nested, and out-of-order marker structures", async () => {
  const fixtures = [
    {
      name: "duplicate",
      transform: (content) =>
        content.replace(
          "<!-- agent-docs:active:start -->",
          "<!-- agent-docs:active:start -->\n<!-- agent-docs:active:start -->",
        ),
      code: "marker-count",
    },
    {
      name: "nested",
      transform: (content) =>
        content.replace(
          "<!-- agent-docs:active:end -->",
          "<!-- agent-docs:req:R-20260818-120000-AAAA:start -->\n" +
            "<!-- agent-docs:req:R-20260818-120001-BBBB:start -->\n" +
            "<!-- agent-docs:req:R-20260818-120001-BBBB:end -->\n" +
            "<!-- agent-docs:req:R-20260818-120000-AAAA:end -->\n" +
            "<!-- agent-docs:active:end -->",
        ),
      code: "requirement-marker-nesting",
    },
    {
      name: "order",
      transform: (content) =>
        content
          .replace("<!-- agent-docs:active:end -->", "ORDER_PLACEHOLDER")
          .replace("<!-- agent-docs:closed:start -->", "<!-- agent-docs:active:end -->")
          .replace("ORDER_PLACEHOLDER", "<!-- agent-docs:closed:start -->"),
      code: "marker-order",
    },
    {
      name: "trailing-content",
      transform: (content) =>
        content.replace(
          "<!-- agent-docs:active:end -->",
          "<!-- agent-docs:req:R-20260818-120000-AAAA:start --> trailing\n" +
            "<!-- agent-docs:active:end -->",
        ),
      code: "requirement-marker-syntax",
    },
    {
      name: "unterminated",
      transform: (content) =>
        content.replace(
          "<!-- agent-docs:active:end -->",
          "<!-- agent-docs:req:R-20260818-120000-AAAA:start\n" + "<!-- agent-docs:active:end -->",
        ),
      code: "requirement-marker-syntax",
    },
  ];

  for (const fixture of fixtures) {
    const repo = await createRepo(`validator-marker-${fixture.name}`);
    runCli(repo, ["init"]);
    const file = path.join(repo, "docs", "agent", "requirements.md");
    await writeFile(file, fixture.transform(await readFile(file, "utf8")), "utf8");
    const result = runCli(repo, ["validate", "--json"], { expectSuccess: false });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, new RegExp(fixture.code));
  }
});

test("rejects wrong-type and malformed references even when another reference is valid", async () => {
  const repo = await createRepo("validator-strict-reference-types");
  runCli(repo, ["init"]);
  const requirement = jsonOutput(
    runCli(repo, [
      "requirement",
      "new",
      "--summary",
      "Validate every reference token",
      "--criteria",
      "Wrong record types are rejected.",
      "--next-step",
      "Inject mixed reference lists.",
    ]),
  );
  const session = jsonOutput(
    runCli(repo, [
      "session",
      "new",
      "--requirements",
      requirement.id,
      "--goal",
      "Create a valid Session before corrupting its references",
      "--status",
      "Partial",
      "--change",
      "Prepared a strict-reference fixture.",
      "--file",
      "docs/agent/requirements.md",
      "--verification",
      "fixture setup",
      "--verification-result",
      "Passed",
      "--verification-evidence",
      "The baseline record validates.",
      "--result",
      "Fixture ready.",
      "--next-step",
      "Run strict reference validation.",
    ]),
  );
  const decision = jsonOutput(
    runCli(repo, [
      "decision",
      "new",
      "--requirements",
      requirement.id,
      "--title",
      "Create a valid Decision fixture",
      "--context",
      "The validator needs a concrete file.",
      "--decision",
      "Validate every reference token.",
      "--trade-offs",
      "The format is intentionally strict.",
      "--consequences",
      "Wrong record types fail validation.",
    ]),
  );
  const sessionFile = path.join(
    repo,
    "docs",
    "agent",
    "sessions",
    `${session.id.slice(2, 6)}-${session.id.slice(6, 8)}`,
    `${session.id}.md`,
  );
  await writeFile(
    sessionFile,
    (await readFile(sessionFile, "utf8")).replace(
      `- **Requirements:** ${requirement.id}`,
      `- **Requirements:** ${requirement.id}, ${session.id}, R-20260818-120000-ABCD.md`,
    ),
    "utf8",
  );
  const decisionFile = path.join(repo, "docs", "agent", "decisions", `${decision.id}.md`);
  await writeFile(
    decisionFile,
    (await readFile(decisionFile, "utf8")).replace(
      "- **Supersedes:** None",
      `- **Supersedes:** ${requirement.id}`,
    ),
    "utf8",
  );

  const result = runCli(repo, ["validate", "--json"], { expectSuccess: false });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /reference-type/);
  assert.match(result.stdout, /reference-format/);
});

test("prevalidates add, close, and archive targets without leaving half-updated Requirements", async () => {
  const repo = await createRepo("validator-prewrite-transaction");
  runCli(repo, ["init"]);
  const requirement = jsonOutput(
    runCli(repo, [
      "requirement",
      "new",
      "--summary",
      "Preserve malformed input for repair",
      "--criteria",
      "A rejected operation leaves the file byte-identical.",
      "--next-step",
      "Corrupt the generated marker structure.",
    ]),
  );
  const session = jsonOutput(
    runCli(repo, [
      "session",
      "new",
      "--requirements",
      requirement.id,
      "--goal",
      "Create closure evidence",
      "--status",
      "Partial",
      "--change",
      "Prepared a prewrite fixture.",
      "--file",
      "docs/agent/requirements.md",
      "--verification",
      "fixture setup",
      "--verification-result",
      "Passed",
      "--verification-evidence",
      "The fixture exists.",
      "--result",
      "Fixture ready.",
      "--next-step",
      "Reject writes against malformed input.",
    ]),
  );
  const file = path.join(repo, "docs", "agent", "requirements.md");
  const malformed = (await readFile(file, "utf8")).replace(
    "<!-- agent-docs:active:start -->",
    "<!-- agent-docs:active:start -->\n<!-- agent-docs:active:start -->",
  );
  await writeFile(file, malformed, "utf8");

  const operations = [
    ["requirement", "new", "--summary", "Must not be appended"],
    [
      "requirement",
      "close",
      "--id",
      requirement.id,
      "--status",
      "Dropped",
      "--session",
      session.id,
      "--evidence",
      "Must not be recorded",
    ],
    ["archive", "--json"],
  ];
  for (const operation of operations) {
    const result = runCli(repo, operation, { expectSuccess: false });
    assert.notEqual(result.status, 0);
    assert.equal(await readFile(file, "utf8"), malformed);
  }
});

test("validates archive year placement and oldest-first append order", async () => {
  const repo = await createRepo("validator-archive-order");
  runCli(repo, ["init"]);
  const archiveDirectory = path.join(repo, "docs", "agent", "archive", "requirements");
  await mkdir(archiveDirectory, { recursive: true });
  const archive = [
    "# Agent Requirements Archive 2026",
    "",
    "<!-- agent-docs:archive:start -->",
    "| ID | Closed (UTC) | Status | Summary | Evidence | Session |",
    "| --- | --- | --- | --- | --- | --- |",
    "| R-20250102-120000-AAAA | 2025-01-02T12:00:00.000Z | Done | Later | check | S-20250102-120000-AAAA |",
    "| R-20250101-120000-BBBB | 2025-01-01T12:00:00.000Z | Done | Earlier | check | S-20250101-120000-BBBB |",
    "<!-- agent-docs:archive:end -->",
    "",
  ].join("\n");
  await writeFile(path.join(archiveDirectory, "2026.md"), archive, "utf8");

  const result = runCli(repo, ["validate", "--json"], { expectSuccess: false });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /archive-year/);
  assert.match(result.stdout, /archive-order/);
});

test("validator rejects a Done row backed by a non-Done Work Session", async () => {
  const repo = await createRepo("validator-done-row-session");
  runCli(repo, ["init"]);
  const requirement = jsonOutput(
    runCli(repo, [
      "requirement",
      "new",
      "--summary",
      "Validate closed completion evidence",
      "--criteria",
      "Completion has successful evidence.",
      "--next-step",
      "Create a non-Done Session fixture.",
    ]),
  );
  const session = jsonOutput(
    runCli(repo, [
      "session",
      "new",
      "--requirements",
      requirement.id,
      "--goal",
      "Record an incomplete result",
      "--status",
      "Partial",
      "--change",
      "The result remains incomplete.",
      "--file",
      "docs/agent/requirements.md",
      "--verification",
      "fixture",
      "--verification-result",
      "Partial",
      "--verification-evidence",
      "The fixture is intentionally incomplete.",
      "--result",
      "Incomplete.",
      "--next-step",
      "Reject a false Done row.",
    ]),
  );
  runCli(repo, [
    "requirement",
    "close",
    "--id",
    requirement.id,
    "--status",
    "Dropped",
    "--session",
    session.id,
    "--evidence",
    "Dropped fixture.",
  ]);
  const requirementsFile = path.join(repo, "docs", "agent", "requirements.md");
  let content = await readFile(requirementsFile, "utf8");
  content = content
    .replace(`| ${requirement.id} |`, `| ${requirement.id} |`)
    .replace("| Dropped |", "| Done |");
  await writeFile(requirementsFile, content, "utf8");

  const result = runCli(repo, ["validate", "--json"], { expectSuccess: false });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /done-session-status/);
});

test("round-trips backslashes pipes Unicode CRLF and long text in closed table cells", async () => {
  const repo = await createRepo("validator-table-escaping");
  runCli(repo, ["init"]);
  const summary = `Preserve C:\\repo\\|marker and 中文 😀 ${"长".repeat(2_048)}`;
  const evidence = "line one | line two\r\nline three\nline four";
  const requirement = jsonOutput(
    runCli(repo, [
      "requirement",
      "new",
      "--summary",
      summary,
      "--criteria",
      "The table value round-trips.",
      "--next-step",
      "Close the Requirement.",
    ]),
  );
  const session = jsonOutput(
    runCli(repo, [
      "session",
      "new",
      "--requirements",
      requirement.id,
      "--goal",
      "Verify table serialization",
      "--status",
      "Done",
      "--change",
      "Exercised special characters.",
      "--file",
      "docs/agent/requirements.md",
      "--verification",
      "table round-trip",
      "--verification-result",
      "Passed",
      "--verification-evidence",
      "Special characters are preserved.",
      "--result",
      "The serialization behavior is complete.",
      "--next-step",
      "No follow-up required.",
    ]),
  );
  const requirementsFile = path.join(repo, "docs", "agent", "requirements.md");
  let content = await readFile(requirementsFile, "utf8");
  content = content
    .replace("- [ ] The table value round-trips.", "- [x] The table value round-trips.")
    .replace("- None yet.", "- `node --test` — table round-trip passed.")
    .replace("- None yet.\n<!-- agent-docs:req:", `- ${session.id}\n<!-- agent-docs:req:`);
  await writeFile(requirementsFile, content, "utf8");

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
    evidence,
  ]);
  const validation = runCli(repo, ["validate", "--json"], { expectSuccess: false });
  assert.equal(validation.status, 0, validation.stdout || validation.stderr);
  const closed = await readFile(requirementsFile, "utf8");
  const row = closed.split(/\r?\n/).find((line) => line.startsWith(`| ${requirement.id} |`));
  const cells = parseEscapedTableRow(row);
  assert.equal(cells.length, 6);
  assert.equal(cells[3], summary);
  assert.equal(cells[4], "line one | line two line three line four");
});
