# Loadout WhatsApp Plugin

An agent-first WhatsApp plugin and CLI for Codex and Claude Code.

This is not a thin MCP wrapper. It packages a local WhatsApp bridge, a SQLite-backed message store, a stable `whatsapp --json ...` CLI, local reviewable drafts, and guarded live sends that require explicit confirmation.

The bridge is based on a patched vendored copy of [`lharries/whatsapp-mcp`](https://github.com/lharries/whatsapp-mcp). Native MCP registration is intentionally disabled by default because direct CLI calls are more reliable for coding agents and avoid tool-routing collisions.

This project is unofficial and is not affiliated with WhatsApp or Meta.

## What You Get

- Local WhatsApp linked-device bridge.
- SQLite-backed reads over contacts, chats, messages, reactions, read receipts,
  context, and media.
- A composable JSON CLI designed for agents: `whatsapp --json ...`.
- Scheduled ElevenLabs transcription of incoming audio with a local SQLite
  transcript cache, so voice notes are already readable before an agent asks.
- Local draft records before sending.
- Live-send guardrails: `--dry-run` or explicit `--confirm` is required.
- Codex and Claude Code plugin metadata.

## Requirements

- macOS or Linux
- Go
- Python 3
- Node.js and pnpm
- `uv` for the vendored Python MCP backend

## Install

```bash
git clone https://github.com/PedroAVJ/loadout.git
cd loadout/plugins/whatsapp
pnpm install
pnpm test
```

Run the CLI from the repo:

```bash
./bin/whatsapp --json doctor
```

Optional: put the CLI on your PATH with your package manager or a symlink:

```bash
ln -sf "$PWD/bin/whatsapp" "$HOME/.local/bin/whatsapp"
whatsapp --json doctor
```

## Link WhatsApp

First-time setup uses WhatsApp's linked-device flow.

```bash
pnpm setup
```

Open WhatsApp on your phone, then use Linked devices -> Link a device and scan the QR code printed by the setup command. The QR is also written under the local state directory:

```text
~/.local/share/codex-whatsapp/upstream-qr.png
```

Start the bridge after a successful link:

```bash
pnpm start
whatsapp --json bridge status
```

If QR pairing fails, phone-number pairing is available as an explicit fallback:

```bash
WHATSAPP_USE_PHONE_PAIRING=1 WHATSAPP_MCP_PAIR_PHONE=15551234567 pnpm setup
```

## Use With Codex

Install Loadout as a Codex marketplace, then install the `whatsapp` plugin from the Plugins screen.

```bash
codex plugin marketplace add PedroAVJ/loadout --ref main --sparse .agents/plugins --sparse plugins/whatsapp
codex plugin marketplace upgrade
```

In the Codex app, the equivalent Add marketplace values are:

```text
Source: PedroAVJ/loadout
Git ref: main
Sparse paths:
.agents/plugins
plugins/whatsapp
```

After installation, use the `whatsapp` skill. The skill tells agents to prefer metadata-only discovery first, then read targeted message context only when needed.

Useful commands:

```bash
whatsapp --json chats list --limit 20 --no-last-message
whatsapp --json chats list --query "Alice" --limit 10 --no-last-message
whatsapp --json messages list --chat-jid "15551234567@s.whatsapp.net" --limit 30
whatsapp --json messages context MESSAGE_ID --before 5 --after 5
whatsapp --json media download MESSAGE_ID "15551234567@s.whatsapp.net"
whatsapp --json media transcribe MESSAGE_ID "15551234567@s.whatsapp.net" --language es
whatsapp --json media transcripts show MESSAGE_ID --chat-jid "15551234567@s.whatsapp.net"
```

`messages list` and `messages context` include reaction and receipt metadata on
each message when the bridge has observed it. Reactions are exposed as
`reactions`; receipts are exposed as `receipts`, with `seen_by` as a convenience
list for `read` receipts. This is message receipt data, not online presence or
last-active tracking.

Audio transcription is arrival-triggered and cached. Reads never transcribe as
a side effect: `messages list` and `messages context` leave audio alone.

The bridge fires `WHATSAPP_MEDIA_ARRIVAL_HOOK` when media lands, which the
plugin points at `media arrival-hook`. A voice note is therefore transcribed
seconds after it arrives, on the message event itself, with no polling in the
primary path. `WHATSAPP_MEDIA_ARRIVAL_HOOK_TYPES` controls which media types
fire it (default `audio`); unset the hook to disable it entirely.

`media autotranscribe install` registers a LaunchAgent as the safety net
underneath that, periodically running `media transcribe-pending` to sweep up
anything the hook missed — audio that landed while the bridge was down, a
history sync, or a hook that failed. It is a reconciliation floor, not the
mechanism.

Agents read the cache with `media transcripts show`; `media transcribe`
remains available for a single message that has not been handled yet, and
repeated calls return the cached transcript unless `--refresh` is passed.

Both paths exist because WhatsApp expires media from its CDN after roughly two
to three weeks. Audio not transcribed inside that window cannot be recovered,
so the event handles the normal case and the sweep guarantees the window is
never missed through downtime alone.

Because expired media never comes back, failures are durable rather than
retried forever: a message that fails three times drops out of the pending
queue and is reported as `gave_up`. Pass `--retry-failed` to include those
again after fixing an unrelated cause, such as a stopped bridge or a missing
`ELEVENLABS_API_KEY`.

Transcription uses the sibling ElevenLabs plugin helper and requires
`ELEVENLABS_API_KEY` only on cache misses. The LaunchAgent runs through a login
shell so it picks that key up from the user's profile rather than storing a
copy in the plist.

## Use With Claude Code

Claude Code can load the same plugin root locally:

```bash
claude --plugin-dir .
claude plugins validate .
```

The Claude manifest does not auto-register a native MCP server. Use the CLI path by default.

## Drafts And Sends

Drafts are local review artifacts stored in SQLite. They do not create WhatsApp's native green draft label.

```bash
whatsapp --json drafts create --chat-jid "15551234567@s.whatsapp.net" --text "Thanks, received."
whatsapp --json drafts list
whatsapp --json drafts send DRAFT_ID --dry-run
whatsapp --json drafts send DRAFT_ID --confirm
```

Direct sends are guarded:

```bash
whatsapp --json messages send --chat-jid "15551234567@s.whatsapp.net" --text "Thanks" --dry-run
whatsapp --json messages send --chat-jid "15551234567@s.whatsapp.net" --text "Thanks" --confirm
```

Do not let an agent use `--confirm` unless the human approved the exact recipient and exact message in the current conversation.

## State

Runtime state is stored outside the repo by default:

```text
~/.local/share/codex-whatsapp/
```

That directory contains local SQLite databases, bridge logs, QR files, and linked-device state. It is intentionally not part of the repository.

Important environment variables:

- `WHATSAPP_PLUGIN_STATE_ROOT`: override the local state root.
- `WHATSAPP_SOURCE_ROOT`: point the CLI at a different plugin checkout.
- `WHATSAPP_DRAFTS_DB_PATH`: override the local drafts database path.
- `WHATSAPP_TRANSCRIPTS_DB_PATH`: override the local audio transcript cache database path.
- `ELEVENLABS_TRANSCRIBE_SCRIPT`: override the ElevenLabs Scribe helper path used by `media transcribe`.
- `WHATSAPP_MCP_HTTP_PORT`: override the local bridge port.
- `WHATSAPP_MCP_PAIR_PHONE`: explicit phone-number pairing fallback.

## Legacy MCP

The vendored MCP server is still present for manual recovery and compatibility, but it is disabled by default.

```bash
WHATSAPP_ALLOW_NATIVE_MCP=1 pnpm mcp
```

For day-to-day agent work, prefer the CLI.

## Attribution

This project vendors and patches `lharries/whatsapp-mcp`, licensed under MIT. See `NOTICE.md` and `vendor/lharries-whatsapp-mcp/LICENSE`.
