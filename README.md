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
| [`plugins/oracle`](./plugins/oracle) | Open | Codex-hosted Claude Fable 5 second opinion through Claude Code with fail-closed model verification. |
| [`plugins/whatsapp`](./plugins/whatsapp) | Open | WhatsApp bridge, SQLite-backed reads, media/context tools, reviewable drafts, and guarded sends for Codex and Claude Code. |
| [`plugins/gmail-cli`](./plugins/gmail-cli) | Open | Gmail raw-message, MIME, and attachment workflows through the authenticated `gws` CLI. |
| [`plugins/google-drive-cli`](./plugins/google-drive-cli) | Open | Google Drive search, download, export, upload, and permission workflows through `gws`. |
| [`plugins/google-tasks`](./plugins/google-tasks) | Open | Google Tasks reads and guarded mutations through `gws`. |
| [`plugins/google-contacts`](./plugins/google-contacts) | Open | Google Contacts identity, phone, organization, and WhatsApp-enrichment lookups through `gws`. |
| [`plugins/elevenlabs`](./plugins/elevenlabs) | Open | ElevenLabs Scribe transcription workflows with diarization, language hints, and keyterms. |
| [`plugins/claude`](./plugins/claude) | Open | Codex-stewarded Claude Fable frontend implementation and visual-explainer workflows with streamed logs. |
| [`plugins/android-phone`](./plugins/android-phone) | Open | Android phone inspection, testing, debugging, and control through ADB. |
| [`plugins/symphony`](./plugins/symphony) | Open | Agent lifecycle workflows for evidence intake, issue coverage, Codex review, review artifacts, and explicit merge/release proof. |
| [`plugins/macbook`](./plugins/macbook) | Open | MacBook heat, memory pressure, and disk headroom as three separate read-only diagnoses. |
| [`plugins/codex-app`](./plugins/codex-app) | Open | Read the local Codex desktop app's internals for feature flags and gated behavior; patch and restore the bundle when necessary. |

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
Sparse paths:
.agents/plugins
plugins/loadout
plugins/google-cloud
plugins/macbook
plugins/codex-app
plugins/whatsapp
plugins/oracle
plugins/gmail-cli
plugins/google-drive-cli
plugins/google-tasks
plugins/google-contacts
plugins/elevenlabs
plugins/claude
plugins/android-phone
plugins/symphony
```

Or from the CLI:

```bash
codex plugin marketplace add PedroAVJ/loadout --ref main --sparse .agents/plugins --sparse plugins/loadout --sparse plugins/google-cloud --sparse plugins/macbook --sparse plugins/codex-app --sparse plugins/whatsapp --sparse plugins/oracle --sparse plugins/gmail-cli --sparse plugins/google-drive-cli --sparse plugins/google-tasks --sparse plugins/google-contacts --sparse plugins/elevenlabs --sparse plugins/claude --sparse plugins/android-phone --sparse plugins/symphony
codex plugin marketplace upgrade
```

Leave sparse paths blank if you want Codex to fetch the whole marketplace repo. The sparse paths above are the minimal set for the marketplace manifest plus the current plugins.

### Install In Claude Code

```bash
claude plugin marketplace add PedroAVJ/loadout --sparse .claude-plugin --sparse plugins/loadout --sparse plugins/google-cloud --sparse plugins/macbook --sparse plugins/codex-app --sparse plugins/whatsapp --sparse plugins/oracle --sparse plugins/gmail-cli --sparse plugins/google-drive-cli --sparse plugins/google-tasks --sparse plugins/google-contacts --sparse plugins/elevenlabs --sparse plugins/android-phone --sparse plugins/symphony
claude plugin install loadout@loadout
```

Install the other Claude-compatible plugins from the same marketplace as needed.

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
