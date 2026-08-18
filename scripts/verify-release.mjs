import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strFromU8, unzipSync } from "fflate";
import { ARCHIVE_BASENAME, ARCHIVE_FILENAME, buildArchiveBytes, sha256 } from "./build-release.mjs";
import { collectReleaseFiles } from "./lib/release-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const archive = await readFile(path.join(root, "dist", ARCHIVE_FILENAME));
const checksum = await readFile(path.join(root, "dist", "SHA256SUMS"), "utf8");
const digest = sha256(archive);
if (checksum !== `${digest}  ${ARCHIVE_FILENAME}\n`) {
  throw new Error("SHA256SUMS does not match the release archive.");
}

const rebuilt = await buildArchiveBytes(root);
if (!archive.equals(rebuilt))
  throw new Error("Release archive does not match a fresh deterministic build.");

const extracted = unzipSync(archive);
const names = Object.keys(extracted);
const sorted = [...names].sort((left, right) => left.localeCompare(right, "en"));
if (JSON.stringify(names) !== JSON.stringify(sorted))
  throw new Error("ZIP entries are not sorted.");
const actualFiles = names.filter((name) => !name.endsWith("/"));
const expectedFiles = (await collectReleaseFiles(root)).map(
  (record) => `${ARCHIVE_BASENAME}/${record.path}`,
);

function centralDirectoryEntries(bytes) {
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65_557); offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) {
      end = offset;
      break;
    }
  }
  if (end < 0) throw new Error("ZIP end-of-central-directory record is missing.");
  const count = bytes.readUInt16LE(end + 10);
  let offset = bytes.readUInt32LE(end + 16);
  const entries = [];
  for (let index = 0; index < count; index += 1) {
    if (bytes.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`ZIP central-directory entry ${index} has an invalid signature.`);
    }
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    entries.push({
      name: bytes.subarray(offset + 46, offset + 46 + nameLength).toString("utf8"),
      creatorOS: bytes.readUInt16LE(offset + 4) >>> 8,
      modifiedTime: bytes.readUInt16LE(offset + 12),
      modifiedDate: bytes.readUInt16LE(offset + 14),
      externalAttributes: bytes.readUInt32LE(offset + 38),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

const metadata = centralDirectoryEntries(archive);
if (metadata.length !== names.length) {
  throw new Error("ZIP central-directory and extracted entry counts differ.");
}
for (const entry of metadata) {
  const expectedAttributes = entry.name.endsWith("/")
    ? ((0o40755 << 16) | 0x10) >>> 0
    : (0o100644 << 16) >>> 0;
  if (entry.creatorOS !== 3) throw new Error(`ZIP creator OS is not fixed to Unix: ${entry.name}`);
  if (entry.modifiedTime !== 0 || entry.modifiedDate !== 0x21) {
    throw new Error(`ZIP timestamp is not fixed to 1980-01-01T00:00:00: ${entry.name}`);
  }
  if (entry.externalAttributes !== expectedAttributes) {
    throw new Error(`ZIP permissions are not fixed for ${entry.name}.`);
  }
}
if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
  throw new Error("ZIP entries differ from the explicit release allowlist.");
}
for (const name of names) {
  if (
    path.posix.isAbsolute(name) ||
    path.win32.isAbsolute(name) ||
    name.split("/").includes("..") ||
    !name.startsWith(`${ARCHIVE_BASENAME}/`)
  ) {
    throw new Error(`Unsafe ZIP entry: ${name}`);
  }
  if (/\/(?:docs\/agent|tests|node_modules|\.github|dist|work)(?:\/|$)/u.test(name)) {
    throw new Error(`Excluded content leaked into ZIP: ${name}`);
  }
  if (!name.endsWith("/") && /\.(?:md|json|mjs)$/u.test(name)) {
    const text = strFromU8(extracted[name]);
    if (text.includes("\r")) throw new Error(`ZIP text is not LF-normalized: ${name}`);
  }
}

console.log(
  `Release verification passed: ${actualFiles.length} allowlisted files, sha256:${digest}.`,
);
