// Everything the kit saves lives in one private folder on this machine, never in a repository.
//   ~/.job-hunt-kit/resume.json            your master resume (the single source of truth)
//   ~/.job-hunt-kit/jobs/<slug>/meta.json  company, role, link, status, dates
//   ~/.job-hunt-kit/jobs/<slug>/job.md     a saved copy of the job ad
//   ~/.job-hunt-kit/jobs/<slug>/analysis.json  overview, gaps and resume changes (written by Claude)
//   ~/.job-hunt-kit/jobs/<slug>/resume.json    the tailored resume for this job

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const STATUSES = ["researching", "applied", "interviewing", "offer", "rejected", "withdrawn"];

export function home() {
  return process.env.JOB_HUNT_KIT_DIR || path.join(os.homedir(), ".job-hunt-kit");
}

export function jobsDir() {
  return path.join(home(), "jobs");
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
}

export function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "Senior Full-Stack Engineer" at "Acme Ltd" -> "acme-ltd-senior-full-stack-engineer" */
export function slugify(...parts) {
  return parts
    .join(" ")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function jobDir(slug) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error(`invalid job slug: ${slug}`);
  return path.join(jobsDir(), slug);
}

export function listJobs() {
  let entries = [];
  try {
    entries = fs.readdirSync(jobsDir(), { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => ({ slug: e.name, ...readJson(path.join(jobsDir(), e.name, "meta.json"), {}) }))
    .sort((a, b) => String(b.updated || "").localeCompare(String(a.updated || "")));
}
