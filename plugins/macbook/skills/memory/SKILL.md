---
name: memory
description: Diagnose MacBook RAM pressure, swap usage, memory compression, OOM risk, and processes that grow or accumulate. Use when the user asks how much RAM is left, whether the machine is close to running out of memory, why it is swapping or beachballing, or whether an app is leaking. Covers physical memory only, not agent memory files, disk space, or CPU heat.
---

# MacBook Memory

Answers one question: **how close is this MacBook to running out of RAM?**

This is physical memory — pressure, swap, compression, OOM risk. Not agent
memory files. Not disk space, though swap ties the two together (see
"The Disk Ceiling" below). Not CPU heat, which is the `heat` skill.

## Rules

- Start read-only. Do not kill processes or quit apps unless asked.
- Report current facts first, then interpretation, then a plan.
- Never call something a memory leak unless **one PID grows over time**. Many
  small stale helpers are process accumulation — a lifecycle bug, not a heap
  leak. The distinction changes the fix: accumulation is cured by restarting
  the parent app, a heap leak is not.
- Take a fresh snapshot. Old culprits are a pattern to compare against.

## Snapshot

```bash
<plugin-root>/scripts/snapshot.sh memory
```

Resolve `scripts/snapshot.sh` relative to the plugin root — from this skill
file that is `../../scripts/snapshot.sh`. Without the script:

```bash
memory_pressure
sysctl vm.swapusage
vm_stat
ps -axo pid=,etime=,pcpu=,pmem=,rss=,comm= | sort -k5,5nr | head -30
```

## Risk Bands

This machine has **8 GB** of RAM, which is the whole reason these bands are
tight. Re-derive them if the hardware changes.

| Swap used | Reading |
| --- | --- |
| `0-2 GB` | Acceptable |
| `2-4 GB` | Pressured — watch it |
| `4-6 GB` | Heavy — restart heavy apps soon |
| `6 GB+` | Restart/quit heavy apps, or reboot |

Compressed memory above roughly `1.5-2 GB` means macOS is working hard to
avoid swapping further — treat it as a leading indicator, ahead of swap.

Uptime past ~40 days with elevated swap is a strong reboot candidate on its
own, even when no single app looks broken.

## The Disk Ceiling

Swap files live on the same APFS container as everything else, so **free disk
space is the hard ceiling on how far swap can grow**. On an 8 GB machine, low
disk directly lowers the OOM threshold — the machine can die of memory
starvation because the disk was full.

Observed 2026-08-03: swap maxed at 9.2 GB with only ~11 GB container free.
The ceiling was disk-imposed and thrashing followed.

So when swap is high, check headroom before blaming an app:

```bash
df -h /System/Volumes/Data /System/Volumes/VM
```

If free space is under ~25 GB, the real problem may be storage. Hand off to
the `storage` skill rather than recommending app restarts that will not help.

## What Eats RAM Here

Electron and Chromium stack up fast on 8 GB: Codex, Claude Desktop, ChatGPT
Atlas, and browser tabs with video. `700 MB-1.3 GB` RSS for a Chromium browser
with video is unremarkable in isolation and still a major contributor to swap.

For accumulation rather than growth, count processes per family. Dozens of
small `SkyComputerUseClient` helpers is the known local pattern — see the
`heat` skill, which covers that family in detail.

## Answer Shape

```text
Verdict: OOM risk low / medium / high — swap <N>GB, compressed <N>GB

Evidence:
- memory_pressure summary
- Swap and compression
- Largest RSS families
- Disk headroom, if swap is elevated

What I would do:
- 1-3 actions, least destructive first
```

Say "confirmed" for measured memory and process counts, "plausible" for
causality, "not proven" for leaks you have not watched grow.
