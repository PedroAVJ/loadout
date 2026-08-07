# Loadout ElevenLabs Plugin

Use ElevenLabs audio and speech tooling from Codex or Claude Code.

The current bundled workflow focuses on ElevenLabs Scribe transcription with language hints, diarization, speaker-count hints, keyterms, and multiple output formats. Raw API results are cached locally (`~/.cache/elevenlabs-transcripts/`, keyed by audio hash + options), so repeat transcriptions of the same file are free; pass `--no-cache` to bypass.

This project is unofficial and is not affiliated with ElevenLabs.

## Requirements

- Python 3
- `requests`
- `ELEVENLABS_API_KEY` set in the shell environment for live API calls

## Start

```bash
elevenlabs transcribe meeting.mp4 --language es --diarize --response-format diarized_text --out transcript.txt
```

`bin/elevenlabs` is the plugin's entry point and belongs on PATH. Other
plugins and repos call transcription through that command rather than
reaching into this plugin's install directory.

Use the `elevenlabs` skill for the documented Scribe options and safety rules.
