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
`lib/dashboard.mjs` in this plugin:

- **summary**: two or three sentences on what the job really is: the product, the team, what you would
  spend your days on.
- **mustHave / niceToHave**: the requirements, in the ad's own priority.
- **signals**: hidden expectations behind phrases like "fast-paced", "ownership", "wear many hats",
  on-call, travel, or a gap between the title and the duties.
- **gaps.stated**: requirements the resume already shows, with the evidence.
- **gaps.unstated**: requirements the user has, according to the skill-tracker log or notes, but the
  resume does not mention. Cite the log as evidence. Never put a skill here without evidence.
- **gaps.missing**: real gaps, marked `must` or `nice`, each with a short plan to close it.
- **score** (0 to 100) and **scoreReason**: must-haves count for 70, nice-to-haves 20, seniority and
  domain fit 10. Show the arithmetic in plain words.
- **fit**: a one-line honest verdict, including "not a good fit" when that is true.
- **resumeChanges**: specific edits: which bullet to reword and how, what to move up, what to cut, which
  unstated skills to add. Each with a reason tied to the ad. Never suggest claiming something without evidence.
- **checklist**: the next steps, such as tailor resume, apply, prepare for interview.

## 5. Build the dashboard and report

Run `jhk dashboard <slug>`, then open the dashboard (`open <path>` on macOS, `xdg-open` on Linux).

In chat, give the user a short report: the role in two sentences, the score and verdict, the top three
gaps, and the suggested resume changes as a numbered list. Then ask whether to make a tailored resume with
those changes (`/job-hunt-kit:resume`). Do not create the resume until the user agrees.
