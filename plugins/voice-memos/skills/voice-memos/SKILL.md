---
name: voice-memos
description: Read the macOS Voice Memos store — enumerate recordings with correct timestamps and durations, resolve a recording to its audio path, and extract Apple's on-device transcript when one exists. Use whenever a task involves Apple Voice Memos on a Mac, including finding recent recordings, locating audio to transcribe, or checking what was recorded when.
---

# Voice Memos

Reads the macOS Voice Memos store. This plugin is **mechanism only** — it tells
you what recordings exist and where the audio is. It holds no opinion about
what any recording means or where its contents belong; that is the calling
workflow's business.

Use the `voice-memos` CLI:

```bash
voice-memos list --json
voice-memos list --since 2026-08-01
voice-memos path 38BEC65A
voice-memos transcript 38BEC65A
```

## Why Not Just List The .m4a Files

Listing `~/Library/Group Containers/group.com.apple.VoiceMemos.shared/Recordings/*.m4a`
looks equivalent and is not. Three things go wrong, and all three fail quietly:

- **The store is live and WAL-mode.** Reading `CloudRecordings.db` without its
  `-wal` sidecar returns an older snapshot — recent recordings are simply
  absent, with no error. This CLI snapshots `.db`, `-wal` and `-shm` together.
- **Timestamps are Core Data reference dates**, seconds since 2001-01-01. Read
  as Unix epoch they are wrong by 31 years.
- **`ZUNIQUEID` is stable, filenames are not.** Prefer the UUID as the identity
  of a recording anywhere you keep state.

Going through the store also returns duration and title directly, so there is
no need to shell out to `afinfo` per file.

## Apple's Embedded Transcripts

Voice Memos stores its own on-device transcript inside the `.m4a`, as JSON in a
`tsrp` atom. `voice-memos transcript` extracts it, with per-segment time ranges
and the detected locale.

Treat it as an opportunistic fast path, never as a guaranteed source:

- It is written **lazily** — recordings that have never been opened in the
  Voice Memos app usually carry none. Coverage of well under half is normal,
  and the newest recordings are the least likely to have one.
- It is **cleaned-up prose**, not verbatim. Filler words and false starts are
  smoothed away. If a workflow needs verbatim text as evidence, this is the
  wrong source — transcribe the audio instead.

`voice-memos transcript` exits non-zero when no transcript is embedded, so a
caller can fall back cleanly:

```bash
voice-memos transcript "$id" 2>/dev/null || elevenlabs transcribe "$(voice-memos path "$id")"
```

## Requirements

The calling process needs **Full Disk Access** to read the store, and Voice
Memos must have been opened at least once. If the database is missing, the CLI
says so rather than reporting zero recordings — an empty list means an empty
store, not a permissions problem.

## Scope

Read-only. This plugin never writes to the Voice Memos store, never deletes
recordings, and never moves audio. Transcription of audio belongs to a
transcription tool; filing and routing belong to whatever workflow called this.
