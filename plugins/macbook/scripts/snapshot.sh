#!/usr/bin/env bash
# Read-only MacBook health snapshot.
#
#   snapshot.sh heat      CPU load, app-family totals, capture/display stack
#   snapshot.sh memory    pressure, swap, compression, large resident processes
#   snapshot.sh storage   APFS headroom, snapshots, build-cache hogs
#   snapshot.sh all       every section (default)
#
# Nothing here mutates state, kills processes, or triggers macOS Automation
# prompts.
set -u

MODE="${1:-all}"

section() {
  printf '\n%s\n%s\n%s\n' \
    "============================================================" \
    "$1" \
    "------------------------------------------------------------"
}

want() {
  [[ "$MODE" == "all" || "$MODE" == "$1" ]]
}

case "$MODE" in
  heat|memory|storage|all) ;;
  *)
    printf 'usage: %s [heat|memory|storage|all]\n' "${0##*/}" >&2
    exit 2
    ;;
esac

now="$(date '+%Y-%m-%d %H:%M:%S %Z')"
host="$(scutil --get ComputerName 2>/dev/null || hostname)"
mem_bytes="$(sysctl -n hw.memsize 2>/dev/null || echo 0)"
mem_gb="$(awk -v b="$mem_bytes" 'BEGIN { printf "%.1f", b / 1024 / 1024 / 1024 }')"
cpu_count="$(sysctl -n hw.ncpu 2>/dev/null || echo unknown)"
model="$(sysctl -n hw.model 2>/dev/null || echo unknown)"

printf 'macbook_snapshot mode=%s %s\n' "$MODE" "$now"
printf 'host=%s model=%s cpu_count=%s ram=%sGB\n' "$host" "$model" "$cpu_count" "$mem_gb"
uptime

# ---------------------------------------------------------------- heat

if want heat; then
  section "App Family Totals (CPU + RSS)"
  ps -axo pcpu=,pmem=,rss=,args= | awk '
  {
    cpu=$1; mem=$2; rss=$3
    $1=$2=$3=""
    sub(/^ +/,"")
    args=$0
    fam=""
    if (args ~ /Codex\.app|codex app-server|codex_chronicle|SkyComputerUseClient|Codex Computer Use/) fam="Codex+ComputerUse"
    else if (args ~ /Claude\.app|claude-code|\/claude --|Claude Helper/) fam="Claude"
    else if (args ~ /ChatGPT Atlas/) fam="ChatGPT Atlas"
    else if (args ~ /WindowServer/) fam="WindowServer"
    else if (args ~ /replayd/) fam="replayd"
    else if (args ~ /coreaudiod/) fam="coreaudiod"
    else if (args ~ /superwhisper/) fam="superwhisper"
    else if (args ~ /VTDecoderXPCService|VideoToolbox|CoreMediaIO|VDCAssistant|UVCAssistant/) fam="media/video services"
    if (fam != "") { n[fam]++; cpuSum[fam]+=cpu; memSum[fam]+=mem; rssSum[fam]+=rss }
  }
  END {
    printf "%24s %6s %9s %8s %10s\n", "family", "procs", "cpu", "mem%", "rssMB"
    for (fam in n) printf "%24s %6d %9.1f %8.1f %10.1f\n", fam, n[fam], cpuSum[fam], memSum[fam], rssSum[fam]/1024
  }' | sort -k3,3nr

  section "Top CPU Processes: Two-Sample View"
  top -l 2 -s 2 -n 25 -o cpu -stats pid,ppid,command,cpu,mem,rsize,threads,state,time 2>/dev/null || true

  section "Thermal State"
  pmset -g therm 2>/dev/null || true
  ps -axo pcpu=,comm= | awk '/kernel_task/ { printf "kernel_task_cpu=%.1f\n", $1 }'

  section "SkyComputerUseClient Health"
  sky_count="$(pgrep -f SkyComputerUseClient 2>/dev/null | wc -l | tr -d ' ')"
  ps -axo pcpu=,rss=,args= | awk '/SkyComputerUseClient/ && !/awk/ {n++; cpu+=$1; rss+=$2} END {printf "count=%d cpu=%.1f rss=%.1fMB\n", n,cpu,rss/1024}'
  if [[ "${sky_count:-0}" -ge 30 ]]; then
    printf 'signal=likely_process_buildup threshold=30+\n'
  elif [[ "${sky_count:-0}" -ge 10 ]]; then
    printf 'signal=suspicious_process_count threshold=10+\n'
  else
    printf 'signal=normal_or_low_count threshold=0-3_fresh_restart\n'
  fi
fi

# -------------------------------------------------------------- memory

if want memory; then
  section "System Memory"
  memory_pressure 2>/dev/null | tail -24 || true
  sysctl vm.swapusage 2>/dev/null || true

  page_size="$(vm_stat 2>/dev/null | awk '/page size of/ { gsub(/[^0-9]/, "", $8); print $8; exit }')"
  compressed_pages="$(vm_stat 2>/dev/null | awk -F: '/Pages occupied by compressor/ { gsub(/[^0-9]/, "", $2); print $2; exit }')"
  free_pages="$(vm_stat 2>/dev/null | awk -F: '/Pages free/ { gsub(/[^0-9]/, "", $2); print $2; exit }')"
  [[ -n "${page_size:-}" && -n "${compressed_pages:-}" ]] && \
    awk -v p="$page_size" -v c="$compressed_pages" 'BEGIN { printf "compressed_occupied=%.1fMB\n", (p*c)/1024/1024 }'
  [[ -n "${page_size:-}" && -n "${free_pages:-}" ]] && \
    awk -v p="$page_size" -v f="$free_pages" 'BEGIN { printf "free_pages_memory=%.1fMB\n", (p*f)/1024/1024 }'

  section "Large Resident Processes"
  ps -axo pid=,ppid=,etime=,stat=,pcpu=,pmem=,rss=,comm= \
    | awk '$7 > 100000 { printf "%7s ppid=%-7s age=%-12s stat=%-5s cpu=%5.1f mem=%4.1f rss=%7.1fMB %s\n", $1,$2,$3,$4,$5,$6,$7/1024,$8 }' \
    | sort -k7,7nr | head -40

  section "Swap Verdict"
  swap_used="$(sysctl vm.swapusage 2>/dev/null | awk -F'used = ' '{print $2}' | awk '{print $1}' | sed 's/M//')"
  if [[ -n "${swap_used:-}" ]]; then
    awk -v s="$swap_used" 'BEGIN {
      if (s >= 6000) print "swap=critical over_6GB restart_or_reboot"
      else if (s >= 4000) print "swap=high over_4GB restart_heavy_apps"
      else if (s >= 2000) print "swap=pressured over_2GB watch"
      else print "swap=acceptable under_2GB"
    }'
  fi
fi

# ------------------------------------------------------------- storage

if want storage; then
  section "APFS Headroom (Swap Ceiling)"
  df -h /System/Volumes/Data /System/Volumes/VM 2>/dev/null || true
  diskutil apfs list 2>/dev/null | grep -E "Capacity (In Use|Not Allocated)" || true

  section "Local Snapshots"
  tmutil listlocalsnapshots / 2>/dev/null || true

  section "Known Build-Cache Hogs"
  for d in \
    /private/tmp \
    "$HOME/Library/Developer/Xcode/DerivedData" \
    "$HOME/Library/Caches" \
    "$HOME/Library/Containers/com.apple.CoreSimulator" \
    "$HOME/.cache" \
    "$HOME/Library/Application Support/Code/Cache"
  do
    [[ -d "$d" ]] && printf '%8s  %s\n' "$(du -sh "$d" 2>/dev/null | cut -f1)" "$d"
  done

  section "Largest Directories Under /private/tmp"
  du -sh /private/tmp/* 2>/dev/null | sort -hr | head -15 || true
fi
