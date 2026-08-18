import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listRepositoryFiles } from "./lib/repository-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = (await listRepositoryFiles(root)).filter((file) => /\.(?:mjs|js)$/u.test(file));

function check(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--check", file], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${file}: ${stderr.trim() || `node --check exited ${code}`}`));
    });
  });
}

for (const file of files) await check(file);
console.log(`Syntax check passed for ${files.length} JavaScript files.`);
