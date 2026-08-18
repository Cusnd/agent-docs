import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, open, readFile, readdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { ID_PATTERNS, LOCK_STALE_MS, SESSION_STATUSES } from "./constants.mjs";
import { hashAgentDocs, hashAgentDocsControl } from "./repo.mjs";

function safeKey(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export function receiptIdentity(input = {}) {
  const value =
    input.turn_id ??
    input.turnId ??
    input.prompt_id ??
    input.promptId ??
    input.session_id ??
    input.sessionId;
  return value ? String(value) : null;
}

export function metadataRoot(repo) {
  return path.join(repo.gitDir, "agent-docs");
}

function fingerprint(...values) {
  const normalized = values.map((value) => {
    const text = String(value);
    return process.platform === "win32" ? text.toLowerCase() : text;
  });
  return createHash("sha256").update(normalized.join("\0")).digest("hex");
}

function samePath(left, right) {
  const first = path.resolve(String(left));
  const second = path.resolve(String(right));
  return process.platform === "win32"
    ? first.toLowerCase() === second.toLowerCase()
    : first === second;
}

function assertReceiptBinding(repo, receipt) {
  if (receipt.schema_version === 1) {
    if (!receipt.repository || !samePath(receipt.repository, repo.root)) {
      throw new Error("Turn Receipt belongs to a different repository or worktree.");
    }
    return;
  }
  if (receipt.schema_version !== 2) {
    throw new Error(`Unsupported Turn Receipt schema: ${receipt.schema_version}.`);
  }
  if (
    receipt.repository_fingerprint !== fingerprint(repo.root, repo.commonDir) ||
    receipt.worktree_fingerprint !== fingerprint(repo.gitDir)
  ) {
    throw new Error("Turn Receipt belongs to a different repository or worktree.");
  }
}

export function receiptPath(repo, identity) {
  return path.join(
    metadataRoot(repo),
    "receipts",
    `${safeKey(String(identity).toLowerCase())}.json`,
  );
}

function legacyReceiptPath(repo, identity) {
  return path.join(metadataRoot(repo), "receipts", `${safeKey(identity)}.json`);
}

async function readReceiptLocation(repo, identity) {
  const normalized = String(identity).toLowerCase();
  const primary = receiptPath(repo, normalized);
  const current = await readJson(primary, { optional: true });
  if (current) return { file: primary, receipt: current };
  if (String(identity) !== normalized) {
    const legacy = legacyReceiptPath(repo, identity);
    const receipt = await readJson(legacy, { optional: true });
    if (receipt) return { file: legacy, receipt };
  }
  return { file: primary, receipt: null };
}

function sessionIndexPath(repo, sessionId) {
  return path.join(metadataRoot(repo), "session-index", `${safeKey(sessionId)}.json`);
}

async function writeSessionIndex(repo, sessionId, identity, updatedAt) {
  if (!sessionId) return;
  await writeJson(sessionIndexPath(repo, sessionId), {
    schema_version: 1,
    session_id: String(sessionId),
    identity,
    updated_at: updatedAt,
  });
}

export async function atomicWrite(
  file,
  contents,
  { renameOperation = rename, removeOperation = rm, waitOperation = sleep } = {},
) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.${randomBytes(8).toString("hex")}.tmp`;
  let handle = null;
  try {
    handle = await open(temporary, "wx");
    await handle.writeFile(contents, typeof contents === "string" ? "utf8" : undefined);
    await handle.sync();
    await handle.close();
    handle = null;

    let renamed = false;
    let lastError = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        await renameOperation(temporary, file);
        renamed = true;
        break;
      } catch (error) {
        lastError = error;
        if (!["EPERM", "EACCES", "EBUSY", "ENOTEMPTY"].includes(error.code) || attempt === 5) {
          throw error;
        }
        await waitOperation(25 * 2 ** attempt);
      }
    }
    if (!renamed) throw lastError ?? new Error(`Unable to atomically replace ${file}.`);

    if (process.platform !== "win32") {
      const parent = await open(path.dirname(file), "r");
      try {
        await parent.sync();
      } finally {
        await parent.close();
      }
    }
  } finally {
    if (handle) await handle.close().catch(() => {});
    await removeOperation(temporary, { force: true, maxRetries: 5, retryDelay: 100 }).catch(
      () => {},
    );
  }
}

export async function writeJson(file, value) {
  await atomicWrite(file, `${JSON.stringify(value, null, 2)}\n`);
}

export async function atomicWriteMany(updates) {
  const files = updates.map((update) => path.resolve(update.file));
  if (new Set(files).size !== files.length) {
    throw new Error("An atomic write transaction contains duplicate target paths.");
  }
  const snapshots = [];
  for (const update of updates) {
    try {
      snapshots.push({ file: update.file, existed: true, contents: await readFile(update.file) });
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      snapshots.push({ file: update.file, existed: false, contents: null });
    }
  }

  let completed = 0;
  try {
    for (const update of updates) {
      await atomicWrite(update.file, update.contents);
      completed += 1;
    }
  } catch (error) {
    for (const snapshot of snapshots.slice(0, completed).reverse()) {
      if (snapshot.existed) await atomicWrite(snapshot.file, snapshot.contents).catch(() => {});
      else await rm(snapshot.file, { force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {});
    }
    throw error;
  }
}

export async function readJson(file, { optional = false } = {}) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (optional && error.code === "ENOENT") return null;
    throw error;
  }
}

export async function createPendingReceipt(repo, input) {
  const explicitTurn = input.turn_id ?? input.turnId ?? input.prompt_id ?? input.promptId;
  const sessionId = input.session_id ?? input.sessionId;
  if (!explicitTurn && !sessionId) throw new Error("Hook input has no turn_id or session_id.");
  if (explicitTurn && !ID_PATTERNS.receipt.test(String(explicitTurn))) {
    throw new Error(`Invalid Receipt ID: ${explicitTurn}`);
  }
  const now = new Date().toISOString();
  const identity = explicitTurn ? String(explicitTurn).toLowerCase() : randomUUID();
  const file = receiptPath(repo, identity);
  const existing = (await readReceiptLocation(repo, explicitTurn ?? identity)).receipt;
  if (existing) {
    assertReceiptBinding(repo, existing);
    await writeSessionIndex(repo, sessionId, existing.identity, existing.updated_at);
    return existing;
  }
  const receipt = {
    schema_version: 2,
    identity,
    state: "pending",
    session_id: sessionId ?? null,
    turn_id: input.turn_id ?? input.turnId ?? null,
    model: input.model ?? null,
    repository: repo.root,
    repository_fingerprint: fingerprint(repo.root, repo.commonDir),
    worktree_fingerprint: fingerprint(repo.gitDir),
    branch: repo.branch,
    start_head: repo.head,
    baseline_control_hash: await hashAgentDocsControl(repo.root),
    created_at: now,
    updated_at: now,
  };
  await writeJson(file, receipt);
  await writeSessionIndex(repo, sessionId, identity, now);
  return receipt;
}

export async function loadReceipt(repo, identity) {
  if (!identity) return null;
  const receipt = (await readReceiptLocation(repo, identity)).receipt;
  if (receipt) assertReceiptBinding(repo, receipt);
  return receipt;
}

export async function findReceiptForHook(repo, input) {
  const identity = receiptIdentity(input);
  if (identity && ID_PATTERNS.receipt.test(identity)) {
    const direct = await loadReceipt(repo, identity);
    if (direct) return direct;
  }
  const sessionId = input.session_id ?? input.sessionId;
  if (!sessionId) return null;
  let index;
  try {
    index = await readJson(sessionIndexPath(repo, sessionId), { optional: true });
  } catch {
    return null;
  }
  if (index?.identity && ID_PATTERNS.receipt.test(index.identity)) {
    const indexed = await loadReceipt(repo, index.identity);
    if (indexed?.session_id === sessionId) return indexed;
  }
  return null;
}

async function withReceiptMutationLock(repo, identity, action) {
  const owner = `receipt-${String(identity).toLowerCase()}-${randomBytes(6).toString("hex")}`;
  const attempts = 16;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const lock = await acquireRequirementsLock(repo, owner);
    if (lock.acquired) {
      try {
        return await action();
      } finally {
        await releaseRequirementsLock(repo, owner, lock.token);
      }
    }
    await sleep(Math.min(25 * 2 ** attempt, 400));
  }
  const error = new Error("Requirements lock remained busy while updating the Turn Receipt.");
  error.code = "EBUSY";
  throw error;
}

async function resolveReceiptUnlocked(repo, identity, state, closure = null) {
  if (!["closed", "not-material"].includes(state)) {
    throw new Error("Receipt state must be closed or not-material.");
  }
  const session = typeof closure === "string" ? closure : (closure?.session ?? null);
  const normalizedIdentity = String(identity).toLowerCase();
  const { file, receipt } = await readReceiptLocation(repo, identity);
  if (!receipt) throw new Error(`No Turn Receipt found for ${identity}.`);
  assertReceiptBinding(repo, receipt);
  if (String(receipt.identity).toLowerCase() !== normalizedIdentity)
    throw new Error("Turn Receipt identity does not match its lookup key.");
  if (receipt.state !== "pending") {
    const identical =
      receipt.state === state &&
      (state !== "closed" || (receipt.session ?? null) === (session ?? null));
    if (identical) return receipt;
    throw new Error(
      `Turn Receipt ${identity} is already resolved as ${receipt.state}; terminal state is immutable.`,
    );
  }
  const current =
    receipt.schema_version === 1
      ? await hashAgentDocs(repo.root)
      : await hashAgentDocsControl(repo.root);
  const baseline =
    receipt.schema_version === 1 ? receipt.baseline_docs_hash : receipt.baseline_control_hash;
  if (state === "not-material") {
    if (current !== baseline) {
      throw new Error("Agent Docs changed during this turn; close it with a Work Session instead.");
    }
  } else {
    if (current === baseline) {
      throw new Error(
        "Agent Docs did not change during this turn; resolve it as not-material instead.",
      );
    }
    if (!closure || typeof closure === "string") {
      throw new Error("Closing a material Turn Receipt requires parsed Work Session evidence.");
    }
    if (!ID_PATTERNS.session.test(session ?? "")) {
      throw new Error(`Invalid Work Session ID: ${session}`);
    }
    if (!SESSION_STATUSES.includes(closure.status)) {
      throw new Error(`Invalid Work Session status: ${closure.status}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(closure.closedAt ?? "")) {
      throw new Error(`Invalid Work Session closed timestamp: ${closure.closedAt}`);
    }
    if (Date.parse(closure.closedAt) < Date.parse(receipt.created_at)) {
      throw new Error(
        `Work Session ${session} predates this Turn Receipt and cannot close the current turn.`,
      );
    }
    if (
      !Array.isArray(closure.requirements) ||
      closure.requirements.length === 0 ||
      closure.requirements.some((id) => !ID_PATTERNS.requirement.test(id))
    ) {
      throw new Error(`Work Session ${session} must reference a valid current Requirement.`);
    }
  }
  receipt.state = state;
  receipt.session = session;
  if (state === "closed") receipt.requirements = [...closure.requirements];
  receipt.updated_at = new Date().toISOString();
  await writeJson(file, receipt);
  return receipt;
}

export async function resolveReceipt(repo, identity, state, closure = null) {
  return withReceiptMutationLock(repo, identity, () =>
    resolveReceiptUnlocked(repo, identity, state, closure),
  );
}

export async function closeReceiptWithHealthWarning(repo, identity) {
  return withReceiptMutationLock(repo, identity, async () => {
    const { file, receipt } = await readReceiptLocation(repo, identity);
    if (!receipt || receipt.state !== "pending") return receipt;
    receipt.state = "closed";
    receipt.resolution = "health-warning";
    receipt.updated_at = new Date().toISOString();
    await writeJson(file, receipt);
    return receipt;
  });
}

export async function writeHealthWarning(repo, input, receipt, reason) {
  const warning = {
    timestamp: new Date().toISOString(),
    code: "AGENT_DOCS_STOP_RETRY_EXHAUSTED",
    reason,
    identity: receipt?.identity ?? receiptIdentity(input),
    session_id: input.session_id ?? input.sessionId ?? null,
    repository: repo.root,
  };
  const directory = path.join(metadataRoot(repo), "health");
  await mkdir(directory, { recursive: true });
  const stamp = warning.timestamp.replaceAll(/[-:.TZ]/g, "");
  const file = path.join(directory, `${stamp}-${randomBytes(8).toString("hex")}.json`);
  await writeJson(file, warning);
  return warning;
}

export async function readHealthStatus(repo) {
  const directory = path.join(metadataRoot(repo), "health");
  let names;
  try {
    names = await readdir(directory);
  } catch (error) {
    if (error.code === "ENOENT") return { count: 0, invalid_files: 0, warnings: [] };
    throw error;
  }
  const warnings = [];
  let invalidFiles = 0;
  for (const name of names.sort()) {
    const file = path.join(directory, name);
    try {
      const content = await readFile(file, "utf8");
      if (name.endsWith(".json")) warnings.push(JSON.parse(content));
      else if (name.endsWith(".jsonl")) {
        for (const line of content.split(/\r?\n/).filter(Boolean)) warnings.push(JSON.parse(line));
      }
    } catch {
      invalidFiles += 1;
    }
  }
  warnings.sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));
  return {
    count: warnings.length,
    invalid_files: invalidFiles,
    warnings: warnings.slice(0, 20),
  };
}

function lockFile(repo) {
  return path.join(metadataRoot(repo), "locks", "requirements.lock");
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function quarantinePath(lock, purpose) {
  return `${lock}.${purpose}-${process.pid}-${Date.now()}-${randomBytes(6).toString("hex")}`;
}

async function removeLockWithRetry(target) {
  await rm(target, {
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  });
}

async function createLockRecord(lock, owner) {
  const token = randomBytes(16).toString("hex");
  let handle;
  try {
    handle = await open(lock, "wx");
  } catch (error) {
    if (error.code === "EEXIST") return null;
    throw error;
  }
  try {
    await handle.writeFile(
      `${JSON.stringify(
        {
          owner,
          token,
          pid: process.pid,
          acquired_at: new Date().toISOString(),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await handle.sync();
    await handle.close();
    handle = null;
  } catch (error) {
    if (handle) await handle.close().catch(() => {});
    await removeLockWithRetry(lock).catch(() => {});
    throw error;
  }
  return token;
}

export async function acquireRequirementsLock(repo, owner) {
  if (!owner) throw new Error("A lock owner/turn ID is required.");
  const lock = lockFile(repo);
  await mkdir(path.dirname(lock), { recursive: true });
  let reclaimed = false;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const token = await createLockRecord(lock, owner);
    if (token) return { acquired: true, reclaimed, lock, owner, token };

    let record = null;
    try {
      record = await readJson(lock, { optional: true });
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
    let lockInfo = null;
    if (!record) {
      try {
        lockInfo = await stat(lock);
      } catch (statError) {
        if (statError.code === "ENOENT") {
          await sleep(10 * (attempt + 1));
          continue;
        }
        throw statError;
      }
    }
    const age = record?.acquired_at
      ? Date.now() - Date.parse(record.acquired_at)
      : Date.now() - lockInfo.mtimeMs;
    if (record?.owner === owner && record?.pid === process.pid) {
      return { acquired: true, reclaimed: false, lock, owner, token: record.token };
    }
    if (age <= LOCK_STALE_MS) {
      return { acquired: false, reclaimed: false, lock, owner: record?.owner ?? "unknown" };
    }
    reclaimed = true;

    const quarantine = quarantinePath(lock, "stale");
    try {
      await rename(lock, quarantine);
    } catch (error) {
      if (["ENOENT", "EEXIST", "EPERM", "EACCES", "EBUSY"].includes(error.code)) {
        await sleep(20 * (attempt + 1));
        continue;
      }
      throw error;
    }
    await removeLockWithRetry(quarantine);
    await sleep(10 * (attempt + 1));
  }
  let record = null;
  try {
    record = await readJson(lock, { optional: true });
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }
  return { acquired: false, reclaimed, lock, owner: record?.owner ?? "unknown" };
}

export async function releaseRequirementsLock(repo, owner, token) {
  if (!token)
    throw new Error("The acquisition token is required to release the Requirements lock.");
  const lock = lockFile(repo);
  const record = await readJson(lock, { optional: true });
  if (!record) return { released: false, reason: "not-held" };
  if (record.owner !== owner) {
    throw new Error(`Requirements lock is held by ${record.owner}, not ${owner}.`);
  }
  if (record.token !== token) {
    throw new Error("Requirements lock token does not match the current acquisition.");
  }
  const quarantine = quarantinePath(lock, "release");
  await rename(lock, quarantine);
  const moved = await readJson(quarantine);
  if (moved.owner !== owner || moved.token !== token) {
    await rename(quarantine, lock).catch(() => {});
    throw new Error("Requirements lock changed before release; it was not removed.");
  }
  await removeLockWithRetry(quarantine);
  return { released: true };
}
