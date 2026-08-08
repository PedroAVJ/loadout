---
name: voice-memos
description: Read the macOS Voice Memos store, atomically claim new recordings for an intake worker by UUID, resolve recordings to audio paths, and extract Apple's on-device transcript when one exists. Use whenever a task involves Apple Voice Memos on a Mac, including an unattended intake watcher.
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
voice-memos intake claim --json
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

## Unattended Intake Cursor

For a heartbeat watcher, do not use chat memory, filenames, or a destination
repository as the dedup cursor. Claim the live recordings through the plugin:

```bash
voice-memos intake baseline --json
voice-memos intake claim --json
```

Run `baseline` once before enabling a new watcher. It records the current store
as already seen so historical recordings are not retroactively dispatched.
Then `claim` atomically records stable `ZUNIQUEID` values in the plugin-owned SQLite
state and returns one `batch_id` plus the newly claimed memo metadata. If the
count is zero, stay silent. If the count is nonzero, create exactly one worker
task for that batch, then attach its task ID:

```bash
voice-memos intake attach --batch BATCH_ID --task CODEX_TASK_ID --json
```

If task creation fails, release the un-dispatched claim so a later heartbeat can
retry:

```bash
voice-memos intake release --batch BATCH_ID --json
```

The worker — not the watcher — reads the memo and decides its destination. Once
it has completed a memo or preserved an unresolved one, it records only the
outcome pointer:

```bash
voice-memos intake resolve UUID --state completed --destination /canonical/path --json
voice-memos intake resolve UUID --state pending --note "Need destination" --json
```

`voice-memos intake status --json` is for audit and recovery. The database
defaults to `~/Library/Application Support/voice-memos/intake.sqlite3`; set
`VOICE_MEMOS_STATE_DB` for tests or a managed runtime. It never stores the
transcript or routing policy.

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

This plugin never writes to the Voice Memos store, never deletes recordings,
and never moves audio. Its intake commands write only a small plugin-owned
SQLite cursor. Transcription belongs to a transcription tool; filing and
routing belong to the worker workflow that called this plugin.
