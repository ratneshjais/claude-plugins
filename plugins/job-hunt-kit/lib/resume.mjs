// The resume format, its HTML template, and the check that a tailored resume invents nothing.
//
// resume.json:
// {
//   "name": "...", "headline": "...", "location": "...", "email": "...", "phone": "...",
//   "links": ["linkedin.com/in/...", "github.com/..."],
//   "summary": "...",
//   "skills": [{ "group": "Data", "items": ["MySQL", "PostgreSQL"] }],
//   "experience": [{
//     "company": "...", "title": "...", "location": "...", "start": "Jun 2021", "end": "Present", "duration": "5+ years",
//     "sections": [{ "heading": "optional sub-heading", "bullets": ["..."] }]
//   }],
//   "education": [{ "school": "...", "degree": "...", "start": "Jun 2014", "end": "Jun 2017" }]
// }

import { esc, page } from "./html.mjs";

/** @returns {string[]} problems; empty when valid */
export function validateResume(r) {
  const problems = [];
  if (!r || typeof r !== "object") return ["resume is not an object"];
  for (const key of ["name", "headline", "summary"]) if (!r[key] || typeof r[key] !== "string") problems.push(`missing ${key}`);
  if (!Array.isArray(r.skills)) problems.push("skills must be a list");
  if (!Array.isArray(r.experience) || r.experience.length === 0) problems.push("experience must be a non-empty list");
  for (const [i, job] of (r.experience || []).entries()) {
    for (const key of ["company", "title", "start", "end"]) if (!job?.[key]) problems.push(`experience[${i}] missing ${key}`);
    if (!Array.isArray(job?.sections)) problems.push(`experience[${i}].sections must be a list`);
  }
  if (!Array.isArray(r.education)) problems.push("education must be a list");
  return problems;
}

const facts = (job) => `${job.company} | ${job.title} | ${job.start} | ${job.end}`;
const norm = (s) => String(s).toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Compare a tailored resume with the master. Facts (employers, titles, dates, education) must not change;
 * reworded bullets and new skills are allowed but listed so the user can review each one.
 * @returns {{ errors: string[], newSkills: string[], changedBullets: string[], droppedRoles: string[] }}
 */
export function checkTailored(master, tailored) {
  const errors = [...validateResume(tailored).map((p) => `tailored resume: ${p}`)];
  const masterFacts = new Set(master.experience.map(facts));
  const tailoredFacts = new Set((tailored.experience || []).map(facts));
  for (const f of tailoredFacts) if (!masterFacts.has(f)) errors.push(`role not in master resume (or changed company, title or dates): ${f}`);
  const droppedRoles = [...masterFacts].filter((f) => !tailoredFacts.has(f));

  const edu = (e) => `${e.school} | ${e.degree} | ${e.start} | ${e.end}`;
  const masterEdu = new Set((master.education || []).map(edu));
  for (const e of tailored.education || []) if (!masterEdu.has(edu(e))) errors.push(`education entry not in master resume: ${edu(e)}`);

  for (const key of ["name", "email", "phone"]) {
    if (master[key] && tailored[key] && master[key] !== tailored[key]) errors.push(`${key} differs from the master resume`);
  }

  const masterSkills = new Set(master.skills.flatMap((g) => g.items).map(norm));
  const newSkills = [...new Set((tailored.skills || []).flatMap((g) => g.items || []))].filter((s) => !masterSkills.has(norm(s)));

  const masterBullets = new Set(master.experience.flatMap((j) => j.sections.flatMap((s) => s.bullets || [])).map(norm));
  const changedBullets = (tailored.experience || [])
    .flatMap((j) => (j.sections || []).flatMap((s) => (s.bullets || []).map((b) => `${j.company}: ${b}`)))
    .filter((b) => !masterBullets.has(norm(b.slice(b.indexOf(": ") + 2))));

  return { errors, newSkills, changedBullets, droppedRoles };
}

const CSS = `
@page { size: A4; margin: 14mm 15mm; }
* { box-sizing: border-box; }
body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1f2937; font-size: 9.6pt; line-height: 1.38; margin: 0; }
header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2.5px solid #1f2937; padding-bottom: 8px; }
h1 { font-size: 25pt; margin: 0 0 4px; color: #111827; letter-spacing: -0.3px; }
.tag { font-size: 11pt; font-weight: 600; color: #4b5563; max-width: 370px; }
.contact { text-align: right; color: #4b5563; font-size: 9.2pt; line-height: 1.6; }
h2 { font-size: 10.5pt; letter-spacing: 1px; text-transform: uppercase; margin: 13px 0 5px; padding-bottom: 3px; border-bottom: 1px solid #d1d5db; color: #111827; }
p { margin: 0; }
table { border-collapse: collapse; width: 100%; }
td { padding: 2px 0; vertical-align: top; }
td:first-child { font-weight: 700; width: 132px; }
.job { margin-top: 7px; }
.row { display: flex; justify-content: space-between; gap: 12px; break-after: avoid; }
.row b { color: #111827; }
.meta { font-style: italic; color: #6b7280; font-size: 9pt; }
.sub { font-weight: 700; color: #374151; margin: 6px 0 0; font-size: 9.4pt; break-after: avoid; }
ul { margin: 3px 0 0; padding-left: 15px; }
li { margin: 1.5px 0; break-inside: avoid; }
.edu .row { margin-top: 4px; }
`;

export function renderResume(r) {
  const phoneEmail = [r.phone, r.email].filter(Boolean).map(esc).join(" &nbsp;|&nbsp; ");
  const contact = [r.location && esc(r.location), phoneEmail, ...(r.links || []).map(esc)].filter(Boolean).join("<br>");
  const skills = r.skills.map((g) => `<tr><td>${esc(g.group)}</td><td>${esc((g.items || []).join(", "))}</td></tr>`).join("");
  const jobs = r.experience
    .map(
      (j) => `<div class="job">
  <div class="row"><b>${esc(j.company)} — ${esc(j.title)}</b><b>${esc(j.start)} – ${esc(j.end)}</b></div>
  <div class="row meta"><span>${esc(j.location || "")}</span><span>${esc(j.duration || "")}</span></div>
  ${(j.sections || [])
    .map((s) => `${s.heading ? `<p class="sub">${esc(s.heading)}</p>` : ""}<ul>${(s.bullets || []).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`)
    .join("\n")}
</div>`,
    )
    .join("\n");
  const edu = (r.education || [])
    .map((e) => `<div class="row"><b>${esc(e.school)}</b><span>${esc(e.start)} – ${esc(e.end)}</span></div><p>${esc(e.degree)}</p>`)
    .join("");
  const body = `<header><div><h1>${esc(r.name)}</h1><div class="tag">${esc(r.headline)}</div></div><div class="contact">${contact}</div></header>
<h2>Summary</h2><p>${esc(r.summary)}</p>
<h2>Skills</h2><table>${skills}</table>
<h2>Experience</h2>${jobs}
<h2>Education</h2><div class="edu">${edu}</div>`;
  return page({ title: `${r.name} Resume`, body, css: CSS });
}
