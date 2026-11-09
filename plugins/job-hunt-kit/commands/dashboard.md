---
description: Open the dashboard for one job, or the overview of all your applications.
argument-hint: "[job slug]"
---

# Open the job hunt dashboard

Request: $ARGUMENTS

Use `node "${CLAUDE_PLUGIN_ROOT}/bin/jhk.mjs"` (or the newest match of
`ls ~/.claude/plugins/cache/*/job-hunt-kit/*/bin/jhk.mjs`), called `jhk` below.

1. If a slug was given, run `jhk dashboard <slug>`; otherwise run `jhk dashboard` for the overview page.
2. Open the page it prints (`open <path>` on macOS, `xdg-open <path>` on Linux).
3. Tell the user the path, in case they want to bookmark it.
