---
description: Show what the career log has recorded so far and where it is stored.
---

# Career log status

Show the user what the career log holds, so they can check that nothing identifying is being saved.

1. Run:

   ```bash
   d="${CAREER_LOG_DIR:-$HOME/.career-log}"; echo "Log folder: $d"; ls -la "$d" 2>/dev/null || echo "(empty: nothing recorded yet)"
   echo "--- last 5 sessions"; tail -n 5 "$d/sessions.jsonl" 2>/dev/null
   echo "--- last 5 notes"; tail -n 5 "$d/notes.jsonl" 2>/dev/null
   ```

2. Explain in plain words what was recorded for the latest sessions (languages, tools, project stack,
   kinds of work, minutes). Point out that no names, paths or code are stored.

3. Remind the user how to pause logging (`export CAREER_LOG_DISABLED=1`) and that they can edit or delete
   any line in those files by hand.
