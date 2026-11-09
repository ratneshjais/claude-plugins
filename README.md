# claude-plugins

My personal [Claude Code](https://docs.claude.com/en/docs/claude-code) plugins, published as a plugin marketplace.

| Plugin | What it does |
|---|---|
| [skill-tracker](plugins/skill-tracker) | Keeps a private, anonymous record of the technologies and kinds of work in your sessions, and turns it into skill summaries and resume bullets. |

## Install

```bash
claude plugin marketplace add ratneshjais/claude-plugins
claude plugin install skill-tracker@ratnesh-plugins
```

Restart Claude Code afterwards so plugin hooks load.

## Develop

Each plugin lives in `plugins/<name>/` with its own README and tests:

```bash
cd plugins/skill-tracker && npm test
claude plugin validate plugins/skill-tracker
```
