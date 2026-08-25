import { randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nativeTempRoot = os.tmpdir();
const nonce = `${process.pid}-${randomBytes(6).toString("hex")}`;
const workBase = path.join(nativeTempRoot, "agent-docs-test-workspaces");
export const workRoot = path.join(workBase, nonce);
const runtimeTemp = path.join(nativeTempRoot, "agent-docs-runtime-temp", nonce);
process.env.TEMP = runtimeTemp;
process.env.TMP = runtimeTemp;
process.env.TMPDIR = runtimeTemp;
export const cli = path.join(packageRoot, "scripts", "agent-docs.mjs");

function ensureSafeWorkPath(target) {
  const relative = path.relative(workRoot, path.resolve(target));
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Unsafe test work path: ${target}`);
  }
}

function ensureNativeTemporaryPath(target) {
  const relative = path.relative(nativeTempRoot, path.resolve(target));
  if (relative.startsWith("..") || path.isAbsolute(relative) || relative === "") {
    throw new Error(`Unsafe native temporary path: ${target}`);
  }
}

export async function resetWork() {
  ensureSafeWorkPath(workRoot);
  ensureNativeTemporaryPath(workRoot);
  ensureNativeTemporaryPath(runtimeTemp);
  await rm(workRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await rm(runtimeTemp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await mkdir(workRoot, { recursive: true });
  await mkdir(runtimeTemp, { recursive: true });
}

export async function cleanupWork() {
  ensureSafeWorkPath(workRoot);
  ensureNativeTemporaryPath(workRoot);
  ensureNativeTemporaryPath(runtimeTemp);
  await rm(workRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await rm(runtimeTemp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

export function run(program, args, options = {}) {
  const result = spawnSync(program, args, {
    cwd: options.cwd || packageRoot,
    input: options.input,
    encoding: "utf8",
    windowsHide: true,
  });
  if (options.expectSuccess !== false && result.status !== 0) {
    throw new Error(
      `${program} ${args.join(" ")} failed (${result.status}):\n${result.stderr}\n${result.stdout}`,
    );
  }
  return result;
}

export async function createRepo(name) {
  const directory = path.join(workRoot, name);
  ensureSafeWorkPath(directory);
  await mkdir(directory, { recursive: true });
  run("git", ["init", "--quiet", directory]);
  run("git", ["config", "user.email", "agent-docs@example.invalid"], { cwd: directory });
  run("git", ["config", "user.name", "Agent Docs Test"], { cwd: directory });
  run("git", ["config", "commit.gpgSign", "false"], { cwd: directory });
  await writeFile(path.join(directory, "README.md"), "# Disposable fixture\n", "utf8");
  run("git", ["add", "README.md"], { cwd: directory });
  run("git", ["commit", "--quiet", "-m", "fixture"], { cwd: directory });
  return directory;
}

export function runCli(repo, args, options = {}) {
  return run(process.execPath, [cli, ...args, "--cwd", repo], options);
}

export function jsonOutput(result) {
  return JSON.parse(result.stdout);
}
