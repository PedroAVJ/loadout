# Symphony

Local Codex plugin for Pedro's explicit Symphony meta-workflow loops.

Codex owns stewardship: grounding, source boundaries, issue lifecycle judgment,
and final reporting. Symphony owns repeatable workflow shape. Claude may be
invoked as a collaborator for design, HTML, presentation, or UI implementation
passes, but Claude should not become the source of truth for work status.

## Current Role

- Coordinate source-of-truth intake from WhatsApp, meetings, Linear, git, and
  repo docs when Pedro explicitly asks for a Symphony workflow.
- Elicit requirements into approved Linear work packets before implementation.
- Dispatch approved Linear work into separate Codex implementation threads so
  Pedro can follow up there with fresh context.
- Preserve meeting/call/audio evidence before issue extraction.
- Persist source-scoped requirements-analysis ledgers in product repos so the
  complete candidate set remains available for Pedro's specification decisions.
- Keep implementable Linear work separate from bookmarks, vague future topics,
  and canceled/obsolete scope.
- Run coverage checks as a mode of requirements elicitation so stakeholder
  input has issue/comment/doc tracking without making Linear the full spec.
- Treat issue/spec rewrites as a restart boundary for stale work.
- Run explicit Codex review, merge, release-proof, and Azure DevOps lifecycle
  lanes when Pedro asks for shipping work.
- Generate sprint-review and stakeholder-facing artifacts from grounded issue
  and repo state.
- Surface concise completion/status updates to Pedro after the workflow has
  actually finished.

## Repo-Specific Boundary

Individual product repos are not Symphony-owned implementation lanes by default.
Ordinary repo work should use normal Codex repo behavior: read the repo, answer
from the source of truth, implement the issue directly, and handle chats one at
a time.

Do not use Symphony to automatically intake, create, rewrite, restart, merge,
or monitor implementation issues. Use Symphony for a repo only when Pedro
explicitly invokes it for a meta artifact or workflow, such as a grounded review
HTML, a deliberately scoped intake audit, or a status summary.

## Skills

- `symphony`
- `elicitation`
- `analysis`
- `requirements-elicitation`
- `requirements-map`
- `delivery-map`
- `issue-explainer`
- `implementation-dispatch`
- `linear-issue-writer` (compatibility/internal issue-body rules)
- `issue-intake` (compatibility alias)
- `coverage-pass` (compatibility mode)
- `codex-review`
- `review-handoff`
- `change-preview`
- `sprint-review`
- `merge`
- `azure-publish-changes`
- `azure-merge`
- `linear` (workspace-wide issue conventions)
- `bdd-test` (behavior contracts paired with Playwright automation)

The last two are standing conventions rather than lifecycle steps. `linear`
governs every issue in the workspace however it was created — no priorities,
one repo label, plain-English references — and sits underneath
`requirements-elicitation` and `linear-issue-writer` rather than competing
with them. `bdd-test` is the acceptance-criteria format the lifecycle produces
when a work packet needs a human-reviewable contract.

## Boundary

This plugin is a product-style workflow plugin, not an MCP server. Add
MCP tools only when there is a concrete runtime action that cannot be handled
cleanly by Codex skills, existing app connectors, the Symphony CLI, or local
scripts.
