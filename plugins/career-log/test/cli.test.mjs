// End-to-end checks of the hook and the two scripts, writing to a throwaway log folder.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logDir = fs.mkdtempSync(path.join(os.tmpdir(), "career-log-test-"));
const env = { ...process.env, CAREER_LOG_DIR: logDir };
delete env.CAREER_LOG_DISABLED;

function project() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "initech-shop-"));
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ dependencies: { react: "19", stripe: "1" } }));
  const transcript = path.join(dir, "t.jsonl");
  fs.writeFileSync(
    transcript,
    [
      { type: "user", timestamp: "2026-11-01T09:00:00Z", message: { content: "add a webhook endpoint for initech payments" } },
      { type: "assistant", timestamp: "2026-11-01T09:30:00Z", message: { content: [{ type: "tool_use", name: "Write", input: { file_path: `${dir}/api/webhook.ts` } }] } },
    ].map((l) => JSON.stringify(l)).join("\n"),
  );
  return { dir, transcript };
}

test("the SessionEnd hook appends one anonymous record and exits 0", () => {
  const { dir, transcript } = project();
  const run = spawnSync("node", [path.join(root, "hooks/session-end.mjs")], {
    input: JSON.stringify({ session_id: "abc", transcript_path: transcript, cwd: dir, hook_event_name: "SessionEnd", reason: "exit" }),
    env,
    encoding: "utf8",
  });
  assert.equal(run.status, 0);
  const lines = fs.readFileSync(path.join(logDir, "sessions.jsonl"), "utf8").trim().split("\n");
  assert.equal(lines.length, 1);
  const rec = JSON.parse(lines[0]);
  assert.deepEqual(rec.stack, ["React", "Stripe"]);
  assert.deepEqual(rec.languages, ["TypeScript"]);
  assert.ok(rec.kinds.includes("API"));
  assert.ok(!lines[0].includes("initech") && !lines[0].includes("abc"), lines[0]);
});

test("the hook exits 0 on garbage input and when disabled", () => {
  for (const extra of [{}, { CAREER_LOG_DISABLED: "1" }]) {
    const run = spawnSync("node", [path.join(root, "hooks/session-end.mjs")], { input: "not json", env: { ...env, ...extra } });
    assert.equal(run.status, 0);
  }
});

test("note.mjs redacts project terms from the folder it runs in", () => {
  const { dir } = project();
  const out = execFileSync("node", [path.join(root, "bin/note.mjs"), "Built Initech-Shop Stripe webhooks with idempotency keys"], { cwd: dir, env, encoding: "utf8" });
  assert.match(out, /Saved: Built \[redacted\] Stripe webhooks with idempotency keys/);
  const notes = fs.readFileSync(path.join(logDir, "notes.jsonl"), "utf8");
  assert.ok(!/initech/i.test(notes), notes);
});

test("note.mjs refuses a note that is nothing but identifying detail", () => {
  const run = spawnSync("node", [path.join(root, "bin/note.mjs"), "https://initech.com"], { env, encoding: "utf8" });
  assert.equal(run.status, 1);
});

test("review.mjs summarises sessions and notes", () => {
  const out = execFileSync("node", [path.join(root, "bin/review.mjs"), "--days", "3650"], { env, encoding: "utf8" });
  assert.match(out, /Sessions: 1 on 1 day/);
  assert.match(out, /React \(1\)/);
  assert.match(out, /Stripe webhooks/);
  assert.match(out, /First period recorded/);
});
