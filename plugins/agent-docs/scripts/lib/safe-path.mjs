import { lstat, mkdir, realpath } from "node:fs/promises";
import path from "node:path";

function comparable(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function isPathWithin(parent, child) {
  const relative = path.relative(comparable(parent), comparable(child));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export async function assertSafeRepositoryPath(repoRoot, target) {
  const absoluteRoot = path.resolve(repoRoot);
  const absoluteTarget = path.resolve(target);
  if (!isPathWithin(absoluteRoot, absoluteTarget)) {
    throw new Error(`Unsafe repository path escapes the repository root: ${absoluteTarget}`);
  }

  const canonicalRoot = await realpath(absoluteRoot);
  const relative = path.relative(absoluteRoot, absoluteTarget);
  let current = canonicalRoot;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    let info;
    try {
      info = await lstat(current);
    } catch (error) {
      if (error.code === "ENOENT") return absoluteTarget;
      throw error;
    }
    if (info.isSymbolicLink()) {
      throw new Error(`Unsafe repository path contains a symbolic link or junction: ${current}`);
    }
    const resolved = await realpath(current);
    if (!isPathWithin(canonicalRoot, resolved)) {
      throw new Error(`Unsafe repository path resolves outside the repository root: ${current}`);
    }
  }
  return absoluteTarget;
}

export async function assertSafeAgentDocsPath(repo, target) {
  const docsRoot = path.join(repo.root, "docs", "agent");
  const absoluteTarget = path.resolve(target);
  if (!isPathWithin(docsRoot, absoluteTarget)) {
    throw new Error(`Unsafe Agent Docs path escapes docs/agent: ${absoluteTarget}`);
  }
  return assertSafeRepositoryPath(repo.root, absoluteTarget);
}

export async function ensureSafeAgentDocsDirectory(repo, directory) {
  await assertSafeAgentDocsPath(repo, directory);
  await mkdir(directory, { recursive: true });
  await assertSafeAgentDocsPath(repo, directory);
  return directory;
}
