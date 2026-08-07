---
name: agent-skills
description: Find, vet, install, update, and remove agent skills across coding agents using the skills CLI, and decide which agents each skill should target. Use when the user asks "is there a skill for X", "how do I do X" where a skill might exist, wants to install or remove a skill, wants to audit what skills are installed where, or is deciding whether something should be a skill at all.
---

# Agent Skills

Use the `skills` CLI (`npx skills`, vercel-labs/skills) as the command
surface for installing SKILL.md directories into local agents. It resolves a
source repo, writes one canonical copy, and bridges that copy into each
target agent's own skills directory.

## Pick the Right Delivery Mechanism First

Three things get installed into agents and they are not interchangeable.
Getting this wrong is the most common mistake, and it is usually made at
authoring time, not install time.

| Mechanism | Carries | Installed by | Lives in |
| --- | --- | --- | --- |
| **Skill** | Procedure and knowledge. No code of its own. | `skills` CLI | `~/.agents/skills/<name>/` |
| **MCP server** | Tools the model can call. | `add-mcp` CLI | each agent's own config |
| **Plugin** | A bundle: skills + scripts + CLIs + MCP config + assets, versioned and released together. | each agent's plugin marketplace | per-agent plugin cache |

**For anything Pedro authors, the answer is always a plugin.** Loadout ships
plugins and only plugins — no standalone skills, no standalone MCP servers.
A plugin may contain skills and MCP config internally; the rule governs the
unit of distribution. When new content has no plugin that owns it, that is
the signal to create one, not to publish it loose. `pnpm test:structure`
enforces this in the repo.

The reasoning, which is worth keeping because it generalizes:

- A **plugin** is versioned, released, and upgraded as one thing through each
  client's marketplace. Its skills, scripts, and CLIs move together and
  cannot drift apart.
- A **standalone skill** installs through a separate CLI with a separate
  lockfile pointing at a path in some repo. It drifts, its `remove` is
  unreliable, and it carries no code — so a skill that says "use the
  installed `foo` CLI" without owning `foo` ships an incomplete install.
- A **standalone MCP server** is a curated subset of tools over an interface
  the agent can usually call directly. When a CLI exists, MCP is strictly
  less capability at the cost of extra context. It earns its place only when
  no callable interface exists — access-gated data, or an opaque running
  process.

The rest of this skill is about *consuming* third-party skills, which is
still worth doing — it just means installing from their source, never
vendoring them here.

See `loadout-release` for how plugins are built and published, and
`mcp-servers` for the MCP side.

## Choosing Agent Targets

`-a/--agent` is repeatable and takes agent identifiers. The default target
set for anything installed here is **both primary agents**:

```bash
npx skills add <source> --skill <name> -a codex -a claude-code -g -y
```

Narrow the target set when the skill is genuinely client-specific — and only
then. A skill belongs to one agent when its *content* would be wrong
elsewhere, not when it merely happens to be used there more often:

- **Codex-only** — procedure written against Codex's own surfaces: its
  config at `~/.codex/config.toml`, `codex plugin`/`codex mcp` subcommands,
  the desktop app bundle, `[apps.*]` brokered integrations.
- **Claude-only** — procedure written against Claude Code's surfaces:
  hooks and `settings.json`, subagents, output styles, Claude plugin
  marketplaces, `~/.claude.json`.
- **Both** — everything else. Tool knowledge, repo conventions, engineering
  doctrine, and any CLI that both agents can shell out to. This is the
  common case; prefer it when unsure, because a skill installed to an agent
  that never triggers it costs nothing but a skill missing where it is
  needed costs a whole session.

The identifiers that matter here are `codex`, `claude-code`, and `universal`
— the last one being the canonical `~/.agents/skills/` directory itself,
which most agents read natively. The CLI supports roughly seventy more
(`cursor`, `zed`, `amp`, `opencode`, `windsurf`, `gemini-cli`, `goose`,
`aider`, `crush`, and so on). Do not assert that a given target exists from
memory; pass a deliberately invalid `-a` value and the CLI prints its full
current list, or drop `-y` for the interactive picker.

`--all` is shorthand for `--skill '*' --agent '*' -y`. Never use it against a
repo you have not listed first.

## Where Installs Land

One canonical copy in `~/.agents/skills/<name>/`, read natively by Codex and
most agents, plus per-agent bridges — Claude Code gets a symlink into
`~/.claude/skills/<name>` because it does not read the agents directory
itself. The lockfile at `~/.agents/.skill-lock.json` records each skill's
source repo, path, folder hash, and install time; read it to answer "where
did this skill come from" and to check provenance before touching anything.

These directories are **install targets, not sources of truth**. Never edit a
skill in place there — the change is invisible to the source repo and the
next `update` silently reverts it. Edit upstream, push, then update.

## Find Before Installing

```bash
npx skills find <query>              # interactive search
npx skills find <query> --owner <gh> # scope to one GitHub owner
npx skills add <source> --list       # enumerate skills in a repo, install nothing
```

Search order that avoids duplicate work:

1. **Already installed?** `npx skills list -g`. The most common outcome of
   "find me a skill for X" is that X is installed and simply did not trigger,
   which is a description problem, not a missing-skill problem.
2. **In loadout?** Check the installed plugins — `claude plugin list`,
   `codex plugin list` — and their skills under `plugins/*/skills/`.
   Loadout's own content is never a standalone skill, so `npx skills` will
   not find it.
3. **The wider ecosystem** — `npx skills find`, and the skills.sh leaderboard
   for a popularity read.

## Try Before Installing

```bash
npx skills use <source>@<skill>
```

Prints the skill as a prompt without installing it. Use this to evaluate a
third-party skill's actual content before it becomes part of every session.
Prefer it over installing-then-removing.

## Vetting

Read `SKILL.md` before installing, always. A skill is instructions that will
be injected into future sessions, so it carries the same trust as anything
else that steers an agent.

- **Read the whole file**, not the description. The description is what
  triggers it; the body is what it does.
- **Check what it executes.** Bundled `scripts/` and any command the body
  tells the agent to run are the real surface area. `curl | sh`, credential
  reads, and writes outside the working tree are disqualifying without a
  specific reason.
- **Install counts are popularity, not review.** They say a skill did not
  visibly break for many people. They say nothing about whether it is right
  for this setup, and a well-reviewed 50-install skill beats a vague
  50,000-install one.
- **Overbroad descriptions are a real cost.** A skill that claims to trigger
  on "any coding task" will fire constantly and crowd out sharper skills.
  Prefer narrow triggers.

## Install, Update, Remove

```bash
# Install one named skill, both primary agents, user-level
npx skills add <source> --skill <name> -a codex -a claude-code -g -y

# Update everything tracked in the lockfile from its source
npx skills update -g

# Update named skills only
npx skills update <name> -g

# Remove
npx skills remove <name> -g -a universal -a codex -a claude-code
```

**`remove` under-reports.** It prints "Successfully removed N skill(s)" after
unlinking only the per-agent bridges it was pointed at; the canonical copy in
`~/.agents/skills/<name>/` and the `~/.agents/.skill-lock.json` entry survive.
`-a '*'` is rejected outright by `remove` despite the help text advertising
it. Include `-a universal` to reach the canonical directory, then verify
rather than trusting the exit message:

```bash
npx skills list -g | grep <name>          # should print nothing
ls ~/.agents/skills/ | grep <name>        # should print nothing
```

If either still shows the skill, delete the directory and drop its lockfile
key by hand. A leftover entry is not cosmetic: it points `update` at a source
path that may no longer exist, and the stale copy keeps loading into every
session.

Removing a standalone skill that has since moved into a plugin is exactly
this case — the lockfile still references the old `skills/<name>/` path, so
clear it or the plugin copy and the orphan will both be live.

Always install by explicit `--skill <name>`. Against a repo that carries
plugins, `-s '*'` / `--all` walks the whole tree, discovers plugin-internal
`SKILL.md` files under `plugins/*/skills/`, and double-installs them as
standalone skills — they then diverge from the plugin that owns them and
update from the wrong place.

`--copy` writes real files instead of symlinks. Use it only when an agent
cannot follow symlinks; the default keeps one canonical copy and is what the
lockfile assumes.

## Authoring

Start a new skill with `npx skills init <name>`, then move it into the repo
that should own it — for Pedro's own skills that is `PedroAVJ/loadout`
(`skills/<name>/` standalone, or `plugins/<plugin>/skills/<name>/` when a
plugin owns it). Write upstream first and install from there; a skill drafted
directly into `~/.agents/skills/` has no source and will be lost.

The description is the trigger. Write it as the conditions under which the
skill should fire, in the user's own vocabulary, including the phrasings they
would actually use — not as a summary of the skill's contents.

## Rules

- Never vendor third-party or vendor-curated skills into loadout. Check the
  `author` field and the lockfile's `source` before copying anything; install
  from the original source instead so it keeps updating.
- The repo is public. Scrub personal names, client references, paths, and
  secrets from examples before pushing.
- Agents read skills at startup. Restart the target agent and confirm the
  skill actually appears before reporting an install as done.
