---
name: elicitation
description: Capture and preserve a requirements-elicitation session — Google Meet recordings, Apple call recordings, voice memos, meeting transcripts, Drive/Gmail meeting artifacts, or local audio/video — as durable, attributed evidence before any analysis, specification, or Linear extraction. Do not create Linear issues by default.
---

# Symphony Elicitation

Use this skill when a session's raw evidence needs to become stable before
Symphony turns it into candidate requirements, issues, coverage notes, review
artifacts, replies, or implementation briefs.

In requirements-engineering terms this is the capture half of elicitation: the
technique (the meeting, the call, the memo) happens with the humans; this skill
acquires the recording, transcribes it, attributes speakers, and freezes it as
evidence with provenance. Traceability quality is fixed at this stage — nothing
downstream can recover what capture loses.

## Session Sources

Three concrete acquisition flows. Detect the source type, then follow its
reference file for acquisition; the shared pipeline below applies to all three.

| Source | Signals | Reference |
| --- | --- | --- |
| Google Meet | Meet link, Gmail "recording ready" notification, Drive Meet Recordings folder, Google Doc transcript | [references/google-meet.md](references/google-meet.md) |
| Apple call recording | "I recorded the call", call recording in Notes, phone/FaceTime call audio | [references/apple-call.md](references/apple-call.md) |
| Voice memo / local media | Voice Memos app, dictated audio note, local or AirDropped audio/video file | [references/voice-memo.md](references/voice-memo.md) |

WhatsApp needs no capture flow: it arrives pre-transcribed with exact
attribution. Read it directly with the WhatsApp skill when it is the source.

## Contract

Produce durable pointers to the source evidence:

- transcript
- recording or source media, when available
- chat transcript, when available
- Drive links, when uploaded or already canonical
- repo/workspace transcript and metadata paths when a repo is the right home
- metadata that identifies the original source artifact and its provenance
  limits (single-microphone attribution, partial recording, unknown speakers)

This skill prepares evidence only. It does not create Linear issues unless
Pedro explicitly asks for Linear capture in the same turn.

When repo/workspace evidence files are created or changed, publish those
changes before returning. Capture should not stop at local files unless pushing
is blocked by credentials, remote divergence, conflicts, or an explicit repo
policy that requires a PR/review step.

## Shared Pipeline

1. Acquire the source artifacts per the flow reference: recording or source
   media, existing transcript, chat transcript, and source metadata.
2. For local audio/video evidence, upload the original media to the intended
   private Drive evidence folder before transcription (`gws drive ...` when the
   curated Drive connector cannot upload directly). Already-canonical Drive
   artifacts stay where they are; store pointers instead.
3. If no transcript exists, transcribe with ElevenLabs Scribe when the
   ElevenLabs plugin is available and `ELEVENLABS_API_KEY` is set:
   - `--language es` when the source is Spanish.
   - diarization for calls or multi-speaker sessions when speaker identity
     matters; `--response-format diarized_text` for readable evidence.
   - If ElevenLabs cannot run, report the exact blocker before choosing any
     fallback transcription path. Do not silently pivot.
4. Store the canonical transcript and metadata in a predictable location
   (repo shape below).
5. Upload transcripts to the same Drive evidence folder when Drive is the
   durable evidence home. Do not change sharing/permissions without explicit
   approval.
6. Verify the bundle:
   - read first and last transcript lines
   - check recording metadata or file presence
   - check uploaded Drive metadata or folder listing when Drive was used
   - check repo diff/status when repo files were added
7. If repo/workspace files were added or changed, commit and push the evidence
   changes before returning:
   - stage only the evidence files for this capture
   - use a scoped commit message and branch when the checkout is detached,
     dirty with unrelated work, or repo policy favors branches
   - push to the relevant upstream/branch; create or report a PR link when the
     repo requires PR-based review
   - do not merge, deploy, or create Linear issues unless Pedro explicitly asks
   - if pushing cannot complete, report the exact blocker and leave clear local
     paths, branch, and commit status
8. Return exact artifact pointers plus repo publication pointers when
   applicable.

If no source artifact can be found through the flow reference, stop and say the
evidence is not grounded.

## Preferred Repo Shape

Use a dated slug under the relevant repo when there is a clear source repo:

```text
docs/meetings/YYYY-MM-DD-short-topic/
  metadata.md
  transcript.es.txt
```

For audio that is not a meeting but still evidence, use the same shape unless
the repo already has a better evidence folder convention.

## Preferred Metadata Shape

```markdown
# SHORT_TITLE

Date: YYYY-MM-DD

Topic: SHORT_TOPIC

Transcript:
`RELATIVE/PATH/transcript.es.txt`

Recording:
DRIVE_OR_LOCAL_AUDIO_POINTER

Drive folder:
DRIVE_FOLDER_LINK_OR_NOT_USED

Source:
SOURCE_POINTER

Notes:
- Transcribed from SOURCE with TOOL.
- Provenance limits, when any (e.g. single shared microphone, attribution
  approximate).
```

## Boundaries

Do not:

- create Linear issues unless Pedro explicitly asks
- leave repo evidence changes only local when commit/push is available
- invent action items or specifications from the transcript
- treat transcript snippets as a replacement for the recording when the audio
  is available
- change Drive permissions or public sharing without explicit approval
- delete or modify source files in app-managed storage (Notes, Voice Memos)

The next step after capture is `analysis`, which classifies the requirements and
creates the Linear batch. Hand it the evidence pointers; do not pre-empt it by
extracting requirements here.

## Preferred Output

Return a short evidence bundle:

```markdown
Evidence ready:
- Transcript: PATH_OR_LINK
- Recording/source media: PATH_OR_LINK
- Chat transcript: PATH_OR_LINK_OR_NOT_AVAILABLE
- Metadata: PATH_OR_LINK
- Repo publication: BRANCH_COMMIT_OR_PR_LINK_OR_NOT_APPLICABLE
```
