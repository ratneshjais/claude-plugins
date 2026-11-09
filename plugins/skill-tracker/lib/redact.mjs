// Removes anything that could identify a client, project or system from free text.
// Used on notes before they are saved. The session hook never stores free text at all.

import { execFileSync } from "node:child_process";
import path from "node:path";

const PATTERNS = [
  // URLs and anything with a scheme
  /\b[a-z][a-z0-9+.-]*:\/\/\S+/gi,
  // email addresses
  /\b[\w.+-]+@[\w-]+(\.[\w-]+)+\b/g,
  // domain names like client-site.co.uk (two or more labels with a known-looking TLD)
  /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|net|org|io|dev|app|co|uk|in|ai|au|us|eu|de|fr|biz|info|site|online|store|shop|tech|cloud)\b/gi,
  // IPv4 addresses
  /\b\d{1,3}(?:\.\d{1,3}){3}\b/g,
  // file paths with at least two segments
  /(?:~|\.{1,2})?\/(?:[\w.@-]+\/)+[\w.@-]*/g,
  // long hex strings, keys and tokens
  /\b[a-f0-9]{16,}\b/gi,
  /\b(?:sk|pk|ghp|gho|github_pat|xox[abp])[-_][\w-]{10,}\b/g,
];

/** Terms that identify the current project: folder names and the git remote's owner and repo. */
export function contextTerms(cwd) {
  const terms = new Set();
  if (!cwd) return [];
  const parts = path.resolve(cwd).split(path.sep).filter(Boolean);
  // The last two folder names are usually the project and its parent group.
  for (const p of parts.slice(-2)) terms.add(p);
  try {
    const remote = execFileSync("git", ["-C", cwd, "remote", "get-url", "origin"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2000,
    }).trim();
    const m = remote.match(/[:/]([^/:]+)\/([^/]+?)(?:\.git)?$/);
    if (m) {
      terms.add(m[1]);
      terms.add(m[2]);
    }
  } catch {
    // not a git repo, or git missing: folder names are enough
  }
  // Also block the parts of hyphenated names, e.g. "acme" from "acme-website".
  for (const t of [...terms]) {
    for (const piece of t.split(/[-_.]/)) if (piece.length >= 4) terms.add(piece);
  }
  const common = new Set(["users", "home", "projects", "project", "sites", "work", "code", "src", "repos", "website", "web", "app"]);
  return [...terms].filter((t) => t.length >= 3 && !common.has(t.toLowerCase()));
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Redact identifying details from text.
 * @param {string} text
 * @param {string[]} extraTerms names to remove (project, client, repo)
 * @returns {{ text: string, removed: number }}
 */
export function redact(text, extraTerms = []) {
  let out = String(text);
  let removed = 0;
  const replace = (re) => {
    out = out.replace(re, () => {
      removed++;
      return "[redacted]";
    });
  };
  // Structured patterns first, so a project name inside an email or URL doesn't break the match.
  for (const re of PATTERNS) replace(re);
  // Longest terms first, so "acme-client" goes before "acme".
  for (const term of [...extraTerms].sort((x, y) => y.length - x.length)) {
    replace(new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi"));
  }
  // Merge neighbours such as "[redacted]-[redacted]" or "[redacted] [redacted]" into one.
  out = out
    .replace(/\[redacted\](?:[\s._-]*\[redacted\])+/g, "[redacted]")
    .replace(/\s{2,}/g, " ")
    .trim();
  return { text: out, removed };
}
