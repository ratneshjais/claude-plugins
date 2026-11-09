# career-log

A Claude Code plugin that keeps a private record of what you work on, so you never have to rebuild your
career story from memory. When each session ends it notes the technologies you used and the kind of work
you did. When you want to update your resume, `/career-log:review` turns that record into a skills summary
and resume-ready bullets.

It is built to run on a work machine without leaking anything about your employer or clients.

## What it records

At the end of every session that edited files or ran commands, one line is appended to
`~/.career-log/sessions.jsonl`:

```json
{"v":1,"date":"2026-11-09","minutes":47,"edits":3,"commands":2,
 "languages":["Blade","SQL","TypeScript"],"tools":["Composer","Git","WP-CLI","npm"],
 "stack":["Bedrock","Next.js","Payload CMS","WooCommerce"],"kinds":["bug fix","performance","testing"],
 "endedAt":"2026-11-09T11:00"}
```

Every name in that record comes from a fixed allowlist of public technologies in `lib/techs.mjs`. Anything
not on the list, such as a private package, a client's plugin or a project folder, is ignored. The record
never contains project or client names, paths, URLs, code, prompts, session IDs or command text.

Notes you add yourself go to `~/.career-log/notes.jsonl`, after a redaction pass that removes URLs, emails,
domains, IP addresses, file paths, tokens, and the current project's folder and git remote names.

Nothing is uploaded anywhere. Both files are plain text that only your user account can read, and you can
edit or delete any line.

## Commands

| Command | What it does |
|---|---|
| `/career-log:note [text]` | Save a one-line win or lesson. Claude strips identifying details, shows you the note, and saves it after you confirm. |
| `/career-log:review [days]` | Summarise the last 30 days (or the number you give): skills used most, what's new, and two to four resume bullets. Built only from the log. |
| `/career-log:status` | Show what has been recorded and where it is stored. |

## Install

From a local clone:

```bash
claude plugin marketplace add ~/Projects/career-log
claude plugin install career-log@career-log
```

Restart Claude Code afterwards so the session hook loads. Requires Node.js 18 or later.

To pause logging, set `CAREER_LOG_DISABLED=1`. To keep the log somewhere else, set `CAREER_LOG_DIR`.

## Using it at work

Check your employer's policy before installing it on a work account. The plugin is designed to record
only your own skills and never your employer's information, but your contract has the final say.

## Develop

```bash
npm test   # node --test, no dependencies
```

The tests use invented projects and transcripts and check that no project names, paths or private
package names reach the log.

## License

MIT
