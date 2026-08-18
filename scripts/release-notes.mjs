import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = process.argv[2]?.replace(/^v/u, "");
if (!/^\d+\.\d+\.\d+$/u.test(version ?? ""))
  throw new Error("A semantic release version is required.");
const changelog = await readFile(path.join(root, "CHANGELOG.md"), "utf8");
const start = changelog.indexOf(`## [${version}]`);
if (start < 0) throw new Error(`CHANGELOG.md has no ${version} section.`);
const next = changelog.indexOf("\n## [", start + 4);
const notes = changelog.slice(start, next < 0 ? undefined : next).trimEnd();
await mkdir(path.join(root, "dist"), { recursive: true });
await writeFile(path.join(root, "dist", "RELEASE_NOTES.md"), `${notes}\n`, "utf8");
console.log(`Prepared release notes for v${version}.`);
