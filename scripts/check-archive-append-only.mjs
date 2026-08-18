import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.BASE_SHA?.trim();
const archivePath = "docs/agent/archive/requirements";
const startMarker = "<!-- agent-docs:archive:start -->";
const endMarker = "<!-- agent-docs:archive:end -->";

if (!base) {
  console.log("Archive append-only check skipped: no pull-request base SHA was supplied.");
  process.exit(0);
}
if (!/^[0-9a-f]{40,64}$/iu.test(base)) {
  throw new Error("BASE_SHA must be a full Git object ID.");
}

function git(args) {
  return execFileSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
}

function parseArchive(content, file) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);
  if (
    start < 0 ||
    end <= start ||
    content.indexOf(startMarker, start + 1) >= 0 ||
    content.indexOf(endMarker, end + 1) >= 0
  ) {
    throw new Error(`${file}: malformed archive marker pair.`);
  }
  const body = content
    .slice(start + startMarker.length, end)
    .trim()
    .split(/\r?\n/u)
    .map((line) => line.trim());
  if (
    body[0] !== "| ID | Closed (UTC) | Status | Summary | Evidence | Session |" ||
    body[1] !== "| --- | --- | --- | --- | --- | --- |"
  ) {
    throw new Error(`${file}: malformed archive table header.`);
  }
  return {
    prefix: content.slice(0, start + startMarker.length),
    suffix: content.slice(end),
    header: body.slice(0, 2),
    rows: body.slice(2).filter(Boolean),
  };
}

const changes = git([
  "diff",
  "--name-status",
  "--diff-filter=ACDMRT",
  base,
  "HEAD",
  "--",
  archivePath,
])
  .trim()
  .split(/\r?\n/u)
  .filter(Boolean);
const errors = [];

for (const line of changes) {
  const [status, ...names] = line.split("\t");
  const file = names.at(-1);
  if (!file?.startsWith(`${archivePath}/`)) continue;
  if (status !== "A" && status !== "M") {
    errors.push(`${file}: archive files cannot be deleted, renamed, or copied.`);
    continue;
  }
  if (status === "A") continue;
  const previous = parseArchive(git(["show", `${base}:${file}`]), file);
  const current = parseArchive(await readFile(path.join(root, ...file.split("/")), "utf8"), file);
  if (
    previous.prefix !== current.prefix ||
    previous.suffix !== current.suffix ||
    previous.header.join("\n") !== current.header.join("\n")
  ) {
    errors.push(`${file}: content outside appended archive rows changed.`);
    continue;
  }
  if (
    current.rows.length < previous.rows.length ||
    previous.rows.some((row, index) => current.rows[index] !== row)
  ) {
    errors.push(`${file}: existing archive rows were changed, removed, or reordered.`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Archive append-only check passed against ${base}.`);
}
