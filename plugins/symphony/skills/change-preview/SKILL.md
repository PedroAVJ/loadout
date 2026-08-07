---
name: change-preview
description: Thin Symphony launcher for Pedro-facing standalone HTML change previews. It invokes Claude with its frontend-design skill, then the runner publishes the resulting HTML when that explicit review lane is requested.
metadata:
  author: Pedro
  origin: local-self-authored
  source: hand-written
  provenance: not-openai-curated-not-plugin
---

# Symphony Change Preview

Generate a standalone `change-preview.html` that helps Pedro quickly understand what changed.

This is a thin orchestration skill for Symphony/the runner. Claude does the creative artifact work through its `frontend-design` skill.

## Boundary

- Verification evidence is internal trust work for the agent: tests, screenshots, traces, logs, production checks, and whatever else proves the change works.
- The change preview is Pedro-facing comprehension: a clear HTML artifact that explains what changed and what matters.
- Claude owns the preview direction through its `frontend-design` skill. The Symphony runner does not choose the sections, media, mockups, or visual style.
- Use the repo, PR/diff, available evidence, and app behavior as inputs.
- Mockups, diagrams, and simplified UI are allowed when they improve comprehension. Label captured evidence, illustrative material, and caveats honestly.
- The HTML must be responsive enough to read comfortably on Pedro's iPhone and MacBook. Use mobile-first CSS, stack dense grids on narrow screens, avoid fixed-width content, prevent horizontal scroll, and keep headings/buttons/labels inside their containers at common iPhone widths.
- Do not edit product source, git state, trackers, PRs, or deployment state while generating the preview.
- Do not handcraft a fallback HTML preview in Codex. If Claude fails, times out, or does not create the requested HTML, report the failure with the helper logs and stop the preview lane.
- If regenerating an existing preview because the layout is bad, ask Claude to replace the HTML from scratch instead of patching the old file or preserving its visual system.
- Do not kill Claude just because the final text log is quiet. The helper streams Claude's JSON output into a trace file and owns the timeout.

## Usage

Call the helper with a target PR/change plus an output path. The helper calls Claude with a short prompt that explicitly asks it to use `frontend-design`. Do not give Claude a prescribed section outline or visual direction.

```bash
python3 "$(find "${CODEX_HOME:-$HOME/.codex}/plugins/cache/loadout/symphony" \
  -path '*/skills/change-preview/scripts/generate_preview.py' \
  -print | sort -V | tail -1)" \
  --workspace . \
  --target "PR 123" \
  --output .symphony-local/change-preview/change-preview.html
```

The helper writes:

- `change-preview-prompt.md`: the exact prompt sent to Claude.
- `change-preview-claude.log`: readable progress extracted from Claude's stream.
- `change-preview-claude.stream.jsonl`: raw Claude stream events for debugging.

Default timeout is 30 minutes. Override with `--timeout-seconds` or `CHANGE_PREVIEW_TIMEOUT_SECONDS` only when the runner has a clear reason.

After the HTML is generated, publish/link the HTML first. For Symphony-managed
change previews, use the repo's configured preview publishing path if one
exists; do not silently switch to Vercel Blob or `publish-file` when the repo
documents a different preview surface. A PNG thumbnail is optional and
secondary.
