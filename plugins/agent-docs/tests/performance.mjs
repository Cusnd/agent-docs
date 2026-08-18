import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
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

const SESSION_COUNT = 1_000;
const RECEIPT_COUNT = 5_000;
const SAMPLE_COUNT = 20;

function percentile95(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * 0.95) - 1];
}

function sessionDocument(id, requirementId, head) {
  return `# ${id}: Performance sample

- **Closed:** 2026-08-18T00:00:00.000Z
- **Requirements:** ${requirementId}
- **Status:** Done
- **Branch:** main
- **Start HEAD:** ${head}
- **End HEAD:** ${head}
- **Executor:** Performance generator

## Goal

Exercise complete-history validation at a realistic upper sample.

## Changes

- Generated one immutable Work Session fixture.

## Files

- docs/agent/requirements.md

## Verification

| Check | Result | Evidence |
| --- | --- | --- |
| Fixture generation | Pass | Deterministic session structure. |

## Result

The generated session is structurally valid.

## Commit

Not applicable.

## Next Step

No follow-up required.
`;
}

async function inBatches(count, batchSize, operation) {
  for (let start = 0; start < count; start += batchSize) {
    await Promise.all(
      Array.from({ length: Math.min(batchSize, count - start) }, (_, offset) =>
        operation(start + offset),
      ),
    );
  }
}

await resetWork();
try {
  const repo = await createRepo("performance");
  jsonOutput(runCli(repo, ["init", "--json"]));
  const requirement = jsonOutput(
    runCli(repo, [
      "requirement",
      "new",
      "--summary",
      "Provide performance validation fixtures",
      "--criteria",
      "History validation remains bounded.",
      "--turn-id",
      "performance-generator",
    ]),
  );
  const head = run("git", ["rev-parse", "HEAD"], { cwd: repo }).stdout.trim();

  const sessions = path.join(repo, "docs", "agent", "sessions", "2026-08");
  await mkdir(sessions, { recursive: true });
  await inBatches(SESSION_COUNT, 50, async (index) => {
    const id = `S-20260818-${String(index).padStart(6, "0")}-${index.toString(36).padStart(4, "0").toUpperCase()}`;
    await writeFile(
      path.join(sessions, `${id}.md`),
      sessionDocument(id, requirement.id, head),
      "utf8",
    );
  });

  const receiptDirectory = path.join(repo, ".git", "agent-docs", "receipts");
  await mkdir(receiptDirectory, { recursive: true });
  await inBatches(RECEIPT_COUNT, 100, async (index) => {
    await writeFile(
      path.join(receiptDirectory, `historical-${String(index).padStart(5, "0")}.json`),
      `${JSON.stringify({ schema_version: 2, state: "closed", identity: randomUUID() })}\n`,
      "utf8",
    );
  });

  const promptDurations = [];
  const stopDurations = [];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    const turn = randomUUID();
    const input = { cwd: repo, session_id: `performance-${index}`, turn_id: turn };
    let started = performance.now();
    run(process.execPath, [cli, "hook", "user-prompt-submit"], {
      cwd: repo,
      input: JSON.stringify(input),
    });
    promptDurations.push(performance.now() - started);

    started = performance.now();
    const result = jsonOutput(
      run(process.execPath, [cli, "hook", "stop"], {
        cwd: repo,
        input: JSON.stringify({ ...input, stop_hook_active: false }),
      }),
    );
    if (result.decision !== "block")
      throw new Error("Stop performance sample did not find its receipt.");
    stopDurations.push(performance.now() - started);
  }

  const validationStarted = performance.now();
  const validation = runCli(repo, ["validate", "--json"]);
  const validationDuration = performance.now() - validationStarted;
  if (validation.status !== 0)
    throw new Error(`Generated history is invalid: ${validation.stdout}`);

  const promptP95 = percentile95(promptDurations);
  const stopP95 = percentile95(stopDurations);
  if (promptP95 >= 5_000)
    throw new Error(`UserPromptSubmit p95 ${promptP95.toFixed(1)}ms exceeds 50% of timeout.`);
  if (stopP95 >= 7_500) throw new Error(`Stop p95 ${stopP95.toFixed(1)}ms exceeds 50% of timeout.`);
  console.log(
    JSON.stringify(
      {
        sessions: SESSION_COUNT,
        historical_receipts: RECEIPT_COUNT,
        samples: SAMPLE_COUNT,
        user_prompt_submit_p95_ms: Number(promptP95.toFixed(1)),
        stop_p95_ms: Number(stopP95.toFixed(1)),
        full_validate_ms: Number(validationDuration.toFixed(1)),
        plugin_root: path.relative(repo, packageRoot).replaceAll(path.sep, "/"),
      },
      null,
      2,
    ),
  );
} finally {
  await cleanupWork();
}
