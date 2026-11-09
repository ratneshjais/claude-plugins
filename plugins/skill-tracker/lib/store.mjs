// Where the log lives. Everything stays on this machine as plain JSON lines you can read and edit.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function logDir() {
  return process.env.SKILL_TRACKER_DIR || path.join(os.homedir(), ".skill-tracker");
}

export function append(file, record) {
  const dir = logDir();
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.appendFileSync(path.join(dir, file), JSON.stringify(record) + "\n", { mode: 0o600 });
}

export function readAll(file) {
  const p = path.join(logDir(), file);
  if (!fs.existsSync(p)) return [];
  return fs
    .readFileSync(p, "utf8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
}

/** Local calendar date as YYYY-MM-DD. */
export function localDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
