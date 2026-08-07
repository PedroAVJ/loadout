---
name: focus-session
description: Compose a work-session soundscape — pick silence, background noise, or music, control macOS Background Sounds, and curate a focus pool that is validated against real work blocks. Use when the user is starting focused work and wants sound set up, asks whether to listen to music while working, or wants a track promoted to or rejected from their focus pool.
---

# Focus Session

Sound for focused work, treated as an instrument with a fit rather than a
matter of taste alone. Two jobs: **choose the layer** for the current state,
and **curate a pool** that has been validated against real work instead of
vibes.

Playback mechanics (queues, URLs, surfaces) live in the sibling
`youtube-music` skill.

## Match Sound To The Arousal Gap

Under-stimulation and over-stimulation both cost attention, and the target
sits between them. The ladder, quietest first:

| State | Layer |
| --- | --- |
| Alert, engaged, task has its own momentum | Silence |
| Slightly flat, or the room is intrusive | Broadband noise (rain, pink noise) |
| Dead, grindy, cannot get started | Familiar low-dynamics instrumental |

Broadband noise is the workhorse default. In ADHD specifically there is real
evidence that non-semantic noise *improves* cognitive performance while
producing no benefit — or a decrement — in controls; the moderate-brain-arousal
literature (Söderlund and colleagues) is the anchor, and a stimulant-medication
comparison found the noise benefit persisting in medicated participants. Not
universal: some people perform worse with it. Treat it as a strong default to
test, never a prescription.

**The pull toward a particular layer is data about the current arousal gap.**
Asking "what is optimal" usually resolves to "optimal is state-dependent, and
here is the rule for picking" — teach the ladder rather than naming one answer.

## Selection Criteria For Focus Music

Instrumental is necessary and **not sufficient**. All three must hold:

1. **No intelligible lyrics** during language work — reading, writing, coding,
   prompting. Lyrics compete for the same verbal working-memory channel. A
   language the user does not speak is a partial exemption.
2. **Low dynamics.** No large builds, brass swells, or percussion drops.
   Dramatic scoring is engineered to seize attention; that is its function in
   the medium it came from. Excluding it removes much of what makes a track
   good as *foreground* listening — which is the point.
3. **Not scene-indexed.** Music tied to vivid remembered scenes — a film cue,
   a battle theme, anything with a strong narrative attachment — does not fade
   into texture. It launches the scene. This criterion disqualifies material
   that passes the first two, and it is the one that gets missed.

Familiarity helps: known music becomes texture, novel music recruits
attention. Two failure modes to watch — a beloved track can be *too*
engaging, and a queue that ends hands the session to autoplay.

## The Audition Funnel

A pool earns trust by surviving work, not by sounding right in the abstract.

1. **Pool of record is a real playlist**, not agent memory. The user must be
   able to open and shuffle it without an agent in the loop.
2. **Get candidates in front of them.** A separate auditions playlist is the
   tidy option, but it only works if they actually play it. When the pool is
   a looping work soundtrack, mixing a few untested tracks straight into it
   is better: they get heard under real conditions instead of sitting in a
   playlist nobody opens. Mark which ones are on trial, and prune on report.
3. **Promote on survival.** A track that got through a work block without
   pulling attention graduates: `ytx items add <pool-id> <video-id>`.
4. **Record rejects durably**, with the reason, so nothing is auditioned
   twice. Memory files or a repo note — somewhere that outlives the session.

Ask before promoting. "I liked it" and "it did not distract me" are different
claims, and only the second is the criterion.

When a user says a generic streaming focus playlist does not work for them,
this is why it can be beaten: the selection signal here is their own reports
of what broke concentration, which no recommender has.

## macOS Background Sounds

macOS ships broadband noise (Rain, Ocean, Stream, and others) under
Accessibility → Audio → Background Sounds. It is scriptable through the
`com.apple.ComfortSounds` domain. Changes need the `heard` daemon restarted to
take effect — it respawns on its own.

Read current state:

```bash
defaults read com.apple.ComfortSounds
```

Keys: `comfortSoundsEnabled` (bool), `relativeVolume` (float, 0–1),
`ComfortSoundsSelectedSound` (an `NSKeyedArchiver` blob).

Toggle on or off:

```bash
defaults write com.apple.ComfortSounds comfortSoundsEnabled -bool true && killall heard
```

Set the volume:

```bash
defaults write com.apple.ComfortSounds relativeVolume -float 0.25 && killall heard
```

Decode which sound is selected — the name is buried in the archived plist:

```bash
python3 -c "
import plistlib, subprocess
raw = subprocess.run(['defaults','export','com.apple.ComfortSounds','-'], capture_output=True).stdout
inner = plistlib.loads(plistlib.loads(raw)['ComfortSoundsSelectedSound'])
print([o for o in inner['\$objects'] if isinstance(o, str) and o in
       ('Rain','Ocean','Stream','Night','Balanced Noise','Bright Noise','Dark Noise')])
"
```

Changing *which* sound plays means rewriting that archived blob; treat sound
choice as read-only and send the user to System Settings for it. Enable and
volume are the writable knobs.

Restarting `heard` produces an audible gap of a second or two. Say so before
toggling during a session, and restore any temporary change.

### Layering

Noise under music is a legitimate combination, not a mistake: a constant floor
masks the silence between tracks, so transitions stop registering as changes
worth attending to. Keep the noise clearly below the music. The only
anti-pattern is two layers competing at similar volume.

## Rules

- Never change what someone is hearing without saying so — audio changes are
  startling and land outside the terminal.
- Restore temporary volume or enable-state changes when the session ends.
- Do not over-attribute a single bad track to medication, time of day, or any
  other narrative. One track is one data point; update the criteria instead.
- If a distractor cannot be identified, log the criteria it violated and drop
  it. Chasing an unidentifiable track wastes the user's session.
