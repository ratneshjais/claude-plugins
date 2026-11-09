#!/usr/bin/env node
// Summarise the career log for a period as Markdown.
// Usage: node bin/review.mjs [--days 30]

import { localDate, logDir, readAll } from "../lib/store.mjs";

const args = process.argv.slice(2);
const daysArg = args.indexOf("--days");
const days = daysArg >= 0 ? Number(args[daysArg + 1]) : 30;
if (!Number.isFinite(days) || days <= 0) {
  console.error("usage: review.mjs [--days N]");
  process.exit(2);
}

const since = localDate(new Date(Date.now() - (days - 1) * 86400000));
const sessions = readAll("sessions.jsonl");
const notes = readAll("notes.jsonl");
const inPeriod = sessions.filter((s) => s.date >= since);
const before = sessions.filter((s) => s.date < since);

function tally(list, key) {
  const counts = new Map();
  for (const s of list) for (const v of s[key] || []) counts.set(v, (counts.get(v) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

const seenBefore = new Set(before.flatMap((s) => [...(s.languages || []), ...(s.tools || []), ...(s.stack || [])]));
const newThisPeriod = [
  ...new Set(inPeriod.flatMap((s) => [...(s.languages || []), ...(s.tools || []), ...(s.stack || [])])),
].filter((t) => !seenBefore.has(t)).sort();

const minutes = inPeriod.reduce((sum, s) => sum + (s.minutes || 0), 0);
const hours = Math.round((minutes / 60) * 2) / 2;
const activeDays = new Set(inPeriod.map((s) => s.date)).size;
const fmt = (rows) => (rows.length ? rows.map(([name, n]) => `${name} (${n})`).join(", ") : "none recorded");

const out = [];
out.push(`# Career log: last ${days} days (${since} to ${localDate()})`);
out.push("");
if (inPeriod.length === 0 && notes.filter((n) => n.date >= since).length === 0) {
  out.push(`No sessions or notes recorded in this period. Log folder: ${logDir()}`);
  console.log(out.join("\n"));
  process.exit(0);
}
out.push(`- Sessions: ${inPeriod.length} on ${activeDays} day${activeDays === 1 ? "" : "s"}, about ${hours} hour${hours === 1 ? "" : "s"}`);
out.push(`- Edits: ${inPeriod.reduce((s, r) => s + (r.edits || 0), 0)}, commands: ${inPeriod.reduce((s, r) => s + (r.commands || 0), 0)}`);
out.push("");
out.push("## Languages written (sessions)");
out.push(fmt(tally(inPeriod, "languages")));
out.push("");
out.push("## Tools used (sessions)");
out.push(fmt(tally(inPeriod, "tools")));
out.push("");
out.push("## Project stacks worked in (sessions)");
out.push(fmt(tally(inPeriod, "stack")));
out.push("");
out.push("## Kinds of work (sessions)");
out.push(fmt(tally(inPeriod, "kinds")));
out.push("");
out.push("## New this period");
if (before.length === 0) out.push("First period recorded, so there is nothing earlier to compare with.");
else out.push(newThisPeriod.length ? newThisPeriod.join(", ") : "Nothing new.");
out.push("");
out.push("## Notes");
const periodNotes = notes.filter((n) => n.date >= since);
out.push(periodNotes.length ? periodNotes.map((n) => `- ${n.date}: ${n.text}`).join("\n") : "No notes. Add wins with /career-log:note.");
console.log(out.join("\n"));
