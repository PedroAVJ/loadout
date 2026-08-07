# Loadout

The armory your agents build loadouts from.

Loadout is a collection of local-first tools, plugins, CLIs, skills, and agent workflows for people who want software-engineering agents to operate real personal and business systems without handing everything to a hosted SaaS.

A loadout is what an agent equips for a job: gear that reaches real systems, know-how that carries procedure without touching anything, and other models it can hand work to. This repo is the shared stock. Each client installs the subset it needs through sparse marketplace paths, so no agent carries the whole armory.

It is intentionally practical:

- Agent-facing CLIs with stable JSON output.
- Local SQLite-backed state where durability matters.
- Codex and Claude Code plugin shells.
- Reviewable drafts before side effects.
- Explicit confirmation gates for live writes.
- Small composable tools that can be inspected, forked, and run locally.

## Modules

| Module | Status | Description |
| --- | --- | --- |
| [`plugins/loadout`](./plugins/loadout) | Open | The recursive one: find and vet skills, install MCP servers, and release the plugins in this repo to both clients. |
| [`plugins/google-cloud`](./plugins/google-cloud) | Open | Google Cloud through the `gcloud` CLI: project inventory, the Cloud Storage substrate and its write boundary, and artifact publishing to durable URLs. |
| [`plugins/whatsapp`](./plugins/whatsapp) | Open | WhatsApp bridge, SQLite-backed reads, media/context tools, reviewable drafts, and guarded sends for Codex and Claude Code. |
| [`plugins/gmail-cli`](./plugins/gmail-cli) | Open | Gmail raw-message, MIME, and attachment workflows through the authenticated `gws` CLI. |
| [`plugins/google-drive-cli`](./plugins/google-drive-cli) | Open | Google Drive search, download, export, upload, and permission workflows through `gws`. |
| [`plugins/google-tasks`](./plugins/google-tasks) | Open | Google Tasks reads and guarded mutations through `gws`. |
| [`plugins/google-contacts`](./plugins/google-contacts) | Open | Google Contacts identity, phone, organization, and WhatsApp-enrichment lookups through `gws`. |
| [`plugins/youtube-cli`](./plugins/youtube-cli) | Open | YouTube playlist reads and guarded edits through the `ytx` CLI, with a SQLite cache and quota accounting. |
| [`plugins/youtube-music`](./plugins/youtube-music) | Open | YouTube Music playback, zero-quota session queues, a validated focus pool, and macOS Background Sounds control. |
| [`plugins/elevenlabs`](./plugins/elevenlabs) | Open | ElevenLabs Scribe transcription workflows with diarization, language hints, and keyterms. |
| [`plugins/claude`](./plugins/claude) | Codex-only | Every way Codex reaches Claude: Opus 5 frontend implementation, visual explainers, and Fable 5 Oracle second opinions — all fail-closed on model identity. |
| [`plugins/android-phone`](./plugins/android-phone) | Open | Android phone inspection, testing, debugging, and control through ADB. |
| [`plugins/symphony`](./plugins/symphony) | Open | Agent lifecycle workflows for evidence intake, issue coverage, Codex review, review artifacts, and explicit merge/release proof. |
| [`plugins/macbook`](./plugins/macbook) | Open | MacBook heat, memory pressure, and disk headroom as three separate read-only diagnoses. |
| [`plugins/codex`](./plugins/codex) | Open | Read the local Codex desktop app's internals for feature flags and gated behavior; patch and restore the bundle when necessary. Resolves the app by bundle id, surviving the `Codex.app` to `ChatGPT.app` rename. |
| [`plugins/voice-memos`](./plugins/voice-memos) | Open | Read the macOS Voice Memos store — recordings, metadata, and Apple's embedded transcripts. |
| [`plugins/call-recordings`](./plugins/call-recordings) | Open | Read Apple call recordings out of the macOS Notes store — calls, timing, audio paths, and Apple's transcripts. |
| [`plugins/sentry`](./plugins/sentry) | Open | Read and triage Sentry through the sentry CLI — issues, events, logs, traces, and the distinctions between them. |

More modules will land here as the custom stack gets cleaned up for public use.

## Plugins Only

This repo ships **plugins, and only plugins**. There are no standalone skills
and no standalone MCP servers published here.

A plugin may contain skills and MCP config internally — that is what a plugin
is for. The rule is about the unit of distribution, not the contents. A
plugin is versioned, released, and upgraded as one thing through each
client's marketplace. A standalone skill installs through a separate CLI with
a separate lockfile, and drifts from the repo that owns it; a standalone MCP
server is a curated subset of an interface the agent could usually call
directly.

So when something new is worth keeping, it goes inside the plugin that owns
it — and if no plugin owns it yet, that is the signal to create one.

`pnpm test:structure` enforces this. It fails on a top-level `skills/`
directory, on repo-scoped agent-skill directories, on a root MCP manifest, on
manifest/marketplace drift, and on any `SKILL.md` outside
`plugins/<plugin>/skills/<skill>/`.

## Principles

0. Plugins are the only unit of distribution.
1. Local-first by default.
2. Agent-readable interfaces before UI gloss.
3. Human approval before irreversible side effects.
4. Durable state over ad-hoc process memory.
5. Bring-your-own-agent: Codex first, Claude Code compatible.

## Quick Start

### Install In Codex

In the Codex app, open Plugins -> Manage -> Add marketplace:

```text
Source: PedroAVJ/loadout
Git ref: main
Sparse paths: (leave blank)
```

Or from the CLI:

```bash
codex plugin marketplace add PedroAVJ/loadout --ref main
codex plugin marketplace upgrade
```

### Install In Claude Code

```bash
claude plugin marketplace add PedroAVJ/loadout
claude plugin install loadout@loadout
```

Install the other plugins from the same marketplace as needed.

### Do Not Use Sparse Paths

Both clients accept `--sparse` to limit the checkout to named directories. Do
not use it here. The path list is frozen at the moment you add the marketplace,
so every plugin added to this repo afterwards is missing from your checkout and
reports `failed to load` — and `marketplace update` does not fix it, because it
re-fetches the same frozen list. Renaming a plugin breaks it the same way.

A full checkout costs about 5 MiB and never goes stale.


### Develop Locally

```bash
git clone https://github.com/PedroAVJ/loadout.git
cd loadout
pnpm test
```

Use the first plugin:

```bash
cd plugins/whatsapp
./bin/whatsapp --json doctor
```

For plugin releases, use
[`loadout-release`](./plugins/loadout/skills/loadout-release/SKILL.md),
one of the skills in the [`loadout`](./plugins/loadout) plugin. It captures the
Codex and Claude Code version bump, marketplace upgrade, and cache
verification workflow.

## Status

This is an early open-source extraction of a real working local agent stack. Expect the repo shape to evolve as more custom modules become public.

## License

MIT. See [`LICENSE`](./LICENSE).
