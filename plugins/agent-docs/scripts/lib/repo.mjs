import { access, readdir, readFile, realpath, stat } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { assertSafeRepositoryPath } from "./safe-path.mjs";

function normalizeForComparison(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function isWithin(parent, child) {
  const relative = path.relative(normalizeForComparison(parent), normalizeForComparison(child));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function git(
  cwd,
  args,
  { allowFailure = false, executable = "git", prefixArgs = [], timeoutMs = 3000 } = {},
) {
  const result = spawnSync(executable, [...prefixArgs, "-C", cwd, ...args], {
    encoding: "utf8",
    windowsHide: true,
    timeout: timeoutMs,
    killSignal: "SIGTERM",
    maxBuffer: 1024 * 1024,
  });
  if (result.error) {
    if (allowFailure) return null;
    const code =
      result.error.code === "ENOENT"
        ? "GIT_NOT_FOUND"
        : result.error.code === "ETIMEDOUT"
          ? "GIT_TIMEOUT"
          : "GIT_FAILED";
    const error = new Error(
      code === "GIT_TIMEOUT"
        ? `Git command exceeded its ${timeoutMs} ms timeout.`
        : `Unable to run Git: ${result.error.message}`,
    );
    error.code = code;
    throw error;
  }
  if (result.status !== 0) {
    if (allowFailure) return null;
    const detail = (result.stderr || result.stdout || "git command failed").trim();
    const error = new Error(detail);
    error.code = /dubious ownership/i.test(detail)
      ? "GIT_DUBIOUS_OWNERSHIP"
      : /not a git repository|cannot change to/i.test(detail)
        ? "NOT_GIT_REPOSITORY"
        : result.signal
          ? "GIT_TIMEOUT"
          : "GIT_FAILED";
    throw error;
  }
  return result.stdout.trim();
}

function repositoryReason(error) {
  return {
    GIT_NOT_FOUND: "git-not-found",
    GIT_TIMEOUT: "git-timeout",
    GIT_DUBIOUS_OWNERSHIP: "git-dubious-ownership",
    NOT_GIT_REPOSITORY: "not-git",
    GIT_FAILED: "git-failed",
  }[error?.code];
}

export async function inspectRepository(cwd = process.cwd()) {
  const probe = path.resolve(cwd);
  let bare;
  try {
    bare = git(probe, ["rev-parse", "--is-bare-repository"]);
  } catch (error) {
    const reason = repositoryReason(error);
    if (reason) return { eligible: false, reason, cwd: probe };
    throw error;
  }
  if (bare === "true") return { eligible: false, reason: "bare-repository", cwd: probe };

  const inside = git(probe, ["rev-parse", "--is-inside-work-tree"], { allowFailure: true });
  if (inside !== "true") return { eligible: false, reason: "not-worktree", cwd: probe };

  const rootText = git(probe, ["rev-parse", "--show-toplevel"], { allowFailure: true });
  if (!rootText) return { eligible: false, reason: "no-worktree-root", cwd: probe };
  const root = path.resolve(rootText);

  const superproject = git(probe, ["rev-parse", "--show-superproject-working-tree"], {
    allowFailure: true,
  });
  if (superproject) {
    return { eligible: false, reason: "git-submodule", cwd: probe, root };
  }

  if (isWithin(os.tmpdir(), root)) {
    return { eligible: false, reason: "temporary-directory", cwd: probe, root };
  }

  try {
    await access(root, fsConstants.W_OK);
  } catch {
    return { eligible: false, reason: "read-only", cwd: probe, root };
  }

  try {
    await access(path.join(root, ".agent-docs-disable"));
    return { eligible: false, reason: "opted-out", cwd: probe, root };
  } catch {
    // Absence is the enabled state.
  }

  const commonText = git(root, ["rev-parse", "--git-common-dir"]);
  const gitDirText = git(root, ["rev-parse", "--git-dir"]);
  const [canonicalRoot, commonDir, gitDir] = await Promise.all([
    realpath(root),
    realpath(path.resolve(root, commonText)),
    realpath(path.resolve(root, gitDirText)),
  ]);
  const branch = git(root, ["branch", "--show-current"], { allowFailure: true }) || "DETACHED";
  const head = git(root, ["rev-parse", "HEAD"], { allowFailure: true }) || "UNBORN";
  return {
    eligible: true,
    reason: "eligible",
    cwd: probe,
    root: canonicalRoot,
    commonDir,
    gitDir,
    branch,
    head,
  };
}

async function walkFiles(directory, base = directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Unsafe repository path contains a symbolic link or junction: ${full}`);
    }
    if (entry.isDirectory()) files.push(...(await walkFiles(full, base)));
    else if (entry.isFile()) files.push(path.relative(base, full).replaceAll(path.sep, "/"));
  }
  return files;
}

export async function hashAgentDocs(repoRoot) {
  const docs = path.join(repoRoot, "docs", "agent");
  await assertSafeRepositoryPath(repoRoot, docs);
  const hash = createHash("sha256");
  const files = await walkFiles(docs);
  for (const relative of files) {
    hash.update(relative);
    hash.update("\0");
    hash.update(await readFile(path.join(docs, ...relative.split("/"))));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export async function hashAgentDocsControl(repoRoot) {
  const docs = path.join(repoRoot, "docs", "agent");
  await assertSafeRepositoryPath(repoRoot, docs);
  const hash = createHash("sha256");
  for (const name of ["manifest.json", "requirements.md"]) {
    const file = path.join(docs, name);
    await assertSafeRepositoryPath(repoRoot, file);
    hash.update(name);
    hash.update("\0");
    try {
      hash.update(await readFile(file));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      hash.update("<missing>");
    }
    hash.update("\0");
  }
  return hash.digest("hex");
}

export async function fileExists(file) {
  try {
    const info = await stat(file);
    return info.isFile();
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}
