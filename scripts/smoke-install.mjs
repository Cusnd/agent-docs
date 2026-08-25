import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";
import { ARCHIVE_BASENAME, ARCHIVE_FILENAME } from "./build-release.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const archive = await readFile(path.join(root, "dist", ARCHIVE_FILENAME));
const temporary = await mkdtemp(path.join(os.tmpdir(), "agent-docs-install-"));
const extractRoot = path.join(temporary, "extract");
const workBase = path.join(root, "work");
const smokeIdentity = randomUUID();
const isolatedCodexHome = path.join(workBase, `codex-home-${smokeIdentity}`);
const smokeRepo = path.join(workBase, `release-smoke-${smokeIdentity}`);

async function locateCodexEntrypoint() {
  const pathDirectories = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  const candidates = new Set();
  for (const directory of [...pathDirectories, path.dirname(process.execPath)]) {
    candidates.add(path.join(directory, "node_modules", "@openai", "codex", "bin", "codex.js"));
    candidates.add(
      path.resolve(directory, "..", "lib", "node_modules", "@openai", "codex", "bin", "codex.js"),
    );
  }
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next npm global layout.
    }
  }
  throw new Error("Unable to locate the npm-installed @openai/codex entrypoint on PATH.");
}

function run(executable, args, { cwd = root, input, env = process.env } = {}) {
  return execFileSync(executable, args, {
    cwd,
    env,
    input,
    encoding: "utf8",
    windowsHide: true,
    timeout: 30_000,
    maxBuffer: 2 * 1024 * 1024,
  }).trim();
}

function json(text) {
  return JSON.parse(text);
}

try {
  await mkdir(extractRoot, { recursive: true });
  for (const [name, bytes] of Object.entries(unzipSync(archive))) {
    if (name.endsWith("/")) continue;
    if (
      path.posix.isAbsolute(name) ||
      path.win32.isAbsolute(name) ||
      name.split("/").includes("..") ||
      !name.startsWith(`${ARCHIVE_BASENAME}/`)
    ) {
      throw new Error(`Unsafe ZIP entry during smoke install: ${name}`);
    }
    const target = path.resolve(extractRoot, ...name.split("/"));
    if (!target.startsWith(`${extractRoot}${path.sep}`))
      throw new Error(`ZIP entry escaped: ${name}`);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }

  await mkdir(isolatedCodexHome, { recursive: true });
  const isolatedEnvironment = { ...process.env, CODEX_HOME: isolatedCodexHome };
  const extractedMarketplaceRoot = path.join(extractRoot, ARCHIVE_BASENAME);
  const marketplaceParent = path.join(isolatedCodexHome, "marketplaces");
  const marketplaceRoot = path.join(marketplaceParent, "agent-docs-v0.2.0");
  const marketplaceStaging = path.join(
    marketplaceParent,
    `.agent-docs-v0.2.0-${smokeIdentity}.staging`,
  );
  await mkdir(marketplaceParent, { recursive: true });
  await cp(extractedMarketplaceRoot, marketplaceStaging, {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
  await rename(marketplaceStaging, marketplaceRoot);
  const codexEntrypoint = await locateCodexEntrypoint();
  const runCodex = (args) =>
    run(process.execPath, [codexEntrypoint, ...args], { env: isolatedEnvironment });
  const codexVersion = runCodex(["--version"]);
  if (!codexVersion.includes("0.147.0")) {
    throw new Error(`Release smoke requires Codex CLI 0.147.0, got ${codexVersion}.`);
  }
  const pluginHelp = runCodex(["plugin", "--help"]);
  if (!pluginHelp.includes("marketplace") || !pluginHelp.includes("remove")) {
    throw new Error("Installed Codex CLI does not expose the expected plugin command surface.");
  }
  json(runCodex(["plugin", "marketplace", "add", marketplaceRoot, "--json"]));
  json(runCodex(["plugin", "add", "agent-docs@agent-docs", "--json"]));
  const installed = runCodex(["plugin", "list", "--json"]);
  if (!installed.includes('"agent-docs"')) throw new Error("Installed plugin was not listed.");
  const installedConfig = await readFile(path.join(isolatedCodexHome, "config.toml"), "utf8");
  if (
    installedConfig.includes('hooks.state."agent-docs@agent-docs:hooks/hooks.json:') ||
    installedConfig.includes("trusted_hash")
  ) {
    throw new Error("Plugin installation unexpectedly persisted hook trust without review.");
  }

  await mkdir(smokeRepo, { recursive: true });
  run("git", ["init", "--initial-branch=main", "--quiet"], { cwd: smokeRepo });
  await writeFile(path.join(smokeRepo, "README.md"), "# Release smoke fixture\n", "utf8");
  const pluginCli = path.join(
    marketplaceRoot,
    "plugins",
    "agent-docs",
    "scripts",
    "agent-docs.mjs",
  );
  const materialTurn = randomUUID();
  const materialInput = { cwd: smokeRepo, session_id: "release-material", turn_id: materialTurn };
  const prompt = json(
    run(process.execPath, [pluginCli, "hook", "user-prompt-submit"], {
      cwd: smokeRepo,
      input: JSON.stringify(materialInput),
    }),
  );
  if (!prompt.hookSpecificOutput?.additionalContext?.includes(materialTurn)) {
    throw new Error("UserPromptSubmit did not create a material Turn Receipt.");
  }
  json(run(process.execPath, [pluginCli, "init", "--json"], { cwd: smokeRepo }));
  const requirement = json(
    run(
      process.execPath,
      [
        pluginCli,
        "requirement",
        "new",
        "--summary",
        "Verify release smoke path",
        "--criteria",
        "Isolated hook workflow completes.",
        "--turn-id",
        materialTurn,
      ],
      { cwd: smokeRepo },
    ),
  );
  const session = json(
    run(
      process.execPath,
      [
        pluginCli,
        "session",
        "new",
        "--requirements",
        requirement.id,
        "--goal",
        "Verify the isolated release",
        "--status",
        "Done",
        "--change",
        "Exercised the installed hook runtime.",
        "--file",
        "docs/agent/requirements.md",
        "--verification",
        "release smoke",
        "--verification-result",
        "Passed",
        "--verification-evidence",
        "Isolated material workflow completed.",
        "--result",
        "Release hook path passed.",
        "--next-step",
        "No follow-up required.",
      ],
      { cwd: smokeRepo },
    ),
  );
  const requirementsFile = path.join(smokeRepo, "docs", "agent", "requirements.md");
  let requirements = await readFile(requirementsFile, "utf8");
  requirements = requirements
    .replace("- **Status:** Todo", "- **Status:** In Progress")
    .replace("- [ ] Isolated hook workflow completes.", "- [x] Isolated hook workflow completes.")
    .replace(
      "- None yet.\n\n#### Next Step",
      "- `release smoke` — passed in an isolated CODEX_HOME.\n\n#### Next Step",
    )
    .replace("Clarify the next material outcome.", "No follow-up required.")
    .replace("- None yet.\n<!-- agent-docs:req:", `- ${session.id}\n<!-- agent-docs:req:`);
  await writeFile(requirementsFile, requirements, "utf8");
  json(
    run(
      process.execPath,
      [
        pluginCli,
        "requirement",
        "close",
        "--id",
        requirement.id,
        "--status",
        "Done",
        "--session",
        session.id,
        "--evidence",
        "release smoke passed",
        "--turn-id",
        materialTurn,
      ],
      { cwd: smokeRepo },
    ),
  );
  json(
    run(
      process.execPath,
      [
        pluginCli,
        "receipt",
        "resolve",
        "--turn-id",
        materialTurn,
        "--state",
        "closed",
        "--session",
        session.id,
      ],
      { cwd: smokeRepo },
    ),
  );

  const nonMaterialTurn = randomUUID();
  run(process.execPath, [pluginCli, "hook", "user-prompt-submit"], {
    cwd: smokeRepo,
    input: JSON.stringify({
      cwd: smokeRepo,
      session_id: "release-non-material",
      turn_id: nonMaterialTurn,
    }),
  });
  json(
    run(
      process.execPath,
      [pluginCli, "receipt", "resolve", "--turn-id", nonMaterialTurn, "--state", "not-material"],
      { cwd: smokeRepo },
    ),
  );

  const stopTurn = randomUUID();
  const stopInput = { cwd: smokeRepo, session_id: "release-stop", turn_id: stopTurn };
  run(process.execPath, [pluginCli, "hook", "user-prompt-submit"], {
    cwd: smokeRepo,
    input: JSON.stringify(stopInput),
  });
  const blocked = json(
    run(process.execPath, [pluginCli, "hook", "stop"], {
      cwd: smokeRepo,
      input: JSON.stringify({ ...stopInput, stop_hook_active: false }),
    }),
  );
  if (blocked.decision !== "block") throw new Error("Stop did not allow exactly one repair pass.");
  const recovered = json(
    run(process.execPath, [pluginCli, "hook", "stop"], {
      cwd: smokeRepo,
      input: JSON.stringify({ ...stopInput, stop_hook_active: true }),
    }),
  );
  if (!recovered.systemMessage?.includes("Log Health Warning"))
    throw new Error("Stop recovery warning was not recorded.");

  await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  const marketplaceAfterTemporaryCleanup = runCodex(["plugin", "marketplace", "list", "--json"]);
  if (
    !marketplaceAfterTemporaryCleanup.includes('"agent-docs"') ||
    !marketplaceAfterTemporaryCleanup.includes("agent-docs-v0.2.0")
  ) {
    throw new Error("Marketplace was not usable after disposable extraction cleanup.");
  }
  const installedAfterTemporaryCleanup = runCodex(["plugin", "list", "--json"]);
  if (!installedAfterTemporaryCleanup.includes('"agent-docs"')) {
    throw new Error("Installed plugin was not usable after disposable extraction cleanup.");
  }

  json(runCodex(["plugin", "remove", "agent-docs@agent-docs", "--json"]));
  json(runCodex(["plugin", "marketplace", "remove", "agent-docs", "--json"]));
  const remaining = runCodex(["plugin", "list", "--json"]);
  if (remaining.includes('"agent-docs"'))
    throw new Error("Plugin remained after isolated removal.");
  console.log(
    "Persistent Marketplace install, untrusted-by-default state, disposable cleanup, fresh-process readback, direct hook workflow, Stop repair, and isolated removal smoke test passed.",
  );
} finally {
  await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await rm(isolatedCodexHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await rm(smokeRepo, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
