---
name: whatsapp
description: Read WhatsApp chats, contacts, message context, and message media; create reviewable local drafts; and send only explicitly approved WhatsApp messages.
---

# WhatsApp

Use this plugin when the user needs WhatsApp conversation context, media inspection, local reply drafts, or an explicitly approved send.

Use the installed `whatsapp --json ...` CLI for the actual WhatsApp operations. This plugin is the product shell and operating manual around that CLI and its local bridge.

## Start

Check health first when bridge status matters:

```bash
whatsapp --json doctor
whatsapp --json bridge status
```

Start or relink only when needed:

```bash
whatsapp --json bridge start
whatsapp bridge relink --confirm
```

Relink uses WhatsApp's QR pairing flow by default. When the QR is shown or
written to `~/.local/share/codex-whatsapp/upstream-qr.png`, tell the user to
open WhatsApp -> Linked devices -> Link a device, then scan it. If QR pairing
fails again, rerun relink with `WHATSAPP_USE_PHONE_PAIRING=1` to use the
phone-number code fallback.

## Reading

- Discover chats with metadata first; avoid reading message bodies until the target is clear.
- Use contact/chat resolution before broad message reads when the user names a person.
- Use message context when replies or nearby discussion matter.
- Download media only when the media itself is needed for the task.
- For a specific WhatsApp audio message, prefer the cached ElevenLabs path:
  `whatsapp --json media transcribe MESSAGE_ID "CHAT_JID" --language es`.
  This downloads and transcribes only that requested message, stores the
  transcript in the local transcript cache, and returns cached text on later
  calls. Use `--refresh` only when the human asks to retranscribe or the
  cached transcript is clearly bad.

Useful fallback commands:

```bash
whatsapp --json chats list --limit 20 --no-last-message
whatsapp --json chats list --query "project name" --limit 20 --no-last-message
whatsapp --json messages list --chat-jid "CHAT_JID" --limit 30
whatsapp --json messages context MESSAGE_ID --before 5 --after 5
whatsapp --json media download MESSAGE_ID "CHAT_JID"
whatsapp --json media transcribe MESSAGE_ID "CHAT_JID" --language es
whatsapp --json media transcripts show MESSAGE_ID --chat-jid "CHAT_JID"
```

Message JSON may include `reactions`, `receipts`, and `seen_by` when the bridge
has observed reaction or read-receipt events. Treat `seen_by` as read-receipt
data only; it is not last-active or online-presence data.

## Drafts And Sends

Drafts are local review artifacts. They do not create WhatsApp's native green Draft label.

Before drafting, read recent messages in the target chat and match the user's prior outbound style for that person or group. Do not produce a generic standalone draft when a target chat can be resolved.

Drafts must sound like the user actually writes in that chat. Mirror the user's normal language, casing, punctuation, brevity, greetings, names, and directness from recent outbound messages. Do not default to English, formal phrasing, or assistant-like wording unless the user's recent messages to that chat use that style.

When the target chat is known or can be resolved cheaply, create the reviewable local draft with `whatsapp --json drafts create ...` and report the draft id. If the target chat is genuinely unclear, ask for the recipient before drafting instead of guessing.

Always show the user the full draft text verbatim in chat, quoted per recipient, together with its draft id. A draft id alone is not reviewable; never ask the user to approve a draft they have not seen word for word in the conversation.

Live sends require explicit approval of the exact recipient and message in the current context.

Pace multi-recipient sends like a human. Never fire bridge sends back-to-back: wait at least 60 seconds between recipients, and several minutes per send when the recipients have no prior chat history or the messages contain links, attachments, or credentials. Burst sends from a linked device match WhatsApp's bot-spam signature and can get the linked device deregistered, killing the bridge session until the user relinks by QR.

Fallback commands:

```bash
whatsapp --json drafts create --chat-jid "CHAT_JID" --text "Gracias, recibido"
whatsapp --json drafts send DRAFT_ID --dry-run
whatsapp --json drafts send DRAFT_ID --confirm
```

## Rules

- Reading and local drafts are safe by default.
- Do not transcribe every audio message returned by a listing; transcription is
  opt-in for the particular audio message needed to answer the task.
- Never live-send with `--confirm` unless the user approved the exact recipient and exact message in the current conversation.
- Never send to multiple recipients without spacing the sends; see the pacing rule above. Batch approval is not batch dispatch.
- Use `--json` whenever reading command output for analysis.
- Prefer metadata-only discovery with `--no-last-message` before reading message contents.
- Do not show raw JIDs or LIDs unless debugging internals.
- Treat `chat_type: "broadcast"` as WhatsApp Status/Broadcast, not a normal person or project chat.
- Treat `identifier_type: "lid"` as a direct chat backed by WhatsApp's LID identity system.
- Use `whatsapp --json contacts search ...` and any user-approved address book source when a person, phone number, company, or WhatsApp identity is unclear.
