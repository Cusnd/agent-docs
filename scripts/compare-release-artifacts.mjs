import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { ARCHIVE_FILENAME } from "./build-release.mjs";

const searchRoot = path.resolve(process.argv[2] ?? "artifacts");

async function find(directory) {
  const matches = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) matches.push(...(await find(full)));
    else if (entry.isFile() && entry.name === ARCHIVE_FILENAME) matches.push(full);
  }
  return matches;
}

const archives = (await find(searchRoot)).sort();
if (archives.length !== 3)
  throw new Error(`Expected three cross-OS archives, found ${archives.length}.`);
const results = [];
for (const archive of archives) {
  const digest = createHash("sha256")
    .update(await readFile(archive))
    .digest("hex");
  results.push({ archive: path.relative(searchRoot, archive).replaceAll(path.sep, "/"), digest });
}
if (new Set(results.map((result) => result.digest)).size !== 1) {
  throw new Error(`Cross-OS release digests differ:\n${JSON.stringify(results, null, 2)}`);
}
console.log(JSON.stringify({ sha256: results[0].digest, archives: results }, null, 2));
