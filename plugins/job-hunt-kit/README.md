# job-hunt-kit

A Claude Code plugin for applying to jobs. Give it a job link and it tells you what the role really is,
how well you match, where your gaps are and what to change on your resume. Then it builds a tailored
resume from your master resume, with a check that it never changes or invents a fact. Every application
gets a dashboard, and an overview page tracks them all.

## Commands

| Command | What it does |
|---|---|
| `/job-hunt-kit:setup [resume file]` | Imports your current resume as the master resume that every tailored version is built from. |
| `/job-hunt-kit:start <job link>` | Reads the job ad and saves a copy. Writes the role overview, match score, gaps and suggested resume changes. Builds the dashboard. |
| `/job-hunt-kit:resume [job]` | Applies the changes you agree to and renders a tailored PDF, after checking it against the master resume. |
| `/job-hunt-kit:gaps [job]` | Re-runs the gap analysis, for example after you learn a skill or update your resume. |
| `/job-hunt-kit:dashboard [job]` | Opens one job's dashboard, or the overview of all applications. |
| `/job-hunt-kit:list [job status]` | Lists applications, or moves one to applied, interviewing, offer, rejected or withdrawn. |

## How it keeps your resume honest

Your master resume is a structured file, `~/.job-hunt-kit/resume.json`. Each tailored resume is a copy
of it with agreed edits, and `bin/jhk.mjs` compares the two before rendering:

- If an employer, job title, date, education entry, name, email or phone changed or appeared from nowhere,
  it refuses to render.
- It lists every new skill and every new or reworded bullet, and Claude asks you to confirm each one.
- It warns when the PDF runs past two pages.

The gap analysis uses only your resume and, if you have it, the anonymous log from the
[skill-tracker](../skill-tracker) plugin. That log is how it finds skills you have but never wrote down.

## Where things are stored

Everything lives in `~/.job-hunt-kit/` on your computer and nowhere else. That covers your master resume,
and, for each job, a copy of the ad, the analysis, the tailored resume and the dashboard. Applications hold
personal details, so keep that folder out of any repository. Set `JOB_HUNT_KIT_DIR` to keep it somewhere else.

Job boards like LinkedIn and Naukri often block automated reading. When that happens, the plugin asks you
to paste the job description instead. It never tries to get around a login.

## Install

```bash
claude plugin marketplace add ratneshjais/claude-plugins
claude plugin install job-hunt-kit@ratnesh-plugins
```

Requires Node.js 18 or later. The PDF uses a locally installed Chrome, Chromium or Edge; without one you
get the HTML file, which any browser can print to PDF. Set `JOB_HUNT_KIT_CHROME` to point at a browser
installed somewhere unusual.

## Coming next

Interview preparation (likely questions with answers drawn from your own work, and flowcharts for design
answers), project and open-source suggestions for each gap, and a public-sources picture of who usually
holds the role.

## Develop

```bash
npm test   # node --test, no dependencies; all people and companies in the tests are invented
```

## License

MIT
