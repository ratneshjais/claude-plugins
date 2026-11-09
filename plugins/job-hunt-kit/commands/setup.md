---
description: Set up job-hunt-kit with your master resume, the single source every tailored resume is built from.
argument-hint: "[path to your current resume: PDF, DOCX, HTML, Markdown or JSON]"
---

# Set up job-hunt-kit

Create or update the user's master resume at `~/.job-hunt-kit/resume.json` (or `$JOB_HUNT_KIT_DIR/resume.json`).
Every tailored resume is generated from it, and the kit checks that tailored versions never change its facts.

Resume to import (may be blank): $ARGUMENTS

## Find the helper script

Use `node "${CLAUDE_PLUGIN_ROOT}/bin/jhk.mjs"`. If that path does not resolve, use the newest match of
`ls ~/.claude/plugins/cache/*/job-hunt-kit/*/bin/jhk.mjs`. Call it `jhk` below.

## Steps

1. Run `jhk home` to see whether a master resume already exists. If it does, ask whether to update it or
   keep it, and stop if the user wants to keep it.
2. Get the resume. Read the file given above. If none was given, ask for a path or for the text to be pasted.
3. Convert it to the format documented at the top of `lib/resume.mjs` in this plugin: name, headline,
   location, email, phone, links, summary, skills (groups of items), experience (company, title, location,
   start, end, duration, sections of bullets with optional headings), education. Copy facts exactly as they
   appear: do not improve, reword or add anything at this stage.
4. Show the user a short summary of what you captured (roles with dates, number of bullets, skill groups)
   and anything you could not place. Ask them to confirm.
5. Save it to `~/.job-hunt-kit/resume.json`, then run `jhk resume master` to render it. Tell the user where
   the PDF is and ask them to compare it with their original.

The master resume holds personal details, so it stays in that private folder. Never copy it into a repository.
