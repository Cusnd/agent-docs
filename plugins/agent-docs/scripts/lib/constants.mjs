export const VERSION = "0.2.0";
export const SCHEMA_VERSION = 1;
export const DOCS_DIR = "docs/agent";
export const MANIFEST_FILE = `${DOCS_DIR}/manifest.json`;
export const REQUIREMENTS_FILE = `${DOCS_DIR}/requirements.md`;

export const REQUIREMENT_STATUSES = [
  "Todo",
  "In Progress",
  "Done",
  "Blocked",
  "Deferred",
  "Dropped",
  "Superseded",
];

export const ACTIVE_REQUIREMENT_STATUSES = ["Todo", "In Progress", "Blocked", "Deferred"];
export const TERMINAL_REQUIREMENT_STATUSES = ["Done", "Dropped", "Superseded"];
export const SESSION_STATUSES = ["Done", "Partial", "Blocked", "Failed"];
export const PRIORITIES = ["P0", "P1", "P2", "P3"];

export const MARKERS = {
  activeStart: "<!-- agent-docs:active:start -->",
  activeEnd: "<!-- agent-docs:active:end -->",
  closedStart: "<!-- agent-docs:closed:start -->",
  closedEnd: "<!-- agent-docs:closed:end -->",
  archiveStart: "<!-- agent-docs:archive:start -->",
  archiveEnd: "<!-- agent-docs:archive:end -->",
};

export const ID_PATTERNS = {
  requirement: /^R-\d{8}-\d{6}-[A-Z0-9]{4}$/,
  session: /^S-\d{8}-\d{6}-[A-Z0-9]{4}$/,
  decision: /^D-\d{8}-\d{4}-[A-Z0-9]{4}$/,
  receipt: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
};

export const MAX_RECENT_CLOSED = 20;
export const LOCK_STALE_MS = 5 * 60 * 1000;

export const TEMPLATE_FILES = ["manifest.json", "requirements.md"];
