#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  addRequirement,
  archiveRequirements,
  closeRequirement,
  createDecision,
  createSession,
  formatId,
  initializeDocs,
} from "./lib/documents.mjs";
import { runHook } from "./lib/hooks.mjs";
import { inspectRepository } from "./lib/repo.mjs";
import {
  acquireRequirementsLock,
  loadReceipt,
  readHealthStatus,
  releaseRequirementsLock,
  resolveReceipt,
} from "./lib/state.mjs";
import { formatValidation, validateAgentDocs } from "./lib/validator.mjs";
import { ID_PATTERNS, VERSION } from "./lib/constants.mjs";

const PLUGIN_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const isHookInvocation = argv[0] === "hook";
const OPERATOR_COMMANDS = new Set(["init", "status", "validate", "archive"]);

class CliError extends Error {
  constructor(message, { code = "INVALID_INVOCATION", exitCode = 2 } = {}) {
    super(message);
    this.code = code;
    this.exitCode = exitCode;
  }
}

function parseArgs(tokens) {
  const parsed = { _: [] };
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("--")) {
      parsed._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = tokens[index + 1];
    const value = next === undefined || next.startsWith("--") ? true : tokens[++index];
    if (parsed[key] === undefined) parsed[key] = value;
    else if (Array.isArray(parsed[key])) parsed[key].push(value);
    else parsed[key] = [parsed[key], value];
  }
  return parsed;
}

function one(options, name, fallback = undefined) {
  const value = options[name];
  return Array.isArray(value) ? value.at(-1) : (value ?? fallback);
}

function many(options, name, { comma = false } = {}) {
  const value = options[name];
  if (value === undefined || value === true) return [];
  const items = Array.isArray(value) ? value : [value];
  return comma
    ? items
        .flatMap((item) => String(item).split(","))
        .map((item) => item.trim())
        .filter(Boolean)
    : items.map(String);
}

function required(options, name) {
  const value = one(options, name);
  if (!value || value === true) throw new Error(`--${name} is required.`);
  return String(value);
}

function recordMetadata(content, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return content.match(new RegExp(`^- \\*\\*${escaped}:\\*\\*\\s*(.+)$`, "m"))?.[1]?.trim() ?? "";
}

function print(value, asJson = false) {
  if (typeof value === "string" && !asJson) console.log(value);
  else console.log(JSON.stringify(value, null, 2));
}

function successEnvelope(command, data) {
  return { schema_version: 1, command, ok: true, data };
}

function errorEnvelope(command, code, message, extra = {}) {
  return { schema_version: 1, command, ok: false, error: { code, message, ...extra } };
}

function rejectUnknownOptions(command, options, allowed) {
  const unknown = Object.keys(options).filter((key) => key !== "_" && !allowed.includes(key));
  if (unknown.length) {
    throw new CliError(`Unknown option for ${command}: --${unknown[0]}`);
  }
  if (options._.length) {
    throw new CliError(`Unexpected positional argument for ${command}: ${options._[0]}`);
  }
}

function printOperator(command, data, options, text) {
  if (options.json) print(successEnvelope(command, data), true);
  else print(text ?? data, typeof (text ?? data) !== "string");
}

async function stdinJson() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  if (!input.trim()) return {};
  return JSON.parse(input);
}

async function eligibleRepo(cwd = process.cwd()) {
  const repo = await inspectRepository(cwd);
  if (!repo.eligible) {
    const transient = [
      "git-not-found",
      "git-timeout",
      "git-dubious-ownership",
      "git-failed",
    ].includes(repo.reason);
    throw new CliError(`Agent Docs is inactive here: ${repo.reason}.`, {
      code: transient ? "REPOSITORY_PROBE_FAILED" : "INELIGIBLE_REPOSITORY",
      exitCode: transient ? 3 : 1,
    });
  }
  return repo;
}

async function wait(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function withRequirementsLock(repo, owner, action) {
  let result = await acquireRequirementsLock(repo, owner);
  if (!result.acquired) {
    await wait(200);
    result = await acquireRequirementsLock(repo, owner);
  }
  if (!result.acquired)
    throw new Error(`Requirements lock is held by ${result.owner}; reread and retry later.`);
  try {
    return await action();
  } finally {
    await releaseRequirementsLock(repo, owner, result.token);
  }
}

function usage() {
  return `Agent Docs ${VERSION}

Usage:
  agent-docs --version
  agent-docs init [--json]
  agent-docs id <requirement|session|decision>
  agent-docs status [--turn-id ID] [--json]
  agent-docs lock <acquire|release> --turn-id ID
  agent-docs requirement new --summary TEXT [--criteria TEXT ...] [--priority P2] [--turn-id ID]
  agent-docs requirement close --id R-... --status Done|Dropped|Superseded --session S-... [--evidence TEXT]
  agent-docs session new --requirements R-...[,R-...] --goal TEXT --status STATUS [detail options]
  agent-docs decision new --requirements R-... --title TEXT [detail options]
  agent-docs archive [--json]
  agent-docs validate [--json]
  agent-docs receipt resolve --turn-id ID --state closed|not-material [--session S-...]

Stable operator commands are init, status, validate, and archive.
Exit codes: 0 success, 1 invalid records, 2 invocation/configuration, 3 transient Git/filesystem/lock, 4 unexpected.
All timestamps and allocated IDs use UTC. Agent Docs never commits changes.`;
}

async function main() {
  const command = argv[0];
  if (!command || command === "help" || command === "--help" || command === "-h") {
    print(usage());
    return;
  }
  if (command === "--version" || command === "version") {
    print(VERSION);
    return;
  }

  if (command === "hook") {
    const event = argv[1];
    if (!event) throw new Error("Hook event name is required.");
    print(await runHook(event, await stdinJson(), PLUGIN_ROOT), true);
    return;
  }

  const options = parseArgs(argv.slice(1));
  const repo = await eligibleRepo(one(options, "cwd", process.cwd()));

  if (command === "init") {
    rejectUnknownOptions(command, options, ["cwd", "json"]);
    const result = await initializeDocs(repo, PLUGIN_ROOT);
    const text = result.initialized
      ? `Initialized Agent Docs: ${result.created.join(", ")}`
      : "Agent Docs is already initialized.";
    printOperator(command, result, options, text);
    return;
  }

  if (command === "id") {
    const kind = options._[0];
    if (!kind) throw new Error("ID kind is required.");
    print(formatId(kind));
    return;
  }

  if (command === "status") {
    rejectUnknownOptions(command, options, ["cwd", "turn-id", "json"]);
    const turnId = one(options, "turn-id");
    if (turnId && !ID_PATTERNS.receipt.test(String(turnId))) {
      throw new CliError(`Invalid Receipt ID: ${turnId}`);
    }
    const result = {
      eligible: true,
      repository: repo.root,
      branch: repo.branch,
      head: repo.head,
      health: await readHealthStatus(repo),
      ...(turnId ? { receipt: await loadReceipt(repo, String(turnId)) } : {}),
    };
    printOperator(
      command,
      result,
      options,
      `Agent Docs active on ${result.branch} at ${result.head}.`,
    );
    return;
  }

  if (command === "lock") {
    const operation = options._[0];
    const owner = required(options, "turn-id");
    if (operation === "acquire") {
      const result = await acquireRequirementsLock(repo, owner);
      print(result, true);
      if (!result.acquired) process.exitCode = 2;
    } else if (operation === "release") {
      print(await releaseRequirementsLock(repo, owner, required(options, "token")), true);
    } else throw new Error("Lock operation must be acquire or release.");
    return;
  }

  if (command === "requirement") {
    const operation = options._[0];
    const owner = String(one(options, "turn-id", `manual-${process.pid}`));
    if (operation === "new") {
      const result = await withRequirementsLock(repo, owner, () =>
        addRequirement(repo, {
          id: one(options, "id"),
          summary: required(options, "summary"),
          priority: one(options, "priority", "P2"),
          status: one(options, "status", "Todo"),
          criteria: many(options, "criteria"),
          supersedes: one(options, "supersedes"),
          nextStep: one(options, "next-step"),
        }),
      );
      print(result, true);
      return;
    }
    if (operation === "close") {
      const result = await withRequirementsLock(repo, owner, () =>
        closeRequirement(repo, PLUGIN_ROOT, {
          id: required(options, "id"),
          status: required(options, "status"),
          session: required(options, "session"),
          evidence: one(options, "evidence"),
        }),
      );
      print(result, true);
      return;
    }
    throw new Error("Requirement operation must be new or close.");
  }

  if (command === "session") {
    if (options._[0] !== "new") throw new Error("Session operation must be new.");
    const result = await createSession(repo, PLUGIN_ROOT, {
      id: one(options, "id"),
      requirements: many(options, "requirements", { comma: true }),
      status: one(options, "status", "Partial"),
      goal: required(options, "goal"),
      changes: many(options, "change"),
      files: many(options, "file"),
      verification: one(options, "verification"),
      verificationResult: one(options, "verification-result"),
      verificationEvidence: one(options, "verification-evidence"),
      result: one(options, "result"),
      commit: one(options, "commit"),
      nextStep: one(options, "next-step"),
      executor: one(options, "executor"),
      startHead: one(options, "start-head"),
    });
    print(result, true);
    return;
  }

  if (command === "decision") {
    if (options._[0] !== "new") throw new Error("Decision operation must be new.");
    const result = await createDecision(repo, PLUGIN_ROOT, {
      id: one(options, "id"),
      requirements: many(options, "requirements", { comma: true }),
      title: required(options, "title"),
      supersedes: one(options, "supersedes"),
      context: one(options, "context"),
      decision: one(options, "decision"),
      tradeoffs: one(options, "trade-offs"),
      consequences: one(options, "consequences"),
    });
    print(result, true);
    return;
  }

  if (command === "archive") {
    rejectUnknownOptions(command, options, ["cwd", "turn-id", "json"]);
    const owner = String(one(options, "turn-id", `manual-${process.pid}`));
    const result = await withRequirementsLock(repo, owner, () =>
      archiveRequirements(repo, PLUGIN_ROOT),
    );
    printOperator(
      command,
      result,
      options,
      result.archived
        ? `Archived ${result.archived} Requirement(s).`
        : "No Requirements needed archival.",
    );
    return;
  }

  if (command === "validate") {
    rejectUnknownOptions(command, options, ["cwd", "json"]);
    const result = await validateAgentDocs(repo);
    if (options.json) {
      if (result.valid) print(successEnvelope(command, result), true);
      else {
        print(
          errorEnvelope(command, "VALIDATION_FAILED", "Agent Docs validation failed.", {
            issues: result.issues,
            counts: result.counts,
          }),
          true,
        );
      }
    } else print(formatValidation(result));
    if (!result.valid) process.exitCode = 1;
    return;
  }

  if (command === "receipt") {
    if (options._[0] !== "resolve") throw new Error("Receipt operation must be resolve.");
    const identity = required(options, "turn-id");
    if (!ID_PATTERNS.receipt.test(identity)) throw new Error(`Invalid Receipt ID: ${identity}`);
    const state = required(options, "state");
    const session = one(options, "session");
    if (state === "closed") {
      if (!session) throw new Error("--session is required when closing a material Turn Receipt.");
      if (!ID_PATTERNS.session.test(String(session))) {
        throw new Error(`Invalid Work Session ID: ${session}`);
      }
      const result = await validateAgentDocs(repo);
      if (!result.valid)
        throw new Error(
          `Agent Docs validation failed; fix it before closing the receipt.\n${formatValidation(result)}`,
        );
      const folder = `${String(session).slice(2, 6)}-${String(session).slice(6, 8)}`;
      const sessionContent = await readFile(
        path.join(repo.root, "docs", "agent", "sessions", folder, `${session}.md`),
        "utf8",
      );
      const sessionRequirements = recordMetadata(sessionContent, "Requirements")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      print(
        await resolveReceipt(repo, identity, state, {
          session: String(session),
          closedAt: recordMetadata(sessionContent, "Closed"),
          status: recordMetadata(sessionContent, "Status"),
          requirements: sessionRequirements,
        }),
        true,
      );
      return;
    }
    print(await resolveReceipt(repo, identity, state), true);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  if (isHookInvocation) {
    console.log(JSON.stringify({ systemMessage: `Agent Docs hook warning: ${error.message}` }));
    process.exitCode = 0;
  } else {
    const command = argv[0] ?? "unknown";
    const asJson = OPERATOR_COMMANDS.has(command) && argv.includes("--json");
    const transient =
      /^(?:GIT_|NOT_GIT_REPOSITORY)/.test(error.code ?? "") ||
      ["EBUSY", "EPERM", "EACCES", "ETIMEDOUT"].includes(error.code) ||
      /requirements lock/i.test(error.message);
    const invocation =
      /unknown command| is required|^invalid .* id|^invalid (?:active |session )?(?:status|priority)|unknown .* kind/i.test(
        error.message,
      );
    const invalidRecords =
      /done requires|must have status done|does not reference|validation failed|not initialized|unsafe .*path|symbolic link|junction|marker|closed requirement|archive rows|malformed|referenced .* not found|must reference|acceptance criterion|concrete evidence/i.test(
        error.message,
      );
    const exitCode = error.exitCode ?? (transient ? 3 : invocation ? 2 : invalidRecords ? 1 : 4);
    const code = error.code ?? (exitCode === 3 ? "TRANSIENT_FAILURE" : "UNEXPECTED_ERROR");
    if (asJson) print(errorEnvelope(command, code, error.message), true);
    else console.error(`Agent Docs: ${error.message}`);
    process.exitCode = exitCode;
  }
});
