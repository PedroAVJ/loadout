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

Two marketplace manifests list the plugins and both must stay in sync:
`.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`. A
plugin that exists on disk but is missing from a manifest is invisible to
that client.

Do not fork the implementation just because both clients use the plugin. Add a
Claude-specific source path only when the runtime behavior truly differs. Most
plugins should share skills, scripts, CLIs, assets, docs, and tests.

Whether a change belongs in a plugin or a standalone skill is decided by the
`agent-skills` sibling skill, not here.

## Before Editing

Start from the marketplace checkout:

```bash
cd ~/.codex/.tmp/marketplaces/loadout
git status --short --branch
git fetch origin main
```

If another checkout is in use, verify its remote is
`https://github.com/PedroAVJ/loadout.git`.

Both client checkouts are **sparse**. They only materialize the plugin paths
they were installed with, so a brand-new plugin is invisible to both clients
until its path is added — see "Publishing a New Plugin to the Clients" below.
That step is only needed once per plugin; ordinary version bumps to an
already-listed plugin do not touch sparse config.

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
6. A row in the root `README.md` module table, and the plugin's sparse path
   added to both install snippets there.

Both marketplace manifests are hand-maintained. Diff their plugin name lists
against `ls plugins/` before committing:

A plugin legitimately appears in only one marketplace when it ships only one
manifest, so compare each marketplace against the plugins that actually carry
its manifest rather than against every directory:

```bash
python3 - <<'PY'
import json, pathlib
for market, manifest in ((".claude-plugin/marketplace.json", ".claude-plugin"),
                         (".agents/plugins/marketplace.json", ".codex-plugin")):
    disk = {p.name for p in pathlib.Path("plugins").iterdir()
            if (p / manifest / "plugin.json").exists()}
    listed = {p["name"] for p in json.load(open(market))["plugins"]}
    print(market, "| missing:", sorted(disk - listed), "| extra:", sorted(listed - disk))
PY
```

## Publishing a New Plugin to the Clients

Once per new plugin, after it is pushed. Skipping this is the failure mode
where the repo, both marketplace manifests, and `main` all look correct while
the install still fails with `Source path does not exist`.

**Claude Code** — add the path, then install:

```bash
git -C ~/.claude/plugins/marketplaces/loadout sparse-checkout add plugins/<plugin>
claude plugin marketplace update loadout
claude plugin install <plugin>@loadout
```

**Codex** — the sparse path must go in *two* places. `codex plugin
marketplace upgrade` rewrites `.git/info/sparse-checkout` from the
`sparse_paths` list in the untracked install record, so a bare
`git sparse-checkout add` is silently reverted on the next upgrade:

```bash
python3 - <<'PY'
import json, os
p = os.path.expanduser("~/.codex/.tmp/marketplaces/loadout/.codex-marketplace-install.json")
d = json.load(open(p))
if "plugins/<plugin>" not in d["sparse_paths"]:
    d["sparse_paths"].append("plugins/<plugin>")
    json.dump(d, open(p, "w"), indent=2)
print(d["sparse_paths"])
PY
git -C ~/.codex/.tmp/marketplaces/loadout sparse-checkout add plugins/<plugin>
codex plugin add <plugin>@loadout
```

Order matters. `git sparse-checkout add` only materializes a directory that
the current `HEAD` already contains, so fetch first if the checkout is behind
— otherwise the command reports success and writes nothing. And `marketplace
upgrade` will not re-apply sparse paths when its recorded `revision` already
matches `origin/main`, so it cannot be used to repair this.

`codex plugin add` is required for the first install of any plugin;
`marketplace upgrade` refreshes snapshots but never installs a plugin that
was not installed before. Confirm with `codex plugin list | grep <plugin>`.

## Standalone Skills Release

Standalone skills live in `skills/<name>/` at the repo root (see
`skills/README.md`). They are not plugins: no manifests, no marketplace
entry.

1. Edit or add the skill under `skills/<name>/` upstream first.
2. Commit and push to `main` as above.
3. Sync local installs through the skills CLI:

```bash
npx skills update -g                 # refresh all tracked skills from their sources
npx skills add PedroAVJ/loadout --skill <name> -a codex -a claude-code -g -y   # first install
```

The `agent-skills` sibling skill covers the CLI itself — agent targeting,
install layout, the lockfile, and the `-s '*'` trap that double-installs
plugin-internal skills. Read it before running anything beyond the two
commands above.

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
