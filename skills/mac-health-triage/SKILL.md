---
name: mac-health-triage
description: Diagnose macOS CPU heat, fan spin, memory pressure, swap, OOM risk, and stale agent/helper processes. Use when the user asks why their Mac is hot/slow, wants CPU/RAM/swap checked, mentions fan noise, memory leaks, OOM, Codex/Claude/Atlas heat, Chronicle, Computer Use, or wants a safe cleanup plan.
---

# Mac Health Triage

Use this skill to answer: "What is making my Mac hot?", "Am I close to OOM?", and "Are Codex/Claude/Atlas/Computer Use leaking or accumulating helpers?"

## Rules

- Start read-only. Do not kill processes, edit config, disable Chronicle, or quit apps unless the user explicitly asks.
- Do not use AppleScript, Accessibility, Computer Use, or app-window control by default. Those can trigger macOS Automation prompts. Use process snapshots first.
- Separate CPU heat from memory/OOM risk. A machine can be hot with acceptable RAM, or memory-pressured with low CPU.
- Report current facts first, then interpretation, then a cleanup plan.
- Treat a single hot sample as a spike until confirmed with a second sample. Use a short two-sample `top` check when a process looks surprising.
- Prefer app-family totals over isolated Electron renderer names. Renderer PIDs are useful, but the user wants the practical app/process family.
- Never call something a classic memory leak unless one PID grows over time. Many small stale helpers are a process-lifecycle leak or process accumulation, not necessarily a heap leak.
- For exact current status, always take a fresh snapshot. Old memory of previous culprit processes is only a pattern to compare against.

## Snapshot Command

Run the bundled script first:

```bash
~/.agents/skills/mac-health-triage/scripts/mac_health_snapshot.sh
```

If the script is unavailable, use this read-only bundle:

```bash
top -l 2 -s 2 -n 25 -o cpu -stats pid,ppid,command,cpu,mem,rsize,threads,state,time
memory_pressure
sysctl vm.swapusage
vm_stat
ps -axo pid=,ppid=,etime=,stat=,pcpu=,pmem=,rss=,comm=,args= | rg -i 'Codex|codex|SkyComputerUseClient|Computer Use|codex_chronicle|Claude|ChatGPT Atlas|WindowServer|replayd|superwhisper'
```

## Interpret CPU Heat

Rank by sustained CPU, not one spike.

Watch these app families:

- `Codex+ComputerUse`: `Codex.app`, `codex app-server`, `Codex Helper (Renderer)`, `codex_chronicle`, `SkyComputerUseClient`.
- `Claude`: `Claude.app`, `Claude Helper`, Claude Code child process.
- `ChatGPT Atlas`: main app, renderers, GPU/service helpers.
- Screen/capture stack: `WindowServer`, `replayd`, `coreaudiod`, `VTDecoderXPCService`, camera/video services.
- Other recurring local apps: `superwhisper`.

Practical CPU signals:

- Any app family above `100%` CPU while idle is suspicious.
- A single renderer above `100%` CPU can heat the machine even if memory is fine.
- `WindowServer` above `30-40%` while idle points to display/compositing/screen-capture pressure.
- `replayd` high alongside Codex Chronicle or Computer Use points to screen-recording/capture overhead.
- `kernel_task` high can be thermal throttling rather than the original culprit.

## Interpret Memory And OOM Risk

Use `memory_pressure`, `sysctl vm.swapusage`, and app-family RSS.

Practical risk bands for this user's 8 GB Mac:

- Swap `0-2 GB`: acceptable.
- Swap `2-4 GB`: pressured; watch it.
- Swap `4-6 GB`: heavy pressure; restart heavy apps soon.
- Swap `6 GB+`: restart/quit heavy apps or reboot.
- Compressed memory above about `1.5-2 GB` means macOS is working hard to avoid swapping more.
- A 40-day-plus uptime with swap pressure is a strong reboot candidate, even if no single app is obviously broken.

When RAM looks bad, list the largest RSS app families and large sleeping processes. On this machine, Electron/browser apps add up quickly: Codex, Claude Desktop, ChatGPT Atlas, and browser/video tabs.

## Interpret Disk Headroom As The Swap Ceiling

Swap files live on the same APFS container as everything else, so container
free space is the hard ceiling on how far swap can grow. Reported "available"
disk already deducts current swap files; the risk is that swap needs to grow
*into* the remaining free space. On an 8 GB machine, low disk therefore
directly lowers the OOM threshold.

Check:

```bash
df -h /System/Volumes/Data /System/Volumes/VM
diskutil apfs list | grep -E "Capacity (In Use|Not Allocated)"
tmutil listlocalsnapshots /
```

Practical bands for this user's 245 GB disk:

- Free `50 GB+`: healthy; swap can absorb a bad day without disk pressure.
- Free `25-50 GB`: acceptable; mention it only if swap is also elevated.
- Free `10-25 GB`: pressured; a heavy agent day can push swap into the
  ceiling. Flag it and suggest a cleanup pass.
- Free under `10 GB`: critical; swap exhaustion is imminent under load and
  APFS itself degrades (slow writes, failed updates). Treat as actionable
  even if the machine currently feels fine.

Notes:

- Observed 2026-08-03: swap maxed at 9.2 GB while container free space was
  ~11 GB — the swap ceiling was disk-imposed, and thrashing followed.
- `sleepimage` (~2 GB, hibernation) is a fixed cost on the VM volume.
- Local Time Machine snapshots can hold space invisibly; list them before
  blaming apps.

## Agent-Specific Leak And Accumulation Signals

### Computer Use

`SkyComputerUseClient` belongs to Codex Computer Use.

Observed local pattern:

- Before Codex restart, `SkyComputerUseClient` reached about `55` processes, using roughly `321 MB` RSS and `12.5%` CPU, with many processes alive for hours.
- Restarting Codex dropped the count to about `3`, reduced swap from about `5 GB` to about `2.3 GB`, and lowered load average.

Interpretation:

- This looked like process accumulation or a process-lifecycle leak.
- It did not look like a classic heap memory leak because each helper was small.
- If the count climbs from `0-3` to dozens after Computer Use or background Codex activity, flag it.

Practical thresholds:

- `0-3`: normal after fresh restart.
- `10+`: suspicious.
- `30+`: likely buildup.
- `50+`: actionable; recommend restarting Codex.

### Chronicle

`codex_chronicle` is Codex's screen-context/memory background feature.

Watch for:

- `codex_chronicle` above `10-20%` CPU for several minutes.
- Repeated `codex_chronicle --capture-screenshot-child`.
- Background `codex exec` memory-writer processes stacking up.
- High `WindowServer` or `replayd` at the same time.

Do not blame Chronicle automatically. In the local evidence, Chronicle was plausibly adjacent, but the visible process accumulation was `SkyComputerUseClient`.

Also check `~/.codex/config.toml` for:

```toml
notify = [".../SkyComputerUseClient", "turn-ended"]
[features]
chronicle = true
```

If both are present, Chronicle/background turns plus a `turn-ended` notify hook may plausibly amplify Computer Use helper spawning. This is a hypothesis, not proof.

### Codex

Flag Codex if:

- `Codex Helper (Renderer)` stays hot while idle.
- `codex app-server` stays hot while idle.
- `SkyComputerUseClient` count grows over time.
- Restarting Codex clears helpers and reduces swap/load.

Cleanest first action is usually quitting and reopening Codex, not killing individual child processes.

### ChatGPT Atlas

Atlas/Chromium can spike during video, page load, or GPU activity. Confirm with a second sample.

For YouTube/video:

- A brief renderer spike above `100%` can happen.
- Steady low single-digit CPU after a second sample is normal.
- Around `700 MB-1.3 GB` RSS for a Chromium browser with video/tabs is not shocking on this machine, but it contributes to swap pressure.

Avoid AppleScript tab/window title checks unless the user approves macOS Automation prompts.

### Claude Desktop

Claude Desktop renderers can use hundreds of MB. Flag only if CPU is sustained high, RSS grows over time, or Claude Code child processes remain active unexpectedly.

## Cleanup Recommendations

Use the least destructive action that matches the evidence:

1. Hot browser renderer only: pause/close/refresh the tab or quit Atlas.
2. Hot Codex renderer or many `SkyComputerUseClient`: quit and reopen Codex.
3. Chronicle/capture stack hot: pause Chronicle temporarily, then re-check.
4. `superwhisper` hot and unused: quit it.
5. Swap above `4-6 GB`: close heavy Electron/browser apps.
6. Long uptime plus swap remains high after app restarts: reboot.

Only suggest commands like `pkill -f SkyComputerUseClient` as a second-best surgical cleanup when normal Codex quit does not work.

## Answer Shape

Use this format:

```text
Verdict:
- CPU heat: hot / okay / cooling
- OOM risk: low / medium / high
- Main culprit: app family and process

Evidence:
- Top sustained CPU processes
- Memory/swap/compression
- Agent helper counts

What I would do:
- 1-3 concrete actions, least destructive first
```

Mention uncertainty explicitly:

- "confirmed" for current process counts and memory.
- "plausible" for Chronicle/notify/Computer Use causality.
- "not proven" for internal product bugs or classic memory leaks.
