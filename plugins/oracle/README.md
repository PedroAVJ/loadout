# Loadout Oracle Plugin

A Codex-hosted Claude Fable 5 second-opinion workflow with fail-closed model
identity verification.

Oracle is intentionally not an API wrapper. It uses the user's authenticated
Claude Code installation with the canonical `--model claude-fable-5` selector,
model substitution disabled, restricted tools, JSON output, and no session
persistence. Its helper inspects Claude Code's `modelUsage` metadata and rejects
Opus, Sonnet, or unknown-model output instead of silently accepting a fallback.

This project is unofficial and is not affiliated with Anthropic. Claude and
related marks belong to their respective owners.

## What You Get

- One canonical `oracle` skill powered only by Claude Fable 5.
- Verified local context condensed into a focused second-opinion prompt.
- No silent fallback when Fable 5 is unavailable.
- A model-identity check before an answer counts.
- A response contract that separates Fable's recommendation from Codex's local
  evidence check and the tests still needed.
- Legacy static dossier scripts only for explicit bundle requests.

## Install With Codex

Install Loadout as a Codex marketplace, then install `oracle` from the
Plugins screen.

```bash
codex plugin marketplace add PedroAVJ/loadout --ref main --sparse .agents/plugins --sparse plugins/oracle
codex plugin marketplace upgrade
```

Equivalent marketplace values in the Codex app:

```text
Source: PedroAVJ/loadout
Git ref: main
Sparse paths:
.agents/plugins
plugins/oracle
```

If Loadout is already installed, add `plugins/oracle` to its sparse paths or
leave sparse paths blank, then run `codex plugin marketplace upgrade`.

## Oracle Flow

Examples:

```text
Ask Oracle to sanity-check this architecture decision.
Use Oracle for Fable 5's second opinion on this device-only bug.
Run this implementation plan by Oracle.
```

Oracle first gathers verified local context. It sends one focused prompt to the
authenticated Claude Code CLI through the fail-closed Fable helper, verifies
that Fable 5 produced the substantive output, and checks the recommendation
against the local evidence.

## Failure Behavior

If Claude Code cannot provide verified Fable 5 output, Oracle reports the exact
failure and returns no Oracle answer. Sonnet, Opus, Haiku, or unknown models are
not silent substitutes.

## Privacy And Source Checks

Oracle sends its prompt to Anthropic. An explicit Oracle request authorizes
relevant nonsensitive context, but credentials, private identifiers, medical or
financial details, private messages, browsing history, and personal files
require specific approval before transmission.
