---
name: youtube-music
description: Play YouTube Music and build throwaway listening queues. Use when the user wants music put on, a queue assembled, a playlist opened for listening, or asks how YouTube Music relates to YouTube playlists. For editing playlists through the API, use the youtube-cli plugin's ytx skill; for composing a work-session soundscape, use focus-session.
---

# YouTube Music

The **listening** surface over the same library `ytx` edits. This skill covers
playback: what to open, where, and how to assemble a queue without spending
API quota. Library mutations belong to the `youtube-cli` plugin (`ytx`).

## One Library, Two Front Doors

YouTube and YouTube Music share one backend and **one playlist ID space**. A
playlist is the same object on both:

```text
https://www.youtube.com/playlist?list=<ID>
https://music.youtube.com/playlist?list=<ID>
```

So there is nothing to sync and nothing to duplicate. `ytx` writes the
library; YouTube Music is where it gets played. Prefer `music.youtube.com`
for actual listening — it is built for continuous playback and, with
Premium, gets background play and no interruptions.

The reverse does not hold for everything. **YouTube-Music-only surfaces are
unreachable through the Data API**: Liked Music (distinct from YouTube's
Liked videos), library albums and artists, uploads, play history, lyrics,
radio and mixes. Full list in the `youtube-cli` plugin's
`references/limitations.md`. Do not promise those.

## Catalog Breadth

YouTube Music plays two different kinds of thing, and the difference matters
when building queues:

- **Music-catalog tracks** — licensed songs, typically surfaced through
  auto-generated `<Artist> - Topic` channels. First-class in YouTube Music:
  searchable, queueable, backgroundable.
- **Ordinary YouTube videos** — anything else, including fan covers, OST
  rips, compilations, and clips. Reachable by direct link and by playlist
  membership, but **not** surfaced in YouTube Music search, which is
  filtered to music.

Practical consequence: a playlist assembled on YouTube can contain items
that YouTube Music will not find by name. It plays them fine from the
playlist; you just cannot search your way there. When a queue behaves
unexpectedly on `music.youtube.com`, check whether its items are Topic-channel
tracks or plain videos before assuming a bug.

## Throwaway Queues — Zero Quota

An ephemeral playlist can be built from bare video IDs with no API call, no
account write, and no quota spend:

```text
https://www.youtube.com/watch_videos?video_ids=ID1,ID2,ID3
```

The request redirects to `watch?v=ID1&list=TLGG…`. That `TLGG…` list exists
only for the session — nothing is added to the user's library.

Use this for anything provisional: auditioning candidates, a one-off mix for
a task, a mood the user will not want again. Reserve real playlist writes
(`ytx playlists create` at 50 units, `ytx items add` at 50 each) for tracks
that have earned a permanent place.

Source the IDs from the local `ytx` cache — free:

```bash
ytx db query "SELECT video_id, title FROM playlist_items WHERE title LIKE '%<term>%'"
```

**Autoplay is the sharp edge.** A temp queue ends, and playback continues
into algorithmic recommendations — which is how an unrelated, attention-
grabbing track arrives mid-session and looks like a curation failure. Either
end the queue with a long compilation, tell the user to switch autoplay off,
or accept it and warn them.

## Opening Playback

Open playback in the **user's own browser**, not an agent-controlled or
sandboxed browser pane:

```bash
open -a "Google Chrome" "https://music.youtube.com/playlist?list=<ID>"
```

A sandboxed pane is logged out, which means ads, no Premium, and no library
state — fine for verifying that a URL resolves, wrong for listening. Browser
automation tooling is not needed to hand someone a tab; `open` is enough and
has no extension dependency.

## Rules

- Playback is user-visible and pulls focus. Opening a tab in front of
  someone mid-task is a real interruption — do it when asked, not
  speculatively.
- Never start playback the user did not ask for.
- Library writes follow the `youtube-cli` rules: ask before creating,
  deleting, adding, removing, or reordering.
- Prefer temp queues over real playlists until the user says a mix is worth
  keeping.
