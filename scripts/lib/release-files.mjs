import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";

const SINGLE_FILES = [
  ".agents/plugins/marketplace.json",
  "AGENT_INSTALL.md",
  "AGENT_INSTALL.zh-CN.md",
  "INSTALL.md",
  "INSTALL.zh-CN.md",
  "LICENSE",
  "README.md",
  "README.zh-CN.md",
  "plugins/agent-docs/.codex-plugin/plugin.json",
  "plugins/agent-docs/CONTEXT.md",
  "plugins/agent-docs/CONTEXT.zh-CN.md",
  "plugins/agent-docs/README.md",
  "plugins/agent-docs/README.zh-CN.md",
  "plugins/agent-docs/hooks/hooks.json",
  "plugins/agent-docs/package.json",
];

const ALLOWED_DIRECTORIES = ["plugins/agent-docs/protocol", "plugins/agent-docs/scripts"];

const TEXT_EXTENSIONS = new Set([".json", ".md", ".mjs"]);

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function assertArchivePath(value) {
  if (!value || path.posix.isAbsolute(value) || path.win32.isAbsolute(value)) {
    throw new Error(`Release path is absolute or empty: ${value}`);
  }
  const parts = value.split("/");
  if (parts.some((part) => part === ".." || part === "")) {
    throw new Error(`Release path contains an unsafe component: ${value}`);
  }
  if (value.includes("\\")) throw new Error(`Release path is not POSIX-normalized: ${value}`);
}

async function collectDirectory(root, relative) {
  const absolute = path.join(root, ...relative.split("/"));
  const entries = await readdir(absolute, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en"))) {
    const child = `${relative}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`Release input is a symbolic link: ${child}`);
    if (entry.isDirectory()) files.push(...(await collectDirectory(root, child)));
    else if (entry.isFile()) files.push(child);
    else throw new Error(`Release input has unsupported file type: ${child}`);
  }
  return files;
}

export async function collectReleaseFiles(root) {
  const canonicalRoot = await realpath(root);
  const files = [...SINGLE_FILES];
  for (const directory of ALLOWED_DIRECTORIES) {
    files.push(...(await collectDirectory(canonicalRoot, directory)));
  }
  const normalized = files.map(toPosix).sort((left, right) => left.localeCompare(right, "en"));
  if (new Set(normalized).size !== normalized.length) {
    throw new Error("Release allowlist generated duplicate entries.");
  }
  const records = [];
  for (const relative of normalized) {
    assertArchivePath(relative);
    const absolute = path.join(canonicalRoot, ...relative.split("/"));
    const info = await lstat(absolute);
    if (!info.isFile() || info.isSymbolicLink()) {
      throw new Error(`Release input is not a regular file: ${relative}`);
    }
    const canonical = await realpath(absolute);
    const inside = path.relative(canonicalRoot, canonical);
    if (inside.startsWith("..") || path.isAbsolute(inside)) {
      throw new Error(`Release input escapes the repository: ${relative}`);
    }
    const extension = path.extname(relative).toLowerCase();
    if (relative !== "LICENSE" && !TEXT_EXTENSIONS.has(extension)) {
      throw new Error(`Release allowlist contains an unexpected binary: ${relative}`);
    }
    const text = (await readFile(absolute, "utf8")).replace(/\r\n?/gu, "\n");
    records.push({ path: relative, text });
  }
  return records;
}

export function releaseFilePolicy() {
  return {
    singleFiles: [...SINGLE_FILES],
    allowedDirectories: [...ALLOWED_DIRECTORIES],
  };
}
