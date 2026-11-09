---
description: Save a one-line career note (a win, a skill learned, a problem solved) with all project and client details removed.
argument-hint: "[what you did or learned]"
---

# Save a career note

The user wants to record something from their work for their career profile. What they said:

$ARGUMENTS

## Steps

1. **Work out the note.** If the user gave text above, use it. If not, look at what was done in this
   session and propose one note. A good note says what was done, how, and the result, in one sentence,
   for example: "Cut a checkout page's load time from 4s to 1.2s by caching shipping-rate lookups in Redis."

2. **Remove every identifying detail before saving.** The note must not contain:
   - client, company, brand, product or project names
   - site addresses, URLs, domains, emails, IP addresses
   - repository, folder or file paths, branch names, ticket numbers
   - code, credentials, or figures that only make sense inside this client's business

   Replace them with neutral descriptions: "an e-commerce client", "a recruitment site", "a Next.js app".
   Technology names (Laravel, Redis, WooCommerce) are fine and wanted. Keep honest numbers only when they
   describe your work, not the client's business.

3. **Show the user the note and ask them to confirm it** before saving. Saving is cheap but the user
   should always see what goes into the log.

4. **Save it** with the bundled script. It redacts again as a safety net and prints what it saved:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/bin/note.mjs" "<the note>"
   ```

   If that path does not resolve, find the script with
   `ls ~/.claude/plugins/cache/*/career-log/*/bin/note.mjs` and use the newest match.

5. **Report** the saved text in one line. If the script redacted anything, mention it so the user can
   rephrase next time.
