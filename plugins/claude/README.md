# Claude

Local Codex plugin for using Claude Code as a frontend implementation and
visual-design collaborator.

Codex owns this wrapper as a stewardship layer: prompts, logs, diff review,
cleanup, verification, and final shipping judgment stay under Codex control.
Claude Fable owns the first implementation pass for browser-visible product UI
and provides visual-artifact direction for the explainer workflow.

This project is unofficial and is not affiliated with Anthropic.

## Workflow rule of thumb

- Use the mandatory frontend UI skill for application UI and frontend work.
- Claude Fable makes the first visible implementation pass; Codex stewards it.
- Use the explainer skill for a standalone designed HTML explanation.

## Model selection

The wrapper passes the stable `fable` alias by default. A caller may explicitly
override it with `--model`.

## Included surfaces

- `skills/frontend-ui` is the mandatory workflow for browser-visible product UI.
- `skills/explainer` produces polished standalone HTML explainers through the Claude visual-artifact workflow.
- `scripts/run_design_pass.py` supports read-only visual/handoff modes and an
  editable frontend implementation mode, with streamed logs for inspection.
- `templates/frontend-implementation.md` directs Claude's product UI pass.
- `templates/frontend-handoff.md` supports explicitly read-only UI planning.
- `templates/visual-handoff.md` provides the read-only visual-direction prompt.
- `assets/claude-mobile-app-icon.jpg` is sourced from the Claude by Anthropic App Store listing.

## Claude Code compatibility

This plugin is intentionally Codex-first. It does not ship a Claude Code plugin manifest because its purpose is to let Codex invoke and steward Claude Code, not to teach Claude how to call itself.
