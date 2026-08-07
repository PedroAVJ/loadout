---
name: elevenlabs
description: Use ElevenLabs audio and speech tooling. Documented use cases include Scribe transcription, diarization, language hints, and keyterm biasing.
---

# ElevenLabs

Use this plugin when the user explicitly asks for ElevenLabs or when audio/speech quality matters enough to choose ElevenLabs.

Do not title the workflow as generic transcription. The product surface is ElevenLabs; transcription is one documented use case through Scribe.

## Scribe Use Case

Use the `elevenlabs` CLI:

```bash
elevenlabs transcribe \
  meeting.mp4 \
  --language es \
  --diarize \
  --response-format diarized_text \
  --out output/elevenlabs/meeting/transcript.txt
```

The CLI is this plugin's `bin/elevenlabs` and belongs on PATH. Other plugins
and repos call transcription through that command; nothing should reach into
this plugin's install layout, because its version directory and marketplace
cache path change without notice. `ELEVENLABS_API_KEY` must be set.

## Decision Rules

- Default to `scribe_v2` for Scribe.
- Diarization: **always auto-detect. Never pass `--num-speakers`.** Real
  recordings (background TV, family wandering in, phone/watch mics) make the
  true speaker count unknowable in advance, and a wrong hint corrupts label
  assignment. Auto mode handles the two-speaker case fine on its own.
- Use `--response-format diarized_text` when the goal is a readable speaker transcript.
- Use `--response-format json` when raw API evidence matters.
- Add `--language es` when the recording is known to be Spanish.
- Add `--keyterm` for domain jargon the model is likely to miss.
- Leave verbatim mode on unless the user wants filler words and false starts removed.

## Reliability — noisy single-mic recordings (Apple Watch, phone memos)

Learned 2026-06-10 from a real Apple Watch Voice Memo (family conversation,
loud TV, watch not deliberately placed). Casual noisy recordings are NOT
fully reliable; treat transcripts as approximate memory aids, never verbatim
sources. Observed failure modes:

- **Diarization merged two similar voices** (father and son) under one
  speaker label — in both a hinted run and an auto run. Labels cannot be
  trusted to separate family members, and they carry no identities; only
  someone who was present can map who's who.
- **Word-level garbling in noisy stretches**: at least one key line came out
  as words nobody said. Never reconstruct or guess garbled lines — mark them
  unintelligible and ask the human what was said.
- **Background audio (TV) interleaves** with real speakers and can absorb or
  emit lines.
- Quiet segments far from the mic are least reliable.

Before transcript content enters any record or document, verify quotes and
speaker attribution with the human. If a future recording matters, say so at
capture time: place the device near the speakers, cut background audio.

## Local Transcript Cache

The CLI caches raw API results in `~/.cache/elevenlabs-transcripts/`
(respects `XDG_CACHE_HOME`), keyed by audio content hash + request options
(model, language, diarization, keyterms, …). Re-transcribing the same file
with the same options is free and works offline — any consumer (any repo,
any session) shares the cache. The response format is not part of the key:
one cached result serves `text`, `json`, `diarized_text`, and
`segments_json` renderings. Changing the model or options is a cache miss
by design. Pass `--no-cache` to force a live API call.

## Environment

- `ELEVENLABS_API_KEY` must be set for live API calls.
- Never ask the user to paste the full key in chat.

## Reference Map

- `references/api.md`: Scribe request knobs, limits, and diarization tradeoffs.
