# Skills

Pedro-authored standalone agent skills (one folder per skill, `SKILL.md`
inside). Skills that belong to a plugin live under that plugin's `skills/`
directory instead; this directory is for skills that stand alone.

A skill stands alone only when it ships nothing but instructions and every
dependency it names is already installed. A skill that owns a CLI, script, or
MCP server belongs in a plugin — see the `agent-skills` skill in the
[`loadout`](../plugins/loadout) plugin for the full rule.

All skills here are client-agnostic instructions usable by any agent that
reads the [Agent Skills](https://agentskills.io) format. Per-agent targeting
(codex-only, Claude-only, everything) happens at install time, not in the
repo.

| Skill | What it does |
| --- | --- |
| `publish-file` | Publish local files to durable URLs via the publish-file CLI (Google Cloud Storage) |

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
-g` locally — see the `loadout-release` skill in the
[`loadout`](../plugins/loadout) plugin for the full release procedure. The
skills CLI keeps the canonical copy in `~/.agents/skills/` and symlinks
`~/.claude/skills/` automatically (Claude Code does not read
the agents directory itself). Local skill directories are CLI-managed
install targets, not sources of truth. OpenAI curated/system skills and
third-party skills are never vendored into this repo.
