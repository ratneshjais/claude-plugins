// Builds the per-job dashboard and the overview of all applications, as static HTML pages.
// The job page is designed to be skimmed in under a minute: verdict and score first, then a
// requirement-by-requirement checklist, with long explanations folded away until clicked.
//
// analysis.json (written by Claude in /job-hunt-kit:start and /job-hunt-kit:gaps).
// Any text field may wrap its key phrase in **double asterisks**; the dashboard highlights it.
// {
//   "company": "...", "role": "...", "url": "https://...", "location": "...", "seniority": "...",
//   "headline": "one-line verdict, at most 15 words",
//   "tldr": ["three bullets, at most 20 words each"],
//   "score": 0-100,
//   "scoreBreakdown": [{ "label": "Must-haves", "got": 22, "max": 70 }, { "label": "Nice-to-haves", "got": 5, "max": 20 }, { "label": "Seniority & domain", "got": 3, "max": 10 }],
//   "scoreReason": "the full arithmetic (shown folded)",
//   "fit": "one line verdict (used when headline is missing)",
//   "summary": "two or three sentences on what the role really is",
//   "signals": ["hidden expectations, one short line each"],
//   "requirements": [{ "text": "Laravel", "importance": "must|nice", "status": "have|partial|unstated|gap", "note": "short evidence or reason" }],
//   "mustHave": ["..."], "niceToHave": ["..."],            (older format; used when requirements is missing)
//   "gaps": {
//     "stated":   [{ "skill": "...", "evidence": "..." }],
//     "unstated": [{ "skill": "...", "evidence": "..." }],
//     "missing":  [{ "skill": "...", "importance": "must|nice", "plan": "..." }]
//   },
//   "resumeChanges": [{ "change": "...", "why": "..." }],
//   "checklist": [{ "item": "...", "done": false }]
// }

import { esc, page, safeHref } from "./html.mjs";
import { STATUSES } from "./store.mjs";

export const REQUIREMENT_STATUSES = ["have", "partial", "unstated", "gap"];

export function validateAnalysis(a) {
  const problems = [];
  if (!a || typeof a !== "object") return ["analysis is not an object"];
  for (const key of ["company", "role", "summary"]) if (!a[key]) problems.push(`missing ${key}`);
  if (a.score !== undefined && !(Number.isFinite(a.score) && a.score >= 0 && a.score <= 100)) problems.push("score must be 0 to 100");
  for (const key of ["stated", "unstated", "missing"]) {
    if (a.gaps && a.gaps[key] !== undefined && !Array.isArray(a.gaps[key])) problems.push(`gaps.${key} must be a list`);
  }
  for (const [i, r] of (a.requirements || []).entries()) {
    if (!r?.text) problems.push(`requirements[${i}] missing text`);
    if (r?.status && !REQUIREMENT_STATUSES.includes(r.status)) problems.push(`requirements[${i}].status must be one of ${REQUIREMENT_STATUSES.join(", ")}`);
  }
  for (const [i, b] of (a.scoreBreakdown || []).entries()) {
    if (!b?.label || !Number.isFinite(b.got) || !Number.isFinite(b.max) || b.max <= 0 || b.got < 0 || b.got > b.max) {
      problems.push(`scoreBreakdown[${i}] needs a label and 0 <= got <= max`);
    }
  }
  return problems;
}

/** Escape, then turn **phrase** into a highlight. Safe because escaping happens first. */
export function md(text) {
  return esc(text).replace(/\*\*(.+?)\*\*/g, "<mark>$1</mark>");
}

const CSS = `
:root {
  --bg:#f6f7fb; --card:#ffffff; --ink:#0f172a; --muted:#5b6475; --faint:#8a93a5; --line:#e6e9f0;
  --good:#16794c; --good-bg:#e7f6ee; --warn:#a15c07; --warn-bg:#fdf3e1; --bad:#b42318; --bad-bg:#fdecea;
  --accent:#4338ca; --mark:#fff1a8;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg:#0b0f19; --card:#121826; --ink:#e7eaf0; --muted:#a3abbb; --faint:#7d8699; --line:#222a3a;
    --good:#4ade80; --good-bg:#0f2a1c; --warn:#fbbf24; --warn-bg:#2b2110; --bad:#f87171; --bad-bg:#2d1414;
    --accent:#a5b4fc; --mark:#5b4a00;
  }
}
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
main { max-width: 880px; margin: 0 auto; padding: 28px 16px 72px; }
a { color: var(--accent); text-decoration: none; } a:hover { text-decoration: underline; }
mark { background: var(--mark); color: inherit; padding: 0 3px; border-radius: 3px; }
h1 { font-size: 28px; line-height: 1.2; margin: 0; letter-spacing: -0.4px; }
h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .14em; color: var(--faint); margin: 0 0 12px; font-weight: 600; }
.chips { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
.chip { font-size:12.5px; padding:3px 10px; border-radius:999px; background:var(--card); border:1px solid var(--line); color:var(--muted); }
.chip.status { background: var(--accent); border-color: var(--accent); color: var(--card); font-weight: 600; text-transform: capitalize; }
.links { margin-top: 10px; font-size: 14px; display:flex; gap: 14px; flex-wrap: wrap; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 20px 22px; margin-top: 16px; }

.hero { display:grid; grid-template-columns: 132px 1fr; gap: 22px; align-items: start; border-left: 6px solid var(--tone); }
.ring { width:120px; height:120px; border-radius:50%; background: conic-gradient(var(--tone) calc(var(--p) * 1%), var(--line) 0); display:grid; place-items:center; }
.ring div { width:96px; height:96px; border-radius:50%; background:var(--card); display:grid; place-items:center; text-align:center; }
.ring b { font-size: 34px; line-height: 1; } .ring small { display:block; font-size: 11px; color: var(--faint); margin-top: 2px; }
.verdict { font-size: 19px; font-weight: 650; color: var(--tone); line-height: 1.35; margin: 2px 0 12px; }
.tldr { margin: 0; padding-left: 18px; } .tldr li { margin: 5px 0; }
.bars { margin-top: 14px; display:grid; gap: 7px; }
.bar { display:grid; grid-template-columns: 150px 1fr 56px; gap: 10px; align-items:center; font-size: 13px; color: var(--muted); }
.track { height: 8px; background: var(--line); border-radius: 99px; overflow:hidden; }
.fill { height: 100%; background: var(--tone); border-radius: 99px; }
.bar span:last-child { text-align: right; font-variant-numeric: tabular-nums; }

table.req { width:100%; border-collapse: collapse; }
.req td { padding: 10px 8px; border-top: 1px solid var(--line); vertical-align: top; }
.req tr:first-child td { border-top: 0; }
.icon { width: 30px; font-size: 16px; font-weight: 700; text-align:center; }
.have .icon { color: var(--good); } .partial .icon, .unstated .icon { color: var(--warn); } .gap .icon { color: var(--bad); }
.req .text { font-weight: 600; } .req .note { color: var(--muted); font-size: 13.5px; margin-top: 2px; font-weight: 400; }
.tag { font-size: 11px; padding: 1px 7px; border-radius: 99px; margin-left: 6px; font-weight: 600; vertical-align: 1px; }
.tag.must { background: var(--bad-bg); color: var(--bad); } .tag.nice { background: var(--line); color: var(--muted); }
.legend { display:flex; gap: 14px; flex-wrap: wrap; font-size: 12.5px; color: var(--muted); margin-bottom: 8px; }

.summary { font-size: 15.5px; margin: 0; }
.signals { list-style: none; padding: 0; margin: 12px 0 0; display:grid; gap: 6px; }
.signals li { padding: 8px 12px; background: var(--warn-bg); border-radius: 10px; font-size: 14px; }

.gapgrid { display:grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
.gapcol h3 { font-size: 14px; margin: 0 0 8px; }
.gapcol.have h3 { color: var(--good); } .gapcol.unstated h3 { color: var(--warn); } .gapcol.gap h3 { color: var(--bad); }
details { border-radius: 10px; margin: 6px 0; }
details > summary { cursor: pointer; list-style: none; padding: 7px 10px; border-radius: 10px; font-weight: 600; font-size: 14px; }
details > summary::-webkit-details-marker { display:none; }
details > summary::before { content: "▸"; display:inline-block; width: 14px; color: var(--faint); transition: transform .15s; }
details[open] > summary::before { transform: rotate(90deg); }
.gapcol.have summary { background: var(--good-bg); } .gapcol.unstated summary { background: var(--warn-bg); } .gapcol.gap summary { background: var(--bad-bg); }
details .more { padding: 6px 10px 4px 24px; color: var(--muted); font-size: 13.5px; }
.empty { color: var(--faint); font-size: 14px; }

ol.changes { margin: 0; padding-left: 22px; } ol.changes li { margin: 0 0 10px; } ol.changes .why { display:block; color: var(--muted); font-size: 13.5px; }
ul.next { list-style: none; padding: 0; margin: 0; } ul.next li { padding: 8px 0; border-top: 1px solid var(--line); display:flex; gap: 10px; }
ul.next li:first-child { border-top: 0; } .box { flex: none; }
.fold { margin: 2px 0 0; } .fold > summary { font-weight: 500; color: var(--accent); padding: 2px 0; font-size: 13px; } .fold .more { padding: 2px 0 4px 14px; }
footer { color: var(--faint); font-size: 12px; margin-top: 28px; text-align: center; }

@media (max-width: 620px) {
  .hero { grid-template-columns: 1fr; justify-items: start; }
  .bar { grid-template-columns: 110px 1fr 48px; }
  h1 { font-size: 23px; }
}
`;

function tone(score) {
  if (score === null) return "var(--faint)";
  if (score >= 75) return "var(--good)";
  if (score >= 50) return "var(--warn)";
  return "var(--bad)";
}

const ICONS = { have: "✓", partial: "◐", unstated: "◐", gap: "✗" };
const LABELS = { have: "You have it", partial: "Partly", unstated: "Have it, not on resume", gap: "Gap" };

/** Older analyses have no requirements list: build one from mustHave/niceToHave and the gaps. */
function deriveRequirements(a) {
  if (Array.isArray(a.requirements) && a.requirements.length) return a.requirements;
  const gaps = a.gaps || {};
  const STOP = new Set(["and", "the", "for", "with", "to", "of", "a", "an", "in", "on", "or", "your", "you", "as"]);
  const words = (s) => new Set(String(s).toLowerCase().match(/[a-z0-9+#]+/g)?.filter((w) => w.length > 1 && !STOP.has(w)) || []);
  const similar = (x, y) => {
    const a1 = words(x);
    const b1 = words(y);
    if (!a1.size || !b1.size) return 0;
    let shared = 0;
    for (const w of a1) if (b1.has(w)) shared++;
    return shared / Math.min(a1.size, b1.size);
  };
  const find = (text) => {
    const hit = (list) => {
      let best = null;
      let bestScore = 0.6; // at least 60% of the shorter phrase's words must match
      for (const g of list || []) {
        const s = similar(text, g.skill);
        if (s >= bestScore) [best, bestScore] = [g, s];
      }
      return best;
    };
    const missing = hit(gaps.missing);
    if (missing) return { status: "gap", note: missing.plan };
    const unstated = hit(gaps.unstated);
    if (unstated) return { status: "unstated", note: unstated.evidence };
    const stated = hit(gaps.stated);
    if (stated) return { status: "have", note: stated.evidence };
    return { status: null, note: "" };
  };
  return [
    ...(a.mustHave || []).map((text) => ({ text, importance: "must", ...find(text) })),
    ...(a.niceToHave || []).map((text) => ({ text, importance: "nice", ...find(text) })),
  ];
}

/** Show the first sentence of a long note and fold the rest, so each row stays one or two lines. */
function note(text) {
  const s = String(text || "").trim();
  if (!s) return "";
  if (s.length <= 160) return `<div class="note">${md(s)}</div>`;
  const cut = s.search(/[.;:](\s|$)/);
  const head = cut > 20 && cut < 160 ? s.slice(0, cut + 1) : s.slice(0, 140).replace(/\s+\S*$/, "") + "…";
  const rest = s.slice(head.replace(/…$/, "").length).trim();
  return `<div class="note">${md(head)}</div>${rest ? `<details class="fold"><summary>More</summary><div class="more">${md(rest)}</div></details>` : ""}`;
}

function gapColumn(cls, title, items, detail) {
  const body = items?.length
    ? items
        .map((g) => {
          const more = detail(g);
          const tag = g.importance ? `<span class="tag ${esc(g.importance)}">${esc(g.importance)}</span>` : "";
          return more
            ? `<details><summary>${md(g.skill)}${tag}</summary><div class="more">${md(more)}</div></details>`
            : `<details><summary>${md(g.skill)}${tag}</summary></details>`;
        })
        .join("")
    : `<p class="empty">None.</p>`;
  return `<div class="gapcol ${cls}"><h3>${esc(title)} · ${items?.length || 0}</h3>${body}</div>`;
}

export function renderJob({ meta = {}, analysis: a, files = {} }) {
  const score = Number.isFinite(a.score) ? Math.round(a.score) : null;
  const t = tone(score);
  const gaps = a.gaps || {};
  const requirements = deriveRequirements(a);
  const tldr = Array.isArray(a.tldr) && a.tldr.length ? a.tldr : [];
  const verdict = a.headline || a.fit || "";

  const links = [
    a.url && `<a href="${safeHref(a.url)}">↗ Job ad</a>`,
    files.jobMd && `<a href="${esc(files.jobMd)}">Saved copy</a>`,
    files.resumePdf && `<a href="${esc(files.resumePdf)}">Tailored resume (PDF)</a>`,
    `<a href="../index.html">All applications</a>`,
  ].filter(Boolean);

  const chips = [a.location, a.seniority].filter(Boolean).map((c) => `<span class="chip">${md(c)}</span>`);
  chips.push(`<span class="chip status">${esc(meta.status || "researching")}</span>`);

  const bars = (a.scoreBreakdown || [])
    .map(
      (b) => `<div class="bar"><span>${esc(b.label)}</span><div class="track"><div class="fill" style="width:${Math.round((b.got / b.max) * 100)}%"></div></div><span>${b.got}/${b.max}</span></div>`,
    )
    .join("");

  const hero = `<section class="card hero" style="--tone:${t}">
  <div class="ring" style="--p:${score ?? 0}"><div><span><b>${score ?? "–"}</b><small>match</small></span></div></div>
  <div>
    ${verdict ? `<p class="verdict">${md(verdict)}</p>` : ""}
    ${tldr.length ? `<ul class="tldr">${tldr.map((x) => `<li>${md(x)}</li>`).join("")}</ul>` : ""}
    ${bars ? `<div class="bars">${bars}</div>` : ""}
    ${a.scoreReason ? `<details class="fold"><summary>How the score was worked out</summary><div class="more">${md(a.scoreReason)}</div></details>` : ""}
  </div>
</section>`;

  const counts = Object.fromEntries(REQUIREMENT_STATUSES.map((s) => [s, requirements.filter((r) => r.status === s).length]));
  const reqTable = requirements.length
    ? `<section class="card"><h2>Requirements</h2>
  <div class="legend"><span>✓ ${counts.have} you have</span><span>◐ ${counts.partial + counts.unstated} partly or not on resume</span><span>✗ ${counts.gap} gap${counts.gap === 1 ? "" : "s"}</span></div>
  <table class="req">${requirements
    .map(
      (r) => `<tr class="${esc(r.status || "")}"><td class="icon" title="${esc(LABELS[r.status] || "Not assessed")}">${ICONS[r.status] || "·"}</td>
<td><div class="text">${md(r.text)}${r.importance ? `<span class="tag ${esc(r.importance)}">${esc(r.importance)}</span>` : ""}</div>${note(r.note)}</td></tr>`,
    )
    .join("")}</table></section>`
    : "";

  const role = `<section class="card"><h2>The role</h2><p class="summary">${md(a.summary)}</p>
  ${a.signals?.length ? `<ul class="signals">${a.signals.map((s) => `<li>⚠︎ ${md(s)}</li>`).join("")}</ul>` : ""}
</section>`;

  const gapSection = `<section class="card"><h2>Profile gaps <span style="text-transform:none;letter-spacing:0;font-weight:400">· click any item for the evidence or plan</span></h2>
  <div class="gapgrid">
    ${gapColumn("have", "You have it and say it", gaps.stated, (g) => g.evidence)}
    ${gapColumn("unstated", "You have it but don't say it", gaps.unstated, (g) => g.evidence)}
    ${gapColumn("gap", "Real gaps", gaps.missing, (g) => g.plan)}
  </div></section>`;

  const changes = a.resumeChanges?.length
    ? `<section class="card"><h2>Resume changes</h2><ol class="changes">${a.resumeChanges
        .map((c) => `<li>${md(c.change)}${c.why ? `<span class="why">${md(c.why)}</span>` : ""}</li>`)
        .join("")}</ol></section>`
    : "";

  const next = a.checklist?.length
    ? `<section class="card"><h2>Next steps</h2><ul class="next">${a.checklist
        .map((c) => `<li><span class="box">${c.done ? "✅" : "⬜️"}</span><span>${md(c.item)}</span></li>`)
        .join("")}</ul></section>`
    : "";

  const body = `<main>
<h1>${esc(a.role)} <span style="color:var(--faint);font-weight:500">at</span> ${esc(a.company)}</h1>
<div class="chips">${chips.join("")}</div>
<div class="links">${links.join("")}</div>
${hero}
${reqTable}
${role}
${gapSection}
${changes}
${next}
<footer>Updated ${esc(meta.updated || "")} · job-hunt-kit · stored only on this computer</footer>
</main>`;
  return page({ title: `${a.role} · ${a.company}`, body, css: CSS });
}

export function renderIndex(jobs) {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, jobs.filter((j) => (j.status || "researching") === s).length]));
  const rows = jobs
    .map((j) => {
      const s = Number.isFinite(j.score) ? j.score : null;
      return `<tr><td><a href="${esc(j.slug)}/dashboard.html"><b>${esc(j.role || j.slug)}</b></a><div class="note">${esc(j.company || "")}</div></td>
<td style="color:${tone(s)};font-weight:700;font-size:18px">${s ?? "–"}</td>
<td><span class="chip status">${esc(j.status || "researching")}</span></td><td class="note">${esc(j.updated || "")}</td></tr>`;
    })
    .join("");
  const body = `<main>
<h1>Job hunt</h1>
<div class="chips">${STATUSES.map((s) => `<span class="chip">${esc(s)}: <b>${counts[s]}</b></span>`).join("")}</div>
<section class="card">
${jobs.length ? `<table class="req">${rows}</table>` : `<p class="empty">No applications yet. Start one with /job-hunt-kit:start and a job link.</p>`}
</section>
<footer>job-hunt-kit · stored only on this computer</footer>
</main>`;
  return page({ title: "Job hunt", body, css: CSS + ".req .note{color:var(--muted);font-size:13px}" });
}
