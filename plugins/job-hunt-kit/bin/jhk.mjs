#!/usr/bin/env node
// job-hunt-kit helper. The plugin's commands call this; you can also run it yourself.
//
//   jhk.mjs home                                   where things are stored, and what is set up
//   jhk.mjs new --company "Acme" --role "Engineer" [--url URL]   create (or find) an application
//   jhk.mjs list                                   all applications
//   jhk.mjs status <slug> <status>                 researching|applied|interviewing|offer|rejected|withdrawn
//   jhk.mjs check <slug>                           compare the tailored resume with the master
//   jhk.mjs resume <slug|master>                   render resume.json to HTML and PDF
//   jhk.mjs dashboard [slug]                       render the job dashboard (if given) and the overview page

import fs from "node:fs";
import path from "node:path";
import { checkTailored, renderResume, validateResume } from "../lib/resume.mjs";
import { renderIndex, renderJob, validateAnalysis } from "../lib/dashboard.mjs";
import { htmlToPdf, pdfPageCount } from "../lib/pdf.mjs";
import { STATUSES, ensureDir, home, jobDir, jobsDir, listJobs, readJson, slugify, today, writeJson } from "../lib/store.mjs";

const [cmd, ...rest] = process.argv.slice(2);

function flag(name) {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
}

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

const masterPath = () => path.join(home(), "resume.json");

function loadMaster() {
  const master = readJson(masterPath());
  if (!master) fail(`No master resume at ${masterPath()}. Run /job-hunt-kit:setup first.`);
  const problems = validateResume(master);
  if (problems.length) fail(`Master resume has problems:\n- ${problems.join("\n- ")}`);
  return master;
}

function touch(slug, changes = {}) {
  const file = path.join(jobDir(slug), "meta.json");
  const meta = { ...readJson(file, {}), ...changes, updated: today() };
  writeJson(file, meta);
  return meta;
}

function report(result) {
  if (result.errors.length) console.log(`PROBLEMS (fix before using this resume):\n- ${result.errors.join("\n- ")}`);
  else console.log("Facts match the master resume: employers, titles, dates and education are unchanged.");
  if (result.droppedRoles.length) console.log(`Roles left out:\n- ${result.droppedRoles.join("\n- ")}`);
  if (result.newSkills.length) console.log(`Skills not in the master resume (confirm each is true):\n- ${result.newSkills.join("\n- ")}`);
  if (result.changedBullets.length) console.log(`New or reworded bullets (review each):\n- ${result.changedBullets.join("\n- ")}`);
}

switch (cmd) {
  case "home": {
    const master = readJson(masterPath());
    console.log(`Folder: ${home()}`);
    console.log(`Master resume: ${master ? masterPath() : "not set up (run /job-hunt-kit:setup)"}`);
    console.log(`Applications: ${listJobs().length}`);
    break;
  }

  case "new": {
    const company = flag("company");
    const role = flag("role");
    if (!company || !role) fail('usage: jhk.mjs new --company "Acme" --role "Engineer" [--url URL]', 2);
    const slug = slugify(company, role);
    const dir = jobDir(slug);
    const existed = fs.existsSync(path.join(dir, "meta.json"));
    ensureDir(dir);
    const meta = touch(slug, existed ? {} : { company, role, url: flag("url") || "", status: "researching", created: today() });
    console.log(JSON.stringify({ slug, dir, existed, meta }, null, 2));
    break;
  }

  case "list": {
    const jobs = listJobs();
    if (!jobs.length) console.log("No applications yet.");
    for (const j of jobs) console.log(`${j.slug}\t${j.status || "researching"}\t${j.score ?? "-"}\t${j.updated || ""}`);
    break;
  }

  case "status": {
    const [slug, status] = rest;
    if (!slug || !STATUSES.includes(status)) fail(`usage: jhk.mjs status <slug> <${STATUSES.join("|")}>`, 2);
    if (!fs.existsSync(jobDir(slug))) fail(`No application ${slug}`);
    console.log(JSON.stringify(touch(slug, { status })));
    break;
  }

  case "check": {
    const [slug] = rest;
    if (!slug) fail("usage: jhk.mjs check <slug>", 2);
    const tailored = readJson(path.join(jobDir(slug), "resume.json"));
    if (!tailored) fail(`No tailored resume at ${path.join(jobDir(slug), "resume.json")}`);
    const result = checkTailored(loadMaster(), tailored);
    report(result);
    process.exit(result.errors.length ? 1 : 0);
  }

  case "resume": {
    const [target] = rest;
    if (!target) fail("usage: jhk.mjs resume <slug|master>", 2);
    const isMaster = target === "master";
    const master = loadMaster();
    const dir = isMaster ? home() : jobDir(target);
    const resume = isMaster ? master : readJson(path.join(dir, "resume.json"));
    if (!resume) fail(`No resume.json in ${dir}`);
    if (!isMaster) {
      const result = checkTailored(master, resume);
      report(result);
      if (result.errors.length) fail("Not rendered: fix the problems above first.");
    }
    const base = slugify(resume.name || "resume") + (isMaster ? "-resume" : "-resume-" + target);
    const htmlPath = path.join(dir, `${base}.html`);
    fs.writeFileSync(htmlPath, renderResume(resume), { mode: 0o600 });
    const pdfPath = path.join(dir, `${base}.pdf`);
    const pdf = htmlToPdf(htmlPath, pdfPath);
    console.log(`HTML: ${htmlPath}`);
    if (pdf.ok) {
      const pages = pdfPageCount(pdfPath);
      console.log(`PDF: ${pdfPath} (${pages} page${pages === 1 ? "" : "s"})`);
      if (pages > 2) console.log("Warning: more than 2 pages. Trim older roles or merge bullets.");
      if (!isMaster) touch(target, { resumePdf: path.basename(pdfPath) });
    } else console.log(pdf.message);
    break;
  }

  case "dashboard": {
    const [slug] = rest;
    if (slug) {
      const dir = jobDir(slug);
      const analysis = readJson(path.join(dir, "analysis.json"));
      if (!analysis) fail(`No analysis.json in ${dir}`);
      const problems = validateAnalysis(analysis);
      if (problems.length) fail(`analysis.json has problems:\n- ${problems.join("\n- ")}`);
      const meta = touch(slug, { score: Number.isFinite(analysis.score) ? Math.round(analysis.score) : undefined });
      const files = {
        jobMd: fs.existsSync(path.join(dir, "job.md")) ? "job.md" : null,
        resumePdf: meta.resumePdf && fs.existsSync(path.join(dir, meta.resumePdf)) ? meta.resumePdf : null,
      };
      const out = path.join(dir, "dashboard.html");
      fs.writeFileSync(out, renderJob({ meta, analysis, files }), { mode: 0o600 });
      console.log(`Dashboard: ${out}`);
    }
    ensureDir(jobsDir());
    const index = path.join(jobsDir(), "index.html");
    fs.writeFileSync(index, renderIndex(listJobs()), { mode: 0o600 });
    console.log(`All applications: ${index}`);
    break;
  }

  default:
    fail("usage: jhk.mjs home | new | list | status | check | resume | dashboard", 2);
}
