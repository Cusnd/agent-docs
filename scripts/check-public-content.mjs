import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listRepositoryFiles } from "./lib/repository-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const binaryExtensions = /\.(?:zip|png|jpe?g|gif|webp|ico|pdf)$/iu;
const files = (await listRepositoryFiles(root)).filter(
  (file) => file !== "scripts/check-public-content.mjs" && !binaryExtensions.test(file),
);
const proseExtensions = /\.(?:md|yml|yaml|json|toml)$/iu;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
const localHostname = os.hostname();
const localRoot = path.resolve(root);
const commonPatterns = [
  ["Windows user directory", /[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s"'<>]+/giu],
  ["Unix home directory", /\/(?:home|Users)\/[^/\s"'<>]+/gu],
  ["machine name", /\b(?:DESKTOP|LAPTOP)-[A-Z0-9-]{3,}\b/giu],
  ...(localHostname.length >= 3
    ? [["current machine name", new RegExp(`\\b${escapeRegex(localHostname)}\\b`, "giu")]]
    : []),
  ["current absolute workspace path", new RegExp(escapeRegex(localRoot), "giu")],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/gu],
  ["authorization header", /\bAuthorization\s*:\s*(?:Bearer|Basic)\s+\S+/giu],
  ["cookie header", /\bCookie\s*:\s*[^\r\n]+/giu],
  ["GitHub token", /\bgh[opusr]_[A-Za-z0-9_]{20,}\b/gu],
  ["OpenAI key", /\bsk-[A-Za-z0-9_-]{20,}\b/gu],
  ["AWS access key", /\bAKIA[A-Z0-9]{16}\b/gu],
  ["npm token", /\bnpm_[A-Za-z0-9]{30,}\b/gu],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/gu],
  ["Stripe secret", /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/gu],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{30,}\b/gu],
  ["private artifact URL", /https?:\/\/[^\s)]+(?:X-Amz-Signature|token=|sig=)[^\s)]*/giu],
];
const prosePatterns = [
  [
    "Codex task or thread identifier",
    /\b(?:task|thread|conversation)[-_ ]?(?:id|uuid)\b[^\r\n]{0,40}\b[0-9a-f]{8}-[0-9a-f-]{27,36}\b/giu,
  ],
  [
    "terminal transcript marker",
    /^\s*(?:PS [A-Za-z]:\\|Last login:|Microsoft Windows \[Version)/gmu,
  ],
];

const findings = [];
for (const file of files) {
  let content;
  try {
    content = await readFile(path.join(root, file), "utf8");
  } catch {
    continue;
  }
  const patterns = proseExtensions.test(file)
    ? [...commonPatterns, ...prosePatterns]
    : commonPatterns;
  for (const [label, pattern] of patterns) {
    pattern.lastIndex = 0;
    for (const match of content.matchAll(pattern)) {
      const line = content.slice(0, match.index).split(/\r?\n/u).length;
      findings.push(`${file}:${line}: ${label}`);
    }
  }
}

if (findings.length) {
  console.error(findings.join("\n"));
  console.error(
    "Automated public-content scanning is a guardrail, not proof that content is safe.",
  );
  process.exitCode = 1;
} else {
  console.log(`Public-content scan passed for ${files.length} text candidates.`);
  console.log("Manual privacy and terminal-transcript review remains required before publication.");
}
