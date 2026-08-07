# Plugins

Loadout plugins package local bridges, CLIs, and agent instructions behind a
Codex- and Claude Code-friendly shape.

Available now:

- [`oracle`](./oracle): Codex-hosted Claude Fable 5 second opinion through
  Claude Code with fail-closed model verification.
- [`gmail-cli`](./gmail-cli): raw Gmail message, MIME, and attachment workflows
  through the authenticated `gws` CLI.
- [`google-drive-cli`](./google-drive-cli): Drive search, download, export,
  upload, and sharing workflows through `gws`.
- [`google-tasks`](./google-tasks): Google Tasks reads and guarded mutations
  through `gws`.
- [`google-contacts`](./google-contacts): Google Contacts identity, phone, and
  organization lookups through `gws`.
- [`elevenlabs`](./elevenlabs): ElevenLabs Scribe transcription workflows with
  diarization, language hints, and keyterms.
- [`claude`](./claude): Codex-stewarded Claude Fable frontend implementation
  and visual-explainer workflows with streamed logs.
- [`android-phone`](./android-phone): Android phone inspection, testing,
  debugging, and control through ADB.
- [`whatsapp`](./whatsapp): local WhatsApp bridge, SQLite-backed reads,
  reviewable drafts, and guarded sends.
