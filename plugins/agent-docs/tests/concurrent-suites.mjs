import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rounds = 3;

function runBase(label) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--test", "--test-concurrency=1"], {
      cwd: packageRoot,
      env: { ...process.env, AGENT_DOCS_TEST_PROCESS: label },
      stdio: ["ignore", "pipe", "pipe"],
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
    child.on("error", (error) => resolve({ label, code: null, stdout, stderr, error }));
    child.on("close", (code) => resolve({ label, code, stdout, stderr, error: null }));
  });
}

for (let round = 1; round <= rounds; round += 1) {
  const results = await Promise.all([runBase(`round-${round}-a`), runBase(`round-${round}-b`)]);
  const failed = results.filter((result) => result.code !== 0 || result.error);
  if (failed.length) {
    const detail = failed
      .map((result) => {
        const output = `${result.stderr}\n${result.stdout}`.trim().slice(-4000);
        return `${result.label}: ${result.error?.message ?? `exit ${result.code}`}\n${output}`;
      })
      .join("\n\n");
    throw new Error(`Concurrent base suites failed in round ${round}.\n${detail}`);
  }
}

console.log(`Concurrent test isolation passed: ${rounds} rounds, 2 suites per round.`);
