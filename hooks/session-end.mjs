#!/usr/bin/env node
// SessionEnd hook: append one anonymous record of the session to ~/.career-log/sessions.jsonl.
// It must never block or break Claude Code, so every failure is swallowed and it always exits 0.

import { buildRecord } from "../lib/collect.mjs";
import { append } from "../lib/store.mjs";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

try {
  if (process.env.CAREER_LOG_DISABLED !== "1") {
    const input = JSON.parse((await readStdin()) || "{}");
    const record = buildRecord({ cwd: input.cwd, transcriptPath: input.transcript_path });
    if (record) append("sessions.jsonl", record);
  }
} catch {
  // never interfere with the session
}
process.exit(0);
