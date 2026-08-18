import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  ACTIVE_REQUIREMENT_STATUSES,
  ID_PATTERNS,
  MARKERS,
  MAX_RECENT_CLOSED,
  PRIORITIES,
  REQUIREMENT_STATUSES,
  SCHEMA_VERSION,
  SESSION_STATUSES,
  TERMINAL_REQUIREMENT_STATUSES,
} from "./constants.mjs";
import { fileExists } from "./repo.mjs";
import { assertSafeRepositoryPath } from "./safe-path.mjs";
import { tableRows } from "./documents.mjs";

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const HEAD_VALUE = /^(?:[0-9a-f]{40,64}|UNBORN)$/;
const DECISION_STATUSES = ["Proposed", "Accepted", "Superseded", "Deprecated"];

const SECRET_PATTERNS = [
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["openai-key", /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/],
  ["github-token", /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/],
  ["github-fine-grained-token", /\bgithub_pat_[A-Za-z0-9_]{20,}\b/],
  ["aws-access-key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["google-api-key", /\bAIza[0-9A-Za-z_-]{30,}\b/],
  ["slack-token", /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ["stripe-secret", /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/],
];

function issue(list, severity, code, file, message, line = null) {
  list.push({ severity, code, file, ...(line ? { line } : {}), message });
}

function relative(repo, file) {
  return path.relative(repo.root, file).replaceAll(path.sep, "/");
}

function lineNumber(text, index) {
  return text.slice(0, Math.max(0, index)).split(/\r?\n/).length;
}

function count(text, token) {
  return text.split(token).length - 1;
}

function metadata(content, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return content.match(new RegExp(`^- \\*\\*${escaped}:\\*\\*\\s*(.+)$`, "m"))?.[1]?.trim() ?? "";
}

function requirementSubsection(content, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    content
      .match(
        new RegExp(`^#### ${escaped}\\s*$\\n([\\s\\S]*?)(?=^#### |^<!-- agent-docs:req:)`, "m"),
      )?.[1]
      ?.trim() ?? ""
  );
}

function splitTableRow(row) {
  const cells = [];
  let current = "";
  let escaped = false;
  for (const char of row.trim().replace(/^\|/, "").replace(/\|$/, "")) {
    if (escaped) {
      current += char;
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (char === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function markerSection(content, start, end) {
  const startIndex = content.indexOf(start);
  const endIndex = content.indexOf(end);
  if (startIndex < 0 || endIndex <= startIndex) return "";
  return content.slice(startIndex + start.length, endIndex).trim();
}

function validateClosedTableHeader(content, rel, issues) {
  const lines = content.split(/\r?\n/u).map((line) => line.trim());
  if (
    lines[0] !== "| ID | Closed (UTC) | Status | Summary | Evidence | Session |" ||
    lines[1] !== "| --- | --- | --- | --- | --- | --- |"
  ) {
    issue(
      issues,
      "error",
      "closed-table-header",
      rel,
      "The closed Requirement table must use the canonical six-column header.",
    );
  }
}

function referenceKind(value) {
  for (const [kind, pattern] of Object.entries(ID_PATTERNS)) {
    if (kind !== "receipt" && pattern.test(value)) return kind;
  }
  return null;
}

function parseReferences(value, expectedKind, rel, issues, fieldName, { required = false } = {}) {
  const pattern = ID_PATTERNS[expectedKind];
  const normalized = String(value ?? "")
    .replace(/\r\n?/gu, "\n")
    .trim();
  const values = normalized
    .split(/\n|,/u)
    .map((item) => item.trim().replace(/^-\s*/u, "").trim())
    .filter((item) => item && !/^None(?: yet)?\.?$/iu.test(item));
  const valid = [];
  const seen = new Set();
  for (const candidate of values) {
    if (pattern.test(candidate)) {
      if (seen.has(candidate)) {
        issue(issues, "error", "duplicate-reference", rel, `${fieldName} repeats ${candidate}.`);
      } else {
        seen.add(candidate);
        valid.push(candidate);
      }
      continue;
    }
    const actualKind = referenceKind(candidate);
    issue(
      issues,
      "error",
      actualKind ? "reference-type" : "reference-format",
      rel,
      actualKind
        ? `${fieldName} expects a ${expectedKind} ID, but ${candidate} is a ${actualKind} ID.`
        : `${fieldName} contains an invalid ${expectedKind} reference: ${candidate}.`,
    );
  }
  if (required && valid.length === 0) {
    issue(
      issues,
      "error",
      `${expectedKind}-references-required`,
      rel,
      `${fieldName} must contain at least one valid ${expectedKind} ID.`,
    );
  }
  return valid;
}

function registerRequirement(refs, id, rel, issues) {
  const existing = refs.requirementSources.get(id);
  if (existing) {
    issue(
      issues,
      "error",
      "duplicate-requirement",
      rel,
      `${id} is duplicated; it already appears in ${existing}.`,
    );
  } else {
    refs.requirementSources.set(id, rel);
  }
  refs.requirements.add(id);
}

async function walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Unsafe Agent Docs link: ${full}`);
    }
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

async function scanSecrets(repo, files, issues) {
  for (const file of files) {
    const content = await readFile(file, "utf8");
    const rel = relative(repo, file);
    for (const [label, pattern] of SECRET_PATTERNS) {
      const match = pattern.exec(content);
      if (match) {
        issue(
          issues,
          "error",
          "secret-pattern",
          rel,
          `Potential ${label} material detected; remove it and reference a secure location instead.`,
          lineNumber(content, match.index),
        );
      }
    }
  }
}

function validateMarkers(content, rel, issues) {
  for (const [name, marker] of Object.entries(MARKERS)) {
    if (name.startsWith("archive")) continue;
    if (count(content, marker) !== 1) {
      issue(issues, "error", "marker-count", rel, `Expected exactly one ${name} marker.`);
    }
  }
  const ordered = [
    MARKERS.activeStart,
    MARKERS.activeEnd,
    MARKERS.closedStart,
    MARKERS.closedEnd,
  ].map((marker) => content.indexOf(marker));
  if (ordered.every((index) => index >= 0)) {
    for (let index = 1; index < ordered.length; index += 1) {
      if (ordered[index] <= ordered[index - 1]) {
        issue(
          issues,
          "error",
          "marker-order",
          rel,
          "Active and Recently Closed markers are out of order.",
        );
        break;
      }
    }
  }

  const tokens = [...content.matchAll(/^.*agent-docs:req:.*$/gmu)];
  let open = null;
  for (const token of tokens) {
    const exact = token[0]
      .trim()
      .match(/^<!-- agent-docs:req:(R-\d{8}-\d{6}-[A-Z0-9]{4}):(start|end) -->$/);
    if (!exact) {
      issue(
        issues,
        "error",
        "requirement-marker-syntax",
        rel,
        "A Requirement marker has invalid syntax.",
        lineNumber(content, token.index),
      );
      continue;
    }
    const [, id, type] = exact;
    if (type === "start") {
      if (open) {
        issue(
          issues,
          "error",
          "requirement-marker-nesting",
          rel,
          `${id} starts before ${open} ends.`,
          lineNumber(content, token.index),
        );
      } else {
        open = id;
      }
    } else if (open !== id) {
      issue(
        issues,
        "error",
        "requirement-marker-pair",
        rel,
        `${id} ends without a matching start.`,
        lineNumber(content, token.index),
      );
    } else {
      open = null;
    }
  }
  if (open)
    issue(issues, "error", "requirement-marker-pair", rel, `${open} has no matching end marker.`);
}

function extractRequirementBlocks(content, rel, issues) {
  const blocks = [];
  const starts = [...content.matchAll(/<!-- agent-docs:req:(R-[A-Z0-9-]+):start -->/g)];
  for (const start of starts) {
    const id = start[1];
    const end = `<!-- agent-docs:req:${id}:end -->`;
    const endIndex = content.indexOf(end, start.index + start[0].length);
    if (endIndex < 0) {
      issue(
        issues,
        "error",
        "requirement-end",
        rel,
        `Requirement ${id} has no matching end marker.`,
        lineNumber(content, start.index),
      );
      continue;
    }
    blocks.push({
      id,
      content: content.slice(start.index, endIndex + end.length),
      index: start.index,
    });
  }
  const ends = [...content.matchAll(/<!-- agent-docs:req:(R-[A-Z0-9-]+):end -->/g)];
  if (ends.length !== starts.length) {
    issue(
      issues,
      "error",
      "requirement-marker-balance",
      rel,
      "Requirement start and end marker counts differ.",
    );
  }
  return blocks;
}

function validateActiveRequirement(block, rel, issues, refs) {
  const { id, content, index } = block;
  registerRequirement(refs, id, rel, issues);
  if (!ID_PATTERNS.requirement.test(id)) {
    issue(
      issues,
      "error",
      "requirement-id",
      rel,
      `Invalid Requirement ID: ${id}.`,
      lineNumber(content, 0),
    );
  }
  if (!content.includes(`### ${id}:`)) {
    issue(
      issues,
      "error",
      "requirement-heading",
      rel,
      `Requirement ${id} needs its fixed heading.`,
    );
  }
  for (const label of ["Created", "Updated", "Summary", "Priority", "Status", "Supersedes"]) {
    if (!metadata(content, label))
      issue(issues, "error", "requirement-field", rel, `${id} is missing ${label}.`);
  }
  for (const label of ["Created", "Updated"]) {
    const value = metadata(content, label);
    if (value && !ISO_UTC.test(value))
      issue(issues, "error", "timestamp", rel, `${id} ${label} must be UTC ISO 8601.`);
  }
  const priority = metadata(content, "Priority");
  if (priority && !PRIORITIES.includes(priority))
    issue(issues, "error", "priority", rel, `${id} has invalid priority ${priority}.`);
  const status = metadata(content, "Status");
  if (status && !REQUIREMENT_STATUSES.includes(status))
    issue(issues, "error", "requirement-status", rel, `${id} has invalid status ${status}.`);
  if (status && !ACTIVE_REQUIREMENT_STATUSES.includes(status)) {
    issue(
      issues,
      "error",
      "terminal-in-active",
      rel,
      `${id} is terminal and must move to Recently Closed.`,
    );
  }
  const criteria = requirementSubsection(content, "Acceptance Criteria");
  if (!/^- \[[ xX]\] .+/m.test(criteria)) {
    issue(
      issues,
      "error",
      "acceptance-criteria",
      rel,
      `${id} needs at least one checkbox Acceptance Criterion.`,
    );
  }
  if (/Define observable completion conditions/i.test(criteria)) {
    issue(
      issues,
      "error",
      "placeholder",
      rel,
      `${id} still contains the generated Acceptance Criteria placeholder.`,
    );
  }
  for (const heading of ["Evidence", "Next Step", "Related Sessions"]) {
    if (!requirementSubsection(content, heading))
      issue(issues, "error", "requirement-section", rel, `${id} is missing ${heading} content.`);
  }
  const supersedes = metadata(content, "Supersedes");
  for (const target of parseReferences(supersedes, "requirement", rel, issues, `${id} Supersedes`))
    refs.requirementLinks.push({ from: id, to: target, rel });
  for (const target of parseReferences(
    requirementSubsection(content, "Related Sessions"),
    "session",
    rel,
    issues,
    `${id} Related Sessions`,
  )) {
    refs.sessionLinks.push({ from: id, to: target, rel });
  }
  return index;
}

function validateClosedRows(rows, rel, issues, refs, archived = false, archiveYear = null) {
  let previous = null;
  for (const row of rows) {
    const cells = splitTableRow(row);
    if (cells.length !== 6) {
      issue(
        issues,
        "error",
        "closed-row",
        rel,
        "A closed Requirement row must have exactly six columns.",
      );
      continue;
    }
    const [id, closed, status, summary, evidence, session] = cells;
    registerRequirement(refs, id, rel, issues);
    if (!ID_PATTERNS.requirement.test(id))
      issue(issues, "error", "requirement-id", rel, `Invalid Requirement ID: ${id}.`);
    if (!ISO_UTC.test(closed))
      issue(issues, "error", "timestamp", rel, `${id} closed time must be UTC ISO 8601.`);
    if (archiveYear && closed.slice(0, 4) !== archiveYear) {
      issue(
        issues,
        "error",
        "archive-year",
        rel,
        `${id} belongs in the ${closed.slice(0, 4)} archive, not ${archiveYear}.`,
      );
    }
    if (!TERMINAL_REQUIREMENT_STATUSES.includes(status))
      issue(
        issues,
        "error",
        "closed-status",
        rel,
        `${id} has non-terminal closed status ${status}.`,
      );
    if (!summary) issue(issues, "error", "closed-summary", rel, `${id} has no summary.`);
    if (!evidence || /none|tbd|todo/i.test(evidence))
      issue(issues, "error", "closed-evidence", rel, `${id} has no concrete evidence reference.`);
    if (!ID_PATTERNS.session.test(session))
      issue(issues, "error", "closed-session", rel, `${id} has an invalid closing Work Session.`);
    else refs.sessionLinks.push({ from: id, to: session, rel });
    refs.closedRequirements.push({ id, status, session, rel });
    if (!archived && previous && Date.parse(closed) > Date.parse(previous)) {
      issue(issues, "error", "closed-order", rel, "Recently Closed rows must be newest first.");
    }
    if (archived && previous && Date.parse(closed) < Date.parse(previous)) {
      issue(
        issues,
        "error",
        "archive-order",
        rel,
        "Archived rows must be oldest first so new rows append at the end.",
      );
    }
    previous = closed;
  }
}

async function validateRequirements(repo, issues, refs) {
  const file = path.join(repo.root, "docs", "agent", "requirements.md");
  const rel = relative(repo, file);
  if (!(await fileExists(file))) {
    issue(issues, "error", "requirements-missing", rel, "requirements.md is missing.");
    return;
  }
  const content = await readFile(file, "utf8");
  validateMarkers(content, rel, issues);
  const blocks = extractRequirementBlocks(content, rel, issues);
  const activeStart = content.indexOf(MARKERS.activeStart);
  const activeEnd = content.indexOf(MARKERS.activeEnd);
  for (const block of blocks) {
    if (activeStart < 0 || activeEnd < 0 || block.index < activeStart || block.index > activeEnd) {
      issue(
        issues,
        "error",
        "requirement-location",
        rel,
        `${block.id} must be inside the Active marker pair.`,
      );
    }
    validateActiveRequirement(block, rel, issues, refs);
  }
  const closedStart = content.indexOf(MARKERS.closedStart);
  const closedEnd = content.indexOf(MARKERS.closedEnd);
  if (closedStart >= 0 && closedEnd > closedStart) {
    const closedBody = markerSection(content, MARKERS.closedStart, MARKERS.closedEnd);
    validateClosedTableHeader(closedBody, rel, issues);
    const rows = tableRows(closedBody);
    if (rows.length > MAX_RECENT_CLOSED) {
      issue(
        issues,
        "error",
        "recent-limit",
        rel,
        `Recently Closed has ${rows.length} rows; maximum is ${MAX_RECENT_CLOSED}.`,
      );
    }
    validateClosedRows(rows, rel, issues, refs);
  }
}

async function validateArchives(repo, issues, refs) {
  const directory = path.join(repo.root, "docs", "agent", "archive", "requirements");
  for (const file of await walk(directory)) {
    const rel = relative(repo, file);
    if (!/^\d{4}\.md$/.test(path.basename(file))) {
      issue(issues, "error", "archive-name", rel, "Requirement archive filename must be YYYY.md.");
      continue;
    }
    const content = await readFile(file, "utf8");
    const archiveStart = content.indexOf(MARKERS.archiveStart);
    const archiveEnd = content.indexOf(MARKERS.archiveEnd);
    if (
      count(content, MARKERS.archiveStart) !== 1 ||
      count(content, MARKERS.archiveEnd) !== 1 ||
      archiveStart < 0 ||
      archiveEnd <= archiveStart
    ) {
      issue(issues, "error", "archive-markers", rel, "Archive needs exactly one marker pair.");
      continue;
    }
    const archiveBody = markerSection(content, MARKERS.archiveStart, MARKERS.archiveEnd);
    validateClosedTableHeader(archiveBody, rel, issues);
    validateClosedRows(tableRows(archiveBody), rel, issues, refs, true, path.basename(file, ".md"));
  }
}

function hasHeading(content, heading) {
  return new RegExp(`^## ${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m").test(
    content,
  );
}

async function validateSessions(repo, issues, refs) {
  const directory = path.join(repo.root, "docs", "agent", "sessions");
  const files = await walk(directory);
  for (const file of files) {
    const rel = relative(repo, file);
    const id = path.basename(file, ".md");
    if (path.extname(file) !== ".md" || !ID_PATTERNS.session.test(id)) {
      issue(
        issues,
        "error",
        "session-name",
        rel,
        "Work Session filename must be its valid S-... ID plus .md.",
      );
      continue;
    }
    refs.sessions.add(id);
    const expectedFolder = `${id.slice(2, 6)}-${id.slice(6, 8)}`;
    if (path.basename(path.dirname(file)) !== expectedFolder) {
      issue(
        issues,
        "error",
        "session-folder",
        rel,
        `${id} must be under sessions/${expectedFolder}/.`,
      );
    }
    const content = await readFile(file, "utf8");
    if (!content.startsWith(`# ${id}:`))
      issue(issues, "error", "session-heading", rel, `${id} needs its fixed heading.`);
    for (const label of [
      "Closed",
      "Requirements",
      "Status",
      "Branch",
      "Start HEAD",
      "End HEAD",
      "Executor",
    ]) {
      if (!metadata(content, label))
        issue(issues, "error", "session-field", rel, `${id} is missing ${label}.`);
    }
    const closed = metadata(content, "Closed");
    if (closed && !ISO_UTC.test(closed))
      issue(issues, "error", "timestamp", rel, `${id} Closed must be UTC ISO 8601.`);
    const status = metadata(content, "Status");
    if (status && !SESSION_STATUSES.includes(status))
      issue(issues, "error", "session-status", rel, `${id} has invalid status ${status}.`);
    for (const label of ["Start HEAD", "End HEAD"]) {
      const value = metadata(content, label);
      if (value && !HEAD_VALUE.test(value))
        issue(issues, "error", "head", rel, `${id} ${label} is not a Git object ID or UNBORN.`);
    }
    const requirementIds = parseReferences(
      metadata(content, "Requirements"),
      "requirement",
      rel,
      issues,
      `${id} Requirements`,
      { required: true },
    );
    for (const target of requirementIds) refs.requirementLinks.push({ from: id, to: target, rel });
    refs.sessionMetadata.set(id, { status, requirements: requirementIds, rel });
    for (const heading of [
      "Goal",
      "Changes",
      "Files",
      "Verification",
      "Result",
      "Commit",
      "Next Step",
    ]) {
      if (!hasHeading(content, heading))
        issue(issues, "error", "session-section", rel, `${id} is missing ${heading}.`);
    }
    const placeholderPatterns = [
      /None recorded/i,
      /Not recorded \| Unknown/i,
      /update this result before closing/i,
      /Complete the remaining Requirement work or record/i,
    ];
    if (placeholderPatterns.some((pattern) => pattern.test(content))) {
      issue(
        issues,
        "error",
        "placeholder",
        rel,
        `${id} still contains generated placeholder content.`,
      );
    }
  }
}

async function validateDecisions(repo, issues, refs) {
  const directory = path.join(repo.root, "docs", "agent", "decisions");
  for (const file of await walk(directory)) {
    const rel = relative(repo, file);
    const id = path.basename(file, ".md");
    if (path.extname(file) !== ".md" || !ID_PATTERNS.decision.test(id)) {
      issue(
        issues,
        "error",
        "decision-name",
        rel,
        "Decision filename must be its valid D-... ID plus .md.",
      );
      continue;
    }
    refs.decisions.add(id);
    const content = await readFile(file, "utf8");
    if (!content.startsWith(`# ${id}:`))
      issue(issues, "error", "decision-heading", rel, `${id} needs its fixed heading.`);
    for (const label of ["Date", "Status", "Requirements", "Supersedes"]) {
      if (!metadata(content, label))
        issue(issues, "error", "decision-field", rel, `${id} is missing ${label}.`);
    }
    const date = metadata(content, "Date");
    if (date && !ISO_UTC.test(date))
      issue(issues, "error", "timestamp", rel, `${id} Date must be UTC ISO 8601.`);
    const status = metadata(content, "Status");
    if (status && !DECISION_STATUSES.includes(status))
      issue(issues, "error", "decision-status", rel, `${id} has invalid status ${status}.`);
    const requirementIds = parseReferences(
      metadata(content, "Requirements"),
      "requirement",
      rel,
      issues,
      `${id} Requirements`,
      { required: true },
    );
    for (const target of requirementIds) refs.requirementLinks.push({ from: id, to: target, rel });
    for (const target of parseReferences(
      metadata(content, "Supersedes"),
      "decision",
      rel,
      issues,
      `${id} Supersedes`,
    ))
      refs.decisionLinks.push({ from: id, to: target, rel });
    for (const heading of ["Context", "Decision", "Trade-offs", "Consequences"]) {
      if (!hasHeading(content, heading))
        issue(issues, "error", "decision-section", rel, `${id} is missing ${heading}.`);
    }
    if (
      /Describe the costly-to-reverse|State the selected approach|State what is gained|State follow-on constraints/i.test(
        content,
      )
    ) {
      issue(
        issues,
        "error",
        "placeholder",
        rel,
        `${id} still contains generated placeholder content.`,
      );
    }
  }
}

function validateCrossReferences(issues, refs) {
  for (const link of refs.requirementLinks) {
    if (!refs.requirements.has(link.to))
      issue(
        issues,
        "error",
        "requirement-reference",
        link.rel,
        `${link.from} references missing Requirement ${link.to}.`,
      );
  }
  for (const link of refs.sessionLinks) {
    if (!refs.sessions.has(link.to))
      issue(
        issues,
        "error",
        "session-reference",
        link.rel,
        `${link.from} references missing Work Session ${link.to}.`,
      );
  }
  for (const link of refs.decisionLinks) {
    if (!refs.decisions.has(link.to))
      issue(
        issues,
        "error",
        "decision-reference",
        link.rel,
        `${link.from} references missing Decision ${link.to}.`,
      );
  }
  for (const closed of refs.closedRequirements) {
    const session = refs.sessionMetadata.get(closed.session);
    if (!session) continue;
    if (closed.status === "Done" && session.status !== "Done") {
      issue(
        issues,
        "error",
        "done-session-status",
        closed.rel,
        `${closed.id} is Done but ${closed.session} has status ${session.status}.`,
      );
    }
    if (!session.requirements.includes(closed.id)) {
      issue(
        issues,
        "error",
        "closing-session-requirement",
        closed.rel,
        `${closed.session} does not reference closed Requirement ${closed.id}.`,
      );
    }
  }
}

async function validateManifest(repo, issues) {
  const file = path.join(repo.root, "docs", "agent", "manifest.json");
  const rel = relative(repo, file);
  if (!(await fileExists(file))) {
    issue(issues, "error", "manifest-missing", rel, "manifest.json is missing.");
    return;
  }
  let manifest;
  try {
    manifest = JSON.parse(await readFile(file, "utf8"));
  } catch {
    issue(issues, "error", "manifest-json", rel, "manifest.json is not valid JSON.");
    return;
  }
  if (manifest.schema_version !== SCHEMA_VERSION)
    issue(issues, "error", "schema-version", rel, `schema_version must be ${SCHEMA_VERSION}.`);
  if (!ISO_UTC.test(manifest.initialized_at || ""))
    issue(issues, "error", "timestamp", rel, "initialized_at must be UTC ISO 8601.");
  if (manifest.generator !== "agent-docs")
    issue(issues, "error", "generator", rel, "generator must be agent-docs.");
  if (typeof manifest.generator_version !== "string" || !manifest.generator_version)
    issue(issues, "error", "generator-version", rel, "generator_version is required.");
}

export async function validateAgentDocs(repo) {
  const issues = [];
  const refs = {
    requirements: new Set(),
    requirementSources: new Map(),
    sessions: new Set(),
    decisions: new Set(),
    requirementLinks: [],
    sessionLinks: [],
    decisionLinks: [],
    closedRequirements: [],
    sessionMetadata: new Map(),
  };
  const docsRoot = path.join(repo.root, "docs", "agent");
  try {
    await assertSafeRepositoryPath(repo.root, docsRoot);
    await walk(docsRoot);
  } catch {
    issue(
      issues,
      "error",
      "unsafe-path",
      "docs/agent",
      "docs/agent contains a symbolic link or junction, or resolves outside the repository root.",
    );
    return {
      valid: false,
      errors: 1,
      warnings: 0,
      issues,
      counts: { requirements: 0, sessions: 0, decisions: 0 },
    };
  }
  await validateManifest(repo, issues);
  await validateRequirements(repo, issues, refs);
  await validateArchives(repo, issues, refs);
  await validateSessions(repo, issues, refs);
  await validateDecisions(repo, issues, refs);
  validateCrossReferences(issues, refs);
  if (await fileExists(path.join(docsRoot, "manifest.json"))) {
    const files = (await walk(docsRoot)).filter((file) => /\.(?:md|json)$/i.test(file));
    await scanSecrets(repo, files, issues);
    for (const file of files) {
      const content = await readFile(file, "utf8");
      const match = /\{\{[A-Z0-9_]+\}\}/.exec(content);
      if (match)
        issue(
          issues,
          "error",
          "template-token",
          relative(repo, file),
          "An unresolved template token remains.",
          lineNumber(content, match.index),
        );
    }
  }
  const errors = issues.filter((item) => item.severity === "error").length;
  const warnings = issues.filter((item) => item.severity === "warning").length;
  return {
    valid: errors === 0,
    errors,
    warnings,
    issues,
    counts: {
      requirements: refs.requirements.size,
      sessions: refs.sessions.size,
      decisions: refs.decisions.size,
    },
  };
}

export function formatValidation(result) {
  const lines = [result.valid ? "Agent Docs validation passed." : "Agent Docs validation failed."];
  lines.push(
    `Requirements: ${result.counts.requirements}; Work Sessions: ${result.counts.sessions}; Decisions: ${result.counts.decisions}.`,
  );
  for (const item of result.issues) {
    const location = item.line ? `${item.file}:${item.line}` : item.file;
    lines.push(`${item.severity.toUpperCase()} ${item.code} ${location} — ${item.message}`);
  }
  lines.push(`${result.errors} error(s), ${result.warnings} warning(s).`);
  return lines.join("\n");
}
