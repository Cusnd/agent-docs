import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expected = "0.2.0";

async function json(file) {
  return JSON.parse(await readFile(path.join(root, file), "utf8"));
}

function assertEqual(actual, wanted, label) {
  if (actual !== wanted) throw new Error(`${label}: expected ${wanted}, got ${actual}`);
}

const rootPackage = await json("package.json");
const pluginPackage = await json("plugins/agent-docs/package.json");
const pluginManifest = await json("plugins/agent-docs/.codex-plugin/plugin.json");
const marketplace = await json(".agents/plugins/marketplace.json");
const templateManifest = await json("plugins/agent-docs/protocol/assets/templates/manifest.json");
const projectManifest = await json("docs/agent/manifest.json");
const constants = await readFile(
  path.join(root, "plugins/agent-docs/scripts/lib/constants.mjs"),
  "utf8",
);

assertEqual(rootPackage.version, expected, "root package version");
assertEqual(pluginPackage.version, expected, "plugin package version");
assertEqual(pluginManifest.version, expected, "plugin manifest version");
assertEqual(templateManifest.generator_version, expected, "new-project generator version");
assertEqual(marketplace.name, "agent-docs", "marketplace name");
assertEqual(marketplace.plugins?.[0]?.name, "agent-docs", "marketplace plugin name");
assertEqual(projectManifest.generator_version, "0.1.0", "project provenance generator version");
if (!constants.includes(`export const VERSION = "${expected}";`)) {
  throw new Error("runtime VERSION does not match 0.2.0");
}
if (rootPackage.private !== true || pluginPackage.private !== true) {
  throw new Error("root and plugin packages must remain private");
}
if (Object.keys(pluginPackage.dependencies ?? {}).length !== 0) {
  throw new Error("the plugin runtime must have zero third-party dependencies");
}

console.log(`Version consistency passed for Agent Docs ${expected}.`);
