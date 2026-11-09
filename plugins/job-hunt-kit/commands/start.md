---
description: Start on a job - give the job link and get the role overview, your match score, profile gaps and suggested resume changes, plus a dashboard.
argument-hint: "<job link, or paste the job description>"
---

# Start a job application

The user wants to go for this job: $ARGUMENTS

## Find the helper script

Use `node "${CLAUDE_PLUGIN_ROOT}/bin/jhk.mjs"`. If that path does not resolve, use the newest match of
`ls ~/.claude/plugins/cache/*/job-hunt-kit/*/bin/jhk.mjs`. Call it `jhk` below.

## 1. Read the job

- If the user gave a link, fetch the page. Many job boards (LinkedIn, Naukri, Indeed, some company portals)
  block automated reading or show a login page. If the page has no real job description, say so and ask the
  user to paste the description. Do not try to get around a login or a block.
- If the user pasted text, use that.
- Work out the company and the role title. If either is unclear, ask.

## 2. Create the application

Run `jhk new --company "<company>" --role "<role>" --url "<link or empty>"`. It prints the application's
`slug` and folder. If it already existed, say so and continue with the existing one.

Save the job description as `job.md` in that folder: a heading with role, company, link and today's date,
then the description text. Job ads disappear, and later steps need it.

## 3. Gather the user's evidence

- Master resume: `~/.job-hunt-kit/resume.json`. If it is missing, stop and ask the user to run `/job-hunt-kit:setup`.
- Skill-tracker log, if that plugin is installed: run the newest match of
  `ls ~/.claude/plugins/cache/*/skill-tracker/*/bin/review.mjs` with `--days 365`. If it is not installed,
  skip this and say the gap analysis uses the resume only.
- Use nothing else. Do not open project folders or repositories to look for evidence.

## 4. Analyse and save `analysis.json`

Write `analysis.json` in the application folder, in the format documented at the top of
`lib/dashboard.mjs` in this plugin.

The dashboard is read in under a minute, so write for skimming:
- Keep every item short: about 20 words at most, except `summary` and `scoreReason`.
- In any text field, wrap the one phrase that matters most in `**double asterisks**`. The dashboard
  highlights it. Highlight one phrase per item at most, or nothing stands out.
- Put long explanations only in `scoreReason`, `gaps[*].evidence` and `gaps.missing[*].plan`, which the
  dashboard shows folded.

The fields:

- **headline**: the verdict in at most 15 words, for example `**Not a fit**: this is an SAP ABAP role, not web full-stack.`
- **tldr**: exactly three bullets: what the job is, where you stand, and what to do next.
- **summary**: two or three sentences on what the job really is: the product, the team, what you would
  spend your days on.
- **signals**: hidden expectations behind phrases like "fast-paced", "ownership", "wear many hats",
  on-call, travel, or a gap between the title and the duties. One short line each, at most five.
- **requirements**: every requirement from the ad, in the ad's priority, each with `importance`
  (`must` or `nice`), `status` and a short `note`:
  - `have`: the resume shows it; the note says where.
  - `unstated`: the skill-tracker log or notes show it, but the resume does not. Never use this without evidence.
  - `partial`: some evidence, but not the depth or scope the ad asks for.
  - `gap`: no evidence; the note says how hard it is to close.
- **mustHave / niceToHave**: the same requirements as plain lists (kept for older tools).
- **gaps.stated / unstated / missing**: the same assessment grouped by status, with the full evidence or plan.
  `missing` items are marked `must` or `nice`.
- **score** (0 to 100), **scoreBreakdown** and **scoreReason**: must-haves count for 70, nice-to-haves 20,
  seniority and domain fit 10. `scoreBreakdown` holds the three parts as
  `{ "label", "got", "max" }`, and they must add up to `score`. `scoreReason` shows the arithmetic in plain words.
- **fit**: the same verdict as `headline`, without highlighting.
- **resumeChanges**: specific edits: which bullet to reword and how, what to move up, what to cut, which
  unstated skills to add. Each with a short reason tied to the ad. Never suggest claiming something without evidence.
- **checklist**: the next steps, such as tailor resume, apply, prepare for interview.

## 5. Build the dashboard and report

Run `jhk dashboard <slug>`, then open the dashboard (`open <path>` on macOS, `xdg-open` on Linux).

In chat, give the user a short report: the role in two sentences, the score and verdict, the top three
gaps, and the suggested resume changes as a numbered list. Then ask whether to make a tailored resume with
those changes (`/job-hunt-kit:resume`). Do not create the resume until the user agrees.
