# YouTube Music

The listening half of the YouTube library. `youtube-cli` edits playlists;
this plugin plays them, and composes the sound around focused work.

## Skills

| Skill | Purpose |
| --- | --- |
| `youtube-music` | Playback surface: the shared playlist ID space, catalog breadth, zero-quota throwaway queues, opening tabs in the user's own browser. |
| `focus-session` | Work-session soundscape: matching sound to the arousal gap, selection criteria for focus music, the audition-then-promote funnel, and macOS Background Sounds control. |

## Why It Is Separate From `youtube-cli`

Different surfaces, different failure modes. `youtube-cli` is an API client
governed by a 10,000-unit daily quota, where the discipline is caching reads
and guarding writes. This plugin is about playback and curation, where the
discipline is not spending quota at all — throwaway queues cost nothing and
touch no account state — and where the interesting problem is which track
survives a work block.

They share one library and one playlist ID space. This plugin calls `ytx`
when a track graduates into a permanent pool.

## Requirements

- `ytx` on `PATH` (from the `youtube-cli` plugin) for library writes.
- macOS for the Background Sounds control in `focus-session`. Everything else
  is platform-agnostic.
- A browser. Playback opens in the user's own browser via `open`; no browser
  extension or automation tooling is involved.
