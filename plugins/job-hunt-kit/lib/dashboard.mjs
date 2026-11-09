// Builds the per-job dashboard and the overview of all applications, as static HTML pages.
//
// analysis.json (written by Claude in /job-hunt-kit:start and /job-hunt-kit:gaps):
// {
//   "company": "...", "role": "...", "url": "https://...", "location": "...", "seniority": "...",
//   "summary": "two or three sentences on what the role really is",
//   "mustHave": ["..."], "niceToHave": ["..."], "signals": ["hidden expectations read between the lines"],
//   "fit": "one line verdict",
//   "score": 0-100, "scoreReason": "how the score was reached",
//   "gaps": {
//     "stated":   [{ "skill": "...", "evidence": "where the resume shows it" }],
//     "unstated": [{ "skill": "...", "evidence": "where the log or notes show it" }],
//     "missing":  [{ "skill": "...", "importance": "must|nice", "plan": "how to close it" }]
//   },
//   "resumeChanges": [{ "change": "...", "why": "..." }],
//   "checklist": [{ "item": "...", "done": false }]
// }

import { esc, list, page, safeHref } from "./html.mjs";
import { STATUSES } from "./store.mjs";

export function validateAnalysis(a) {
  const problems = [];
  if (!a || typeof a !== "object") return ["analysis is not an object"];
  for (const key of ["company", "role", "summary"]) if (!a[key]) problems.push(`missing ${key}`);
  if (a.score !== undefined && !(Number.isFinite(a.score) && a.score >= 0 && a.score <= 100)) problems.push("score must be 0 to 100");
  for (const key of ["stated", "unstated", "missing"]) {
    if (a.gaps && a.gaps[key] !== undefined && !Array.isArray(a.gaps[key])) problems.push(`gaps.${key} must be a list`);
  }
  return problems;
}

const CSS = `
:root { --bg:#f8fafc; --card:#fff; --ink:#0f172a; --muted:#475569; --line:#e2e8f0; --good:#15803d; --warn:#b45309; --bad:#b91c1c; --accent:#4338ca; }
@media (prefers-color-scheme: dark) { :root { --bg:#0b1120; --card:#111827; --ink:#e5e7eb; --muted:#9ca3af; --line:#1f2937; --good:#4ade80; --warn:#fbbf24; --bad:#f87171; --accent:#a5b4fc; } }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
main { max-width: 980px; margin: 0 auto; padding: 24px 16px 64px; }
a { color: var(--accent); }
h1 { font-size: 26px; margin: 0; letter-spacing: -0.3px; }
h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .12em; color: var(--muted); margin: 0 0 10px; }
.sub { color: var(--muted); margin-top: 4px; }
.grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin-top: 16px; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 18px; }
.wide { grid-column: 1 / -1; }
.score { display:flex; align-items:center; gap:16px; }
.ring { --p:0; width:84px; height:84px; border-radius:50%; flex: none;
  background: conic-gradient(var(--c) calc(var(--p) * 1%), var(--line) 0); display:grid; place-items:center; }
.ring span { width:66px; height:66px; border-radius:50%; background:var(--card); display:grid; place-items:center; font-size:22px; font-weight:700; }
ul { margin: 0; padding-left: 18px; } li { margin: 4px 0; }
.pill { display:inline-block; font-size:12px; padding:2px 8px; border-radius:999px; border:1px solid var(--line); color:var(--muted); }
.good { color: var(--good); } .warn { color: var(--warn); } .bad { color: var(--bad); }
.cols { display:grid; gap:16px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
table { width:100%; border-collapse: collapse; } td, th { text-align:left; padding:8px 6px; border-bottom:1px solid var(--line); vertical-align: top; }
th { font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:.08em; }
.check li { list-style: none; margin-left: -18px; }
footer { color: var(--muted); font-size: 12px; margin-top: 24px; }
`;

function scoreColour(score) {
  if (score >= 75) return "var(--good)";
  if (score >= 50) return "var(--warn)";
  return "var(--bad)";
}

export function renderJob({ meta = {}, analysis: a, files = {} }) {
  const score = Number.isFinite(a.score) ? Math.round(a.score) : null;
  const gaps = a.gaps || {};
  const gapList = (items, cls, fmt) =>
    items?.length ? `<ul>${items.map((g) => `<li class="${cls}">${fmt(g)}</li>`).join("")}</ul>` : `<p class="sub">None.</p>`;
  const links = [
    a.url && `<a href="${safeHref(a.url)}">Job ad</a>`,
    files.jobMd && `<a href="${esc(files.jobMd)}">Saved copy</a>`,
    files.resumePdf && `<a href="${esc(files.resumePdf)}">Tailored resume (PDF)</a>`,
    files.resumeHtml && !files.resumePdf && `<a href="${esc(files.resumeHtml)}">Tailored resume (HTML)</a>`,
    `<a href="../index.html">All applications</a>`,
  ].filter(Boolean);

  const body = `<main>
<h1>${esc(a.role)} · ${esc(a.company)}</h1>
<p class="sub">${esc([a.location, a.seniority].filter(Boolean).join(" · "))} &nbsp; <span class="pill">${esc(meta.status || "researching")}</span></p>
<p class="sub">${links.join(" · ")}</p>

<div class="grid">
  <section class="card">
    <h2>Match</h2>
    ${
      score === null
        ? `<p class="sub">No score yet.</p>`
        : `<div class="score"><div class="ring" style="--p:${score};--c:${scoreColour(score)}"><span>${score}</span></div><p>${esc(a.scoreReason || "")}</p></div>`
    }
    ${a.fit ? `<p style="margin-top:12px"><strong>Verdict:</strong> ${esc(a.fit)}</p>` : ""}
  </section>
  <section class="card">
    <h2>The role</h2>
    <p>${esc(a.summary)}</p>
    ${a.signals?.length ? `<p class="sub" style="margin-top:10px">Reading between the lines:</p><ul>${list(a.signals)}</ul>` : ""}
  </section>
  <section class="card">
    <h2>Must have</h2><ul>${list(a.mustHave)}</ul>
    ${a.niceToHave?.length ? `<h2 style="margin-top:14px">Nice to have</h2><ul>${list(a.niceToHave)}</ul>` : ""}
  </section>

  <section class="card wide">
    <h2>Profile gaps</h2>
    <div class="cols">
      <div><p><strong class="good">You have it and say it</strong></p>${gapList(gaps.stated, "", (g) => `${esc(g.skill)}<br><span class="sub">${esc(g.evidence || "")}</span>`)}</div>
      <div><p><strong class="warn">You have it but don't say it</strong></p>${gapList(gaps.unstated, "", (g) => `${esc(g.skill)}<br><span class="sub">${esc(g.evidence || "")}</span>`)}</div>
      <div><p><strong class="bad">Real gaps</strong></p>${gapList(gaps.missing, "", (g) => `${esc(g.skill)} <span class="pill">${esc(g.importance || "")}</span><br><span class="sub">${esc(g.plan || "")}</span>`)}</div>
    </div>
  </section>

  <section class="card wide">
    <h2>Resume changes</h2>
    ${
      a.resumeChanges?.length
        ? `<table><tr><th>Change</th><th>Why</th></tr>${a.resumeChanges.map((c) => `<tr><td>${esc(c.change)}</td><td class="sub">${esc(c.why || "")}</td></tr>`).join("")}</table>`
        : `<p class="sub">No changes suggested yet.</p>`
    }
  </section>

  <section class="card wide">
    <h2>Checklist</h2>
    <ul class="check">${(a.checklist || []).map((c) => `<li>${c.done ? "✅" : "⬜️"} ${esc(c.item)}</li>`).join("") || `<li class="sub">Nothing yet.</li>`}</ul>
  </section>
</div>
<footer>Generated ${esc(meta.updated || "")} by job-hunt-kit. Stored only on this computer.</footer>
</main>`;
  return page({ title: `${a.role} · ${a.company}`, body, css: CSS });
}

export function renderIndex(jobs) {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, jobs.filter((j) => (j.status || "researching") === s).length]));
  const rows = jobs
    .map(
      (j) => `<tr><td><a href="${esc(j.slug)}/dashboard.html">${esc(j.role || j.slug)}</a></td><td>${esc(j.company || "")}</td>
<td>${Number.isFinite(j.score) ? `<strong style="color:${scoreColour(j.score)}">${j.score}</strong>` : "–"}</td>
<td><span class="pill">${esc(j.status || "researching")}</span></td><td class="sub">${esc(j.updated || "")}</td></tr>`,
    )
    .join("");
  const body = `<main>
<h1>Job hunt</h1>
<p class="sub">${STATUSES.map((s) => `${esc(s)}: ${counts[s]}`).join(" · ")}</p>
<div class="card" style="margin-top:16px">
${jobs.length ? `<table><tr><th>Role</th><th>Company</th><th>Match</th><th>Status</th><th>Updated</th></tr>${rows}</table>` : `<p class="sub">No applications yet. Start one with /job-hunt-kit:start and a job link.</p>`}
</div>
<footer>Stored only on this computer.</footer>
</main>`;
  return page({ title: "Job hunt", body, css: CSS });
}
