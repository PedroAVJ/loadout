---
name: loadout-release
description: Release and upgrade Loadout plugins across both Codex and Claude Code. Use when changing a plugin in PedroAVJ/loadout, adding a new one, bumping versions, publishing to the marketplaces, or verifying that Codex and Claude both see the same version.
---

# Loadout Release

Use this skill when a Loadout plugin changes and needs to be available in
both Codex and Claude Code. The repo is the source of truth: edit upstream
first, push, then upgrade local installs.

## Model

**Loadout ships plugins, and only plugins.** No standalone skills, no
standalone MCP servers. A plugin may contain skills and MCP config
internally — the rule governs the unit of distribution, not the contents.
There is therefore exactly one release path, the one below.

- Shared plugin source: `plugins/<plugin>/`
- Codex manifest: `plugins/<plugin>/.codex-plugin/plugin.json`
- Claude manifest: `plugins/<plugin>/.claude-plugin/plugin.json`
- A plugin is codex-only or Claude-only when only one manifest exists; dual
  when both do.

Two marketplace manifests list the plugins and both must stay in sync:
`.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`. A
plugin that exists on disk but is missing from a manifest is invisible to
that client.

Do not fork the implementation just because both clients use the plugin. Add a
Claude-specific source path only when the runtime behavior truly differs. Most
plugins should share skills, scripts, CLIs, assets, docs, and tests.

New content always lands inside a plugin. If no existing plugin owns it,
that is the signal to create one — see "Adding a New Plugin" below.

## Before Editing

Start from the marketplace checkout:

```bash
cd ~/.codex/.tmp/marketplaces/loadout
git status --short --branch
git fetch origin main
```

If another checkout is in use, verify its remote is
`https://github.com/PedroAVJ/loadout.git`.

Client checkouts must be **full, not sparse**. A sparse checkout freezes the
plugin list at the moment the marketplace was added, so every plugin created
afterwards is invisible and reports `failed to load` — and `marketplace update`
re-fetches the same frozen list, so it never self-heals. Check before releasing:

```bash
python3 -c "import json,os;d=json.load(open(os.path.expanduser('~/.claude/plugins/known_marketplaces.json')));print(d['loadout']['source'].get('sparsePaths','full checkout — good'))"
```

If that prints a path list, re-add the marketplace without `--sparse`; see
"Publishing a New Plugin to the Clients" below.

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

### PATH Shims

Plugin CLIs reach the shell through hand-written shims in `~/.local/bin/`
(`whatsapp`, `elevenlabs`) that exec an absolute path into the marketplace
checkout. They are not managed by any installer, so nothing updates them
automatically. Re-point every shim whenever the marketplace name, the repo
name, or the checkout location changes, then run each command once to
confirm:

```bash
grep -rl "marketplaces/" ~/.local/bin/
whatsapp --json doctor
elevenlabs --help
```

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

## Adding a New Plugin

A new plugin is not done when its directory exists. Every one of these must
land in the same change, or the plugin is invisible to one client or the
other:

1. `plugins/<plugin>/.codex-plugin/plugin.json` — Codex manifest, including
   the `interface` block (display name, icon, category, default prompts).
2. `plugins/<plugin>/.claude-plugin/plugin.json` — Claude manifest, when the
   plugin should work there.
3. `plugins/<plugin>/README.md`.
4. An entry in `.claude-plugin/marketplace.json`.
5. An entry in `.agents/plugins/marketplace.json`.
6. A row in the root `README.md` module table.

Both marketplace manifests are hand-maintained, and every item above is
checked by `pnpm test:structure`. Stage the new plugin first — the structure
test reads `git ls-files`, so an unstaged plugin is invisible to it:

```bash
git add plugins/<plugin>
pnpm test:structure
```

## Publishing a New Plugin to the Clients

Once per new plugin, after it is pushed. On a full checkout the path is
already there, so this is only an install:

```bash
claude plugin install <plugin>@loadout
codex plugin add <plugin>@loadout
```

`codex plugin add` is required for the first install of any plugin;
`marketplace upgrade` refreshes snapshots but never installs a plugin that
was not installed before.

Verify with `claude plugin list` and `codex plugin list | grep <plugin>`, and
confirm the path actually materialized:

```bash
ls ~/.claude/plugins/marketplaces/loadout/plugins/ ~/.codex/.tmp/marketplaces/loadout/plugins/
```

### If The Checkout Is Sparse

Symptoms that look like a repo problem and are not: `failed to load` with
`Plugin directory not found`, `Source path does not exist` on install, and
`plugin source path is not a directory` on upgrade — all for a plugin that is
demonstrably on `main`.

Do not patch the path list; it will only go stale again at the next new
plugin. Re-add the marketplace without `--sparse`, which converts it to a full
checkout in place and leaves installed plugins intact:

```bash
claude plugin marketplace add PedroAVJ/loadout
```

For Codex, clear `sparse_paths` under `[marketplaces.loadout]` in
`~/.codex/config.toml`, then `codex plugin marketplace upgrade`. The install
record at `~/.codex/.tmp/marketplaces/loadout/.codex-marketplace-install.json`
is generated from that config, so never edit it directly.

A renamed plugin leaves its own stale install entry behind. Uninstall the old
name and install the new one:

```bash
claude plugin uninstall <old-name>@loadout
claude plugin install <new-name>@loadout
```

## Validate Before Pushing

```bash
pnpm test:structure
```

This enforces the plugins-only rule and catches the drift that silently
breaks a release: a missing client manifest, manifests disagreeing on
version, a plugin absent from one marketplace, a marketplace listing a
plugin that is not on disk, or a `SKILL.md` outside
`plugins/<plugin>/skills/<skill>/`.

The structure test reads `git ls-files`, so a brand-new plugin must be
staged before it will be checked. Run it after `git add`, not before.

Then run the changed plugin's own tests:

```bash
pnpm --dir plugins/<plugin> test
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
