# Plugins

Loadout plugins package local bridges, CLIs, and agent instructions behind a
Codex- and Claude Code-friendly shape.

Available now:

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
- [`claude`](./claude): Codex-only. Every way Codex reaches Claude — Opus 5
  frontend implementation, visual explainers, and Fable 5 Oracle second
  opinions — each fail-closed on model identity.
- [`android-phone`](./android-phone): Android phone inspection, testing,
  debugging, and control through ADB.
- [`whatsapp`](./whatsapp): local WhatsApp bridge, SQLite-backed reads,
  reviewable drafts, and guarded sends.
