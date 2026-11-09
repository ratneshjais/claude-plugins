#!/usr/bin/env node
// Save a one-line career note, with project and client details redacted first.
// Usage: node bin/note.mjs "Cut checkout page load from 4s to 1.2s by caching shipping rates"
//        node bin/note.mjs --dry-run "..."   (show what would be saved, save nothing)

import { contextTerms, redact } from "../lib/redact.mjs";
import { append, localDate, logDir } from "../lib/store.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const text = args.filter((a) => a !== "--dry-run").join(" ").trim();

if (!text) {
  console.error('usage: note.mjs [--dry-run] "what you did or learned"');
  process.exit(2);
}

const { text: clean, removed } = redact(text, contextTerms(process.cwd()));
if (!clean.replace(/\[redacted\]/g, "").trim()) {
  console.error("Nothing left to save after redaction. Rephrase the note without names, links or paths.");
  process.exit(1);
}

const record = { v: 1, date: localDate(), text: clean };
if (!dryRun) append("notes.jsonl", record);

console.log(`${dryRun ? "Would save" : "Saved"}: ${clean}`);
if (removed > 0) console.log(`(${removed} identifying detail${removed === 1 ? "" : "s"} redacted)`);
if (!dryRun) console.log(`Log: ${logDir()}/notes.jsonl`);
