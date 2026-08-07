# call-recordings

Read Apple call recordings out of the macOS Notes store — calls, timing, audio
paths, and Apple's transcripts.

Mechanism only. It answers *which calls were recorded, when, and where is the
audio*. It has no opinion about what a call meant or where its contents belong.

## Install

```bash
skills install call-recordings
```

## Usage

```bash
call-recordings list                    # human-readable
call-recordings list --json             # for a caller to consume
call-recordings list --since 2026-06-01

call-recordings path A1B2C3D4           # absolute audio path
call-recordings transcript A1B2C3D4     # Apple's call transcript, if any
call-recordings doctor                  # store access + unreferenced audio
```

A call can be referenced by its attachment UUID, a UUID prefix, or a contact
name. An ambiguous name is an error listing the candidates, never a silent pick.

## Why this exists

Apple files each recorded call as a note, with the audio in the Notes group
container. Globbing that container for `Call with *.m4a` looks equivalent to
reading the store and is not:

| | Naive file listing | This plugin |
| --- | --- | --- |
| Which files are calls | includes audio from deleted and superseded recordings, indistinguishable by name, size, or mtime | only what a note actually references; `doctor` lists the leftovers |
| Duration | one `afinfo` per file — or `0.0` for every call if read off the titled attachment row | the child attachment row, which is where the real value lives |
| Call time | file mtime, which is a CloudKit sync artifact | the attachment pair brackets the call: parent creation = start, child creation = end |
| Recent calls | may be missing — the store is WAL-mode, and reading `NoteStore.sqlite` alone returns a stale snapshot | snapshots `.db` + `-wal` + `-shm` together |
| Identity | filename, which is `Call with <contact>.m4a` for every call with that contact | the attachment UUID |

## Apple's transcripts

Voice Memos embeds its transcript in the audio file. Calls do not — a call
transcript is written into the note body, a gzipped protobuf in
`ZICNOTEDATA.ZDATA`. `call-recordings transcript` decodes it.

Coverage is the exception. Call transcription is region- and language-gated, so
most calls carry none, and the command exits non-zero when the note is empty:

```bash
call-recordings transcript "$id" 2>/dev/null || elevenlabs transcribe "$(call-recordings path "$id")"
```

For evidence, transcribe the audio regardless — a call is two-speaker by nature,
so diarization matters and Apple's transcript does not provide it.

## Requirements

- macOS, with Apple call recording used at least once
- **Full Disk Access** for the calling process
- Python 3

## Scope

Read-only. Never writes to the Notes store, deletes or edits notes and
recordings, or moves audio.
