import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listRepositoryFiles } from "./lib/repository-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = (await listRepositoryFiles(root)).filter((file) => file.endsWith(".md"));
const urls = new Set();
for (const file of files) {
  const content = await readFile(path.join(root, file), "utf8");
  for (const match of content.matchAll(/https:\/\/[^\s)<>"']+/gu)) {
    urls.add(match[0].replace(/[.,;:]$/u, ""));
  }
}

async function request(url, method) {
  return fetch(url, {
    method,
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
    headers: {
      "user-agent": "Cusnd-agent-docs-link-check/0.2.0",
      ...(method === "GET" ? { range: "bytes=0-0" } : {}),
    },
  });
}

const broken = [];
const warnings = [];
for (const url of [...urls].sort()) {
  let response;
  try {
    response = await request(url, "HEAD");
    if ([405, 501].includes(response.status)) response = await request(url, "GET");
  } catch (error) {
    warnings.push(`${url}: ${error.name}`);
    continue;
  }
  if ([404, 410].includes(response.status)) broken.push(`${url}: HTTP ${response.status}`);
  else if (response.status >= 500) warnings.push(`${url}: HTTP ${response.status}`);
}

for (const warning of warnings) console.warn(`External link inconclusive: ${warning}`);
if (broken.length) {
  console.error(broken.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`External link check found no confirmed 404/410 among ${urls.size} HTTPS URLs.`);
}
