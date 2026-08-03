# SWE Stack

Agentic SDK for prosumers.

SWE Stack is a collection of local-first tools, plugins, CLIs, skills, and agent workflows for people who want software-engineering agents to operate real personal and business systems without handing everything to a hosted SaaS.

The stack is intentionally practical:

- Agent-facing CLIs with stable JSON output.
- Local SQLite-backed state where durability matters.
- Codex and Claude Code plugin shells.
- Reviewable drafts before side effects.
- Explicit confirmation gates for live writes.
- Small composable tools that can be inspected, forked, and run locally.

## Modules

| Module | Status | Description |
| --- | --- | --- |
| [`plugins/oracle`](./plugins/oracle) | Open | Codex-hosted two-model council using GPT-5.6 Sol Pro in the user's logged-in ChatGPT session and Claude Fable 5 through Claude Code. |
| [`plugins/whatsapp`](./plugins/whatsapp) | Open | WhatsApp bridge, SQLite-backed reads, media/context tools, reviewable drafts, and guarded sends for Codex and Claude Code. |
| [`plugins/gmail-cli`](./plugins/gmail-cli) | Open | Gmail raw-message, MIME, and attachment workflows through the authenticated `gws` CLI. |
| [`plugins/google-drive-cli`](./plugins/google-drive-cli) | Open | Google Drive search, download, export, upload, and permission workflows through `gws`. |
| [`plugins/google-tasks`](./plugins/google-tasks) | Open | Google Tasks reads and guarded mutations through `gws`. |
| [`plugins/google-contacts`](./plugins/google-contacts) | Open | Google Contacts identity, phone, organization, and WhatsApp-enrichment lookups through `gws`. |
| [`plugins/elevenlabs`](./plugins/elevenlabs) | Open | ElevenLabs Scribe transcription workflows with diarization, language hints, and keyterms. |
| [`plugins/claude`](./plugins/claude) | Open | Codex-stewarded Claude Fable frontend implementation and visual-explainer workflows with streamed logs. |
| [`plugins/android-phone`](./plugins/android-phone) | Open | Android phone inspection, testing, debugging, and control through ADB. |
| [`plugins/symphony`](./plugins/symphony) | Open | Agent lifecycle workflows for evidence intake, issue coverage, Codex review, review artifacts, and explicit merge/release proof. |

More modules will land here as the custom stack gets cleaned up for public use.

## Principles

1. Local-first by default.
2. Agent-readable interfaces before UI gloss.
3. Human approval before irreversible side effects.
4. Durable state over ad-hoc process memory.
5. Bring-your-own-agent: Codex first, Claude Code compatible.

## Quick Start

### Install In Codex

In the Codex app, open Plugins -> Manage -> Add marketplace:

```text
Source: PedroAVJ/swe-stack
Git ref: main
Sparse paths:
.agents/plugins
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
codex plugin marketplace add PedroAVJ/swe-stack --ref main --sparse .agents/plugins --sparse plugins/whatsapp --sparse plugins/oracle --sparse plugins/gmail-cli --sparse plugins/google-drive-cli --sparse plugins/google-tasks --sparse plugins/google-contacts --sparse plugins/elevenlabs --sparse plugins/claude --sparse plugins/android-phone --sparse plugins/symphony
codex plugin marketplace upgrade
```

Leave sparse paths blank if you want Codex to fetch the whole marketplace repo. The sparse paths above are the minimal set for the marketplace manifest plus the current plugins.

### Install In Claude Code

```bash
claude plugin marketplace add PedroAVJ/swe-stack --sparse .claude-plugin --sparse plugins/whatsapp --sparse plugins/oracle --sparse plugins/gmail-cli --sparse plugins/google-drive-cli --sparse plugins/google-tasks --sparse plugins/google-contacts --sparse plugins/elevenlabs --sparse plugins/android-phone --sparse plugins/symphony
claude plugin install whatsapp@swe-stack
```

Install the other Claude-compatible plugins from the same marketplace as needed.

### Develop Locally

```bash
git clone https://github.com/PedroAVJ/swe-stack.git
cd swe-stack
pnpm test
```

Use the first plugin:

```bash
cd plugins/whatsapp
./bin/whatsapp --json doctor
```

For plugin releases, use
[`swe-stack-plugin-release`](./.agents/skills/swe-stack-plugin-release/SKILL.md).
It captures the Codex and Claude Code version bump, marketplace upgrade, and
cache verification workflow.

## Status

This is an early open-source extraction of a real working local agent stack. Expect the repo shape to evolve as more custom modules become public.

## License

MIT. See [`LICENSE`](./LICENSE).
