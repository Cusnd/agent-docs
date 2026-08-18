import { randomBytes } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ACTIVE_REQUIREMENT_STATUSES,
  DOCS_DIR,
  ID_PATTERNS,
  MARKERS,
  MAX_RECENT_CLOSED,
  PRIORITIES,
  SESSION_STATUSES,
  TERMINAL_REQUIREMENT_STATUSES,
} from "./constants.mjs";
import { fileExists, git } from "./repo.mjs";
import { assertSafeAgentDocsPath, ensureSafeAgentDocsDirectory } from "./safe-path.mjs";
import { atomicWrite, atomicWriteMany } from "./state.mjs";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const HEAD_VALUE = /^(?:[0-9a-f]{40,64}|UNBORN)$/;

function suffix() {
  const bytes = randomBytes(4);
  return [...bytes].map((value) => ALPHABET[value % ALPHABET.length]).join("");
}

function dateParts(date) {
  const iso = date.toISOString();
  return {
    day: iso.slice(0, 10).replaceAll("-", ""),
    hour: iso.slice(11, 19).replaceAll(":", ""),
    minute: iso.slice(11, 16).replaceAll(":", ""),
  };
}

export function formatId(kind, date = new Date(), randomSuffix = suffix()) {
  const parts = dateParts(date);
  if (kind === "requirement") return `R-${parts.day}-${parts.hour}-${randomSuffix}`;
  if (kind === "session") return `S-${parts.day}-${parts.hour}-${randomSuffix}`;
  if (kind === "decision") return `D-${parts.day}-${parts.minute}-${randomSuffix}`;
  throw new Error(`Unknown ID kind: ${kind}`);
}

function templatesRoot(pluginRoot) {
  return path.join(pluginRoot, "protocol", "assets", "templates");
}

export async function readTemplate(pluginRoot, name) {
  return readFile(path.join(templatesRoot(pluginRoot), name), "utf8");
}

async function safeAgentFile(repo, ...segments) {
  const file = path.join(repo.root, "docs", "agent", ...segments);
  await assertSafeAgentDocsPath(repo, file);
  return file;
}

async function safeAtomicWrite(repo, file, contents) {
  await assertSafeAgentDocsPath(repo, file);
  await atomicWrite(file, contents);
  await assertSafeAgentDocsPath(repo, file);
}

async function safeAtomicWriteMany(repo, updates) {
  for (const update of updates) await assertSafeAgentDocsPath(repo, update.file);
  await atomicWriteMany(updates);
  for (const update of updates) await assertSafeAgentDocsPath(repo, update.file);
}

async function safeExclusiveWrite(repo, file, contents) {
  await ensureSafeAgentDocsDirectory(repo, path.dirname(file));
  await assertSafeAgentDocsPath(repo, file);
  await writeFile(file, contents, { encoding: "utf8", flag: "wx" });
  await assertSafeAgentDocsPath(repo, file);
}

export async function initializeDocs(repo, pluginRoot) {
  const target = path.join(repo.root, ...DOCS_DIR.split("/"));
  await ensureSafeAgentDocsDirectory(repo, target);
  await ensureSafeAgentDocsDirectory(repo, path.join(target, "sessions"));
  await ensureSafeAgentDocsDirectory(repo, path.join(target, "decisions"));
  await ensureSafeAgentDocsDirectory(repo, path.join(target, "archive", "requirements"));

  const created = [];
  const initializedAt = new Date().toISOString();
  for (const name of ["manifest.json", "requirements.md"]) {
    const output = path.join(target, name);
    await assertSafeAgentDocsPath(repo, output);
    if (await fileExists(output)) continue;
    const source = (await readTemplate(pluginRoot, name)).replaceAll(
      "{{INITIALIZED_AT}}",
      initializedAt,
    );
    await safeExclusiveWrite(repo, output, source);
    created.push(path.relative(repo.root, output).replaceAll(path.sep, "/"));
  }
  return { initialized: created.length > 0, created };
}

export async function requireInitialized(repo) {
  const file = await safeAgentFile(repo, "manifest.json");
  if (!(await fileExists(file))) {
    throw new Error("Agent Docs is not initialized. Run `agent-docs init` for material work.");
  }
}

function replaceBetween(text, start, end, body) {
  const startIndex = text.indexOf(start);
  const endIndex = text.indexOf(end);
  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
    throw new Error(`Required marker pair is missing: ${start} / ${end}`);
  }
  return `${text.slice(0, startIndex + start.length)}\n${body}${text.slice(endIndex)}`;
}

function markerBody(text, start, end) {
  const startIndex = text.indexOf(start);
  const endIndex = text.indexOf(end);
  if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) {
    throw new Error(`Required marker pair is missing: ${start} / ${end}`);
  }
  return text.slice(startIndex + start.length, endIndex).trim();
}

function inlineText(value) {
  return (
    String(value)
      .replace(/\r\n?|\n/gu, " ")
      // Repository metadata and headings cannot retain ASCII controls.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .replaceAll("<!--", "&lt;!--")
      .replaceAll("-->", "--&gt;")
      .replace(/ {2,}/gu, " ")
      .trim()
  );
}

function blockText(value) {
  return (
    String(value)
      .replace(/\r\n?/gu, "\n")
      // Keep newlines but reject the remaining ASCII controls in generated Markdown.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, " ")
      .replaceAll("<!--", "&lt;!--")
      .replaceAll("-->", "--&gt;")
      .trim()
  );
}

function escapeCell(value) {
  return inlineText(value).replaceAll("\\", "\\\\").replaceAll("|", "\\|");
}

function field(block, label) {
  const match = block.match(new RegExp(`^- \\*\\*${label}:\\*\\*\\s*(.+)$`, "m"));
  return match?.[1]?.trim() ?? "";
}

async function requirementIds(repo) {
  const file = await safeAgentFile(repo, "requirements.md");
  const content = await readFile(file, "utf8");
  const ids = new Set();
  for (const match of content.matchAll(
    /<!-- agent-docs:req:(R-\d{8}-\d{6}-[A-Z0-9]{4}):start -->/g,
  )) {
    ids.add(match[1]);
  }
  for (const row of tableRows(content)) {
    const id = row.match(/^\|\s*(R-\d{8}-\d{6}-[A-Z0-9]{4})\s*\|/)?.[1];
    if (id) ids.add(id);
  }
  return ids;
}

async function assertRequirementReferences(repo, references) {
  for (const id of references) {
    if (!ID_PATTERNS.requirement.test(id)) throw new Error(`Invalid Requirement ID: ${id}`);
  }
  const existing = await requirementIds(repo);
  for (const id of references) {
    if (!existing.has(id)) throw new Error(`Referenced Requirement not found: ${id}`);
  }
}

async function assertDecisionReference(repo, id) {
  if (!ID_PATTERNS.decision.test(id)) throw new Error(`Invalid Decision ID: ${id}`);
  const directory = await safeAgentFile(repo, "decisions");
  const names = await readdir(directory);
  if (!names.includes(`${id}.md`)) throw new Error(`Referenced Decision not found: ${id}`);
}

function section(block, heading, nextHeadings = []) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stop = nextHeadings.length
    ? `(?=^#### (?:${nextHeadings.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*$)`
    : "(?=^<!-- agent-docs:req:|(?![\\s\\S]))";
  const match = block.match(new RegExp(`^#### ${escaped}\\s*$\\n([\\s\\S]*?)${stop}`, "m"));
  return match?.[1]?.trim() ?? "";
}

export async function addRequirement(repo, options) {
  await requireInitialized(repo);
  const priority = options.priority || "P2";
  const status = options.status || "Todo";
  if (!PRIORITIES.includes(priority)) throw new Error(`Invalid priority: ${priority}`);
  if (!ACTIVE_REQUIREMENT_STATUSES.includes(status))
    throw new Error(`Invalid active status: ${status}`);
  const id = options.id || formatId("requirement");
  if (!ID_PATTERNS.requirement.test(id)) throw new Error(`Invalid Requirement ID: ${id}`);
  if (options.supersedes) await assertRequirementReferences(repo, [options.supersedes]);
  const now = new Date().toISOString();
  const summary = inlineText(options.summary);
  if (!summary) throw new Error("Requirement summary cannot be empty.");
  const criteria = (
    options.criteria?.length ? options.criteria : ["Define observable completion conditions."]
  )
    .map((item) => `- [ ] ${inlineText(item)}`)
    .join("\n");
  const block = [
    `<!-- agent-docs:req:${id}:start -->`,
    `### ${id}: ${summary}`,
    "",
    `- **Created:** ${now}`,
    `- **Updated:** ${now}`,
    `- **Summary:** ${summary}`,
    `- **Priority:** ${priority}`,
    `- **Status:** ${status}`,
    `- **Supersedes:** ${options.supersedes || "None"}`,
    "",
    "#### Acceptance Criteria",
    "",
    criteria,
    "",
    "#### Evidence",
    "",
    "- None yet.",
    "",
    "#### Next Step",
    "",
    inlineText(options.nextStep || "Confirm criteria before material implementation."),
    "",
    "#### Related Sessions",
    "",
    "- None yet.",
    `<!-- agent-docs:req:${id}:end -->`,
  ].join("\n");

  const file = await safeAgentFile(repo, "requirements.md");
  const original = await readFile(file, "utf8");
  assertPreparedRequirementsDocument(original);
  if (original.includes(`agent-docs:req:${id}:`))
    throw new Error(`Requirement already exists: ${id}`);
  const current = markerBody(original, MARKERS.activeStart, MARKERS.activeEnd);
  const body = current ? `${current}\n\n${block}\n` : `${block}\n`;
  const target = replaceBetween(original, MARKERS.activeStart, MARKERS.activeEnd, body);
  assertPreparedRequirementsDocument(target);
  await safeAtomicWrite(repo, file, target);
  return { id, file: path.relative(repo.root, file).replaceAll(path.sep, "/") };
}

function tableHeader() {
  return [
    "| ID | Closed (UTC) | Status | Summary | Evidence | Session |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
}

export function tableRows(body) {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !/^\|\s*(?:ID|---)\s*\|/.test(line));
}

function splitTableRow(row) {
  const cells = [];
  let current = "";
  let escaped = false;
  for (const character of row.trim().replace(/^\|/, "").replace(/\|$/, "")) {
    if (escaped) {
      current += character;
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (character === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  if (escaped) current += "\\";
  cells.push(current.trim());
  return cells;
}

function assertSingleMarkerPair(content, start, end, label) {
  const starts = content.split(start).length - 1;
  const ends = content.split(end).length - 1;
  const startIndex = content.indexOf(start);
  const endIndex = content.indexOf(end);
  if (starts !== 1 || ends !== 1 || startIndex < 0 || endIndex <= startIndex) {
    throw new Error(`${label} must contain exactly one ordered marker pair.`);
  }
  return { startIndex, endIndex };
}

function assertClosedRows(rows, { archiveYear = null, newestFirst = false } = {}) {
  let previous = null;
  const ids = new Set();
  for (const row of rows) {
    const cells = splitTableRow(row);
    if (cells.length !== 6) throw new Error("A closed Requirement row must have six columns.");
    const [id, closed, status, summary, evidence, session] = cells;
    if (!ID_PATTERNS.requirement.test(id)) throw new Error(`Invalid Requirement ID: ${id}`);
    if (ids.has(id)) throw new Error(`Requirement appears more than once: ${id}`);
    ids.add(id);
    if (!ISO_UTC.test(closed) || Number.isNaN(Date.parse(closed))) {
      throw new Error(`Invalid closed timestamp for ${id}: ${closed}`);
    }
    if (archiveYear && closed.slice(0, 4) !== archiveYear) {
      throw new Error(`${id} does not belong in the ${archiveYear} archive.`);
    }
    if (!TERMINAL_REQUIREMENT_STATUSES.includes(status)) {
      throw new Error(`Invalid terminal Requirement status for ${id}: ${status}`);
    }
    if (!summary || !evidence) throw new Error(`${id} needs a summary and evidence.`);
    if (!ID_PATTERNS.session.test(session)) {
      throw new Error(`Invalid closing Work Session ID: ${session}`);
    }
    if (previous) {
      const outOfOrder = newestFirst
        ? Date.parse(closed) > Date.parse(previous)
        : Date.parse(closed) < Date.parse(previous);
      if (outOfOrder) {
        throw new Error(
          newestFirst
            ? "Recently Closed rows must be newest first."
            : "Archive rows must be oldest first.",
        );
      }
    }
    previous = closed;
  }
  return ids;
}

function assertCanonicalClosedHeader(body) {
  const lines = body.split(/\r?\n/u).map((line) => line.trim());
  const expected = tableHeader();
  if (lines[0] !== expected[0] || lines[1] !== expected[1]) {
    throw new Error("The closed Requirement table has a malformed six-column header.");
  }
}

function assertPreparedRequirementsDocument(content, { allowOverflow = false } = {}) {
  const active = assertSingleMarkerPair(
    content,
    MARKERS.activeStart,
    MARKERS.activeEnd,
    "Active Requirements",
  );
  const closed = assertSingleMarkerPair(
    content,
    MARKERS.closedStart,
    MARKERS.closedEnd,
    "Recently Closed Requirements",
  );
  if (active.endIndex >= closed.startIndex) {
    throw new Error("Active and Recently Closed marker pairs are out of order.");
  }

  const tokens = [...content.matchAll(/^.*agent-docs:req:.*$/gmu)];
  const activeIds = new Set();
  let open = null;
  for (const token of tokens) {
    const exact = token[0]
      .trim()
      .match(/^<!-- agent-docs:req:(R-\d{8}-\d{6}-[A-Z0-9]{4}):(start|end) -->$/);
    if (!exact) throw new Error(`Invalid Requirement marker: ${token[0]}`);
    const [, id, type] = exact;
    if (token.index <= active.startIndex || token.index >= active.endIndex) {
      throw new Error(`${id} is outside the Active Requirements marker pair.`);
    }
    if (type === "start") {
      if (open) throw new Error(`Nested Requirement markers: ${open} and ${id}`);
      if (activeIds.has(id)) throw new Error(`Duplicate Requirement marker: ${id}`);
      activeIds.add(id);
      open = id;
    } else {
      if (open !== id) throw new Error(`Mismatched Requirement marker ending ${id}.`);
      open = null;
    }
  }
  if (open) throw new Error(`Requirement marker has no end: ${open}`);

  const closedBody = markerBody(content, MARKERS.closedStart, MARKERS.closedEnd);
  assertCanonicalClosedHeader(closedBody);
  const rows = tableRows(closedBody);
  if (!allowOverflow && rows.length > MAX_RECENT_CLOSED) {
    throw new Error(`Recently Closed has more than ${MAX_RECENT_CLOSED} rows.`);
  }
  const closedIds = assertClosedRows(rows, { newestFirst: true });
  for (const id of activeIds) {
    if (closedIds.has(id)) throw new Error(`Requirement is both active and closed: ${id}`);
    const start = `<!-- agent-docs:req:${id}:start -->`;
    const end = `<!-- agent-docs:req:${id}:end -->`;
    const block = content.slice(content.indexOf(start), content.indexOf(end) + end.length);
    if (!block.includes(`### ${id}:`)) throw new Error(`${id} has no matching heading.`);
  }
}

function assertPreparedArchiveDocument(content, year) {
  assertSingleMarkerPair(
    content,
    MARKERS.archiveStart,
    MARKERS.archiveEnd,
    `Requirement archive ${year}`,
  );
  const archiveBody = markerBody(content, MARKERS.archiveStart, MARKERS.archiveEnd);
  assertCanonicalClosedHeader(archiveBody);
  assertClosedRows(tableRows(archiveBody), {
    archiveYear: year,
  });
}

function rowTimestamp(row) {
  return Date.parse(row.match(/^\|\s*R-[^|]+\|\s*([^|]+)\|/)?.[1]?.trim() ?? "");
}

async function prepareArchiveRows(repo, pluginRoot, rows) {
  const grouped = new Map();
  for (const row of rows) {
    const match = row.match(/^\|\s*R-[^|]+\|\s*(\d{4})-/);
    if (!match) throw new Error(`Cannot determine archive year from row: ${row}`);
    if (!grouped.has(match[1])) grouped.set(match[1], []);
    grouped.get(match[1]).push(row);
  }
  const files = [];
  const updates = [];
  for (const [year, yearRows] of grouped) {
    const file = await safeAgentFile(repo, "archive", "requirements", `${year}.md`);
    await ensureSafeAgentDocsDirectory(repo, path.dirname(file));
    let content;
    if (await fileExists(file)) content = await readFile(file, "utf8");
    else content = (await readTemplate(pluginRoot, "archive.md")).replaceAll("{{YEAR}}", year);
    assertPreparedArchiveDocument(content, year);
    const existing = tableRows(markerBody(content, MARKERS.archiveStart, MARKERS.archiveEnd));
    const known = new Set(existing.map((row) => row.match(/^\|\s*(R-[^| ]+)/)?.[1]));
    const additions = yearRows
      .filter((row) => !known.has(row.match(/^\|\s*(R-[^| ]+)/)?.[1]))
      .sort((left, right) => rowTimestamp(left) - rowTimestamp(right));
    const body = [...tableHeader(), ...existing, ...additions].join("\n") + "\n";
    const target = replaceBetween(content, MARKERS.archiveStart, MARKERS.archiveEnd, body);
    assertPreparedArchiveDocument(target, year);
    updates.push({ file, contents: target });
    files.push(path.relative(repo.root, file).replaceAll(path.sep, "/"));
  }
  return { files, updates };
}

async function prepareArchive(repo, pluginRoot, requirementsContent) {
  const rows = tableRows(markerBody(requirementsContent, MARKERS.closedStart, MARKERS.closedEnd));
  const keep = rows.slice(0, MAX_RECENT_CLOSED);
  const overflow = rows.slice(MAX_RECENT_CLOSED);
  if (!overflow.length) {
    return { archived: 0, files: [], updates: [], requirementsContent };
  }
  const body = [...tableHeader(), ...keep].join("\n") + "\n";
  const archive = await prepareArchiveRows(repo, pluginRoot, overflow);
  return {
    archived: overflow.length,
    files: archive.files,
    updates: archive.updates,
    requirementsContent: replaceBetween(
      requirementsContent,
      MARKERS.closedStart,
      MARKERS.closedEnd,
      body,
    ),
  };
}

export async function archiveRequirements(repo, pluginRoot) {
  await requireInitialized(repo);
  const file = await safeAgentFile(repo, "requirements.md");
  const original = await readFile(file, "utf8");
  assertPreparedRequirementsDocument(original, { allowOverflow: true });
  const archive = await prepareArchive(repo, pluginRoot, original);
  if (!archive.archived) return { archived: 0, files: [] };
  assertPreparedRequirementsDocument(archive.requirementsContent);
  await safeAtomicWriteMany(repo, [
    ...archive.updates,
    { file, contents: archive.requirementsContent },
  ]);
  return { archived: archive.archived, files: archive.files };
}

export async function closeRequirement(repo, pluginRoot, options) {
  await requireInitialized(repo);
  if (!ID_PATTERNS.requirement.test(options.id || ""))
    throw new Error(`Invalid Requirement ID: ${options.id}`);
  if (!ID_PATTERNS.session.test(options.session || ""))
    throw new Error(`Invalid Work Session ID: ${options.session}`);
  if (!TERMINAL_REQUIREMENT_STATUSES.includes(options.status)) {
    throw new Error(`Closing status must be one of: ${TERMINAL_REQUIREMENT_STATUSES.join(", ")}`);
  }
  const sessionFolder = `${options.session.slice(2, 6)}-${options.session.slice(6, 8)}`;
  const sessionFile = await safeAgentFile(repo, "sessions", sessionFolder, `${options.session}.md`);
  if (!(await fileExists(sessionFile)))
    throw new Error(`Closing Work Session not found: ${options.session}`);
  const sessionContent = await readFile(sessionFile, "utf8");
  const sessionStatus = field(sessionContent, "Status");
  const sessionRequirements =
    field(sessionContent, "Requirements").match(/R-\d{8}-\d{6}-[A-Z0-9]{4}/g) ?? [];
  if (!sessionRequirements.includes(options.id)) {
    throw new Error(`Closing Work Session ${options.session} does not reference ${options.id}.`);
  }
  if (options.status === "Done" && sessionStatus !== "Done") {
    throw new Error(`A Requirement closed as Done must have status Done in ${options.session}.`);
  }
  const file = await safeAgentFile(repo, "requirements.md");
  const original = await readFile(file, "utf8");
  assertPreparedRequirementsDocument(original);
  const start = `<!-- agent-docs:req:${options.id}:start -->`;
  const end = `<!-- agent-docs:req:${options.id}:end -->`;
  const startIndex = original.indexOf(start);
  const endIndex = original.indexOf(end);
  if (startIndex < 0 || endIndex < startIndex)
    throw new Error(`Active Requirement not found: ${options.id}`);
  const blockEnd = endIndex + end.length;
  const block = original.slice(startIndex, blockEnd);
  const summary = field(block, "Summary");
  if (options.status === "Done") {
    const criteria = section(block, "Acceptance Criteria", ["Evidence"]);
    if (!criteria || /^- \[ \]/m.test(criteria)) {
      throw new Error("Done requires every Acceptance Criterion to be checked.");
    }
    const evidence = section(block, "Evidence", ["Next Step"]);
    if (!evidence || /none yet|tbd|todo/i.test(evidence)) {
      throw new Error("Done requires concrete completion evidence.");
    }
  }
  const closed = new Date().toISOString();
  const evidenceSummary = options.evidence || `See ${options.session}`;
  const row = `| ${options.id} | ${closed} | ${options.status} | ${escapeCell(summary)} | ${escapeCell(evidenceSummary)} | ${options.session} |`;
  const without = `${original.slice(0, startIndex).trimEnd()}\n${original.slice(blockEnd).replace(/^\s*/, "\n")}`;
  const rows = tableRows(markerBody(without, MARKERS.closedStart, MARKERS.closedEnd));
  const body = [...tableHeader(), row, ...rows].join("\n") + "\n";
  const closedContent = replaceBetween(without, MARKERS.closedStart, MARKERS.closedEnd, body);
  assertPreparedRequirementsDocument(closedContent, { allowOverflow: true });
  const archive = await prepareArchive(repo, pluginRoot, closedContent);
  assertPreparedRequirementsDocument(archive.requirementsContent);
  await safeAtomicWriteMany(repo, [
    ...archive.updates,
    { file, contents: archive.requirementsContent },
  ]);
  return { id: options.id, status: options.status, archived: archive.archived };
}

function fill(template, values) {
  let output = template;
  for (const [key, value] of Object.entries(values)) {
    output = output.replaceAll(`{{${key}}}`, String(value));
  }
  return output;
}

function listText(value, fallback = "- None recorded.") {
  if (!value) return fallback;
  const items = Array.isArray(value) ? value : [value];
  return items
    .map((item) => inlineText(String(item).replace(/^\s*-\s*/u, "")))
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");
}

export async function createSession(repo, pluginRoot, options) {
  await requireInitialized(repo);
  if (!options.requirements?.length)
    throw new Error("A Work Session must reference at least one Requirement.");
  await assertRequirementReferences(repo, options.requirements);
  const status = options.status || "Partial";
  if (!SESSION_STATUSES.includes(status)) throw new Error(`Invalid session status: ${status}`);
  const id = options.id || formatId("session");
  if (!ID_PATTERNS.session.test(id)) throw new Error(`Invalid Work Session ID: ${id}`);
  const folder = `${id.slice(2, 6)}-${id.slice(6, 8)}`;
  const file = await safeAgentFile(repo, "sessions", folder, `${id}.md`);
  if (await fileExists(file)) throw new Error(`Work Session already exists: ${id}`);
  const now = new Date().toISOString();
  const endHead = git(repo.root, ["rev-parse", "HEAD"], { allowFailure: true }) || "UNBORN";
  const startHead = options.startHead || repo.head;
  if (!HEAD_VALUE.test(startHead)) throw new Error(`Invalid Start HEAD: ${startHead}`);
  if (!HEAD_VALUE.test(endHead)) throw new Error(`Invalid End HEAD: ${endHead}`);
  const requirements = options.requirements?.length ? options.requirements.join(", ") : "None";
  const verification = options.verification
    ? `| ${escapeCell(options.verification)} | ${escapeCell(options.verificationResult || "Recorded")} | ${escapeCell(options.verificationEvidence || "See command result")} |`
    : "| Not recorded | Unknown | Add a reproducible check before claiming Done |";
  const content = fill(await readTemplate(pluginRoot, "session.md"), {
    SESSION_ID: id,
    CLOSED_AT: now,
    REQUIREMENTS: requirements,
    STATUS: status,
    BRANCH: repo.branch,
    START_HEAD: startHead,
    END_HEAD: endHead,
    EXECUTOR: inlineText(options.executor || "Root Agent"),
    GOAL: inlineText(options.goal || "Record the material outcome of this Work Session."),
    CHANGES: listText(options.changes),
    FILES: listText(options.files),
    VERIFICATION: verification,
    RESULT: blockText(
      options.result || "Partial; update this result before closing the Turn Receipt.",
    ),
    COMMIT: blockText(options.commit || "Not committed by Agent Docs."),
    NEXT_STEP: blockText(
      options.nextStep ||
        "Complete the remaining Requirement work or record why no next step exists.",
    ),
  });
  await safeExclusiveWrite(repo, file, content);
  return { id, file: path.relative(repo.root, file).replaceAll(path.sep, "/") };
}

export async function createDecision(repo, pluginRoot, options) {
  await requireInitialized(repo);
  if (!options.requirements?.length)
    throw new Error("A Decision must reference at least one Requirement.");
  await assertRequirementReferences(repo, options.requirements);
  const id = options.id || formatId("decision");
  if (!ID_PATTERNS.decision.test(id)) throw new Error(`Invalid Decision ID: ${id}`);
  if (options.supersedes) await assertDecisionReference(repo, options.supersedes);
  const file = await safeAgentFile(repo, "decisions", `${id}.md`);
  if (await fileExists(file)) throw new Error(`Decision already exists: ${id}`);
  const content = fill(await readTemplate(pluginRoot, "decision.md"), {
    DECISION_ID: id,
    TITLE: inlineText(options.title),
    DATE: new Date().toISOString(),
    REQUIREMENTS: options.requirements?.length ? options.requirements.join(", ") : "None",
    SUPERSEDES: options.supersedes || "None",
    CONTEXT: blockText(
      options.context || "Describe the costly-to-reverse choice and the competing forces.",
    ),
    DECISION: blockText(options.decision || "State the selected approach."),
    TRADE_OFFS: blockText(options.tradeoffs || "State what is gained and what is given up."),
    CONSEQUENCES: blockText(
      options.consequences || "State follow-on constraints and expected effects.",
    ),
  });
  await safeExclusiveWrite(repo, file, content);
  return { id, file: path.relative(repo.root, file).replaceAll(path.sep, "/") };
}
