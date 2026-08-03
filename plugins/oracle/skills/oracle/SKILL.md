---
name: oracle
description: Ask ChatGPT GPT-5.6 Sol Pro through the user's logged-in Chrome session and Claude Fable 5 through Claude Code, then synthesize both independent answers without hiding disagreements.
metadata:
  author: Pedro
  origin: swe-stack-plugin
  source: hand-written
  provenance: unofficial-not-openai-curated
---

# Oracle

## Overview

Oracle is a two-model council. It sends the same verified, decision-focused
prompt independently to both of these lanes:

1. **GPT-5.6 Sol Pro** in the user's logged-in ChatGPT Pro session, controlled
   through the Chrome plugin / Codex Chrome Extension.
2. **Claude Fable 5** through the user's authenticated Claude Code CLI with the
   explicit canonical `claude-fable-5` model identifier.

Both answers are required for a complete Oracle run. Neither model sees the
other model's answer before responding. Codex then compares them, preserves
meaningful disagreements, and gives a locally grounded verdict.

This dual workflow is Codex-hosted. Do not claim a complete dual Oracle run
from inside an existing Claude Code session: recursively launching Claude Code
may be blocked or may not be independent, and Claude Code does not provide the
Codex Chrome-control lane.

The static dossier and zip helpers under this skill directory are legacy tools.
Use them only when the user explicitly asks for an uploadable bundle.

## When To Use

Use this skill when the user says things like:

- "ask Oracle"
- "use Oracle"
- "ask both models"
- "get a second opinion from Pro and Fable"
- "ask GPT-5.6 Pro and Fable 5"
- "use the stronger models"

If the current thread makes the question clear, proceed without asking the
user to restate it.

## Source-Of-Truth Discipline

Before consulting either model, gather the facts Codex can verify locally.

- Inspect the relevant files, diffs, tests, logs, issue text, and deployment or
  device state first.
- Use the canonical connector or artifact for external state when available.
- Mark verified facts, observations, and inferences distinctly in the prompt.
- Do not ask either model to fetch data from tools it cannot access.
- Reduce large context to the decision-critical facts. Do not upload a repo or
  personal file unless the user explicitly asked for that transmission.

An explicit Oracle request authorizes sending the relevant nonsensitive prompt
to both OpenAI and Anthropic. If the prompt would include credentials, private
identifiers, medical or financial details, private messages, browsing history,
or other sensitive data that the user did not clearly authorize sending to
both providers, confirm immediately before transmission.

## Shared Prompt Contract

Build one concise prompt and reuse it verbatim for both lanes. Do not include
one model's answer in the other model's prompt.

```text
I need a blunt second opinion from a senior <domain> expert.

Verified context:
- <verified fact>
- <verified command, log, or device result>
- <current implementation detail>

Constraints:
- <constraint that changes the answer>

Questions:
1. <core decision>
2. <specific failure mode>
3. <practical next experiments>

Separate verified behavior from inference. Prefer a concrete next step over
generic advice.
```

## GPT-5.6 Sol Pro Lane

1. Use the Chrome plugin with the Codex Chrome Extension. Do not substitute the
   in-app Browser because it cannot rely on the user's logged-in ChatGPT state.
2. Start with a lightweight connection check. Follow the Chrome skill's retry
   and recovery instructions if the extension bridge is unavailable.
3. Open a fresh `https://chatgpt.com/` conversation unless the user explicitly
   asks to continue an existing Oracle thread.
4. Verify that ChatGPT is logged in to the user's Pro account.
5. Open the current model or Intelligence menu and choose **Pro**. In the
   current ChatGPT UI, `Pro` is GPT-5.6 Sol Pro. A control reading `Instant`,
   `Medium`, `High`, or `Extra High` is not the Pro lane.
6. Re-read the visible control after selection. It must show `Pro` or an
   explicit `GPT-5.6 Sol Pro` label before sending.
7. Send the shared prompt exactly once and wait for generation to finish. Pro
   may take many minutes; never cancel it for duration alone.
8. If the browser socket stalls, reconnect and reclaim the same tab. If page
   reads remain wedged, recover the saved `https://chatgpt.com/c/...`
   conversation in a fresh tab before starting a duplicate run.
9. Extract the final answer only after ChatGPT is no longer generating.

Do not use a logged-out, free, Instant, Medium, High, Extra High, or other model
as a silent substitute. Do not automate login challenges, CAPTCHAs, credential
prompts, payment, or account setup.

## Claude Fable 5 Lane

Use the authenticated native Claude Code CLI. Send the shared prompt on stdin
so it does not become a shell argument. Run without tools, project discovery,
or session persistence by default:

```bash
python3 <oracle-skill-dir>/scripts/oracle_fable.py
```

Feed the shared prompt to that process on stdin. The helper sets
`CLAUDE_CODE_NO_MODEL_FALLBACK=1`, invokes this underlying command, and fails
closed if Claude Code attempts model substitution or the identity metadata does
not prove Fable 5 answered:

```bash
CLAUDE_CODE_NO_MODEL_FALLBACK=1 claude \
  --safe-mode \
  --model claude-fable-5 \
  --print \
  --system-prompt 'You are the Claude Fable 5 member of a two-model council. Answer independently and separate verified facts from inference.' \
  --tools '' \
  --disable-slash-commands \
  --output-format json \
  --no-session-persistence
```

Pass the prompt through stdin. Parse the JSON result and require all of these:

- `is_error` is false.
- `result` is nonempty.
- `modelUsage` includes `claude-fable-5` with output tokens.
- The only permitted non-Fable output is at most 128 tokens from the currently
  observed `claude-haiku-4-5` auxiliary model.
- Any Opus, Sonnet, unknown model, or larger auxiliary contribution fails the
  lane instead of being treated as Fable.

Claude Code may use a small auxiliary model internally; that does not replace
the requirement that Fable 5 produced the substantive answer. Do not silently
fall back to Sonnet, Opus, Haiku, or another model. A control-model probe may be
used for diagnosis, but it is not an Oracle answer.

Use both the canonical identifier and the no-fallback environment tripwire. On
Claude Code 2.1.220, both the `fable` alias and the canonical identifier routed
substantive Oracle prompts to Opus 5 when substitution remained enabled. The
tripwire makes that substitution fail instead. Also omit an effort override
unless a live identity probe proves the combination still resolves to Fable 5.

## Coordination And Failure Rules

- Start both independent lanes as close together as practical; while Pro is
  thinking, let Fable run.
- Wait for both completed answers before synthesizing.
- If one lane fails, report the exact failed surface and return the surviving
  answer only as a **partial council result**. Say plainly that Oracle did not
  complete.
- Never conceal a provider outage, model-selection mismatch, login failure,
  Chrome extension failure, Claude CLI error, or account gating behind a
  fallback model.
- Do not dump full transcripts unless the user explicitly asks. Preserve the
  reasoning that changes the decision.

## Synthesis Contract

Codex owns the final synthesis and must ground it against the locally verified
facts. Return:

1. **Verdict** — Codex's direct answer.
2. **Consensus** — conclusions both models independently support.
3. **Disagreements** — incompatible recommendations or confidence differences;
   do not average these away.
4. **Model-specific insight** — the strongest unique contribution from
   GPT-5.6 Sol Pro and from Fable 5.
5. **Next verification** — the smallest local tests that settle what remains.

If a model asserts an API, product behavior, or current fact that was not
locally verified, label it as that model's claim until Codex checks it.
