# SWE Stack Oracle Plugin

A Codex-hosted, two-model council that independently consults ChatGPT's
GPT-5.6 Sol Pro and Claude Fable 5, then synthesizes their answers without
hiding disagreements.

Oracle is intentionally not an API wrapper. It uses the user's existing
authenticated products:

- ChatGPT Pro in Chrome, controlled through the Codex Chrome Extension. The
  workflow selects and visibly verifies `Pro`, which currently maps to
  GPT-5.6 Sol Pro.
- Claude Code with the canonical `--model claude-fable-5` selector, model
  substitution disabled, restricted tools, JSON output, and no session
  persistence.
- A fail-closed helper that prevents model fallback and rejects Opus, Sonnet,
  or unknown-model output by inspecting Claude Code's `modelUsage` metadata.

This project is unofficial and is not affiliated with OpenAI or Anthropic.
ChatGPT, GPT, OpenAI, Claude, and related marks belong to their respective
owners.

## What You Get

- One canonical `oracle` skill.
- The same verified prompt sent independently to both models.
- No silent fallback when either requested model is unavailable.
- Model-identity checks before an answer counts.
- A synthesis contract that surfaces consensus, disagreements, each model's
  strongest unique insight, and the local tests still needed.
- Patient ChatGPT recovery: reclaim a stalled Chrome tab or reopen its saved
  `chatgpt.com/c/...` conversation before starting a duplicate run.
- Legacy static dossier scripts only for explicit bundle requests.

## Install With Codex

Install SWE Stack as a Codex marketplace, then install `oracle` from the
Plugins screen.

```bash
codex plugin marketplace add PedroAVJ/swe-stack --ref main --sparse .agents/plugins --sparse plugins/oracle
codex plugin marketplace upgrade
```

Equivalent marketplace values in the Codex app:

```text
Source: PedroAVJ/swe-stack
Git ref: main
Sparse paths:
.agents/plugins
plugins/oracle
```

If SWE Stack is already installed, add `plugins/oracle` to its sparse paths or
leave sparse paths blank, then run `codex plugin marketplace upgrade`.

## Oracle Flow

Examples:

```text
Ask Oracle to sanity-check this architecture decision.
Use Oracle for a second opinion on this device-only bug.
Run this implementation plan by GPT-5.6 Sol Pro and Fable 5.
```

Oracle first gathers verified local context. It then starts a fresh ChatGPT
conversation, selects `Pro`, sends the prompt, and runs the same prompt through
Claude Code with Fable 5. Codex waits for both answers and synthesizes them.

The complete dual workflow is Codex-hosted. The Claude-compatible manifest
makes the skill discoverable, but an Oracle invocation from inside Claude Code
must not pretend a recursive Claude process plus a missing Codex Chrome lane is
an independent two-model council.

## Recovery

If Chrome can still list or claim the ChatGPT tab but DOM or screenshot reads
time out, recover the saved `https://chatgpt.com/c/...` URL from the tab list or
focused history lookup, open it in a fresh tab, and extract the completed answer
there. Only start a duplicate Pro run after this recovery path fails.

If either requested model is unavailable, Oracle reports the exact failed
surface and labels the surviving answer as partial. Sonnet, Opus, Haiku,
Instant, Medium, High, and Extra High are not silent substitutes.

## Privacy And Source Checks

Oracle sends its prompt to both OpenAI and Anthropic. An explicit Oracle request
authorizes relevant nonsensitive context, but credentials, private identifiers,
medical or financial details, private messages, browsing history, and personal
files require specific approval before transmission to both providers.
