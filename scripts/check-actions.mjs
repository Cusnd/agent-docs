import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listRepositoryFiles } from "./lib/repository-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflows = (await listRepositoryFiles(root)).filter((file) =>
  /^\.github\/workflows\/[^/]+\.ya?ml$/u.test(file),
);
const errors = [];
for (const file of workflows) {
  const content = await readFile(path.join(root, file), "utf8");
  if (/\bpull_request_target\s*:/u.test(content))
    errors.push(`${file}: pull_request_target is forbidden`);
  if (!/^permissions:(?:\s+read-all)?\s*$/mu.test(content)) {
    errors.push(`${file}: missing explicit top-level permissions`);
  }
  for (const match of content.matchAll(/\buses:\s*([^\s#]+)/gu)) {
    const value = match[1];
    if (!/@[0-9a-f]{40}$/u.test(value))
      errors.push(`${file}: action is not pinned to a full SHA: ${value}`);
  }
  for (const match of content.matchAll(
    /^\s*-\s+run:\s+node scripts\/compare-release-artifacts\.mjs\b/gmu,
  )) {
    const preceding = content.slice(0, match.index);
    const jobStarts = [...preceding.matchAll(/^ {2}[a-zA-Z0-9_-]+:\s*$/gmu)];
    const jobStart = jobStarts.at(-1)?.index ?? 0;
    const job = preceding.slice(jobStart);
    if (!/^\s*-\s+run:\s+npm ci\s*$/mu.test(job)) {
      errors.push(`${file}: release artifact comparison job must install locked dependencies`);
    }
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`GitHub Actions policy passed for ${workflows.length} workflows.`);
}
