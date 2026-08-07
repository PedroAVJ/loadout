---
name: heat
description: Diagnose why a MacBook is hot, loud, or throttling — sustained CPU load, fan spin, thermal throttling, and runaway agent or browser processes. Use when the user says their MacBook is hot, the fans are loud, the machine is sluggish under load, or asks what is burning CPU. Not for RAM or disk questions; those are the memory and storage skills.
---

# MacBook Heat

Answers one question: **what is making this MacBook hot right now?**

RAM pressure and disk headroom are separate diagnoses with their own skills.
A MacBook can be hot with plenty of free RAM, and swapping hard while cool.
Do not blend them into a single "health" verdict — say which one you checked.

## Rules

- Start read-only. Do not kill processes, quit apps, or change settings
  unless the user explicitly asks.
- No AppleScript, Accessibility, or Computer Use for this. They trigger macOS
  Automation prompts and are not needed — process snapshots are enough.
- **One hot sample is a spike, not a culprit.** Confirm with a second sample
  before naming anything. The snapshot below does this for you.
- Prefer app-family totals over isolated Electron renderer names. "Codex is at
  140% across 6 processes" is actionable; "Codex Helper (Renderer) PID 8412"
  usually is not.
- Take a fresh snapshot every time. Previously observed culprits are a pattern
  to compare against, never a current answer.

## Snapshot

```bash
<plugin-root>/scripts/snapshot.sh heat
```

Resolve `scripts/snapshot.sh` relative to the plugin root — from this skill
file that is `../../scripts/snapshot.sh`. Without the script:

```bash
top -l 2 -s 2 -n 25 -o cpu -stats pid,ppid,command,cpu,mem,rsize,threads,state,time
pmset -g therm
ps -axo pid=,ppid=,etime=,stat=,pcpu=,pmem=,rss=,comm=,args= \
  | rg -i 'Codex|SkyComputerUseClient|codex_chronicle|Claude|ChatGPT Atlas|WindowServer|replayd|superwhisper'
```

## Reading The Result

Rank by **sustained** CPU across a family, not by a single peak.

| Signal | Reading |
| --- | --- |
| Any app family above `100%` while idle | Suspicious — investigate |
| One renderer above `100%` | Enough to heat the machine on its own, even with healthy RAM |
| `WindowServer` above `30-40%` idle | Display/compositing/screen-capture pressure |
| `replayd` hot alongside Chronicle or Computer Use | Screen-recording overhead |
| `kernel_task` high | Thermal throttling — a *symptom* of heat, not its cause. Look past it for the real culprit |

App families worth naming: `Codex+ComputerUse` (`Codex.app`, `codex
app-server`, `Codex Helper (Renderer)`, `codex_chronicle`,
`SkyComputerUseClient`), `Claude`, `ChatGPT Atlas`, the capture stack
(`WindowServer`, `replayd`, `coreaudiod`, `VTDecoderXPCService`), and
`superwhisper`.

## Agent-Specific Patterns

**Computer Use.** `SkyComputerUseClient` accumulates processes rather than
leaking heap — each helper is small, but dozens of them burn real CPU.
Counts: `0-3` normal after a restart, `10+` suspicious, `30+` buildup, `50+`
actionable. Observed locally: ~55 processes at 12.5% CPU, dropping to ~3 after
a Codex restart.

**Chronicle.** `codex_chronicle` is Codex's screen-context feature. Flag it
above `10-20%` for several minutes, or when `--capture-screenshot-child`
repeats and `WindowServer`/`replayd` are hot at the same time. Do not blame it
automatically — in the local evidence Chronicle was adjacent, while the
visible accumulation was `SkyComputerUseClient`. Check whether both a
`turn-ended` notify hook and `[features] chronicle = true` are set in
`~/.codex/config.toml`; together they *may* amplify helper spawning. That is a
hypothesis, not proof, and should be reported as one.

**Atlas / Chromium.** Brief renderer spikes above `100%` during video or page
load are normal. Steady single digits on the second sample is fine.

**Claude Desktop.** Flag only on sustained CPU or unexpectedly live Claude
Code children.

## Cleanup

Least destructive action that matches the evidence:

1. Hot browser renderer → close/refresh the tab, or quit Atlas.
2. Hot Codex renderer, or many `SkyComputerUseClient` → quit and reopen Codex.
   This is almost always better than killing individual children.
3. Capture stack hot → pause Chronicle, re-check.
4. `superwhisper` hot and unused → quit it.
5. Still hot after all of the above with long uptime → reboot.

`pkill -f SkyComputerUseClient` is a second-best surgical fallback, only when
a normal Codex quit does not clear it.

## Answer Shape

```text
Verdict: hot / okay / cooling — main culprit: <family and process>

Evidence:
- Top sustained CPU (two samples)
- Thermal throttling present or not
- Agent helper counts

What I would do:
- 1-3 actions, least destructive first
```

Label confidence: "confirmed" for process counts and CPU, "plausible" for
Chronicle/Computer-Use causality, "not proven" for product bugs. If the user
asked about slowness generally and RAM or disk is the actual constraint, say
so and hand off to the `memory` or `storage` skill rather than forcing a heat
answer.
