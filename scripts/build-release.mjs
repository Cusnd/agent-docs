import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strToU8, zipSync } from "fflate";
import { collectReleaseFiles } from "./lib/release-files.mjs";

export const RELEASE_VERSION = "0.2.0";
export const ARCHIVE_BASENAME = `agent-docs-marketplace-v${RELEASE_VERSION}`;
export const ARCHIVE_FILENAME = `${ARCHIVE_BASENAME}.zip`;
const FIXED_MTIME = new Date(1980, 0, 1, 0, 0, 0, 0);

function directoryNames(files) {
  const names = new Set([`${ARCHIVE_BASENAME}/`]);
  for (const file of files) {
    const parts = `${ARCHIVE_BASENAME}/${file.path}`.split("/");
    for (let index = 1; index < parts.length; index += 1) {
      names.add(`${parts.slice(0, index).join("/")}/`);
    }
  }
  return [...names].sort((left, right) => left.localeCompare(right, "en"));
}

export async function buildArchiveBytes(root) {
  const records = await collectReleaseFiles(root);
  const entries = [];
  for (const directory of directoryNames(records)) {
    entries.push([
      directory,
      [
        new Uint8Array(),
        { mtime: FIXED_MTIME, os: 3, attrs: ((0o40755 << 16) | 0x10) >>> 0, level: 0 },
      ],
    ]);
  }
  for (const record of records) {
    entries.push([
      `${ARCHIVE_BASENAME}/${record.path}`,
      [
        strToU8(record.text),
        { mtime: FIXED_MTIME, os: 3, attrs: (0o100644 << 16) >>> 0, level: 9 },
      ],
    ]);
  }
  entries.sort(([left], [right]) => left.localeCompare(right, "en"));
  return Buffer.from(zipSync(Object.fromEntries(entries), { level: 9, mtime: FIXED_MTIME }));
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const temporaryRoots = await Promise.all([
    mkdtemp(path.join(os.tmpdir(), "agent-docs-build-a-")),
    mkdtemp(path.join(os.tmpdir(), "agent-docs-build-b-")),
  ]);
  try {
    const [first, second] = await Promise.all([buildArchiveBytes(root), buildArchiveBytes(root)]);
    if (!first.equals(second)) {
      throw new Error("Two independent release builds were not byte-for-byte identical.");
    }
    await Promise.all(
      temporaryRoots.map((directory, index) =>
        writeFile(path.join(directory, ARCHIVE_FILENAME), index === 0 ? first : second),
      ),
    );
    const digest = sha256(first);
    const output = path.join(root, "dist");
    await mkdir(output, { recursive: true });
    await writeFile(path.join(output, ARCHIVE_FILENAME), first);
    await writeFile(path.join(output, "SHA256SUMS"), `${digest}  ${ARCHIVE_FILENAME}\n`, "utf8");
    console.log(`${ARCHIVE_FILENAME} ${first.length} bytes sha256:${digest}`);
  } finally {
    await Promise.all(
      temporaryRoots.map((directory) =>
        rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }),
      ),
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
