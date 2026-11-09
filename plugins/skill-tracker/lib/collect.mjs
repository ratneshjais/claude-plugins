// Builds one anonymous session record from the project manifests and the session transcript.
// Every value in the record comes from the allowlists in techs.mjs or is a number, so no
// project names, client names, paths or code can end up in it.

import fs from "node:fs";
import path from "node:path";
import { COMMANDS, COMPOSER, EXTENSIONS, NPM, WORK_KINDS, lookup } from "./techs.mjs";
import { localDate } from "./store.mjs";

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/** Folders worth checking for manifests: the project root plus common monorepo and Bedrock layouts. */
function manifestDirs(root) {
  const dirs = [root];
  for (const group of ["apps", "packages", "services", path.join("web", "app", "themes"), path.join("web", "app", "plugins")]) {
    const base = path.join(root, group);
    try {
      for (const entry of fs.readdirSync(base, { withFileTypes: true }).slice(0, 30)) {
        if (entry.isDirectory()) dirs.push(path.join(base, entry.name));
      }
    } catch {
      // folder not present
    }
  }
  return dirs;
}

/** Technologies the project is built on, from package.json and composer.json. */
export function stackFromManifests(root) {
  const found = new Set();
  if (!root) return found;
  for (const dir of manifestDirs(root)) {
    const pkg = readJson(path.join(dir, "package.json"));
    if (pkg) {
      for (const name of Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })) {
        const tech = lookup(NPM, name);
        if (tech) found.add(tech);
      }
    }
    const composer = readJson(path.join(dir, "composer.json"));
    if (composer) {
      found.add("Composer");
      for (const name of Object.keys({ ...composer.require, ...composer["require-dev"] })) {
        const tech = lookup(COMPOSER, name);
        if (tech) found.add(tech);
      }
    }
  }
  return found;
}

function extensionTech(filePath) {
  const base = path.basename(String(filePath)).toLowerCase();
  if (base === "dockerfile") return EXTENSIONS.dockerfile;
  if (base.endsWith(".blade.php")) return EXTENSIONS["blade.php"];
  const ext = base.includes(".") ? base.split(".").pop() : "";
  return EXTENSIONS[ext] || null;
}

function commandTools(command) {
  const tools = new Set();
  for (const segment of String(command).split(/&&|\|\||;|\||\n/)) {
    const words = segment.trim().split(/\s+/).filter((w) => !/^[A-Z_]+=/.test(w));
    let first = words[0] || "";
    if (first === "sudo" || first === "time") first = words[1] || "";
    first = path.basename(first);
    if (first === "php" && words.some((w) => w.endsWith("artisan"))) tools.add(COMMANDS.artisan);
    if (Object.hasOwn(COMMANDS, first)) tools.add(COMMANDS[first]);
  }
  return tools;
}

function textOf(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.filter((c) => c?.type === "text").map((c) => c.text).join("\n");
  return "";
}

/** What was actually touched in the session, from the transcript. */
export function fromTranscript(transcriptPath) {
  const result = { languages: new Set(), tools: new Set(), kinds: new Set(), edits: 0, commands: 0, first: null, last: null };
  let raw;
  try {
    raw = fs.readFileSync(transcriptPath, "utf8");
  } catch {
    return result;
  }
  const kindText = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const t = Date.parse(entry.timestamp);
    if (!Number.isNaN(t)) {
      if (result.first === null || t < result.first) result.first = t;
      if (result.last === null || t > result.last) result.last = t;
    }
    const message = entry.message;
    if (!message) continue;
    if (entry.type === "user" && typeof message.content === "string") kindText.push(message.content);
    if (entry.type === "user" && Array.isArray(message.content)) kindText.push(textOf(message.content));
    if (entry.type !== "assistant" || !Array.isArray(message.content)) continue;
    for (const block of message.content) {
      if (block?.type !== "tool_use") continue;
      const input = block.input || {};
      if (["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(block.name)) {
        result.edits++;
        const tech = extensionTech(input.file_path || input.notebook_path || "");
        if (tech) result.languages.add(tech);
      } else if (block.name === "Bash") {
        result.commands++;
        for (const tool of commandTools(input.command)) result.tools.add(tool);
        kindText.push(String(input.command || ""));
      }
    }
  }
  const joined = kindText.join("\n");
  for (const [kind, re] of WORK_KINDS) if (re.test(joined)) result.kinds.add(kind);
  return result;
}

/** One anonymous record for the session, or null if nothing was worked on. */
export function buildRecord({ cwd, transcriptPath, now = new Date() }) {
  const t = fromTranscript(transcriptPath);
  if (t.edits === 0 && t.commands === 0) return null;
  const minutes = t.first !== null && t.last !== null ? Math.max(1, Math.round((t.last - t.first) / 60000)) : null;
  const sort = (s) => [...s].sort();
  return {
    v: 1,
    date: localDate(now),
    minutes,
    edits: t.edits,
    commands: t.commands,
    languages: sort(t.languages),
    tools: sort(t.tools),
    stack: sort(stackFromManifests(cwd)),
    kinds: sort(t.kinds),
    endedAt: `${localDate(now)}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
  };
}
