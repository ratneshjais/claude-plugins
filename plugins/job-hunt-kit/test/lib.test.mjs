// All people, companies and jobs in these tests are invented.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkTailored, renderResume, validateResume } from "../lib/resume.mjs";
import { renderIndex, renderJob, validateAnalysis } from "../lib/dashboard.mjs";
import { safeHref } from "../lib/html.mjs";
import { slugify } from "../lib/store.mjs";

const load = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
const clone = (v) => structuredClone(v);

test("the fixture resume is valid and an empty one is not", () => {
  assert.deepEqual(validateResume(load("resume.json")), []);
  const problems = validateResume({});
  assert.ok(problems.includes("missing name") && problems.includes("experience must be a non-empty list"), problems.join());
});

test("an unchanged copy passes the tailoring check", () => {
  const master = load("resume.json");
  const r = checkTailored(master, clone(master));
  assert.deepEqual(r, { errors: [], newSkills: [], changedBullets: [], droppedRoles: [] });
});

test("changing a date, title or employer is refused", () => {
  const master = load("resume.json");
  for (const mutate of [
    (t) => (t.experience[0].start = "Jan 2020"),
    (t) => (t.experience[0].title = "Senior Software Engineer"),
    (t) => t.experience.push({ ...t.experience[1], company: "Made Up Corp" }),
    (t) => (t.education[0].degree = "MSc Computer Science"),
    (t) => (t.email = "other@example.com"),
  ]) {
    const tailored = clone(master);
    mutate(tailored);
    assert.ok(checkTailored(master, tailored).errors.length > 0, mutate.toString());
  }
});

test("new skills, reworded bullets and dropped roles are listed for review", () => {
  const master = load("resume.json");
  const tailored = clone(master);
  tailored.skills[2].items.push("AWS");
  tailored.skills[0].items = ["php", "TypeScript"]; // case change is not a new skill
  tailored.experience[0].sections[0].bullets[0] = "Built Laravel REST APIs for booking systems.";
  tailored.experience.pop();
  const r = checkTailored(master, tailored);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.newSkills, ["AWS"]);
  assert.deepEqual(r.changedBullets, ["Example Agency: Built Laravel REST APIs for booking systems."]);
  assert.deepEqual(r.droppedRoles, ["First Job Ltd | Developer | Jun 2019 | Dec 2021"]);
});

test("resume HTML escapes everything it prints", () => {
  const r = load("resume.json");
  r.experience[0].sections[0].bullets[0] = '<script>alert("x")</script> & more';
  const html = renderResume(r);
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; more"));
  assert.ok(html.includes("Alex Example") && html.includes("Jun 2019 – Dec 2021"));
});

test("the analysis fixture is valid; a bad score is not", () => {
  assert.deepEqual(validateAnalysis(load("analysis.json")), []);
  assert.ok(validateAnalysis({ ...load("analysis.json"), score: 140 }).includes("score must be 0 to 100"));
  assert.ok(validateAnalysis({ company: "x" }).includes("missing role"));
});

test("the job dashboard shows each section, escapes text and blocks unsafe links", () => {
  const a = load("analysis.json");
  a.summary = "<img src=x onerror=alert(1)>";
  a.url = "javascript:alert(1)";
  const html = renderJob({ meta: { status: "applied", updated: "2026-11-09" }, analysis: a, files: { jobMd: "job.md" } });
  assert.ok(!html.includes("<img") && !html.includes('href="javascript'));
  for (const s of ["Senior Laravel Developer", "78", "You have it but don't say it", "REST APIs", "AWS", "Resume changes", "applied"]) {
    assert.ok(html.includes(s), s);
  }
});

test("the overview lists applications and counts statuses", () => {
  const html = renderIndex([
    { slug: "globex-senior-laravel-developer", role: "Senior Laravel Developer", company: "Globex", score: 78, status: "applied" },
    { slug: "initech-php-engineer", role: "PHP Engineer", company: "Initech", status: "researching" },
  ]);
  assert.ok(html.includes("applied: 1") && html.includes("researching: 1"));
  assert.ok(html.includes('href="globex-senior-laravel-developer/dashboard.html"'));
  assert.match(renderIndex([]), /No applications yet/);
});

test("slugs and links are safe", () => {
  assert.equal(slugify("Globex Corp.", "Sr. Full-Stack / Laravel Engineer"), "globex-corp-sr-full-stack-laravel-engineer");
  assert.equal(safeHref("javascript:alert(1)"), "#");
  assert.equal(safeHref("https://example.com/a?b=1&c=2"), "https://example.com/a?b=1&amp;c=2");
});
