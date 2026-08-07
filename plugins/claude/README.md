# Claude

Local Codex plugin for reaching Claude. Every way Codex spends Claude tokens
lives here: frontend implementation, visual explainers, and Fable 5 second
opinions.

Codex owns this wrapper as a stewardship layer: prompts, logs, diff review,
cleanup, verification, and final shipping judgment stay under Codex control.
Claude Opus 5 owns the first implementation pass for browser-visible product UI
and provides visual-artifact direction for the explainer workflow. Claude
Fable 5 answers as Oracle.

This project is unofficial and is not affiliated with Anthropic.

## Workflow rule of thumb

- Use the mandatory frontend UI skill for application UI and frontend work.
- Claude Opus 5 makes the first visible implementation pass; Codex stewards it.
- Use the explainer skill for a standalone designed HTML explanation.
- Use the oracle skill when a decision needs Fable 5's second opinion.

## Model selection

The wrapper passes the canonical `claude-opus-5` identifier by default; oracle
pins `claude-fable-5`. A caller may explicitly override the design pass with
`--model`, but the mandatory frontend UI workflow pins the canonical identifier
rather than relying on a mutable alias.

## Fail-closed model identity

`--model` is a request, not a guarantee — Claude Code will fall back when the
requested model is unavailable. Passing a fallback answer off as Opus 5's or
Fable 5's is a lie about what produced it, so every skill here runs with
`CLAUDE_CODE_NO_MODEL_FALLBACK=1` and then verifies `modelUsage` in the result
before the answer counts. `scripts/claude_host.py` holds that check once for
all three skills; a clean exit code alone is never treated as proof.

Small auxiliary Haiku calls (titles, topic detection) are tolerated below a
128-output-token floor. Anything above that from an unrequested model is a
hard failure.

## Included surfaces

- `skills/frontend-ui` is the mandatory workflow for browser-visible product UI.
- `skills/explainer` produces polished standalone HTML explainers through the Claude visual-artifact workflow.
- `skills/oracle` sends one focused prompt to Claude Fable 5 for a second opinion.
- `scripts/claude_host.py` holds the shared host guard and model-identity check.
- `scripts/run_design_pass.py` supports read-only visual/handoff modes and an
  editable frontend implementation mode, with streamed logs for inspection.
- `templates/frontend-implementation.md` directs Claude's product UI pass.
- `templates/frontend-handoff.md` supports explicitly read-only UI planning.
- `templates/visual-handoff.md` provides the read-only visual-direction prompt.
- `assets/claude-mobile-app-icon.jpg` is sourced from the Claude by Anthropic App Store listing.

## Claude Code compatibility

This plugin is intentionally Codex-only. Its purpose is to let Codex invoke and
steward Claude Code, not to teach Claude how to call itself, so it is scoped out
of Claude Code twice over:

1. **No `.claude-plugin/` manifest and no entry in the repo's
   `marketplace.json`.** Claude Code cannot install it. This is the real guard —
   an uninstalled plugin has no skills to misfire.
2. **A runtime refusal in `scripts/claude_host.py`.** If the plugin is ever
   sideloaded, every script exits non-zero when `$CLAUDECODE` is set. `CLAUDECODE`
   is present in every Claude Code session and absent under Codex, which makes
   host detection a fact rather than a heuristic.

Without the guard, an Opus 5 session running `oracle` would spawn a nested CLI
to ask itself for an outside opinion and return the result as one. The failure
is silent and the output looks correct, which is exactly why it fails closed.
