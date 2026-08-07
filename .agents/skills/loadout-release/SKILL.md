---
name: loadout-release
description: Release and upgrade Loadout plugins and standalone skills across both Codex and Claude Code. Use when changing a plugin or skill in PedroAVJ/loadout, bumping plugin versions, publishing to the marketplace, syncing local skill installs, or verifying that Codex and Claude both see the same version.
---

# Loadout Release

Use this skill when a Loadout plugin or standalone skill changes and needs
to be available in both Codex and Claude Code. The repo is the source of
truth for both content types: edit upstream first, push, then upgrade local
installs.

## Model

Loadout hosts two content types:

- **Plugins**: one shared source directory per plugin with client-specific
  manifests.
  - Shared plugin source: `plugins/<plugin>/`
  - Codex manifest: `plugins/<plugin>/.codex-plugin/plugin.json`
  - Claude manifest: `plugins/<plugin>/.claude-plugin/plugin.json`
  - A plugin is codex-only or Claude-only when only one manifest exists;
    dual when both do.
- **Standalone skills**: `skills/<name>/` at the repo root (see
  `skills/README.md`). No manifests, no marketplace entry. Per-agent
  targeting happens at install time, not in the repo.

Do not fork the implementation just because both clients use the plugin. Add a
Claude-specific source path only when the runtime behavior truly differs. Most
plugins should share skills, scripts, CLIs, assets, docs, and tests.

## Before Editing

Start from the marketplace checkout:

```bash
cd ~/.codex/.tmp/marketplaces/loadout
git status --short --branch
git fetch origin main
```

If another checkout is in use, verify its remote is
`https://github.com/PedroAVJ/loadout.git`.

Leave unrelated untracked installer files alone, such as
`.codex-marketplace-install.json`.

## Change Checklist

1. Patch the plugin source under `plugins/<plugin>/`.
2. If the plugin version should change, bump every relevant version:
   - `plugins/<plugin>/package.json`, when present.
   - `plugins/<plugin>/.codex-plugin/plugin.json`.
   - `plugins/<plugin>/.claude-plugin/plugin.json`, when present.
3. If a plugin is intended to work in both clients, ensure both manifests exist.
4. Update the plugin skill/docs when agent behavior changes.
5. Add or update tests that guard the behavior and manifest shape.

Useful manifest audit:

```bash
find plugins -maxdepth 3 \( -path '*/.codex-plugin/plugin.json' -o -path '*/.claude-plugin/plugin.json' -o -name package.json \) -print
```

## Validate

Run focused tests for the changed plugin. Examples:

```bash
pnpm --dir plugins/whatsapp test
python3 -m py_compile plugins/whatsapp/cli/whatsapp_cli.py
```

Validate manifests when Claude-specific metadata changed:

```bash
claude plugins validate plugins/<plugin>
```

Use `git diff --check` before committing.

## Commit And Push

Stage only related plugin files:

```bash
git add plugins/<plugin> ...
git commit -m "Short plugin release summary"
git push origin main
```

After pushing, verify local and remote `main` agree:

```bash
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

## Upgrade Codex

Codex has its own marketplace checkout and plugin cache under:

```text
~/.codex/.tmp/marketplaces/loadout
~/.codex/plugins/cache/loadout/<plugin>/<version>
```

Upgrade:

```bash
codex plugin marketplace upgrade
```

If the installed Codex CLI cannot parse the user's config because
`service_tier = "default"` is too new/old for that CLI, use a one-command
override instead of editing the user's config:

```bash
codex -c 'service_tier="fast"' plugin marketplace upgrade
```

Verify the installed cache:

```bash
find ~/.codex/plugins/cache/loadout/<plugin> -maxdepth 2 -name package.json -print -exec cat {} \;
```

For CLI plugins, verify the new command surface through the installed command
or cache path.

## Upgrade Claude Code

Claude Code has a separate marketplace checkout, install manifest, and cache:

```text
~/.claude/plugins/marketplaces/loadout
~/.claude/plugins/installed_plugins.json
~/.claude/plugins/cache/loadout/<plugin>/<version>
```

Update the marketplace, then update the installed plugin:

```bash
claude plugins marketplace update loadout
claude plugins update <plugin>@loadout
```

Verify:

```bash
claude plugins list
cat ~/.claude/plugins/installed_plugins.json
cat ~/.claude/plugins/cache/loadout/<plugin>/<version>/.claude-plugin/plugin.json
```

Claude reports "restart required to apply changes"; mention this if any Claude
session may already be running.

If Claude's marketplace checkout reports stale `origin/main`, refresh it:

```bash
git -C ~/.claude/plugins/marketplaces/loadout fetch origin main
git -C ~/.claude/plugins/marketplaces/loadout status --short --branch
```

## Standalone Skills Release

Pedro-authored standalone skills live in `skills/<name>/` at the repo root
(see `skills/README.md`). They are not plugins: no manifests, no marketplace
entry.

Local skill installs are managed by the skills CLI (`npx skills`,
vercel-labs/skills). Its default layout: one canonical copy in
`~/.agents/skills/` (read natively by Codex and most agents) plus symlinks
into `~/.claude/skills/` for Claude Code. The lockfile at
`~/.agents/.skill-lock.json` records each skill's source repo. Do not place
or edit files in these directories by hand.

Release flow:

1. Edit or add the skill under `skills/<name>/` upstream first.
2. Commit and push to `main` as above.
3. Sync local installs through the CLI:

```bash
npx skills update -g                 # refresh all tracked skills from their sources
npx skills add PedroAVJ/loadout --skill <name> -a codex -a claude-code -g -y   # first install of a new skill
```

Always install by explicit `--skill` name. Never use `-s '*'` / `--all`
against this repo: the CLI discovers plugin-internal SKILL.md folders under
`plugins/*/skills/` and would double-install them as standalone skills.

## Claude Code Bridge

Claude Code does not read `~/.agents/skills/` (open request
anthropics/claude-code#31005; verified empirically 2026-06-10 with probe
skills). The skills CLI bridges this automatically by symlinking each
installed skill into `~/.claude/skills/`. Manual fallback, only for a skill
the CLI does not manage — per-skill symlink, never the whole directory
(Claude writes `.system/` files into its skills dir):

```bash
ln -sfn ~/.agents/skills/<name> ~/.claude/skills/<name>
```

## Rules

- Local `~/.agents/skills`, `~/.claude/skills`, and `~/.codex/skills` are
  install targets, not sources of truth.
- Never vendor OpenAI curated/system skills or other third-party skills
  (check `author` fields and `~/.agents/.skill-lock.json` provenance) into
  the repo.
- The repo is public: scrub personal names, client references, and secrets
  from skill examples before pushing.

## Closeout

Report:

- Commit SHA pushed.
- Tests/validation run.
- Codex installed version and cache path.
- Claude installed version and cache path.
- Any client restart needed.

Do not claim both clients are upgraded until both caches or install manifests
have been read back.
