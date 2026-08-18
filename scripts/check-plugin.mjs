import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function json(file) {
  return JSON.parse(await readFile(path.join(root, file), "utf8"));
}

const manifest = await json("plugins/agent-docs/.codex-plugin/plugin.json");
const marketplace = await json(".agents/plugins/marketplace.json");
const hooks = await json("plugins/agent-docs/hooks/hooks.json");
const pluginPackage = await json("plugins/agent-docs/package.json");

if (!/^[a-z0-9-]+$/u.test(manifest.name) || manifest.name !== "agent-docs") {
  throw new Error("plugin manifest name must be agent-docs");
}
if (!/^\d+\.\d+\.\d+$/u.test(manifest.version)) {
  throw new Error("plugin manifest version must be a stable semantic version");
}
if (marketplace.plugins?.length !== 1) throw new Error("marketplace must expose one plugin");
const entry = marketplace.plugins[0];
if (entry.name !== manifest.name || entry.source?.path !== "./plugins/agent-docs") {
  throw new Error("marketplace entry does not resolve to the Agent Docs plugin");
}

const requiredHooks = ["Stop", "SubagentStart", "UserPromptSubmit"];
const actualHooks = Object.keys(hooks.hooks ?? {}).sort();
if (JSON.stringify(actualHooks) !== JSON.stringify(requiredHooks)) {
  throw new Error(`hook-only contract changed: ${actualHooks.join(", ")}`);
}
if (actualHooks.includes("SessionStart")) throw new Error("SessionStart must not be registered");
for (const event of actualHooks) {
  for (const matcher of hooks.hooks[event]) {
    for (const hook of matcher.hooks ?? []) {
      if (hook.type !== "command" || !hook.command.includes("$PLUGIN_ROOT")) {
        throw new Error(`${event} is not a portable plugin-root command hook`);
      }
      if (!hook.commandWindows?.includes("$env:PLUGIN_ROOT")) {
        throw new Error(`${event} lacks a portable Windows command`);
      }
    }
  }
}
if (Object.keys(pluginPackage.dependencies ?? {}).length !== 0) {
  throw new Error("plugin package contains runtime dependencies");
}

console.log("Plugin structure, hook-only contract, and zero-runtime-dependency checks passed.");
