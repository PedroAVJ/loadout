---
name: "frontend-ui"
description: "Use for application UI, frontend, layout, interaction, customer-facing screens, dashboards, components, CSS, responsive behavior, mobile UI, or other browser-visible implementation. Claude Opus 5 must own the first visible implementation pass; Codex stewards, reviews, cleans up, verifies, and decides what ships."
---

# Frontend UI

This is the mandatory Claude Opus 5 workflow for browser-visible product work.

If a task changes application UI, visual behavior, layout, styling,
interaction, a customer-facing screen, a dashboard, components, CSS,
responsive behavior, mobile UI, or another browser-visible surface, Codex must
use Claude Opus 5 for the first implementation pass before directly editing
those UI files.

## Contract

1. Claude Opus 5 owns the first browser-visible implementation pass.
2. Codex owns stewardship: requirements, scope, prompt quality, logs, diff
   inspection, integration cleanup, verification, and final shipping judgment.
3. Do not substitute a read-only critique for implementation unless the user
   explicitly asks for planning, critique, or no code changes.
4. Do not hand-edit the visible UI first and ask Claude afterward.
5. Backend, data, schema, and non-visual test-harness work may proceed before
   the Claude pass when they establish the contract the UI must consume.
6. If Opus 5 cannot run, say so before editing UI. A fallback model or
   Codex-only visible implementation requires a named failure reason.

## Implementation Workflow

1. Inspect the relevant product behavior and files enough to give Claude a
   grounded, narrow prompt.
2. Make non-visual contract changes first when the UI depends on them.
3. Ensure no other agent is concurrently editing the same UI files.
4. Run the plugin implementation pass:

```bash
python3 /path/to/plugins/claude/scripts/run_design_pass.py \
  --repo /path/to/repo \
  --mode implement \
  --model claude-opus-5 \
  --effort high \
  --prompt "Use your frontend-design skill. Implement the requested product UI. Keep scope narrow, inspect the existing design system, and do not change unrelated behavior."
```

Resolve `/path/to/plugins/claude` to the installed plugin directory containing
this skill. Keep `--model claude-opus-5` explicit for browser-visible
implementation; do not rely on a mutable model alias.

5. Inspect Claude's stream/debug logs and resulting diff.
6. Let Claude correct material visual misses before Codex performs narrow
   integration cleanup.
7. Verify every exposed action in the real browser-visible flow. For deployed
   forms, repeat the complete flow against the deployed environment.
8. In the final response, identify Claude's implementation pass and any
   separate Codex cleanup.

## Read-Only UI Handoff

Only when the user asks for planning, critique, or no code changes:

```bash
python3 /path/to/plugins/claude/scripts/run_design_pass.py \
  --repo /path/to/repo \
  --mode handoff \
  --model claude-opus-5 \
  --prompt "Use your frontend-design skill. Inspect the requested UI and return a concrete design handoff without editing files."
```

## Boundaries

- Pure backend, CLI, data, documentation, or non-visual test-harness work does
  not require this skill.
- Standalone educational HTML explainers use the `explainer` skill.
- Run heavy builds and browser sessions serially when local memory is
  constrained.
