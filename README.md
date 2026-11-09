# claude-plugins

My personal [Claude Code](https://docs.claude.com/en/docs/claude-code) plugins, published as a plugin marketplace.

| Plugin | What it does |
|---|---|
| [career-log](plugins/career-log) | Keeps a private, anonymous record of the technologies and kinds of work in your sessions, and turns it into skill summaries and resume bullets. |

## Install

```bash
claude plugin marketplace add ratneshjais/claude-plugins
claude plugin install career-log@ratnesh-plugins
```

Restart Claude Code afterwards so plugin hooks load.

## Develop

Each plugin lives in `plugins/<name>/` with its own README and tests:

```bash
cd plugins/career-log && npm test
claude plugin validate plugins/career-log
```
