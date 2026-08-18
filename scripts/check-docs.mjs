import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listRepositoryFiles } from "./lib/repository-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allFiles = await listRepositoryFiles(root);
const fileSet = new Set(allFiles);
const markdown = allFiles.filter((file) => file.endsWith(".md"));
const pairingExclusions = [
  /^docs\/agent\//u,
  /^plugins\/agent-docs\/protocol\/assets\/templates\//u,
  /^\.github\/PULL_REQUEST_TEMPLATE\.md$/u,
];

function excludedFromPairing(file) {
  return pairingExclusions.some((pattern) => pattern.test(file));
}

const errors = [];
for (const file of markdown) {
  if (excludedFromPairing(file)) continue;
  if (file.endsWith(".zh-CN.md")) {
    const canonical = file.replace(/\.zh-CN\.md$/u, ".md");
    if (!fileSet.has(canonical)) errors.push(`${file}: missing canonical ${canonical}`);
  } else {
    const translation = file.replace(/\.md$/u, ".zh-CN.md");
    if (!fileSet.has(translation)) errors.push(`${file}: missing translation ${translation}`);
  }
}

const markdownLink = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/gu;
for (const file of markdown) {
  const content = await readFile(path.join(root, file), "utf8");
  for (const match of content.matchAll(markdownLink)) {
    const target = match[1];
    if (/^(?:https?:|mailto:|codex:|#)/u.test(target)) continue;
    const withoutAnchor = target.split("#", 1)[0];
    if (!withoutAnchor) continue;
    let decoded;
    try {
      decoded = decodeURIComponent(withoutAnchor);
    } catch {
      errors.push(`${file}: invalid encoded link ${target}`);
      continue;
    }
    const absolute = decoded.startsWith("/")
      ? path.join(root, decoded.slice(1))
      : path.resolve(root, path.dirname(file), decoded);
    if (!absolute.startsWith(`${root}${path.sep}`) && absolute !== root) {
      errors.push(`${file}: link escapes the repository: ${target}`);
      continue;
    }
    try {
      await access(absolute);
    } catch {
      errors.push(`${file}: broken internal link ${target}`);
    }
  }
}

const readme = await readFile(path.join(root, "README.md"), "utf8");
const readmeZh = await readFile(path.join(root, "README.zh-CN.md"), "utf8");
if (!readme.includes("README.zh-CN.md")) errors.push("README.md: missing Chinese switch");
if (!readmeZh.includes("README.md")) errors.push("README.zh-CN.md: missing English switch");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Documentation pairing and internal-link checks passed for ${markdown.length} files.`,
  );
}
