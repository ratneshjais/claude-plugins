---
description: Make a fresh resume tailored to one job, built from your master resume, with a check that no facts were changed or invented.
argument-hint: "[job slug, default: the most recent application] [changes to include or skip]"
---

# Tailor the resume for a job

Request: $ARGUMENTS

## Find the helper script

Use `node "${CLAUDE_PLUGIN_ROOT}/bin/jhk.mjs"`. If that path does not resolve, use the newest match of
`ls ~/.claude/plugins/cache/*/job-hunt-kit/*/bin/jhk.mjs`. Call it `jhk` below.

## Steps

1. Pick the application. Use the slug given above; otherwise run `jhk list` and take the most recent one.
   Confirm which job you are working on.
2. Read `~/.job-hunt-kit/resume.json` (the master) and the application's `analysis.json` and `job.md`.
3. Agree the changes. List the `resumeChanges` from the analysis and ask which to apply, unless the user
   already said so above.
4. Write the tailored resume to `resume.json` in the application folder. Start from a copy of the master and
   apply only the agreed changes. The rules:
   - Never change employers, titles, dates, education, name, email or phone. The check will refuse it.
   - You may reword, reorder, merge or cut bullets; reorder skill groups; and rewrite the headline and summary
     for this role.
   - Add a skill only when the master resume or the skill-tracker log shows it. Use the job ad's wording for
     a skill the user really has (for example "REST APIs" when the ad says so).
   - Never invent numbers, results, team sizes or tools.
   - Keep it to two pages.
5. Run `jhk resume <slug>`. It checks the tailored resume against the master, then writes HTML and PDF.
   - If it reports problems, fix them and run it again.
   - It lists every new skill and every new or reworded bullet. Show that list to the user and ask them to
     confirm each one is true. Change anything they reject and run it again.
6. Update the checklist in `analysis.json` (mark "tailor resume" done), run `jhk dashboard <slug>`, and give
   the user the PDF path.
