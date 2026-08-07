---
name: internals
description: Read the internals of the local macOS Codex desktop app without modifying it — extract and search the Electron bundle for feature flags, unreleased or gated behavior, config keys, IPC surfaces, and version details. Use to find out what the installed Codex app can actually do, what is gated behind a flag, or how a feature is wired, before assuming a capability does or does not exist.
---

# Codex App Internals

Read-only forensics on `/Applications/Codex.app`. Extract, search, report —
never write back. Patching is a separate skill (`patching`) with its own
integrity and signing requirements, and it is deliberately not reachable from
here.

This is the cheap way to answer "does the app already do this?" — much better
than guessing from release notes, and much better than patching to find out.

## Why Read Instead of Guess

Codex ships behavior before it ships UI. Feature flags, gated panes, and
config keys land in the bundle first, sometimes weeks ahead of any
announcement. Reading the bundle tells you what the installed version can do
today, which is the difference between waiting for a feature and turning one
on that is already there.

It also settles capability questions honestly. If a flag exists but is off,
say that. If it does not exist in this version, say that too, with the
version you inspected.

## Version First

Every finding is version-scoped. Record it before anything else, and quote it
in the answer — bundle names and minified identifiers change every release.

```bash
defaults read /Applications/Codex.app/Contents/Info.plist CFBundleShortVersionString
defaults read /Applications/Codex.app/Contents/Info.plist CFBundleVersion
```

## Extract

Extraction copies out; it does not touch the bundle.

```bash
rm -rf /tmp/codex-read && mkdir -p /tmp/codex-read
npx -y asar extract /Applications/Codex.app/Contents/Resources/app.asar /tmp/codex-read/app
```

The layers worth knowing:

| Path | Holds |
| --- | --- |
| `/Applications/Codex.app/Contents/Resources/app.asar` | packed JavaScript |
| `.../Resources/app.asar.unpacked` | native modules and files that must stay on disk |
| `/Applications/Codex.app/Contents/Info.plist` | version, ASAR integrity hashes |
| `~/.codex/config.toml` | local config, including `[features]` |
| `~/.codex/` | local persisted state |

Inside an extracted ASAR, the interesting code concentrates in
`.vite/build/main-*.js` (main process), `webview/assets/index-*.js`
(renderer), and `webview/assets/app-server-manager-signals-*.js`.

## Search

Feature flags and gated behavior:

```bash
rg -n "featureFlag|isEnabled|experiment|gate|rollout" /tmp/codex-read/app --no-heading | head -50
rg -no '"[a-z][a-z0-9_]{3,}(_enabled|_flag)"' /tmp/codex-read/app | sort -u | head -40
```

Config keys the app reads — cross-reference against what is actually set:

```bash
rg -n "config\.(get|read)|\[features\]|features\." /tmp/codex-read/app | head -40
grep -n -A20 "^\[features\]" ~/.codex/config.toml
```

A named capability:

```bash
rg -n "browser|chronicle|computer.?use|plugin|marketplace" /tmp/codex-read/app -l
```

Minification makes function names useless, so anchor searches on **string
literals** — user-visible copy, config keys, event names, URLs. Those survive
minification; identifiers do not.

## Reporting

State the app version, the paths searched, and the literal evidence — a
matched string with its file, not a paraphrase. Distinguish:

- **present and on** — the flag exists and evaluates true in this install
- **present and gated** — the code path exists but is off, and say what gates it
- **absent in this version** — searched and not found, with the search terms used

Never infer that a feature is missing from a single failed grep. Minified
bundles split and rename aggressively; a negative result is weak evidence.
Say "not found with these anchors" rather than "does not exist".

## Boundary

If a question can only be answered by changing the app, stop and say so. Do
not patch under cover of an investigation — hand off to `patching`, which
requires backups, ASAR header hash repair, and re-signing, and which the user
should opt into explicitly because it breaks official updates.
