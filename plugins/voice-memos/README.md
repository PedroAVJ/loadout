# voice-memos

Read the macOS Voice Memos store — recordings, metadata, and Apple's embedded
transcripts.

Mechanism only. It answers *what was recorded, when, and where is the audio*.
It has no opinion about what a recording means or where its contents belong.

## Install

```bash
skills install voice-memos
```

## Usage

```bash
voice-memos list                       # human-readable
voice-memos list --json                # for a caller to consume
voice-memos list --since 2026-08-01
voice-memos list --check-transcripts   # also report Apple-transcript presence

voice-memos path 38BEC65A              # absolute audio path
voice-memos transcript 38BEC65A        # Apple's on-device transcript, if any
```

A recording can be referenced by `ZUNIQUEID`, filename, filename stem, or the
short hex prefix Voice Memos puts in filenames.

## Why this exists

Listing `.m4a` files in the Recordings folder looks equivalent to reading the
store and is not. Every difference fails silently:

| | Naive file listing | This plugin |
| --- | --- | --- |
| Recent recordings | may be missing — the store is WAL-mode, and reading `CloudRecordings.db` alone returns a stale snapshot | snapshots `.db` + `-wal` + `-shm` together |
| Timestamps | parsed from the filename, or wrong by 31 years if `ZDATE` is read as Unix epoch | Core Data reference date, converted correctly |
| Duration | one `afinfo` subprocess per file | read from the store |
| Identity | filename, which is not stable | `ZUNIQUEID` |

## Apple's transcripts

Voice Memos embeds its own transcript in the `.m4a` as JSON in a `tsrp` atom.
`voice-memos transcript` extracts it with per-segment time ranges and locale.

It is a fast path, not a source of record. Apple writes these lazily, so
recordings never opened in the app usually have none — coverage well under half
is normal, and the newest recordings are least likely to be covered. The text
is also cleaned-up prose rather than verbatim, so anything that needs filler
words and false starts preserved should transcribe the audio instead.

The command exits non-zero when nothing is embedded, which makes fallback easy:

```bash
voice-memos transcript "$id" 2>/dev/null || elevenlabs transcribe "$(voice-memos path "$id")"
```

## Requirements

- macOS, with Voice Memos opened at least once
- **Full Disk Access** for the calling process
- Python 3

## Scope

Read-only. Never writes to the store, deletes recordings, or moves audio.
