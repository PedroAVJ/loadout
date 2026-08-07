# MacBook

Three separate diagnoses for a MacBook under strain.

"My MacBook is slow" is never one question. It is heat, memory, or disk, and
they fail independently — the machine can be hot with plenty of free RAM, or
swapping hard while cool, or dying of memory starvation because the disk
filled up. Collapsing them into a single health check produces a verdict that
is right about one thing and silently wrong about the other two.

So this plugin splits them, and each skill says which one it answered.

## Skills

| Skill | Question |
| --- | --- |
| `heat` | What is burning CPU, spinning the fans, or throttling the machine? |
| `memory` | How close is physical RAM to OOM — pressure, swap, compression, accumulation? |
| `storage` | Where did the disk go, and what is safe to reclaim? |

## Snapshot Script

One read-only script backs all three, sectioned by concern:

```bash
./scripts/snapshot.sh heat
./scripts/snapshot.sh memory
./scripts/snapshot.sh storage
./scripts/snapshot.sh all
```

Nothing in it mutates state, kills processes, or triggers macOS Automation
prompts.

## Where They Connect

Swap files share the APFS container with everything else, so free disk is the
hard ceiling on how far swap can grow. On a small-RAM machine, a full disk
lowers the OOM threshold directly — which is why `memory` checks headroom
before blaming an app, and hands off to `storage` when that is the real
constraint.

## Calibration

The risk bands are written for an 8 GB / 228 GiB MacBook Pro. They are stated
explicitly in each skill so they can be re-derived rather than silently
misapplied on different hardware.

## Install

```bash
claude plugin install macbook@loadout
```

```bash
codex plugin add macbook@loadout
```
