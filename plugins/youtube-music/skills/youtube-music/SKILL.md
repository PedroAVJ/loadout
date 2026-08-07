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

**Autoplay is the sharp edge.** By default a short playlist loads with a
radio tail appended — a 6-track playlist becoming a ~65-item queue — so
playback runs past the curated material into recommendations. The tail is
*adjacent* to the seed rather than random, which is exactly why it slips past
unnoticed: it sounds close enough to belong while breaking whatever criteria
the pool was built on.

It is switchable, with one ordering trap:

1. Open the queue panel and turn off **Autoplay** ("Add similar content to the
   end of the queue").
2. **Reload or restart the playlist.** The toggle does not retroactively clear
   a queue that already has its tail — checking immediately after toggling
   shows the tail still there and looks like the setting failed.
3. Confirm: the queue panel renders an **"Autoplay is off"** divider, and the
   queue holds exactly the playlist's tracks.

Pair it with **Repeat all** for a pool that loops indefinitely without ever
reaching a recommendation. That combination — not a longer pool — is the
actual fix for "I want only my curated tracks."

Add **Shuffle** unless the user wants a fixed order: a looping pool played in
playlist order becomes predictable within a session, and predictable order is
its own low-grade distraction. Note shuffle keeps whatever is *currently*
playing at the front, so hit Next once afterwards or every session still opens
on the same track.

Counting the queue in JS: `querySelectorAll('ytmusic-player-queue-item')`
**over-counts badly** (76 for a 12-track queue) because wrapper renderers nest
their own items and off-queue content stays in the DOM. Count the children of
`ytmusic-player-queue #contents` instead.

**Temp queues are a youtube.com mechanism.** A user who listens on YouTube
Music — especially on a phone, where a session URL is useless — needs
candidates in a real playlist instead. Make a second, explicitly provisional
playlist rather than polluting the good one; 50 units per track is cheap
next to handing someone a link their phone cannot open.

## Free Expansion Candidates

A playlist page on `music.youtube.com` carries a **Suggestions** rail
underneath it, seeded from the playlist's own contents. It costs no quota
and reflects the user's actual curation rather than a generic mood. Read it
before spending 100 units on `ytx search`.

For continuous play beyond a finite pool, playlist radio extends any
playlist indefinitely:

```text
https://music.youtube.com/playlist?list=RDAMPL<PLAYLIST_ID>
```

This is recommendation conditioned on validated seeds — usually a better
answer to "I want new music constantly" than hand-picking, and the reason a
short pool is not a problem.

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
