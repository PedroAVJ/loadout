# Apple Call Recording Acquisition

For phone/FaceTime calls recorded with Apple's built-in call recording. macOS
files these as notes in the Notes app, with the audio in the Notes group
container.

Use the `call-recordings` plugin. Do not drive the Notes UI, and do not glob the
container for `Call with *.m4a` — deleted and superseded recordings leave audio
on disk that is indistinguishable from a live call by name, size, or mtime, and
the titled attachment row reports a duration of zero for every call.

```bash
call-recordings list --json --since 2026-06-01
call-recordings path A1B2C3D4
```

`list --json` gives the call's start, end, real duration, contact, a stable
attachment UUID to key cursors on, and the absolute audio path.

## Handling

1. Copy the `.m4a` out to the session scratchpad before doing anything with it.
   Never modify or delete files inside the Notes container.
2. Upload the copy to the private Drive evidence folder (shared pipeline step
   2), then transcribe with Scribe using diarization — calls are two-speaker by
   nature.
3. Try `call-recordings transcript <id>` first, but expect nothing: call
   transcription is region- and language-gated, so Spanish-language calls in
   Mexico normally carry none, and Apple's transcript has no diarization even
   when present. It is a cross-check, not the evidence record.
4. Record the attachment UUID and the container path as the source pointers in
   metadata.

## Blockers

- If the container is unreadable, `call-recordings doctor` says so rather than
  reporting zero calls. Full Disk Access for the calling process is the usual
  cause. Report that exact blocker and ask Pedro to share the recording from
  Notes (share sheet → save audio) instead. Do not silently fall back.
