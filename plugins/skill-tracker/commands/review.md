---
description: Turn your tracked work into a summary of skills, new technologies and resume-ready bullets, with no client or project names.
argument-hint: "[days, default 30]"
---

# Skill review

Summarise the user's skill tracker and suggest how it strengthens their profile.

Period requested (in days, blank means 30): $ARGUMENTS

## Steps

1. **Read the log summary** with the bundled script. Use the number of days given above, or 30:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/bin/review.mjs" --days 30
   ```

   If that path does not resolve, find the script with
   `ls ~/.claude/plugins/cache/*/skill-tracker/*/bin/review.mjs` and use the newest match.
   The script only reads `~/.skill-tracker/` (or `$SKILL_TRACKER_DIR`). Do not open project folders, repositories
   or transcripts to add detail: the review must be built only from the log.

2. **Write the review** for the user, in this order:
   - **Skills in use:** the technologies and kinds of work that came up most, in a sentence or two.
   - **New this period:** anything the log marks as new, and whether it is worth adding to the profile.
   - **Resume bullets:** two to four bullets built from the notes and the patterns above. Each one starts
     with a verb, names the technology, and states a result when the notes give one. Never invent numbers
     or outcomes that are not in the notes; leave a bullet without a figure rather than guess.
   - **Profile suggestions:** skills to add to the resume, site or LinkedIn, and any skill that appears
     often in the log but is missing from them, if the user has shared their profile in this conversation.

3. **Keep it anonymous.** The output goes on a public profile. If any note still contains a name, URL or
   other identifying detail, leave it out and tell the user which note to fix.

4. **Offer to save** the review as `~/.skill-tracker/reviews/<YYYY-MM-DD>.md`. Write the file only if the user agrees.
