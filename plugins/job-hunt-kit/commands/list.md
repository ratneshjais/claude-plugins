---
description: List your job applications, or update one's status (researching, applied, interviewing, offer, rejected, withdrawn).
argument-hint: "[slug status]"
---

# Job applications

Request: $ARGUMENTS

Use `node "${CLAUDE_PLUGIN_ROOT}/bin/jhk.mjs"` (or the newest match of
`ls ~/.claude/plugins/cache/*/job-hunt-kit/*/bin/jhk.mjs`), called `jhk` below.

- If the request names an application and a status, run `jhk status <slug> <status>`, then `jhk dashboard`
  to refresh the overview. Match loose wording to a status ("got an interview" means `interviewing`) and to a
  slug (a company name is enough when it is unique).
- Otherwise run `jhk list` and show the applications as a short table: role, company, match score, status,
  last updated. Suggest the next step for anything that has been sitting at the same status for over two weeks.
