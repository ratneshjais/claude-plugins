// Runs the helper script end to end against a throwaway folder.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { findChrome } from "../lib/pdf.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = path.join(root, "test", "fixtures");
const home = fs.mkdtempSync(path.join(os.tmpdir(), "job-hunt-kit-test-"));
const env = { ...process.env, JOB_HUNT_KIT_DIR: home };

const jhk = (...args) => spawnSync("node", [path.join(root, "bin/jhk.mjs"), ...args], { env, encoding: "utf8" });

test("commands that need the master resume explain how to set it up", () => {
  const run = jhk("resume", "master");
  assert.equal(run.status, 1);
  assert.match(run.stderr, /run \/job-hunt-kit:setup/i);
});

test("full flow: new, status, dashboard, tailored resume", () => {
  fs.copyFileSync(path.join(fixtures, "resume.json"), path.join(home, "resume.json"));

  const created = jhk("new", "--company", "Globex", "--role", "Senior Laravel Developer", "--url", "https://jobs.example.com/1");
  assert.equal(created.status, 0, created.stderr);
  const { slug, dir, existed } = JSON.parse(created.stdout);
  assert.equal(slug, "globex-senior-laravel-developer");
  assert.equal(existed, false);
  assert.equal(JSON.parse(jhk("new", "--company", "Globex", "--role", "Senior Laravel Developer").stdout).existed, true);

  assert.equal(jhk("status", slug, "applied").status, 0);
  assert.equal(jhk("status", slug, "hired").status, 2);
  assert.match(jhk("list").stdout, new RegExp(`${slug}\\tapplied`));

  fs.copyFileSync(path.join(fixtures, "analysis.json"), path.join(dir, "analysis.json"));
  fs.writeFileSync(path.join(dir, "job.md"), "# Senior Laravel Developer\n");
  const dash = jhk("dashboard", slug);
  assert.equal(dash.status, 0, dash.stderr);
  assert.ok(fs.existsSync(path.join(dir, "dashboard.html")));
  assert.ok(fs.readFileSync(path.join(home, "jobs", "index.html"), "utf8").includes("Senior Laravel Developer"));
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8")).score, 78);

  // A tailored resume that changes a date is refused and not rendered.
  const bad = JSON.parse(fs.readFileSync(path.join(fixtures, "resume.json"), "utf8"));
  bad.experience[0].start = "Jan 2018";
  fs.writeFileSync(path.join(dir, "resume.json"), JSON.stringify(bad));
  const refused = jhk("resume", slug);
  assert.equal(refused.status, 1);
  assert.match(refused.stdout, /PROBLEMS/);
  assert.ok(!fs.readdirSync(dir).some((f) => f.endsWith(".html") && f.includes("resume")));

  // A fair tailored resume renders, and its changes are listed for review.
  const good = JSON.parse(fs.readFileSync(path.join(fixtures, "resume.json"), "utf8"));
  good.headline = "Senior Laravel Developer — APIs, queues, MySQL";
  good.experience[0].sections[0].bullets[0] = "Built Laravel REST APIs for booking systems.";
  fs.writeFileSync(path.join(dir, "resume.json"), JSON.stringify(good));
  const ok = jhk("resume", slug);
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /Facts match the master resume/);
  assert.match(ok.stdout, /New or reworded bullets[\s\S]*REST APIs/);
  assert.ok(fs.existsSync(path.join(dir, `alex-example-resume-${slug}.html`)));
  if (findChrome()) assert.match(ok.stdout, /PDF: .*\(1 page\)/);
});

test("slugs that could escape the folder are rejected", () => {
  const run = jhk("status", "../../etc", "applied");
  assert.notEqual(run.status, 0);
});
