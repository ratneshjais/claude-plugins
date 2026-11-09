---
description: Re-run the profile gap analysis for a job, for example after updating your resume or building a skill.
argument-hint: "[job slug, default: the most recent application]"
---

# Refresh the profile gaps for a job

Request: $ARGUMENTS

Use `node "${CLAUDE_PLUGIN_ROOT}/bin/jhk.mjs"` (or the newest match of
`ls ~/.claude/plugins/cache/*/job-hunt-kit/*/bin/jhk.mjs`), called `jhk` below.

1. Pick the application from the slug above, or the most recent one from `jhk list`.
2. Read its `job.md` and `analysis.json`, the master resume, the tailored `resume.json` if there is one, and
   the skill-tracker review (`--days 365`) if that plugin is installed. Use nothing else.
3. Redo `gaps`, `score`, `scoreReason`, `fit` and `resumeChanges` with the same rules as `/job-hunt-kit:start`.
   Keep the rest of `analysis.json` as it is.
4. Run `jhk dashboard <slug>`.
5. Tell the user what changed since last time: gaps closed, gaps still open, and the new score.
