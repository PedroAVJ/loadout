---
name: storage
description: Diagnose MacBook disk space — what is consuming the APFS container, build caches, local Time Machine snapshots, and how little free space is left before the machine degrades. Use when the user asks why the disk is full, where their storage went, what is safe to delete, or gets a low-disk warning. Not for RAM or CPU questions.
---

# MacBook Storage

Answers one question: **where did the disk go, and what is safe to reclaim?**

Free space is not just a convenience number on this machine. Swap grows into
the same APFS container, so disk headroom sets the OOM ceiling — see the
`memory` skill. A low-disk complaint and a swap-thrashing complaint can be
the same problem.

## Rules

- Start read-only. Measure before proposing any deletion.
- Never delete anything without naming it, its size, and what regenerates it.
- Distinguish **regenerable** (build caches, DerivedData, package caches —
  safe, costs a rebuild) from **user data** (documents, repos, Photos —
  never delete without an explicit yes).
- `du` on a large tree is slow. Scope it; do not walk `$HOME` blind.

## Snapshot

```bash
<plugin-root>/scripts/snapshot.sh storage
```

Resolve `scripts/snapshot.sh` relative to the plugin root — from this skill
file that is `../../scripts/snapshot.sh`. Without the script:

```bash
df -h /System/Volumes/Data /System/Volumes/VM
diskutil apfs list | grep -E "Capacity (In Use|Not Allocated)"
tmutil listlocalsnapshots /
du -sh /private/tmp/* 2>/dev/null | sort -hr | head -15
```

## Headroom Bands

For this machine's ~228 GiB container:

| Free | Reading |
| --- | --- |
| `50 GB+` | Healthy — swap can absorb a bad day |
| `25-50 GB` | Acceptable — mention only if swap is also elevated |
| `10-25 GB` | Pressured — a heavy agent day can hit the swap ceiling |
| under `10 GB` | Critical — swap exhaustion imminent under load, and APFS itself degrades (slow writes, failed updates). Actionable even when the machine feels fine |

## Check Build Caches First

**`/private/tmp` is the usual answer on this machine, and Xcode DerivedData
inside it is the single biggest hog.** Swift/Xcode builds park hundreds of MB
per build directory there and nothing prunes them. Check it before
investigating anything else on a low-disk complaint — it is regenerable, so
it is also the cheapest thing to reclaim.

```bash
du -sh /private/tmp/* 2>/dev/null | sort -hr | head -15
du -sh ~/Library/Developer/Xcode/DerivedData ~/Library/Caches ~/.cache 2>/dev/null
```

Other regenerable pools worth measuring: `~/Library/Caches`, `~/.cache`,
CoreSimulator devices (`~/Library/Containers/com.apple.CoreSimulator`), and
package manager caches (`npm`, `pnpm`, `pip`, `cargo`, Homebrew).

## Space You Cannot See In Finder

- **Local Time Machine snapshots** hold space invisibly and Finder reports it
  as unavailable rather than used. List them with `tmutil listlocalsnapshots /`
  before blaming any app. macOS thins them automatically under pressure, so
  prefer waiting or freeing elsewhere over deleting them by hand.
- **`sleepimage`** on the VM volume is a fixed hibernation cost of roughly the
  size of RAM. Not reclaimable in any way worth doing.
- **Purgeable space** means APFS counts space it could free on demand. `df`
  "available" already accounts for current swap files, but the risk is swap
  needing to grow *into* what is left.

## Cleanup Order

Least destructive first, and only after measuring:

1. Stale build directories under `/private/tmp`.
2. Xcode DerivedData and CoreSimulator devices for projects not in flight.
3. Package manager caches.
4. Application caches under `~/Library/Caches`.
5. Large downloads and disk images the user confirms are done with.

Stop at the first step that clears enough headroom, and report how much was
actually reclaimed rather than how much was expected.

## Answer Shape

```text
Verdict: healthy / acceptable / pressured / critical — <N>GB free of <N>GB

Where it went:
- Top consumers by size, regenerable vs user data marked

What I would reclaim:
- 1-3 targets, size each, what regenerates them
```
