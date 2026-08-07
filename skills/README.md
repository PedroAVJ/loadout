# Skills

Pedro-authored standalone agent skills (one folder per skill, `SKILL.md`
inside). Skills that belong to a plugin live under that plugin's `skills/`
directory instead; this directory is for skills that stand alone.

All skills here are client-agnostic instructions usable by any agent that
reads the [Agent Skills](https://agentskills.io) format. Per-agent targeting
(codex-only, Claude-only, everything) happens at install time, not in the
repo.

| Skill | What it does |
| --- | --- |
| `agent-ledger` | Agent-owned operational state in a local SQLite ledger (IOUs, follow-ups, agent todos) |
| `anger-defusal` | Context-gap check before responding to user frustration; verdict-first defusal shape |
| `bdd-test` | Minimal BDD contracts (Given/When/Then Markdown) paired with Playwright automation |
| `codex-app-hacking` | Inspect/patch/restore the local macOS Codex desktop app bundle (ASAR, codesigning) |
| `linear` | Linear workspace conventions: no priorities, label by originating repo, plain-English issue references |
| `mac-health-triage` | Diagnose macOS CPU heat, memory pressure, swap, and stale agent processes |
| `mcp-servers` | Install/list/remove/sync MCP servers across coding agents via the add-mcp CLI |
| `publish-file` | Publish local files to durable URLs via the publish-file CLI (Google Cloud Storage) |
| `sentry-logs` | Sentry Logs vs issues/events/traces; query the right surface |
| `sqlite-cache-cli-pattern` | Durable CLIs that sync API/connector data into a local SQLite cache |

Install into local agents with the skills CLI:

```bash
npx skills add PedroAVJ/loadout --list
npx skills add PedroAVJ/loadout --skill <name> -a claude-code -a codex -g -y
```

Always install by explicit `--skill` name. Do not use `-s '*'` / `--all` on
this repo: the CLI discovers every SKILL.md in the tree, including
plugin-internal skills under `plugins/*/skills/`, which are delivered via the
plugin marketplaces and must not be double-installed as standalone skills.

Workflow: edit skills here (upstream) first, push, then `npx skills update
-g` locally — see `.agents/skills/loadout-release` for the full release
procedure. The skills CLI keeps the canonical copy in `~/.agents/skills/`
and symlinks `~/.claude/skills/` automatically (Claude Code does not read
the agents directory itself). Local skill directories are CLI-managed
install targets, not sources of truth. OpenAI curated/system skills and
third-party skills are never vendored into this repo.
