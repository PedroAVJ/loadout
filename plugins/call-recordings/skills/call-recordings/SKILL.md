---
name: call-recordings
description: Read Apple call recordings on a Mac — enumerate recorded phone and FaceTime calls with real start, end, and duration, resolve a call to its audio file, and extract Apple's call transcript when the note carries one. Use whenever a task involves a recorded call, including finding recent calls, locating call audio to transcribe, or checking who was called when.
---

# Call Recordings

Reads Apple's built-in call recordings, which live as notes in the macOS Notes
store. This plugin is **mechanism only** — it tells you which calls were
recorded, when, and where the audio is. It holds no opinion about what a call
meant or where its contents belong; that is the calling workflow's business.

Use the `call-recordings` CLI:

```bash
call-recordings list --json
call-recordings list --since 2026-06-01
call-recordings path A1B2C3D4
call-recordings transcript A1B2C3D4
call-recordings doctor
```

A call is referenced by its attachment UUID, a UUID prefix, or a contact name.
A name that matches several calls is an error listing the candidates, never a
silent pick.

## Why Not Just Find The .m4a Files

`find ~/Library/Group\ Containers/group.com.apple.notes -name 'Call with*.m4a'`
looks equivalent to reading the store. It is not, and every difference fails
quietly:

- **Media folders outlive the calls that used them.** A recording that was
  deleted or superseded leaves its audio on disk, with the same name shape, a
  plausible size, and a plausible mtime. Nothing on the filesystem distinguishes
  it from a live call. Only the database knows which file a call points at —
  `call-recordings doctor` lists the leftovers explicitly so they can never be
  mistaken for copies of a real call.
- **One call is two attachment rows.** The row carrying the title reports
  `ZDURATION = 0.0` for every call. The real duration is on a child attachment
  whose own media is an internal `moments_*.MOV`. Reading the obvious row gives
  zero, silently.
- **File mtime is a CloudKit sync artifact**, not the call time. The store's
  timestamps are Core Data reference dates (seconds since 2001-01-01), wrong by
  31 years if read as Unix epoch.
- **The store is live and WAL-mode.** Reading `NoteStore.sqlite` without its
  `-wal` sidecar returns an older snapshot, with recent calls simply absent.

The parent attachment's creation date is the call's start and the child's is
its end, so `list` reports a real wall-clock window, not just a duration.

## Apple's Call Transcripts

Unlike Voice Memos — which embeds its transcript in the audio file's `tsrp`
atom — a call transcript is written into the **note body**, a gzipped protobuf
in `ZICNOTEDATA.ZDATA`. `call-recordings transcript` decodes that body and
returns the text alongside the attachment placeholder.

Coverage is the exception, not the rule. Call transcription is region- and
language-gated, so most calls carry none at all, and a Spanish-language call in
Mexico normally has nothing. Treat it as an opportunistic fast path.

The command exits non-zero when the note carries no transcript, so a caller can
fall back cleanly:

```bash
call-recordings transcript "$id" 2>/dev/null || elevenlabs transcribe "$(call-recordings path "$id")"
```

For evidence, prefer transcribing the audio regardless: a call is two-speaker
by nature, so diarization matters and Apple's transcript does not provide it.

## The `moments_*.MOV` File

Each call also has an internal Apple capture in a MOV container, exposed as
`moments_path` in JSON. The `.m4a` is the canonical recording and the one to
transcribe. `moments_path` exists so a caller can recognize the MOV rather than
stumble on it while globbing.

## Requirements

The calling process needs **Full Disk Access** to read the Notes container. If
the database is missing or unreadable, the CLI says so rather than reporting
zero calls — an empty list means no recorded calls, not a permissions problem.
`call-recordings doctor` distinguishes the two.

## Scope

Read-only. This plugin never writes to the Notes store, never deletes or
modifies notes and recordings, and never moves audio. Transcription of audio
belongs to a transcription tool; filing and routing belong to whatever workflow
called this.
