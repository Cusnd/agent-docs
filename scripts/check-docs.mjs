import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { listRepositoryFiles } from "./lib/repository-files.mjs";
import { releaseFilePolicy } from "./lib/release-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allFiles = await listRepositoryFiles(root);
const fileSet = new Set(allFiles);
const markdown = allFiles.filter((file) => file.endsWith(".md"));
const pairingExclusions = [
  /^docs\/agent\//u,
  /^plugins\/agent-docs\/protocol\/assets\/templates\//u,
  /^\.github\/PULL_REQUEST_TEMPLATE\.md$/u,
];
const installContractStart = "<!-- agent-docs:install-contract:start -->";
const installContractEnd = "<!-- agent-docs:install-contract:end -->";
const expectedInstallContract = {
  schema_version: 1,
  entrypoint: "https://raw.githubusercontent.com/Cusnd/agent-docs/main/AGENT_INSTALL.md",
  repository: "Cusnd/agent-docs",
  distribution: "github-release-zip",
  release_tag: "v0.2.0",
  release_page: "https://github.com/Cusnd/agent-docs/releases/tag/v0.2.0",
  archive: {
    name: "agent-docs-marketplace-v0.2.0.zip",
    download_url:
      "https://github.com/Cusnd/agent-docs/releases/download/v0.2.0/agent-docs-marketplace-v0.2.0.zip",
    sha256: "70723ad7eb654af02d36c73ca3ea35bda6a5a8043513cf66c5e847e42e65863a",
    regular_file_count: 34,
    root: "agent-docs-marketplace-v0.2.0/",
  },
  checksums: {
    name: "SHA256SUMS",
    download_url: "https://github.com/Cusnd/agent-docs/releases/download/v0.2.0/SHA256SUMS",
    sha256: "f79428e7c25ee45109a91c6df5036f0c0b037e1f7114c8c074f35de074465c06",
  },
  attestation: {
    repository: "Cusnd/agent-docs",
    signer_workflow: "Cusnd/agent-docs/.github/workflows/release.yml",
    source_ref: "refs/tags/v0.2.0",
    source_digest: "569fb8a1544d0dfcb95552c953048df5be0e6b5f",
    predicate_type: "https://slsa.dev/provenance/v1",
    deny_self_hosted_runners: true,
  },
  marketplace: "agent-docs",
  plugin: "agent-docs@agent-docs",
  plugin_version: "0.2.0",
  verified_codex_cli: "0.147.0",
  node: "^22.0.0 || ^24.0.0 || ^26.0.0",
  verified_operating_systems: ["Windows", "Linux", "macOS"],
  safety: {
    require_target_authorization: true,
    allow_login: false,
    allow_model_or_ai_api_calls: false,
    allow_credential_access: false,
    overwrite_existing_installation: false,
  },
};

function excludedFromPairing(file) {
  return pairingExclusions.some((pattern) => pattern.test(file));
}

const errors = [];
const markdownContents = new Map();
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
  markdownContents.set(file, content);
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

function countToken(content, token) {
  return content.split(token).length - 1;
}

function parseInstallContract(file) {
  const content = markdownContents.get(file);
  if (typeof content !== "string") {
    errors.push(`${file}: missing Agent installation contract document`);
    return null;
  }
  const starts = countToken(content, installContractStart);
  const ends = countToken(content, installContractEnd);
  if (starts !== 1 || ends !== 1) {
    errors.push(`${file}: expected exactly one ordered Agent installation contract marker pair`);
    return null;
  }
  const start = content.indexOf(installContractStart) + installContractStart.length;
  const end = content.indexOf(installContractEnd);
  if (start > end) {
    errors.push(`${file}: Agent installation contract markers are out of order`);
    return null;
  }
  const fenced = content.slice(start, end).match(/^\s*```json\r?\n([\s\S]*?)\r?\n```\s*$/u);
  if (!fenced) {
    errors.push(`${file}: Agent installation contract must contain exactly one JSON fence`);
    return null;
  }
  try {
    return JSON.parse(fenced[1]);
  } catch (error) {
    errors.push(`${file}: invalid Agent installation contract JSON: ${error.message}`);
    return null;
  }
}

const installContractFiles = ["AGENT_INSTALL.md", "AGENT_INSTALL.zh-CN.md"];
const installContracts = installContractFiles.map(parseInstallContract);
for (let index = 0; index < installContracts.length; index += 1) {
  const contract = installContracts[index];
  if (contract && !isDeepStrictEqual(contract, expectedInstallContract)) {
    errors.push(`${installContractFiles[index]}: Agent installation contract drifted from policy`);
  }
}
if (
  installContracts.every(Boolean) &&
  !isDeepStrictEqual(installContracts[0], installContracts[1])
) {
  errors.push("Agent installation contract differs between English and Chinese documents");
}
const releaseSingleFiles = new Set(releaseFilePolicy().singleFiles);
for (const file of installContractFiles) {
  if (!releaseSingleFiles.has(file)) {
    errors.push(`${file}: Agent installation contract is missing from the release allowlist`);
  }
}

const requiredRunbookTokens = [
  "gh auth status",
  "gh release download v0.2.0",
  "gh attestation verify",
  "--signer-workflow Cusnd/agent-docs/.github/workflows/release.yml",
  "--source-ref refs/tags/v0.2.0",
  "--source-digest 569fb8a1544d0dfcb95552c953048df5be0e6b5f",
  "--predicate-type https://slsa.dev/provenance/v1",
  "--deny-self-hosted-runners",
  "codex plugin marketplace add",
  "codex plugin marketplace list --json",
  "codex plugin add agent-docs@agent-docs --json",
  "codex plugin list --json",
  "codex plugin remove agent-docs@agent-docs --json",
  "codex plugin marketplace remove agent-docs --json",
  "CODEX_HOME",
];
for (const file of installContractFiles) {
  const content = markdownContents.get(file);
  if (typeof content !== "string") continue;
  for (const token of requiredRunbookTokens) {
    if (!content.includes(token)) errors.push(`${file}: missing required runbook token ${token}`);
  }
}

const publicEntrypoints = new Map([
  [
    "README.md",
    [
      "AGENT_INSTALL.md",
      "https://raw.githubusercontent.com/Cusnd/agent-docs/main/AGENT_INSTALL.md",
    ],
  ],
  [
    "README.zh-CN.md",
    [
      "AGENT_INSTALL.zh-CN.md",
      "https://raw.githubusercontent.com/Cusnd/agent-docs/main/AGENT_INSTALL.zh-CN.md",
    ],
  ],
  [
    "INSTALL.md",
    [
      "AGENT_INSTALL.md",
      "https://raw.githubusercontent.com/Cusnd/agent-docs/main/AGENT_INSTALL.md",
    ],
  ],
  [
    "INSTALL.zh-CN.md",
    [
      "AGENT_INSTALL.zh-CN.md",
      "https://raw.githubusercontent.com/Cusnd/agent-docs/main/AGENT_INSTALL.zh-CN.md",
    ],
  ],
]);
for (const [file, tokens] of publicEntrypoints) {
  const content = markdownContents.get(file);
  if (typeof content !== "string") {
    errors.push(`${file}: missing public Agent installation entrypoint document`);
    continue;
  }
  for (const token of tokens) {
    if (!content.includes(token))
      errors.push(`${file}: missing Agent installation entrypoint ${token}`);
  }
}

const readme = markdownContents.get("README.md");
const readmeZh = markdownContents.get("README.zh-CN.md");
if (!readme.includes("README.zh-CN.md")) errors.push("README.md: missing Chinese switch");
if (!readmeZh.includes("README.md")) errors.push("README.zh-CN.md: missing English switch");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Documentation pairing, links, and Agent installation contract checks passed for ${markdown.length} files.`,
  );
}
