import { readdir } from "node:fs/promises";
import path from "node:path";

const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  ".nyc_output",
  ".work",
]);

export function toPosix(value) {
  return value.split(path.sep).join("/");
}

export async function listRepositoryFiles(root, directory = root) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listRepositoryFiles(root, absolute)));
    else if (entry.isFile()) files.push(toPosix(path.relative(root, absolute)));
  }
  return files;
}
